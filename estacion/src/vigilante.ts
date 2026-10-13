// El vigilante de la Estación (C-ESTACION-VIGILANTE, 13 oct 2026): la Estación se quedó callada y
// quieta casi diez horas esperando una respuesta del panel que nunca llegó, y el guion aprobado no se
// producía. Cada vez que la Estación le habla al panel da una señal de vida (también el latido de
// cada 45 s mientras produce); si pasan 10 minutos sin ninguna, se sale y launchd (KeepAlive) la
// vuelve a arrancar.

export const LIMITE_SIN_VIDA_MS = 10 * 60_000;

let ultimaSenal = Date.now();

export function senalDeVida(ahoraMs: number = Date.now()): void {
  ultimaSenal = ahoraMs;
}

/** Si pasó más del límite desde la última señal de vida. */
export function seTrabo(ultimaMs: number, ahoraMs: number, limiteMs: number = LIMITE_SIN_VIDA_MS): boolean {
  return ahoraMs - ultimaMs > limiteMs;
}

/** Revisa cada minuto; si la Estación se trabó, avisa y llama a `alTrabarse` (salir para que launchd la reinicie). */
export function vigilar(alTrabarse: (minutos: number) => void): NodeJS.Timeout {
  const t = setInterval(() => {
    const ahora = Date.now();
    if (seTrabo(ultimaSenal, ahora)) alTrabarse(Math.round((ahora - ultimaSenal) / 60_000));
  }, 60_000);
  t.unref();
  return t;
}
