// El Director (docs/DIRECTOR.md): lo que comparten el panel y la Estación de los trabajos con el video
// del cliente. La PRUEBA EN VIVO pasa su video entero, sin cortes, con cada frase de la voz en el segundo
// en que pasa lo que dice (como la del agua de Pro In Shop). La LOCUCIÓN le pone la voz a un video ya
// editado, con calma y un piano suave debajo (como la de los quince años). Los dos los aprueba Richard
// con el botón de la tarjeta (C-DIRECTOR-1) y los arma la Mac.
import { z } from "zod";
import { IDS_IDIOMA } from "./comerciales";
import { VOCES } from "./guion";
import { COSTO_AVATAR_POR_SEGUNDO } from "./publicidad";

export const ESTADOS_VIDEO_DIRECTOR = ["subiendo", "subido", "mirando", "listo", "error"] as const;
export type EstadoVideoDirector = (typeof ESTADOS_VIDEO_DIRECTOR)[number];
/** Un video de teléfono de un par de minutos pesa unos cientos de megas; 2 GB sobra. */
export const MAX_BYTES_VIDEO_DIRECTOR = 2 * 1024 * 1024 * 1024;

export const ESTADOS_TRABAJO_DIRECTOR = ["subida", "tomada", "lista", "error"] as const;
export type EstadoTrabajoDirector = (typeof ESTADOS_TRABAJO_DIRECTOR)[number];

/** Lo más largo que sale una prueba en vivo (el anuncio entero, con la tarjeta final). */
export const MAX_SEGUNDOS_DEMOSTRACION = 120;
/** La voz de los anuncios lee unas 12,5 letras por segundo; con eso se calcula si una frase cabe. */
export const LETRAS_POR_SEGUNDO = 12.5;
/** Lo más que la locución estira el video para que la voz quepa con calma (lo mismo que en la Mac). */
export const ESTIRAR_MAXIMO = 1.35;

export const segundosDeTexto = (texto: string) => texto.trim().length / LETRAS_POR_SEGUNDO;

export const esquemaDemostracion = z.object({
  tipo: z.literal("demostracion"),
  nombre: z.string().trim().min(3, "Ponle nombre (el cliente y el producto).").max(120),
  /** El número del video del cliente (el que subió en el chat). */
  video_id: z.number().int().positive(),
  /** Desde qué segundo del video arranca el anuncio, para saltar lo que sobra al principio. */
  desde_s: z.number().min(0).max(600).default(0),
  /** Cada frase de la voz con el segundo DEL VIDEO en que empieza, y lo que sale grande mientras. */
  partes: z
    .array(
      z.object({
        texto: z.string().trim().min(2).max(400),
        en_s: z.number().min(0).max(600),
        titulo: z.string().trim().max(40).default(""),
      }),
    )
    .min(4, "Hacen falta al menos cuatro frases: la entrada, dos de la prueba y el cierre.")
    .max(20),
  idioma: z.enum(IDS_IDIOMA),
  voz: z.enum(VOCES),
  /** La portada del primer cuadro (la miniatura de WhatsApp): una o dos líneas y una etiqueta. */
  portada: z.object({
    lineas: z.array(z.string().trim().min(1).max(26)).min(1).max(2),
    etiqueta: z.string().trim().max(24).default(""),
  }),
  /** Las carpetas de Imágenes de donde salen el logo, la persona y el producto del cierre. */
  carpetas: z.array(z.string().trim().min(1)).max(6).default([]),
  /** La persona que narra en un círculo abajo (su foto, de esas carpetas); vacío: sin persona. */
  avatar: z.string().trim().max(160).default(""),
  /** El sonido real del video (el chorro del agua), de 0 a 1; 0 = mudo. */
  sonido_video: z.number().min(0).max(1).default(0.8),
  /** La tarjeta final: de una a cuatro líneas cortas y, si hay, la foto del producto. */
  cierre: z.object({
    lineas: z.array(z.string().trim().min(1).max(32)).min(1).max(4),
    imagen: z.string().trim().max(160).default(""),
  }),
});
export type Demostracion = z.infer<typeof esquemaDemostracion>;

export const esquemaLocucion = z.object({
  tipo: z.literal("locucion"),
  nombre: z.string().trim().min(3, "Ponle nombre al video.").max(120),
  video_id: z.number().int().positive(),
  /** La de Richard por defecto: la locución es su voz sobre su video. */
  voz: z.enum(VOCES).default("richard"),
  idioma: z.enum(IDS_IDIOMA),
  /** Cada párrafo es una pieza de voz; `en_s`: no empieza antes de ese segundo del video. */
  partes: z
    .array(
      z.object({ texto: z.string().trim().min(1).max(1500), en_s: z.number().min(0).max(3600).optional() }),
    )
    .min(1)
    .max(40),
  musica: z.enum(["piano", "ninguna"]).default("piano"),
});
export type Locucion = z.infer<typeof esquemaLocucion>;

export type TrabajoConVideo = Demostracion | Locucion;

/** La voz: ElevenLabs cobra 10 centavos por cada mil letras. */
const costoDeVoz = (texto: string) => (texto.length / 1000) * 0.1;
const redondear = (usd: number) => Math.ceil(usd * 100) / 100;

export const textoDeDemostracion = (d: Pick<Demostracion, "partes">) =>
  d.partes.map((p) => p.texto).join(" ");

/** Lo que cuesta ANTES de gastar: la voz y, si va, la persona que habla toda la voz (con margen). */
export function costoDemostracionUsd(d: Pick<Demostracion, "partes" | "avatar">): number {
  const texto = textoDeDemostracion(d);
  const persona = d.avatar ? segundosDeTexto(texto) * COSTO_AVATAR_POR_SEGUNDO : 0;
  return redondear(costoDeVoz(texto) + persona + 0.02);
}

export function costoLocucionUsd(d: Pick<Locucion, "partes">): number {
  return redondear(costoDeVoz(d.partes.map((p) => p.texto).join(" ")) + 0.01);
}

const reloj = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

/**
 * ¿La prueba en vivo calza con su video? Las frases van en orden, dentro del video, y cada una alcanza
 * a decirse antes de que empiece la siguiente (si no, la voz se corre y deja de ir donde pasa cada cosa).
 * Devuelve el problema en palabras, para que la IA lo corrija, o null si calza.
 */
export function problemaDeDemostracion(d: Demostracion, duracionVideoS: number): string | null {
  const { partes } = d;
  if (d.desde_s >= duracionVideoS - 3)
    return `El video dura ${reloj(duracionVideoS)}: «desde_s» queda al final.`;
  for (const [i, p] of partes.entries()) {
    if (p.en_s < d.desde_s) return `La frase ${i + 1} empieza antes de «desde_s» (${reloj(d.desde_s)}).`;
    if (p.en_s > duracionVideoS)
      return `La frase ${i + 1} empieza en ${reloj(p.en_s)}, pero el video dura ${reloj(duracionVideoS)}.`;
    const siguiente = partes[i + 1];
    if (siguiente && siguiente.en_s <= p.en_s)
      return `Las frases ${i + 1} y ${i + 2} no van en orden de tiempo.`;
    const dura = segundosDeTexto(p.texto);
    if (siguiente && p.en_s + dura > siguiente.en_s + 1.5)
      return `La frase ${i + 1} dura unos ${Math.round(dura)} s y no alcanza a decirse antes de la ${i + 2} (en ${reloj(siguiente.en_s)}): acórtala o muévela.`;
  }
  const ultima = partes[partes.length - 1];
  const fin = ultima ? ultima.en_s - d.desde_s + segundosDeTexto(ultima.texto) + 3 : 0;
  if (fin > MAX_SEGUNDOS_DEMOSTRACION)
    return `Saldría de unos ${Math.round(fin)} s; el tope es ${MAX_SEGUNDOS_DEMOSTRACION}. Recorta con «desde_s» o acorta el texto.`;
  return null;
}

/**
 * ¿La locución cabe en el video? La voz con calma (una pausa de un segundo entre párrafos, uno al
 * empezar y uno y medio al final) tiene que caber, estirando el video como mucho un 35 %.
 */
export function problemaDeLocucion(d: Locucion, duracionVideoS: number): string | null {
  const habla = d.partes.reduce((s, p) => s + segundosDeTexto(p.texto), 0);
  const necesita = 1 + habla + Math.max(0, d.partes.length - 1) * 1 + 1.5;
  const cabe = duracionVideoS * ESTIRAR_MAXIMO;
  if (necesita > cabe)
    return `La voz necesita unos ${Math.round(necesita)} s y el video (${reloj(duracionVideoS)}) da como mucho ${Math.round(cabe)} s estirándolo: acorta el texto unas ${Math.ceil(((necesita - cabe) * LETRAS_POR_SEGUNDO) / 6)} palabras.`;
  for (const [i, p] of d.partes.entries())
    if (p.en_s !== undefined && p.en_s > duracionVideoS)
      return `El párrafo ${i + 1} empieza en ${reloj(p.en_s)}, pero el video dura ${reloj(duracionVideoS)}.`;
  return null;
}

/** Las palabras de una frase que sirven para encontrarla en la voz (sin signos sueltos). */
export const palabrasUtiles = (texto: string) =>
  texto
    .replace(/[¿¡]/g, "")
    .split(/\s+/)
    .filter((p) => /[\p{L}\p{N}]/u.test(p));

/** Unas palabras seguidas de una frase, desde la número `desde` (la usa la Mac para el plan). */
export const palabrasDe = (texto: string, desde = 0, n = 3) =>
  palabrasUtiles(texto)
    .slice(desde, desde + n)
    .join(" ");

export const primerasPalabras = (texto: string, n = 3) => palabrasDe(texto, 0, n);
