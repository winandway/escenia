// Mejora la imagen de un clip de avatar (docs/AVATAR.md): FlashTalk sale a 448×768 y en pantalla
// completa se ve borroso; el mejorador de ByteDance en fal.ai lo lleva a 1080p con su modo para
// video hecho con IA (0,0072 $ por segundo). Se corre ANTES de la cámara.
// Uso (desde estacion/):
//   npx tsx src/avatar-mejorar.ts --clip x.mp4 --salida x-1080.mp4
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { appendFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { asegurarModeloMejorador, costoMejoradorUsd } from "@compartido/modelos";
import { PEDIDOS_FAL, subirAFal, urlDeFal } from "./avatar";
import { config } from "./config";

const exec = promisify(execFile);
const MODELO = "fal-ai/bytedance-upscaler/upscale/video";
const ESPERA_MAXIMA_MS = 30 * 60_000;

export async function mejorarClip(entrada: {
  clip: string;
  salida: string;
  avisar?: (t: string) => void;
}): Promise<{ ruta: string; costoUsd: number }> {
  if (!config.FAL_KEY) throw new Error("Falta FAL_KEY en estacion/.env.");
  if (!existsSync(entrada.clip)) throw new Error(`No existe el clip ${entrada.clip}.`);
  const modelo = asegurarModeloMejorador(MODELO);
  const { stdout } = await exec("ffprobe", [
    "-v",
    "error",
    "-show_entries",
    "format=duration",
    "-of",
    "csv=p=0",
    entrada.clip,
  ]);
  const costoUsd = costoMejoradorUsd(modelo, Number(stdout.trim()));
  const avisar = entrada.avisar ?? (() => {});
  avisar(`mejorando a 1080p con ${modelo}: $${costoUsd.toFixed(2)}`);
  const cabeceras = { authorization: `Key ${config.FAL_KEY}`, "content-type": "application/json" };
  const envio = await fetch(`https://queue.fal.run/${modelo}`, {
    method: "POST",
    headers: cabeceras,
    body: JSON.stringify({
      video_url: await subirAFal(entrada.clip, config.FAL_KEY),
      target_resolution: "1080p",
      enhancement_tier: "standard",
      enhancement_preset: "aigc",
      // "medium" = mejora fuerte: con "high" (la suave) casi no se notaba (8 oct 2026).
      fidelity: "medium",
      target_fps: 25,
    }),
  });
  if (!envio.ok)
    throw new Error(
      `fal.ai respondió ${envio.status} al encolar la mejora: ${(await envio.text()).slice(0, 300)}`,
    );
  const cola = (await envio.json()) as { request_id: string; status_url: string; response_url: string };
  await mkdir(path.dirname(entrada.salida), { recursive: true });
  await appendFile(
    path.join(path.dirname(entrada.salida), PEDIDOS_FAL),
    `${JSON.stringify({ ...cola, salida: entrada.salida, modelo, costoUsd, fecha: new Date().toISOString() })}\n`,
  );
  const inicio = Date.now();
  let ultimo = "";
  for (;;) {
    if (Date.now() - inicio > ESPERA_MAXIMA_MS)
      throw new Error(
        `fal.ai tardó más de 30 minutos. El pedido ${cola.request_id} sigue allá: recógelo con avatar-recoger.ts.`,
      );
    const estado = (await (await fetch(urlDeFal(cola.status_url), { headers: cabeceras })).json()) as {
      status: string;
    };
    if (estado.status !== ultimo) {
      avisar(`fal.ai: ${estado.status}`);
      ultimo = estado.status;
    }
    if (estado.status === "COMPLETED") break;
    if (estado.status === "FAILED") throw new Error("fal.ai no pudo mejorar el video.");
    await new Promise((r) => setTimeout(r, 5000));
  }
  const r = (await (await fetch(urlDeFal(cola.response_url), { headers: cabeceras })).json()) as {
    video?: { url: string };
  };
  if (!r.video?.url)
    throw new Error(`fal.ai devolvió una respuesta sin video: ${JSON.stringify(r).slice(0, 200)}`);
  const d = await fetch(r.video.url);
  if (!d.ok) throw new Error(`No se pudo bajar el video mejorado (${d.status}).`);
  const mejorado = `${entrada.salida}.sin-audio.mp4`;
  await writeFile(mejorado, Buffer.from(await d.arrayBuffer()));
  // El mejorador puede devolverlo sin sonido: se le vuelve a poner el audio del clip original.
  await exec("ffmpeg", [
    "-v",
    "error",
    "-y",
    "-i",
    mejorado,
    "-i",
    entrada.clip,
    "-map",
    "0:v",
    "-map",
    "1:a",
    "-c:v",
    "copy",
    "-c:a",
    "copy",
    "-shortest",
    entrada.salida,
  ]);
  await appendFile(
    path.join(path.dirname(entrada.salida), "gastos.txt"),
    `${new Date().toISOString()}\t${modelo}\t-\t$${costoUsd.toFixed(2)}\t${path.basename(entrada.salida)}\n`,
  );
  return { ruta: entrada.salida, costoUsd };
}

const opcion = (nombre: string): string | null => {
  const i = process.argv.indexOf(nombre);
  return i === -1 ? null : (process.argv[i + 1] ?? null);
};

if (process.argv[1] && path.basename(process.argv[1]).startsWith("avatar-mejorar")) {
  const clip = opcion("--clip");
  const salida = opcion("--salida");
  if (!clip || !salida) {
    console.error("Uso: avatar-mejorar.ts --clip x.mp4 --salida x-1080.mp4");
    process.exit(1);
  }
  mejorarClip({
    clip: path.resolve(clip),
    salida: path.resolve(salida),
    avisar: (t) => console.log(`  ${t}`),
  })
    .then((r) => console.log(`Listo: ${r.ruta} ($${r.costoUsd.toFixed(2)})`))
    .catch((e: unknown) => {
      console.error(e instanceof Error ? e.message : e);
      process.exit(1);
    });
}
