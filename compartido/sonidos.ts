// Biblioteca de sonidos (C-SONIDOS-1): la música y los efectos que Richard sube
// desde el panel para usarlos en sus videos, una y otra vez. Aquí está lo que
// comparten el panel (que los recibe) y la Estación (que los baja y los usa).
import { z } from "zod";

export const TIPOS_SONIDO = ["musica", "efecto"] as const;
export type TipoSonido = (typeof TIPOS_SONIDO)[number];

/** El género es la palabra con la que la Estación elige la pista para cada video. */
export const GENEROS = [
  { id: "bachata", nombre: "Bachata" },
  { id: "salsa", nombre: "Salsa" },
  { id: "merengue", nombre: "Merengue" },
  { id: "cumbia", nombre: "Cumbia" },
  { id: "vallenato", nombre: "Vallenato" },
  { id: "reggaeton", nombre: "Reguetón" },
  { id: "regional", nombre: "Regional mexicano" },
  { id: "bolero", nombre: "Bolero" },
  { id: "balada", nombre: "Balada o pop" },
  { id: "beat", nombre: "Ritmo con bombo y bajo" },
  { id: "electronic", nombre: "Electrónica" },
  { id: "neutral", nombre: "Neutra (sirve para cualquier video)" },
] as const;
export const IDS_GENERO = GENEROS.map((g) => g.id) as [string, ...string[]];

/**
 * Para qué sirve un efecto. Cada uso tiene su lugar en el video; `archivo` es
 * el nombre con el que la plantilla lo busca (los que llevan número se turnan).
 */
export const USOS_EFECTO = [
  { id: "corte", nombre: "Cambio de imagen (chasquido, soplido corto)", archivo: "corte", varios: true },
  {
    id: "transicion",
    nombre: "Paso de una escena a otra (barrido, whoosh)",
    archivo: "whoosh",
    varios: true,
  },
  { id: "golpe", nombre: "Golpe de un titular o una cifra", archivo: "boom", varios: false },
  { id: "titulo", nombre: "Subida cuando arranca el video", archivo: "riser", varios: false },
  { id: "cierre", nombre: "Campana del cierre", archivo: "ding", varios: false },
] as const;
export const IDS_USO = USOS_EFECTO.map((u) => u.id) as [string, ...string[]];

/** De dónde salió el sonido. No hay opción para canciones comerciales: YouTube las detecta. */
export const ORIGENES = [
  { id: "propia", nombre: "La hice yo o la generé con IA (Suno u otra)" },
  { id: "licencia", nombre: "La compré con licencia para usarla en videos" },
  { id: "libre", nombre: "Es de una biblioteca libre de derechos" },
] as const;
export const IDS_ORIGEN = ORIGENES.map((o) => o.id) as [string, ...string[]];

export const EXTENSIONES_SONIDO = ["mp3", "m4a", "wav", "ogg", "aac"] as const;
export const TIPO_DE_CONTENIDO: Record<(typeof EXTENSIONES_SONIDO)[number], string> = {
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  wav: "audio/wav",
  ogg: "audio/ogg",
  aac: "audio/aac",
};
export const MAX_BYTES_SONIDO = 30 * 1024 * 1024;

export const esquemaSonidoNuevo = z
  .object({
    tipo: z.enum(TIPOS_SONIDO),
    nombre: z.string().trim().min(2, "Ponle un nombre al sonido.").max(80),
    genero: z.union([z.literal(""), z.enum(IDS_GENERO)]).default(""),
    uso: z.union([z.literal(""), z.enum(IDS_USO)]).default(""),
    origen: z.enum(IDS_ORIGEN, { message: "Dinos de dónde salió el sonido." }),
    extension: z.enum(EXTENSIONES_SONIDO, { message: "Sube un archivo de audio: MP3, M4A, WAV, OGG o AAC." }),
  })
  .superRefine((d, ctx) => {
    if (d.tipo === "musica" && !d.genero)
      ctx.addIssue({ code: "custom", path: ["genero"], message: "Elige el género de la música." });
    if (d.tipo === "efecto" && !d.uso)
      ctx.addIssue({ code: "custom", path: ["uso"], message: "Elige para qué se usa el efecto." });
  });
export type SonidoNuevo = z.infer<typeof esquemaSonidoNuevo>;

/** La extensión de un nombre de archivo, si es de audio. */
export function extensionDe(nombreArchivo: string): string {
  return /\.([a-z0-9]{2,4})$/i.exec(nombreArchivo.trim())?.[1]?.toLowerCase() ?? "";
}

function palabras(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/**
 * El nombre con que la Estación guarda el sonido en la Mac. En la música, el
 * nombre ES la ficha («bachata-romantica-guitarra-p7.mp3»): con esas palabras
 * se elige la pista. En los efectos, es el nombre que busca la plantilla.
 */
export function archivoDeSonido(s: {
  id: number;
  tipo: TipoSonido;
  nombre: string;
  genero: string;
  uso: string;
  extension: string;
}): string {
  if (s.tipo === "musica") {
    const base = [s.genero, palabras(s.nombre)].filter(Boolean).join("-");
    return `${base}-p${s.id}.${s.extension}`;
  }
  const uso = USOS_EFECTO.find((u) => u.id === s.uso) ?? USOS_EFECTO[0];
  // Los efectos se guardan siempre en MP3 (la Estación los convierte al bajarlos).
  return uso.varios ? `${uso.archivo}-p${s.id}.mp3` : `${uso.archivo}.mp3`;
}
