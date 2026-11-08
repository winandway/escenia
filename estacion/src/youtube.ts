// Fase 3 (C-YOUTUBE-1, docs/YOUTUBE.md): la Mac sube el video a YouTube EN PRIVADO, con su título,
// descripción (enlaces con UTM), palabras clave, la marca de contenido sintético y su miniatura, y
// lee las métricas de los videos ya subidos. Nada se publica solo: Richard lo hace público (o lo
// programa) en YouTube Studio, que es su revisión final.
//
// La llave vive en la Mac, fuera de git: ~/.config/motor-escenia/youtube.json (carpeta 700, archivo
// 600) con { client_id, client_secret, refresh_token }. La crea `autorizar-youtube.ts` una sola vez.
import { createReadStream } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { z } from "zod";
import { textoConUtm, type MarcaUtm } from "@compartido/utm";

export const RUTA_LLAVE = path.join(os.homedir(), ".config", "motor-escenia", "youtube.json");
/** Solo subir y leer los propios videos: nada de borrar ni de tocar otros canales. */
export const PERMISOS_YOUTUBE = [
  "https://www.googleapis.com/auth/youtube.upload",
  "https://www.googleapis.com/auth/youtube.readonly",
] as const;

export const esquemaLlave = z.object({
  client_id: z.string().min(10),
  client_secret: z.string().min(5),
  refresh_token: z.string().min(10).optional(),
});
export type LlaveYouTube = z.infer<typeof esquemaLlave>;

type Fetch = typeof fetch;

export async function leerLlave(ruta = RUTA_LLAVE): Promise<LlaveYouTube> {
  let crudo: string;
  try {
    crudo = await readFile(ruta, "utf8");
  } catch {
    throw new Error(
      "Falta la llave de YouTube en la Mac (~/.config/motor-escenia/youtube.json). Ver docs/YOUTUBE.md.",
    );
  }
  return esquemaLlave.parse(JSON.parse(crudo));
}

/** Un permiso de una hora a partir del permiso largo (refresh token). */
export async function tokenDeAcceso(llave: LlaveYouTube, f: Fetch = fetch): Promise<string> {
  if (!llave.refresh_token)
    throw new Error("La llave de YouTube no tiene el permiso de la cuenta: corre autorizar-youtube.ts.");
  const r = await f("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: llave.client_id,
      client_secret: llave.client_secret,
      refresh_token: llave.refresh_token,
      grant_type: "refresh_token",
    }),
  });
  const datos = (await r.json().catch(() => ({}))) as { access_token?: string; error?: string };
  if (!r.ok || !datos.access_token)
    throw new Error(
      datos.error === "invalid_grant"
        ? "Google ya no acepta el permiso de YouTube (se venció o se quitó): corre autorizar-youtube.ts otra vez."
        : `Google no dio permiso para YouTube (${r.status} ${datos.error ?? ""}).`,
    );
  return datos.access_token;
}

export type PiezaParaSubir = {
  titulo: string;
  descripcion: string;
  etiquetas: string[];
  idioma: "es" | "en";
  /** 28 = Ciencia y tecnología (Full Código), 10 = Música (Caprichoso TV), 22 = Personas y blogs. */
  categoria: "28" | "10" | "22";
  utm: MarcaUtm;
  /** Imágenes o voz hechas con IA: YouTube pide declararlo. En Escenia es casi siempre sí. */
  sintetico: boolean;
};

/** Lo que se le manda a YouTube con el video. SIEMPRE privado: el candado C-YOUTUBE-1. */
export function metadatosDeSubida(p: PiezaParaSubir) {
  return {
    snippet: {
      // YouTube corta a 100 letras y no admite «<» ni «>» en título ni descripción.
      title: p.titulo.replace(/[<>]/g, "").slice(0, 100),
      description: textoConUtm(p.descripcion, p.utm).replace(/[<>]/g, "").slice(0, 5000),
      tags: recortarEtiquetas(p.etiquetas),
      categoryId: p.categoria,
      defaultLanguage: p.idioma,
      defaultAudioLanguage: p.idioma,
    },
    status: {
      privacyStatus: "private" as const,
      selfDeclaredMadeForKids: false,
      containsSyntheticMedia: p.sintetico,
    },
  };
}

/** YouTube admite hasta 500 letras de etiquetas en total (cada una con espacio cuenta con comillas). */
export function recortarEtiquetas(etiquetas: string[], limite = 500): string[] {
  const salida: string[] = [];
  let total = 0;
  for (const e of etiquetas.map((x) => x.replace(/[<>,]/g, "").trim()).filter(Boolean)) {
    const largo = e.length + (e.includes(" ") ? 2 : 0) + (salida.length ? 1 : 0);
    if (total + largo > limite) break;
    salida.push(e);
    total += largo;
  }
  return salida;
}

/** Sube un MP4 con subida reanudable de Google y devuelve el id del video. */
export async function subirVideo(
  token: string,
  rutaMp4: string,
  pieza: PiezaParaSubir,
  f: Fetch = fetch,
): Promise<string> {
  const metadatos = metadatosDeSubida(pieza);
  if (metadatos.status.privacyStatus !== "private") throw new Error("C-YOUTUBE-1: solo se sube en privado.");
  const { size } = await stat(rutaMp4);
  const inicio = await f(
    "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json; charset=UTF-8",
        "x-upload-content-type": "video/mp4",
        "x-upload-content-length": String(size),
      },
      body: JSON.stringify(metadatos),
    },
  );
  const destino = inicio.headers.get("location");
  if (!inicio.ok || !destino)
    throw new Error(`YouTube no aceptó la subida (${inicio.status}): ${await textoDeError(inicio)}`);
  const cuerpo = Readable.toWeb(createReadStream(rutaMp4)) as ReadableStream<Uint8Array>;
  const r = await f(destino, {
    method: "PUT",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "video/mp4",
      "content-length": String(size),
    },
    body: cuerpo,
    // Node exige decirlo para mandar un cuerpo que se va leyendo del disco.
    duplex: "half",
  } as RequestInit);
  const datos = (await r.json().catch(() => ({}))) as { id?: string };
  if (!r.ok || !datos.id) throw new Error(`La subida a YouTube no terminó (${r.status}).`);
  return datos.id;
}

export async function ponerMiniatura(token: string, videoId: string, rutaPng: string, f: Fetch = fetch) {
  const imagen = await readFile(rutaPng);
  const r = await f(
    `https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=${encodeURIComponent(videoId)}`,
    {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "image/png" },
      body: imagen,
    },
  );
  if (!r.ok) throw new Error(`YouTube no aceptó la miniatura (${r.status}): ${await textoDeError(r)}`);
}

export type Metricas = {
  id: string;
  titulo: string;
  privacidad: string;
  vistas: number;
  meGusta: number;
  comentarios: number;
};

/** Las cifras de hasta 50 videos por consulta (cuesta 1 unidad de cuota, no escribe nada en la base). */
export async function metricasDe(token: string, ids: string[], f: Fetch = fetch): Promise<Metricas[]> {
  const salida: Metricas[] = [];
  for (let i = 0; i < ids.length; i += 50) {
    const lote = ids.slice(i, i + 50);
    const r = await f(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,status&id=${lote.map(encodeURIComponent).join(",")}`,
      { headers: { authorization: `Bearer ${token}` } },
    );
    if (!r.ok) throw new Error(`YouTube no dio las métricas (${r.status}): ${await textoDeError(r)}`);
    const datos = (await r.json()) as {
      items?: {
        id: string;
        snippet?: { title?: string };
        status?: { privacyStatus?: string };
        statistics?: { viewCount?: string; likeCount?: string; commentCount?: string };
      }[];
    };
    for (const v of datos.items ?? [])
      salida.push({
        id: v.id,
        titulo: v.snippet?.title ?? "",
        privacidad: v.status?.privacyStatus ?? "",
        vistas: Number(v.statistics?.viewCount ?? 0),
        meGusta: Number(v.statistics?.likeCount ?? 0),
        comentarios: Number(v.statistics?.commentCount ?? 0),
      });
  }
  return salida;
}

/** De un enlace de YouTube (largo, corto o Short) al id del video; null si no es uno. */
export function idDeEnlace(enlace: string): string | null {
  const m = /(?:youtu\.be\/|[?&]v=|\/shorts\/|\/live\/)([A-Za-z0-9_-]{11})/.exec(enlace);
  return m?.[1] ?? null;
}

async function textoDeError(r: Response): Promise<string> {
  const t = await r.text().catch(() => "");
  try {
    const j = JSON.parse(t) as { error?: { message?: string } };
    return j.error?.message ?? t.slice(0, 200);
  } catch {
    return t.slice(0, 200);
  }
}

export type DatosDePieza = {
  guionId: number;
  tematicaId: string;
  canal: "canal-ia" | "caprichoso-tv" | null;
  publicacion: {
    titulo: string;
    descripcion: string;
    etiquetas: string[];
    shorts: { indice: number; titulo: string }[];
  };
  pieza: { tipo: "largo" | "short"; indice: number };
};

/**
 * Lo que se sube de una pieza (el largo o un Short) con los textos que ya escribió el panel. Un comercial
 * es del cliente: NO va a nuestros canales. Sin canal, tampoco.
 */
export function piezaParaSubir(d: DatosDePieza): PiezaParaSubir {
  if (d.tematicaId === "comercial")
    throw new Error("Un comercial es del cliente: no se sube a nuestros canales.");
  if (!d.canal) throw new Error("Esa temática no tiene canal de YouTube.");
  const corto = d.pieza.tipo === "short";
  const short = corto ? d.publicacion.shorts.find((s) => s.indice === d.pieza.indice) : null;
  if (corto && !short) throw new Error(`El panel no tiene el título del Short ${d.pieza.indice}.`);
  const titulo = short ? short.titulo : d.publicacion.titulo;
  return {
    // A un Short se le agrega #Shorts si cabe: así YouTube lo pone en la fila de Shorts.
    titulo: short && !/#shorts/i.test(titulo) && titulo.length <= 92 ? `${titulo} #Shorts` : titulo,
    descripcion: d.publicacion.descripcion,
    etiquetas: d.publicacion.etiquetas,
    idioma: "es",
    categoria: d.canal === "canal-ia" ? "28" : "10",
    utm: { campana: `escenia-g${d.guionId}`, contenido: corto ? `short-${d.pieza.indice}` : "largo" },
    sintetico: true,
  };
}

/** «largo», «short-2» → la pieza. */
export function leerPieza(texto: string): { tipo: "largo" | "short"; indice: number } {
  if (texto === "largo") return { tipo: "largo", indice: 0 };
  const m = /^short-(\d{1,2})$/.exec(texto);
  if (m) return { tipo: "short", indice: Number(m[1]) };
  throw new Error(`Pieza desconocida «${texto}»: usa «largo» o «short-1», «short-2»…`);
}
