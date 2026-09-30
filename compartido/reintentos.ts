// Un corte de red de unos segundos no puede tumbar una producción de media
// hora (C-ENTREGA-1). Aquí vive la regla de qué se reintenta y cuánto se espera.

/** Esperas entre intentos: 2 s, 5 s, 15 s, 30 s y 60 s (seis intentos en total, casi dos minutos). */
export const ESPERAS_MS = [2_000, 5_000, 15_000, 30_000, 60_000] as const;

/** Error con el código que respondió el panel, para decidir si vale la pena reintentar. */
export class ErrorDelPanel extends Error {
  constructor(
    mensaje: string,
    public readonly status: number,
  ) {
    super(mensaje);
    this.name = "ErrorDelPanel";
  }
}

const CODIGOS_PASAJEROS = new Set([408, 425, 429, 500, 502, 503, 504]);

/**
 * ¿Vale la pena volver a intentarlo? Sí cuando falló la red (no hubo respuesta)
 * o el servidor dijo que el problema es pasajero. No cuando el panel rechazó lo
 * que se le mandó (400, 401, 404, 409, 422…): repetirlo daría lo mismo.
 */
export function seReintenta(fallo: unknown): boolean {
  if (fallo instanceof ErrorDelPanel) return CODIGOS_PASAJEROS.has(fallo.status);
  if (!(fallo instanceof Error)) return false;
  const texto = `${fallo.name} ${fallo.message} ${String((fallo as { cause?: unknown }).cause ?? "")}`;
  return /fetch failed|network|socket|ECONNRESET|ECONNREFUSED|ETIMEDOUT|EAI_AGAIN|ENOTFOUND|UND_ERR|timeout|aborted|terminated/i.test(
    texto,
  );
}

export async function conReintentos<T>(
  tarea: (intento: number) => Promise<T>,
  opciones: {
    esperas?: readonly number[];
    dormir?: (ms: number) => Promise<void>;
    alReintentar?: (intento: number, esperaMs: number, fallo: unknown) => void;
  } = {},
): Promise<T> {
  const esperas = opciones.esperas ?? ESPERAS_MS;
  const dormir = opciones.dormir ?? ((ms: number) => new Promise<void>((listo) => setTimeout(listo, ms)));
  for (let intento = 1; ; intento++) {
    try {
      return await tarea(intento);
    } catch (fallo) {
      const espera = esperas[intento - 1];
      if (espera === undefined || !seReintenta(fallo)) throw fallo;
      opciones.alReintentar?.(intento, espera, fallo);
      await dormir(espera);
    }
  }
}
