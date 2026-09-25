// Lo que recibe la plantilla de video. Todo viene calculado por la Estación:
// la plantilla solo dibuja.
import { z } from "zod";

export const esquemaPalabra = z.object({
  text: z.string(),
  startMs: z.number(),
  endMs: z.number(),
  timestampMs: z.number().nullable(),
  confidence: z.number().nullable(),
});

export const esquemaEscenaVideo = z.object({
  parte: z.string(),
  inicioMs: z.number(),
  finMs: z.number(),
  textoEnPantalla: z.string().default(""),
  // Ruta relativa al publicDir (staticFile) del clip de fondo, o null para fondo de color.
  clip: z.object({ ruta: z.string(), duracionSeg: z.number() }).nullable(),
});

export const esquemaPropsVideo = z.object({
  titulo: z.string(),
  audio: z.string(), // ruta relativa al publicDir
  duracionMs: z.number(),
  palabras: z.array(esquemaPalabra),
  escenas: z.array(esquemaEscenaVideo),
  producto: z.object({ nombre: z.string(), url: z.string() }).nullable(),
  vozDePrueba: z.boolean().default(false),
});

export type PropsVideo = z.infer<typeof esquemaPropsVideo>;

export const FPS = 30;
export const COLA_FINAL_MS = 1500;

export function duracionEnFrames(duracionMs: number): number {
  return Math.ceil(((duracionMs + COLA_FINAL_MS) / 1000) * FPS);
}
