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
  // "clip": clip de fondo con rótulo arriba. "frase": clip difuminado con la frase
  // grande al centro. "foto": fotografía real con movimiento lento y marco.
  // "titular": titular enorme con golpe. "recorte": recorte de periódico o tarjeta de red social.
  estilo: z.enum(["clip", "frase", "foto", "titular", "recorte"]).default("clip"),
  // Ruta relativa al publicDir (staticFile) del clip de fondo, o null si no hubo ninguno.
  clip: z.object({ ruta: z.string(), duracionSeg: z.number() }).nullable(),
  foto: z.object({ ruta: z.string(), ancho: z.number(), alto: z.number() }).nullable().default(null),
  // Varias imágenes en la misma escena (una por frase de la narración): se
  // muestran en orden, cada una con su movimiento, repartidas en el tiempo.
  fotos: z.array(z.object({ ruta: z.string(), ancho: z.number(), alto: z.number() })).default([]),
  recorte: z
    .object({
      tipo: z.enum(["periodico", "red", "titular"]),
      titular: z.string().default(""),
      fecha: z.string().default(""),
      cuerpo: z.string().default(""),
    })
    .nullable()
    .default(null),
});

export const esquemaSfx = z.object({
  whoosh: z.array(z.string()).default([]),
  pop: z.string().nullable().default(null),
  riser: z.string().nullable().default(null),
  ding: z.string().nullable().default(null),
  boom: z.string().nullable().default(null),
});

export const esquemaPropsVideo = z.object({
  titulo: z.string(),
  audio: z.string(), // ruta relativa al publicDir
  duracionMs: z.number(),
  palabras: z.array(esquemaPalabra),
  escenas: z.array(esquemaEscenaVideo),
  producto: z.object({ nombre: z.string(), url: z.string() }).nullable(),
  vozDePrueba: z.boolean().default(false),
  // "tech": explicador de tecnología. "documental": biografías, más pausado y con serif.
  tema: z.enum(["tech", "documental"]).default("tech"),
  sfx: esquemaSfx.default({ whoosh: [], pop: null, riser: null, ding: null, boom: null }),
});

export type PropsVideo = z.infer<typeof esquemaPropsVideo>;

export const FPS = 30;
export const COLA_FINAL_MS = 1500;

export function duracionEnFrames(duracionMs: number): number {
  return Math.ceil(((duracionMs + COLA_FINAL_MS) / 1000) * FPS);
}
