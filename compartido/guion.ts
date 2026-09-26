// Forma del guion que sale de la IA y que viaja entre el panel y la Estación.
// Es la única fuente de verdad: si cambia aquí, cambia para los dos lados.
import { z } from "zod";

export const PARTES = ["gancho", "problema", "contexto", "demo", "dato", "opinion", "cierre", "cta"] as const;
export const TIPOS_VISUAL = ["stock", "foto", "texto", "titulo", "pantalla"] as const;

export const esquemaVisual = z.object({
  tipo: z.enum(TIPOS_VISUAL),
  // Palabras para buscar el clip en Pexels (stock) o la foto en Wikimedia Commons (foto).
  busqueda: z.string().trim().max(80).optional(),
  // Dirección a grabar en pantalla (solo si tipo = pantalla).
  url: z.string().trim().max(300).optional(),
  // Frase corta que aparece grande en pantalla.
  texto_en_pantalla: z.string().trim().max(90).optional(),
});

export const esquemaEscena = z.object({
  parte: z.enum(PARTES),
  narracion: z.string().trim().min(1).max(1500),
  visual: esquemaVisual,
  // Emoción del momento; en la Fase 2 elige memes y efectos de la biblioteca.
  momento: z.string().trim().max(30).optional(),
});

export const esquemaGuion = z.object({
  titulo: z.string().trim().min(5).max(100),
  gancho: z.string().trim().min(5).max(300),
  escenas: z.array(esquemaEscena).min(3).max(30),
  // Afirmaciones que Richard tiene que comprobar antes de aprobar
  // (lo que es dato de fuente, separado de lo que opina la IA).
  hechos_a_verificar: z.array(z.string().trim().max(300)).max(20).default([]),
  descripcion_youtube: z.string().trim().max(4500).default(""),
  etiquetas: z.array(z.string().trim().max(40)).max(20).default([]),
});

export type Guion = z.infer<typeof esquemaGuion>;
export type Escena = z.infer<typeof esquemaEscena>;

/** Mínimo de letras de la opinión de Richard para poder aprobar. */
export const OPINION_MINIMA = 40;

/**
 * Pone la opinión de Richard como escena propia, narrada con su voz.
 * Si el guion ya traía una escena de opinión, la reemplaza; si no, la mete
 * justo antes del cierre o del llamado a la acción.
 */
export function insertarOpinion(escenas: Escena[], opinion: string): Escena[] {
  const texto = opinion.trim();
  const escenaOpinion: Escena = {
    parte: "opinion",
    narracion: texto,
    visual: { tipo: "texto", texto_en_pantalla: "Mi opinión" },
  };
  const sinOpinion = escenas.filter((e) => e.parte !== "opinion");
  const indiceFinal = sinOpinion.findIndex((e) => e.parte === "cierre" || e.parte === "cta");
  if (indiceFinal === -1) return [...sinOpinion, escenaOpinion];
  return [...sinOpinion.slice(0, indiceFinal), escenaOpinion, ...sinOpinion.slice(indiceFinal)];
}

/** Texto completo que se narra, escena por escena. */
export function textoNarrado(escenas: Escena[]): string {
  return escenas.map((e) => e.narracion.trim()).join("\n\n");
}

/** Estimación de duración: ~150 palabras por minuto en español narrado. */
export function duracionEstimadaSeg(escenas: Escena[]): number {
  const palabras = textoNarrado(escenas).split(/\s+/).filter(Boolean).length;
  return Math.round((palabras / 150) * 60);
}
