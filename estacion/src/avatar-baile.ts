// Chase copia los movimientos de un video (docs/AVATAR.md, «transferencia de movimiento»): una foto
// de Chase de cuerpo entero y un video de alguien bailando dan a Chase bailando igual (cuerpo, manos,
// cara y labios). Modelo: DreamActor v2 en fal.ai (0,05 $/s, hasta 30 s), con su candado en
// compartido/modelos.ts. Se le devuelve el sonido del video de referencia y se anota la escena
// (C-AVATAR-2: la misma foto no se repite).
// Uso (desde estacion/):
//   npx tsx src/avatar-baile.ts --imagen ../avatar/chase-montes/fotos/escena-x.png \
//       --video ../avatar/chase-montes/bailes/referencia.mp4 --salida ../avatar/chase-montes/bailes/chase-baile.mp4
import { execFile } from "node:child_process";
import { appendFile, mkdir, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import sharp from "sharp";
import { asegurarModeloTransferencia, costoTransferenciaUsd } from "@compartido/modelos";
import { PEDIDOS_FAL, subirAFal, urlDeFal } from "./avatar";
import { asegurarEscenaNueva, registrarEscena } from "./avatar-escena";
import { config } from "./config";

const exec = promisify(execFile);
const MODELO = "fal-ai/bytedance/dreamactor/v2";
const ESPERA_MAXIMA_MS = 30 * 60_000;

const opcion = (nombre: string): string | null => {
  const i = process.argv.indexOf(nombre);
  return i === -1 ? null : (process.argv[i + 1] ?? null);
};

async function principal() {
  const imagen = opcion("--imagen");
  const video = opcion("--video");
  const salida = opcion("--salida");
  if (!imagen || !video || !salida)
    throw new Error("Uso: avatar-baile.ts --imagen chase.png --video baile.mp4 --salida chase-baile.mp4");
  if (!config.FAL_KEY) throw new Error("Falta FAL_KEY en estacion/.env.");
  const rutaSalida = path.resolve(salida);
  const carpetaClips = path.dirname(rutaSalida);
  await mkdir(carpetaClips, { recursive: true });
  const huella = await asegurarEscenaNueva(path.resolve(imagen), carpetaClips);
  const modelo = asegurarModeloTransferencia(MODELO);

  // El modelo pide mp4 normal (H.264) y una foto de menos de 4,7 MB.
  const tmp = await mkdtemp(path.join(os.tmpdir(), "chase-baile-"));
  const videoMp4 = path.join(tmp, "referencia.mp4");
  await exec("ffmpeg", [
    "-v",
    "error",
    "-y",
    "-i",
    path.resolve(video),
    "-c:v",
    "libx264",
    "-crf",
    "18",
    "-preset",
    "fast",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    "-b:a",
    "160k",
    videoMp4,
  ]);
  const fotoJpg = path.join(tmp, "chase.jpg");
  await sharp(path.resolve(imagen)).flatten({ background: "#ffffff" }).jpeg({ quality: 90 }).toFile(fotoJpg);
  const { stdout } = await exec("ffprobe", [
    "-v",
    "error",
    "-show_entries",
    "format=duration",
    "-of",
    "csv=p=0",
    videoMp4,
  ]);
  const segundos = Number(stdout.trim());
  const costoUsd = costoTransferenciaUsd(modelo, segundos);
  console.log(`  ${modelo}: ${segundos.toFixed(1)} s de video, $${costoUsd.toFixed(2)}`);

  const cabeceras = { authorization: `Key ${config.FAL_KEY}`, "content-type": "application/json" };
  const envio = await fetch(`https://queue.fal.run/${modelo}`, {
    method: "POST",
    headers: cabeceras,
    body: JSON.stringify({
      image_url: await subirAFal(fotoJpg, config.FAL_KEY),
      video_url: await subirAFal(videoMp4, config.FAL_KEY),
      trim_first_second: true,
    }),
  });
  if (!envio.ok)
    throw new Error(`fal.ai respondió ${envio.status} al encolar: ${(await envio.text()).slice(0, 300)}`);
  const cola = (await envio.json()) as { request_id: string; status_url: string; response_url: string };
  await appendFile(
    path.join(carpetaClips, PEDIDOS_FAL),
    `${JSON.stringify({ ...cola, salida: rutaSalida, modelo, costoUsd, fecha: new Date().toISOString() })}\n`,
  );
  console.log(`  pedido ${cola.request_id} anotado`);
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
      console.log(`  fal.ai: ${estado.status}`);
      ultimo = estado.status;
    }
    if (estado.status === "COMPLETED") break;
    if (estado.status === "FAILED") throw new Error("fal.ai no pudo generar el baile.");
    await new Promise((r) => setTimeout(r, 5000));
  }
  const r = (await (await fetch(urlDeFal(cola.response_url), { headers: cabeceras })).json()) as {
    video?: { url: string };
  };
  if (!r.video?.url)
    throw new Error(`fal.ai devolvió una respuesta sin video: ${JSON.stringify(r).slice(0, 300)}`);
  const crudo = path.join(tmp, "crudo.mp4");
  await writeFile(crudo, Buffer.from(await (await fetch(r.video.url)).arrayBuffer()));
  // Se le pone el sonido del video de referencia (el modelo puede devolverlo mudo). Con
  // trim_first_second el modelo quita su segundo de transición, así que el audio arranca 1 s después.
  await exec("ffmpeg", [
    "-v",
    "error",
    "-y",
    "-i",
    crudo,
    "-ss",
    "1",
    "-i",
    videoMp4,
    "-map",
    "0:v",
    "-map",
    "1:a",
    "-c:v",
    "copy",
    "-c:a",
    "aac",
    "-b:a",
    "160k",
    "-shortest",
    rutaSalida,
  ]);
  await registrarEscena(huella, carpetaClips, path.basename(rutaSalida));
  await appendFile(
    path.join(carpetaClips, "gastos.txt"),
    `${new Date().toISOString()}\t${modelo}\t${segundos.toFixed(1)} s\t$${costoUsd.toFixed(2)}\t${path.basename(rutaSalida)}\n`,
  );
  console.log(`Listo: ${rutaSalida} ($${costoUsd.toFixed(2)})`);
}

principal().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
