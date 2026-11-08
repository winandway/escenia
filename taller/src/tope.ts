// C-TALLER-2: el tope de gasto del taller en la nube (sin dependencias: se prueba desde pruebas/).

/** standard-4: 4 vCPU × 0,00002 $ + 12 GiB × 0,0000025 $ por segundo (precios leídos el 8 nov 2026). */
export const DOLARES_POR_SEGUNDO = 4 * 0.00002 + 12 * 0.0000025;
/** 6 $ al mes / 0,00011 $ por segundo ≈ 54.500 s. Se deja en 50.000 para no rozar el tope. */
export const TOPE_SEGUNDOS_MES = 50_000;
/** Amarillo desde unos 60 comerciales de 5 minutos al mes (lo que dijo la propuesta). */
export const AMARILLO_SEGUNDOS_MES = 18_000;

export const mesDe = (d: Date) => d.toISOString().slice(0, 7);

export function estadoDelGasto(segundos: number): "verde" | "amarillo" | "rojo" {
  if (segundos >= TOPE_SEGUNDOS_MES) return "rojo";
  return segundos >= AMARILLO_SEGUNDOS_MES ? "amarillo" : "verde";
}
