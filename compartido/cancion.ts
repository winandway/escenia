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

/** Cuánto papel ocupa el boceto arriba (fracción del alto del video vertical). */
export const ALTO_DEL_BOCETO = 0.3;
