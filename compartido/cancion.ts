// Formato Canción (docs/CANCION.md): Richard canta a cámara con su fondo real y, encima de
// su cabeza, va un boceto a lápiz por verso que sigue la letra. Sale solo en vertical, con su
// audio en vivo tal cual (sin música del motor, sin efectos, sin quitarle el fondo).
import type { MomentoPresentador } from "./presentador";

/**
 * El estilo que se le suma al prompt de cada boceto. La IA del plan describe SOLO la escena
 * del verso; esto es lo que la vuelve un dibujo a lápiz sobre papel viejo (como el video de
 * Dietrich Bonhoeffer que le gustó a Richard el 6 oct 2026).
 */
export const ESTILO_LAPIZ =
  "Hand-drawn pencil sketch on aged, slightly crumpled old paper with coffee stains: simple, cute stick figures with round heads and expressive poses, loose graphite and charcoal strokes, light cross-hatching, monochrome sepia and dark gray on cream paper, minimal composition with plenty of empty paper, storybook feel. No text, no letters, no numbers, no logos, no watermark, no photo-realism, no color.";

/** El prompt completo de un boceto: la escena que pidió la IA más el estilo a lápiz. */
export function promptDeBoceto(escena: string): string {
  const limpia = escena.trim().replace(/[.\s]+$/u, "");
  return `${limpia}. ${ESTILO_LAPIZ}`;
}

/** En una canción él sale entero todo el tiempo: ni esquina ni ventana. */
export const momentosDeCancion = (): MomentoPresentador[] => [{ inicioMs: 0, modo: "completo" }];

/**
 * Cuánto ocupa el papel del boceto arriba (fracción del alto del video vertical). Va de borde a
 * borde y bien cuadrado, sin torcer: lo pidió Richard el 6 oct 2026 al ver el primer video.
 */
export const ALTO_DEL_BOCETO = 0.3;

/** Hasta dónde llega su cabeza (gorra incluida) y su mentón en toda la toma, en fracciones del alto. */
export type CaraDelPresentador = { arriba: number; abajo: number };

/** De las caras de varios cuadros de la toma (recuadros en fracciones), lo más alto que llega la cabeza y lo más bajo el mentón. */
export function caraDeLaToma(cuadros: { cy: number; h: number }[][]): CaraDelPresentador | null {
  const mayores = cuadros
    .map((caras) => [...caras].sort((a, b) => b.h - a.h)[0])
    .filter((c) => c !== undefined);
  if (mayores.length === 0) return null;
  // Del recuadro de la cara (frente a mentón) a la cabeza entera con gorra: tres cuartos de cara por
  // encima (medido en su toma del 6 oct 2026: con media cara, la gorra quedaba tapada).
  const arriba = Math.max(0, Math.min(...mayores.map((c) => c.cy - c.h / 2 - c.h * 0.75)));
  const abajo = Math.min(1, Math.max(...mayores.map((c) => c.cy + c.h / 2)));
  return { arriba, abajo };
}

/**
 * Cuánto se baja el video (fracción del alto) para que la cabeza quede justo debajo del papel.
 * Se pierde un poco del cuerpo por abajo; nunca se tapa la cara. Sin cara detectada, se baja
 * un poco por si acaso.
 */
export function bajadaDelVideo(cara: CaraDelPresentador | null, altoPapel = ALTO_DEL_BOCETO): number {
  if (!cara) return Math.min(altoPapel, 0.1);
  const aire = 0.01;
  return Math.max(0, Math.min(altoPapel, altoPapel + aire - cara.arriba));
}

/**
 * Dónde empieza la letra (fracción del alto del video final): debajo del mentón, sobre el pecho,
 * como en los demás videos verticales. Nunca sobre la cara, y nunca tan abajo que la tape YouTube.
 */
export function arribaDeLaLetra(cara: CaraDelPresentador | null, bajada: number): number {
  const menton = (cara?.abajo ?? 0.5) + bajada;
  return Math.min(0.8, Math.max(0.56, menton + 0.025));
}
