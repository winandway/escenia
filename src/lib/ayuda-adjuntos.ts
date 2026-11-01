// Las capturas de los casos de ayuda (docs/AYUDA.md, C-AYUDA-2). La persona sube cada imagen sola (hasta 3 por
// mensaje, 10 MB cada una, JPG, PNG, WEBP o HEIC) y después manda el mensaje con sus números: si una subida
// falla, el texto no se pierde. El tipo se decide por los primeros bytes del archivo, no por lo que diga el
// navegador. Cada captura se ve con un enlace firmado de Escenia que vale 30 días.
import type { BaseDatos } from "./db";
import { b64url, desdeB64url, igualesSinFiltrarTiempo } from "./clave";

export const MAX_BYTES_ADJUNTO = 10 * 1_048_576;
export const MAX_ADJUNTOS_POR_MENSAJE = 3;
/** Capturas subidas y todavía sin mensaje, por caso (para que nadie llene el almacén sin escribir). */
const MAX_SUELTOS_POR_CASO = 12;
export const VIGENCIA_ENLACE_DIAS = 30;
const SITIO = "https://escenia.sitios.dev";

export type TipoAdjunto = "image/jpeg" | "image/png" | "image/webp" | "image/heic";
const EXTENSION: Record<TipoAdjunto, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
};

/** Lo mínimo del almacén que se usa (R2 en el sitio; un mapa en las pruebas). */
export type Almacen = {
  put(
    clave: string,
    cuerpo: ArrayBuffer,
    opciones?: { httpMetadata?: { contentType?: string } },
  ): Promise<unknown>;
};

/** El tipo real de la imagen por sus primeros bytes. Cualquier otra cosa (SVG, GIF, PDF, texto) no entra. */
export function tipoPorContenido(b: Uint8Array): TipoAdjunto | null {
  const ascii = (desde: number, largo: number) => String.fromCharCode(...b.subarray(desde, desde + largo));
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b[0] === 0x89 && ascii(1, 3) === "PNG") return "image/png";
  if (ascii(0, 4) === "RIFF" && ascii(8, 4) === "WEBP") return "image/webp";
  if (
    ascii(4, 4) === "ftyp" &&
    ["heic", "heix", "heim", "heis", "hevc", "hevx", "mif1", "msf1"].includes(ascii(8, 4))
  )
    return "image/heic";
  return null;
}

/** El nombre que se muestra: sin rutas ni caracteres raros, con la extensión del tipo real. */
export function nombreDeAdjunto(original: string, tipo: TipoAdjunto): string {
  const base =
    (original.split(/[\\/]/).pop() ?? "")
      .replace(/\.[a-z0-9]{1,5}$/i, "")
      .replace(/[^\p{L}\p{N} ._-]/gu, "")
      .trim()
      .slice(0, 80) || "captura";
  return `${base}.${EXTENSION[tipo]}`;
}

async function llaveDeFirma(secreto: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(`ayuda-adjuntos:${secreto}`),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
}

async function firma(secreto: string, id: number, vence: number): Promise<string> {
  const f = await crypto.subtle.sign(
    "HMAC",
    await llaveDeFirma(secreto),
    new TextEncoder().encode(`${id}.${vence}`),
  );
  return b64url(new Uint8Array(f));
}

/** El enlace firmado de una captura: vale VIGENCIA_ENLACE_DIAS desde que se pide la lista. */
export async function enlaceDeAdjunto(secreto: string, id: number, ahoraMs = Date.now()): Promise<string> {
  const vence = Math.floor(ahoraMs / 1000) + VIGENCIA_ENLACE_DIAS * 86_400;
  return `${SITIO}/datos/ayuda/adjuntos/${id}?v=${vence}&f=${await firma(secreto, id, vence)}`;
}

/** ¿El enlace es de verdad nuestro y sigue vigente? La firma se compara en tiempo constante. */
export async function enlaceValido(
  secreto: string,
  id: number,
  vence: number,
  recibida: string,
  ahoraMs = Date.now(),
): Promise<boolean> {
  if (!Number.isInteger(id) || id <= 0 || !Number.isInteger(vence) || vence * 1000 < ahoraMs) return false;
  if (!/^[A-Za-z0-9_-]{43}$/.test(recibida)) return false;
  return igualesSinFiltrarTiempo(desdeB64url(recibida), desdeB64url(await firma(secreto, id, vence)));
}

export type ResultadoSubida =
  | { ok: true; id: number; nombre: string; tipo: TipoAdjunto }
  | { ok: false; codigo: "vacio" | "grande" | "tipo" | "demasiados"; estado: number };

/** Guarda una captura del caso (todavía sin mensaje). El caso ya viene comprobado por su enlace. */
export async function guardarAdjunto(
  db: BaseDatos,
  almacen: Almacen,
  casoId: number,
  nombre: string,
  contenido: ArrayBuffer,
): Promise<ResultadoSubida> {
  const caso = { id: casoId };
  if (contenido.byteLength < 100) return { ok: false, codigo: "vacio", estado: 400 };
  if (contenido.byteLength > MAX_BYTES_ADJUNTO) return { ok: false, codigo: "grande", estado: 413 };
  const tipo = tipoPorContenido(new Uint8Array(contenido.slice(0, 16)));
  if (!tipo) return { ok: false, codigo: "tipo", estado: 415 };
  const sueltos = await db.uno<{ n: number }>(
    "SELECT COUNT(*) AS n FROM ayuda_adjuntos WHERE caso_id = ? AND mensaje_id IS NULL",
    [caso.id],
  );
  if ((sueltos?.n ?? 0) >= MAX_SUELTOS_POR_CASO) return { ok: false, codigo: "demasiados", estado: 429 };
  const clave = `ayuda/${caso.id}/${b64url(crypto.getRandomValues(new Uint8Array(16)))}.${EXTENSION[tipo]}`;
  await almacen.put(clave, contenido, { httpMetadata: { contentType: tipo } });
  const limpio = nombreDeAdjunto(nombre, tipo);
  const r = await db.ejecutar(
    "INSERT INTO ayuda_adjuntos (caso_id, clave, nombre, tipo, bytes) VALUES (?, ?, ?, ?, ?)",
    [caso.id, clave, limpio, tipo, contenido.byteLength],
  );
  return { ok: true, id: Number(r.ultimoId), nombre: limpio, tipo };
}

/** ¿Todas estas capturas son de este caso y siguen sin mensaje? (Si una no, no se manda nada.) */
export async function adjuntosLibres(db: BaseDatos, casoId: number, ids: number[]): Promise<boolean> {
  const unicos = [...new Set(ids)];
  if (unicos.length !== ids.length || unicos.length > MAX_ADJUNTOS_POR_MENSAJE) return false;
  if (!unicos.length) return true;
  const f = await db.uno<{ n: number }>(
    `SELECT COUNT(*) AS n FROM ayuda_adjuntos
      WHERE caso_id = ? AND mensaje_id IS NULL AND id IN (SELECT value FROM json_each(?))`,
    [casoId, JSON.stringify(unicos)],
  );
  return f?.n === unicos.length;
}

export async function pegarAdjuntos(db: BaseDatos, casoId: number, mensajeId: number, ids: number[]) {
  if (!ids.length) return;
  await db.ejecutar(
    `UPDATE ayuda_adjuntos SET mensaje_id = ?
      WHERE caso_id = ? AND mensaje_id IS NULL AND id IN (SELECT value FROM json_each(?))`,
    [mensajeId, casoId, JSON.stringify(ids)],
  );
}

export type AdjuntoPublico = { nombre: string; tipo: TipoAdjunto; url: string };

/** Las capturas de cada mensaje, con su enlace firmado. */
export async function adjuntosDeMensajes(
  db: BaseDatos,
  mensajeIds: number[],
  secreto: string,
): Promise<Map<number, AdjuntoPublico[]>> {
  const porMensaje = new Map<number, AdjuntoPublico[]>();
  if (!mensajeIds.length) return porMensaje;
  const filas = await db.todos<{ id: number; mensaje_id: number; nombre: string; tipo: TipoAdjunto }>(
    `SELECT id, mensaje_id, nombre, tipo FROM ayuda_adjuntos
      WHERE mensaje_id IN (SELECT value FROM json_each(?)) ORDER BY id`,
    [JSON.stringify(mensajeIds)],
  );
  for (const f of filas) {
    const lista = porMensaje.get(f.mensaje_id) ?? [];
    lista.push({ nombre: f.nombre, tipo: f.tipo, url: await enlaceDeAdjunto(secreto, f.id) });
    porMensaje.set(f.mensaje_id, lista);
  }
  return porMensaje;
}

/** La captura que pide un enlace ya comprobado. */
export const adjuntoPorId = (db: BaseDatos, id: number) =>
  db.uno<{ clave: string; nombre: string; tipo: TipoAdjunto }>(
    "SELECT clave, nombre, tipo FROM ayuda_adjuntos WHERE id = ?",
    [id],
  );
