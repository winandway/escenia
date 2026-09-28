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

// Foto o imagen generada. `enfoque`: dónde está la persona (fracciones 0-1),
// para recortar en vertical sin cortarle la cara (C-SHORTS-2).
export const esquemaFoto = z.object({
  ruta: z.string(),
  ancho: z.number(),
  alto: z.number(),
  enfoque: z.object({ x: z.number(), y: z.number() }).nullable().default(null),
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
  foto: esquemaFoto.nullable().default(null),
  // Varias imágenes en la misma escena (una por frase de la narración): se
  // muestran en orden, cada una con su movimiento, repartidas en el tiempo.
  fotos: z.array(esquemaFoto).default([]),
  recorte: z
    .object({
      tipo: z.enum(["periodico", "red", "titular"]),
      titular: z.string().default(""),
      fecha: z.string().default(""),
      cuerpo: z.string().default(""),
    })
    .nullable()
    .default(null),
  // Respiro musical: no hay voz en este tramo, la música sube y pasan las imágenes.
  interludio: z.boolean().default(false),
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
  // Música de fondo (ruta relativa al publicDir), ya normalizada de volumen. Se repite en bucle.
  musica: z.object({ ruta: z.string(), duracionSeg: z.number() }).nullable().default(null),
  // Cierre de los shorts: «ver video completo» con la miniatura del largo
  // (data URI PNG), el título y el canal. Solo lo usan los shorts.
  cierre: z
    .object({
      canalNombre: z.string(),
      canalUsuario: z.string(),
      miniatura: z.string().nullable(),
    })
    .nullable()
    .default(null),
  // Short: trozo del video largo que se dibuja en 9:16, con su título al
  // arrancar y un cierre de «ver video completo». Todo lo demás es lo mismo.
  ventana: z
    .object({
      inicioMs: z.number(),
      finMs: z.number(),
      titulo: z.string(),
      indice: z.number(),
      total: z.number(),
    })
    .nullable()
    .default(null),
});

export type PropsVideo = z.infer<typeof esquemaPropsVideo>;

export const FPS = 30;
export const COLA_FINAL_MS = 1500;
// Con música, el video respira al final: la música sube unos segundos y se apaga.
export const COLA_CON_MUSICA_MS = 4000;

export function duracionEnFrames(duracionMs: number, conMusica = false): number {
  return Math.ceil(((duracionMs + (conMusica ? COLA_CON_MUSICA_MS : COLA_FINAL_MS)) / 1000) * FPS);
}

// Sin portada: el short arranca con imagen y voz en el segundo cero; el título
// pasa como una banda encima (C-GANCHO-1).
export const INTRO_SHORT_MS = 0;
export const CIERRE_SHORT_MS = 5000;

export function duracionShortEnFrames(ventana: { inicioMs: number; finMs: number }): number {
  return Math.ceil(((INTRO_SHORT_MS + (ventana.finMs - ventana.inicioMs) + CIERRE_SHORT_MS) / 1000) * FPS);
}

/** Frames que dura un video con o sin ventana (lo usan las composiciones). */
export function framesDe(props: {
  duracionMs: number;
  musica?: unknown;
  ventana?: { inicioMs: number; finMs: number } | null;
}): number {
  return props.ventana
    ? duracionShortEnFrames(props.ventana)
    : duracionEnFrames(props.duracionMs, Boolean(props.musica));
}
