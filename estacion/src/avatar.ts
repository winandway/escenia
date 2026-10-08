// Avatar guiado por audio (docs/AVATAR.md): una foto (de Richard o del muñeco Chase Montes) y
// un audio, y fal.ai devuelve el video hablando. Se usa la cola de fal (tarda de 2 a 6 minutos).
// Cada llamada pasa por el candado de modelos y de segundos de compartido/modelos.ts.
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { asegurarModeloAvatar, costoAvatarUsd, type ModeloAvatar } from "@compartido/modelos";
import { config } from "./config";

const exec = promisify(execFile);
const ESPERA_MAXIMA_MS = 15 * 60_000;

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
};

async function comoDataUri(ruta: string): Promise<string> {
  const tipo = TIPOS[path.extname(ruta).toLowerCase()];
  if (!tipo) throw new Error(`No sé mandar a fal.ai un archivo ${path.extname(ruta)}.`);
  return `data:${tipo};base64,${(await readFile(ruta)).toString("base64")}`;
}

/** Solo se habla con la cola de fal.ai: una dirección que no sea de ahí no se sigue. */
function urlDeFal(direccion: string): string {
  const u = new URL(direccion);
  if (u.protocol !== "https:" || u.hostname !== "queue.fal.run")
    throw new Error(`fal.ai devolvió una dirección inesperada: ${u.hostname}`);
  return u.toString();
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
  const cuerpo: Record<string, unknown> = {
    image_url: await comoDataUri(entrada.imagen),
    audio_url: await comoDataUri(entrada.audio),
    ...(entrada.prompt ? { prompt: entrada.prompt } : {}),
  };
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

  const inicio = Date.now();
  let ultimo = "";
  for (;;) {
    if (Date.now() - inicio > ESPERA_MAXIMA_MS)
      throw new Error("fal.ai tardó más de 15 minutos con el avatar.");
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
