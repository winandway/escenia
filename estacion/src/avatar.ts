// Avatar guiado por audio (docs/AVATAR.md): una foto (de Richard o del muñeco Chase Montes) y
// un audio, y fal.ai devuelve el video hablando. Se usa la cola de fal (tarda de 2 a 6 minutos).
// Cada llamada pasa por el candado de modelos y de segundos de compartido/modelos.ts.
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { asegurarModeloAvatar, costoAvatarUsd, type ModeloAvatar } from "@compartido/modelos";
import { config } from "./config";

const exec = promisify(execFile);
const ESPERA_MAXIMA_MS = 30 * 60_000;
/** Cada pedido encolado se anota aquí (junto al clip) apenas fal.ai lo acepta: si la espera se corta,
 *  el pedido sigue en fal.ai y se cobra, así que se puede recoger después con avatar-recoger.ts. */
export const PEDIDOS_FAL = "pedidos-fal.jsonl";
export type PedidoFal = {
  request_id: string;
  status_url: string;
  response_url: string;
  salida: string;
  modelo: string;
  costoUsd: number;
  fecha: string;
};

export type ResultadoAvatar = { ruta: string; segundos: number; costoUsd: number; modelo: ModeloAvatar };

async function duracionSeg(ruta: string): Promise<number> {
  const { stdout } = await exec("ffprobe", [
    "-v",
    "error",
    "-show_entries",
    "format=duration",
    "-of",
    "csv=p=0",
    ruta,
  ]);
  return Number(stdout.trim());
}

const TIPOS: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".m4a": "audio/mp4",
  ".mp4": "video/mp4",
};

/**
 * Sube un archivo al almacén de fal.ai y devuelve su dirección pública. Los modelos de avatar no
 * aceptan datos en base64 en `audio_url` (OmniHuman respondió «Failed to download the file» el
 * 8 oct 2026), así que foto y audio van subidos primero, como hace el cliente oficial de fal.
 */
export async function subirAFal(ruta: string, falKey: string): Promise<string> {
  const tipo = TIPOS[path.extname(ruta).toLowerCase()];
  if (!tipo) throw new Error(`No sé mandar a fal.ai un archivo ${path.extname(ruta)}.`);
  const inicio = await fetch("https://rest.alpha.fal.ai/storage/upload/initiate?storage_type=fal-cdn-v3", {
    method: "POST",
    headers: { authorization: `Key ${falKey}`, "content-type": "application/json" },
    body: JSON.stringify({ content_type: tipo, file_name: path.basename(ruta) }),
  });
  if (!inicio.ok)
    throw new Error(
      `fal.ai respondió ${inicio.status} al preparar la subida: ${(await inicio.text()).slice(0, 200)}`,
    );
  const { upload_url, file_url } = (await inicio.json()) as { upload_url: string; file_url: string };
  const subida = await fetch(upload_url, {
    method: "PUT",
    headers: { "content-type": tipo },
    body: await readFile(ruta),
  });
  if (!subida.ok) throw new Error(`fal.ai respondió ${subida.status} al subir ${path.basename(ruta)}.`);
  return file_url;
}

/** Solo se habla con la cola de fal.ai: una dirección que no sea de ahí no se sigue. */
export function urlDeFal(direccion: string): string {
  const u = new URL(direccion);
  if (u.protocol !== "https:" || u.hostname !== "queue.fal.run")
    throw new Error(`fal.ai devolvió una dirección inesperada: ${u.hostname}`);
  return u.toString();
}

/** Lo que pide cada modelo (esquemas leídos en fal.ai el 8 oct 2026). */
export function cuerpoDelPedido(
  modelo: ModeloAvatar,
  imagenUrl: string,
  audioUrl: string,
  segundos: number,
  prompt?: string,
): Record<string, unknown> {
  const base = { image_url: imagenUrl, audio_url: audioUrl };
  switch (modelo) {
    case "fal-ai/flashtalk":
      return base; // solo foto y audio
    case "fal-ai/hunyuan-avatar":
      // 25 cuadros por segundo, tope del modelo 401 (16 s); `text` describe la escena.
      return {
        ...base,
        text: prompt ?? "A person is talking naturally to the camera.",
        num_frames: Math.min(401, Math.ceil(segundos * 25) + 1),
        turbo_mode: true,
      };
    default:
      return { ...base, ...(prompt ? { prompt } : {}) };
  }
}

/**
 * Genera el clip del avatar. `prompt` (opcional) guía la animación en Kling. El costo se calcula
 * con los segundos del audio: el video dura lo que dura el audio.
 */
export async function generarAvatar(entrada: {
  imagen: string;
  audio: string;
  modelo: string;
  salida: string;
  prompt?: string;
  avisar?: (texto: string) => void;
}): Promise<ResultadoAvatar> {
  if (!config.FAL_KEY) throw new Error("Falta FAL_KEY en estacion/.env: sin ella no hay avatar.");
  const modelo = asegurarModeloAvatar(entrada.modelo);
  if (!existsSync(entrada.imagen)) throw new Error(`No existe la foto ${entrada.imagen}.`);
  if (!existsSync(entrada.audio)) throw new Error(`No existe el audio ${entrada.audio}.`);
  const segundos = await duracionSeg(entrada.audio);
  const costoUsd = costoAvatarUsd(modelo, segundos);
  const avisar = entrada.avisar ?? (() => {});
  avisar(`avatar con ${modelo}: ${segundos.toFixed(1)} s de audio, $${costoUsd.toFixed(2)}`);

  const cabeceras = { authorization: `Key ${config.FAL_KEY}`, "content-type": "application/json" };
  const imagenUrl = await subirAFal(entrada.imagen, config.FAL_KEY);
  const audioUrl = await subirAFal(entrada.audio, config.FAL_KEY);
  const cuerpo = cuerpoDelPedido(modelo, imagenUrl, audioUrl, segundos, entrada.prompt);
  const envio = await fetch(`https://queue.fal.run/${modelo}`, {
    method: "POST",
    headers: cabeceras,
    body: JSON.stringify(cuerpo),
  });
  if (!envio.ok)
    throw new Error(
      `fal.ai respondió ${envio.status} al encolar el avatar: ${(await envio.text()).slice(0, 300)}`,
    );
  const cola = (await envio.json()) as { request_id: string; status_url: string; response_url: string };
  const pedido: PedidoFal = {
    ...cola,
    salida: entrada.salida,
    modelo,
    costoUsd,
    fecha: new Date().toISOString(),
  };
  await mkdir(path.dirname(entrada.salida), { recursive: true });
  await appendFile(path.join(path.dirname(entrada.salida), PEDIDOS_FAL), `${JSON.stringify(pedido)}\n`);
  avisar(`pedido ${cola.request_id} anotado en ${PEDIDOS_FAL}`);

  const inicio = Date.now();
  let ultimo = "";
  for (;;) {
    if (Date.now() - inicio > ESPERA_MAXIMA_MS)
      throw new Error(
        `fal.ai tardó más de 30 minutos con el avatar. El pedido ${cola.request_id} sigue allá y se cobra: recógelo con avatar-recoger.ts.`,
      );
    const est = await fetch(urlDeFal(cola.status_url), { headers: cabeceras });
    const estado = (await est.json()) as { status: string; queue_position?: number };
    const texto = `${estado.status}${estado.queue_position !== undefined ? ` (puesto ${estado.queue_position})` : ""}`;
    if (texto !== ultimo) {
      avisar(`fal.ai: ${texto}`);
      ultimo = texto;
    }
    if (estado.status === "COMPLETED") break;
    if (estado.status === "FAILED") throw new Error("fal.ai no pudo generar el avatar.");
    await new Promise((r) => setTimeout(r, 5000));
  }
  const res = await fetch(urlDeFal(cola.response_url), { headers: cabeceras });
  const salida = (await res.json()) as { video?: { url: string } };
  const url = salida.video?.url;
  if (!url)
    throw new Error(`fal.ai devolvió una respuesta sin video: ${JSON.stringify(salida).slice(0, 200)}`);
  const d = await fetch(url);
  if (!d.ok) throw new Error(`No se pudo bajar el video del avatar (${d.status}).`);
  await mkdir(path.dirname(entrada.salida), { recursive: true });
  await writeFile(entrada.salida, Buffer.from(await d.arrayBuffer()));
  return { ruta: entrada.salida, segundos, costoUsd, modelo };
}
