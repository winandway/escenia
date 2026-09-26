// Imágenes generadas con IA (fal.ai, cola oficial). Solo corre el modelo
// permitido en compartido/modelos.ts (~$0.03 por imagen); si falla, la escena
// se queda con clip de fondo: nunca se escala a un modelo caro.
// Sin FAL_KEY en estacion/.env, esta pieza está apagada.
import { existsSync } from "node:fs";
import { copyFile, link, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { asegurarModeloImagen, IMAGENES_PERMITIDAS, MODELO_IMAGEN_POR_DEFECTO } from "@compartido/modelos";
import { config } from "./config";

export type ImagenIA = { ruta: string; ancho: number; alto: number; credito: string; costoUsd: number };

const ESTILO_BASE =
  "editorial documentary illustration, painterly realism, soft film grain, natural light, no text, no captions, no watermark, no logos";

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
  opciones: { vertical?: boolean; blancoYNegro?: boolean } = {},
): Promise<ImagenIA | null> {
  if (!config.FAL_KEY) return null;
  const modelo = asegurarModeloImagen(MODELO_IMAGEN_POR_DEFECTO);
  const promptFinal = `${prompt.trim()}. ${opciones.blancoYNegro ? "black and white vintage photograph look, " : ""}${ESTILO_BASE}`;
  const tam = opciones.vertical ? { width: 1152, height: 2048 } : { width: 2048, height: 1152 };

  const carpeta = path.join(config.CARPETA_CLIPS, "ia");
  await mkdir(carpeta, { recursive: true });
  const nombre = `ia-${createHash("sha1").update(`${modelo}|${promptFinal}|${tam.width}x${tam.height}`).digest("hex").slice(0, 16)}.jpg`;
  const destino = path.join(carpeta, nombre);
  let costoUsd = 0;

  if (!existsSync(destino)) {
    const cabeceras = { authorization: `Key ${config.FAL_KEY}`, "content-type": "application/json" };
    const envio = await fetch(`https://queue.fal.run/${modelo}`, {
      method: "POST",
      headers: cabeceras,
      body: JSON.stringify({
        prompt: promptFinal,
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
    credito: `Imagen generada con IA (${modelo}) · contenido sintético`,
    costoUsd,
  };
}
