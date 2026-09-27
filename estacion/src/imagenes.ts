// Imágenes generadas con IA (fal.ai, cola oficial). Solo corre el modelo
// permitido en compartido/modelos.ts (~$0.03 por imagen); si falla, la escena
// se queda con clip de fondo: nunca se escala a un modelo caro.
// Sin FAL_KEY en estacion/.env, esta pieza está apagada.
import { existsSync } from "node:fs";
import { copyFile, link, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import {
  asegurarModeloImagen,
  IMAGENES_PERMITIDAS,
  MODELO_IMAGEN_CON_REFERENCIA,
  MODELO_IMAGEN_POR_DEFECTO,
} from "@compartido/modelos";
import { config } from "./config";

const exec = promisify(execFile);

export type ImagenIA = { ruta: string; ancho: number; alto: number; credito: string; costoUsd: number };

// Fotografía realista, no ilustración: Richard vio las «pinturas» y parecían
// caricaturas (26 sep 2026). Candado C-IMAGEN-2.
const ESTILO_BASE =
  "photorealistic documentary photograph, natural skin texture, cinematic lighting, subtle film grain, no text, no captions, no watermark, no logos";
// Con foto de referencia: se le exige al modelo conservar la cara de la persona real.
const CON_REFERENCIA =
  "Keep the exact same face, skin tone, features and identity of the person in the reference image. ";

/** Referencia reducida a 1280 px y en base64 (fal no puede bajar de Wikimedia directamente). */
async function referenciaEnBase64(ruta: string): Promise<{ dataUri: string; huella: string }> {
  const carpeta = path.join(config.CARPETA_CLIPS, "ia", "referencias");
  await mkdir(carpeta, { recursive: true });
  const huella = createHash("sha1")
    .update(await readFile(ruta))
    .digest("hex")
    .slice(0, 16);
  const reducida = path.join(carpeta, `${huella}.jpg`);
  if (!existsSync(reducida)) {
    await exec("sips", ["-s", "format", "jpeg", "-Z", "1280", ruta, "--out", reducida]);
  }
  return { dataUri: `data:image/jpeg;base64,${(await readFile(reducida)).toString("base64")}`, huella };
}

/** Solo se manda la clave a direcciones de fal.ai por https; a cualquier otra, nunca. */
function urlDeFal(direccion: string): string {
  const u = new URL(direccion);
  if (u.protocol !== "https:" || u.hostname !== "queue.fal.run") {
    throw new Error(`fal.ai devolvió una dirección inesperada (${u.hostname}); no se envía la clave.`);
  }
  return u.toString();
}

export function imagenesActivas(): boolean {
  return Boolean(config.FAL_KEY);
}

export async function generarImagen(
  prompt: string,
  carpetaPublica: string,
  opciones: { vertical?: boolean; blancoYNegro?: boolean; referencia?: string } = {},
): Promise<ImagenIA | null> {
  if (!config.FAL_KEY) return null;
  const referencia = opciones.referencia ? await referenciaEnBase64(opciones.referencia) : null;
  const modelo = asegurarModeloImagen(referencia ? MODELO_IMAGEN_CON_REFERENCIA : MODELO_IMAGEN_POR_DEFECTO);
  const promptFinal = `${referencia ? CON_REFERENCIA : ""}${prompt.trim()}. ${opciones.blancoYNegro ? "black and white vintage photograph look, " : ""}${ESTILO_BASE}`;
  const tam = opciones.vertical ? { width: 1152, height: 2048 } : { width: 2048, height: 1152 };

  const carpeta = path.join(config.CARPETA_CLIPS, "ia");
  await mkdir(carpeta, { recursive: true });
  const nombre = `ia-${createHash("sha1")
    .update(`${modelo}|${promptFinal}|${tam.width}x${tam.height}|${referencia?.huella ?? ""}`)
    .digest("hex")
    .slice(0, 16)}.jpg`;
  const destino = path.join(carpeta, nombre);
  let costoUsd = 0;

  if (!existsSync(destino)) {
    const cabeceras = { authorization: `Key ${config.FAL_KEY}`, "content-type": "application/json" };
    const envio = await fetch(`https://queue.fal.run/${modelo}`, {
      method: "POST",
      headers: cabeceras,
      body: JSON.stringify({
        prompt: promptFinal,
        ...(referencia ? { image_urls: [referencia.dataUri] } : {}),
        image_size: tam,
        num_images: 1,
        enable_safety_checker: true,
      }),
    });
    if (!envio.ok)
      throw new Error(`fal.ai respondió ${envio.status} al encolar: ${(await envio.text()).slice(0, 200)}`);
    // fal devuelve las direcciones exactas de estado y resultado (no cuelgan del id del modelo).
    const cola = (await envio.json()) as { request_id: string; status_url: string; response_url: string };

    // Espera hasta 90 s a que termine.
    const inicio = Date.now();
    let listo = false;
    while (Date.now() - inicio < 90_000) {
      const est = await fetch(urlDeFal(cola.status_url), { headers: cabeceras });
      const estado = (await est.json()) as { status: string };
      if (estado.status === "COMPLETED") {
        listo = true;
        break;
      }
      if (estado.status === "FAILED") throw new Error("fal.ai no pudo generar la imagen.");
      await new Promise((r) => setTimeout(r, 2000));
    }
    if (!listo) throw new Error("fal.ai tardó demasiado en generar la imagen.");

    const res = await fetch(urlDeFal(cola.response_url), { headers: cabeceras });
    const salida = (await res.json()) as { images?: { url: string; width?: number; height?: number }[] };
    const url = salida.images?.[0]?.url;
    if (!url) throw new Error("fal.ai devolvió una respuesta sin imagen.");
    const d = await fetch(url);
    if (!d.ok) throw new Error(`No se pudo bajar la imagen generada (${d.status}).`);
    await writeFile(destino, Buffer.from(await d.arrayBuffer()));
    costoUsd = IMAGENES_PERMITIDAS[modelo];
  }

  await mkdir(path.join(carpetaPublica, "ia"), { recursive: true });
  await link(destino, path.join(carpetaPublica, "ia", nombre)).catch(() =>
    copyFile(destino, path.join(carpetaPublica, "ia", nombre)),
  );
  return {
    ruta: `ia/${nombre}`,
    ancho: tam.width,
    alto: tam.height,
    credito: referencia
      ? `Imagen generada con IA (${modelo}) a partir de una foto libre de la persona · contenido sintético`
      : `Imagen generada con IA (${modelo}) · contenido sintético`,
    costoUsd,
  };
}
