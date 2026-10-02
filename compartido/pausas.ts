// Pausas parejas (C-VOZ-6). La voz sale con silencios de largo muy distinto:
// unos de 0,3 s y otros de más de un segundo. Eso es lo que se siente como «el
// ritmo no se mantiene». Aquí se decide qué trozo de cada silencio se recorta,
// y cómo se corren los tiempos de las palabras después del recorte.

export type Silencio = { inicioSeg: number; finSeg: number };
export type Corte = { desdeSeg: number; hastaSeg: number };

/** Ninguna pausa dentro de una escena dura más que esto. */
export const PAUSA_MAXIMA_SEG = 0.34;
/** Un silencio más corto que esto es respiración normal: no se toca. */
export const PAUSA_QUE_SE_TOCA_SEG = 0.42;

/** Lo que se deja de silencio al arrancar y al terminar una pieza (entre escenas ya hay su pausa). */
const BORDE_INICIO_SEG = 0.06;
const BORDE_FINAL_SEG = 0.12;

/**
 * De cada silencio largo se quita el centro y se deja `PAUSA_MAXIMA_SEG`
 * repartido a los lados. El silencio con que arranca o termina la pieza se
 * deja en casi nada.
 */
export function cortesDePausas(
  silencios: Silencio[],
  duracionSeg: number,
  opciones: { maximaSeg?: number; seTocaSeg?: number } = {},
): Corte[] {
  const maxima = opciones.maximaSeg ?? PAUSA_MAXIMA_SEG;
  const seToca = opciones.seTocaSeg ?? PAUSA_QUE_SE_TOCA_SEG;
  const cortes: Corte[] = [];
  for (const s of [...silencios].sort((a, b) => a.inicioSeg - b.inicioSeg)) {
    const inicio = Math.max(0, s.inicioSeg);
    const fin = Math.min(duracionSeg, s.finSeg);
    const alInicio = inicio <= 0.02;
    const alFinal = fin >= duracionSeg - 0.02;
    let corte: Corte;
    if (alInicio) corte = { desdeSeg: 0, hastaSeg: fin - BORDE_INICIO_SEG };
    else if (alFinal) corte = { desdeSeg: inicio + BORDE_FINAL_SEG, hastaSeg: duracionSeg };
    else if (fin - inicio < seToca) continue;
    else corte = { desdeSeg: inicio + maxima / 2, hastaSeg: fin - maxima / 2 };
    if (corte.hastaSeg - corte.desdeSeg > 0.03) cortes.push(corte);
  }
  return cortes;
}

/** Dónde queda un instante después de quitar los cortes. */
export function tiempoTrasCortes(t: number, cortes: Corte[]): number {
  let quitado = 0;
  for (const c of cortes) {
    if (t >= c.hastaSeg) quitado += c.hastaSeg - c.desdeSeg;
    else if (t > c.desdeSeg) quitado += t - c.desdeSeg;
  }
  return Math.max(0, t - quitado);
}

/** Los trozos de audio que se conservan, en orden. */
export function trozosQueQuedan(cortes: Corte[], duracionSeg: number): Corte[] {
  const trozos: Corte[] = [];
  let cursor = 0;
  for (const c of cortes) {
    if (c.desdeSeg > cursor) trozos.push({ desdeSeg: cursor, hastaSeg: c.desdeSeg });
    cursor = Math.max(cursor, c.hastaSeg);
  }
  if (cursor < duracionSeg) trozos.push({ desdeSeg: cursor, hastaSeg: duracionSeg });
  return trozos;
}
