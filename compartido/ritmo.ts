// Ritmo de lectura parejo (C-VOZ-4). Cada escena sale de la voz con su propio
// ritmo (medido: de 104 a 163 palabras por minuto en el mismo video) y las
// lentas aburren. Se mide cuántas letras por segundo tiene cada pieza y se
// ajusta el tempo (sin cambiar el tono) hacia un objetivo único.
import type { Alineacion } from "./subtitulos";

/**
 * ≈ 158 palabras por minuto en español narrado, «un poco rápido» como pidió
 * Richard. Subió de 11 a 11,6 el 2 oct 2026: ahora el ritmo se mide con las
 * pausas ya recortadas (C-VOZ-6), y con 11 la voz se habría frenado.
 */
export const LETRAS_POR_SEGUNDO_OBJETIVO = 11.6;
export const FACTOR_MINIMO = 0.85;
export const FACTOR_MAXIMO = 1.25;

/** Letras que se pronuncian: sin espacios ni puntuación. */
export function letrasHabladas(texto: string): number {
  return texto.replace(/[\s\p{P}\p{S}]/gu, "").length;
}

/** Cuánto acelerar (>1) o frenar (<1) una pieza para que lea al ritmo objetivo. Acotado para que no suene raro. */
export function factorDeRitmo(
  texto: string,
  duracionSeg: number,
  objetivo = LETRAS_POR_SEGUNDO_OBJETIVO,
): number {
  const letras = letrasHabladas(texto);
  if (letras < 20 || duracionSeg <= 0.5) return 1;
  const factor = objetivo / (letras / duracionSeg);
  return Math.round(Math.min(FACTOR_MAXIMO, Math.max(FACTOR_MINIMO, factor)) * 1000) / 1000;
}

/** Al acelerar por `factor`, cada tiempo de la alineación se divide por él. */
export function escalarAlineacion(a: Alineacion, factor: number): Alineacion {
  return {
    characters: a.characters,
    character_start_times_seconds: a.character_start_times_seconds.map((t) => t / factor),
    character_end_times_seconds: a.character_end_times_seconds.map((t) => t / factor),
  };
}
