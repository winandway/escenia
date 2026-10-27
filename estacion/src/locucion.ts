// Locución sobre un video ya editado: cada párrafo con la voz elegida (la de Richard por defecto), cada
// uno en su sitio del video, una música suave debajo que baja sola cuando la voz habla, y el video
// tal cual (la imagen no se vuelve a codificar). También deja una versión liviana para WhatsApp.
// Uso (desde estacion/):
//   npx tsx src/locucion.ts ../encargos/<encargo>/plan.json            → el video con voz
//   npx tsx src/locucion.ts ../encargos/<encargo>/plan.json --muestra 1 → solo el párrafo 1, para medir
// Lo ya grabado (mismo texto, misma voz y mismos ajustes) no se vuelve a pagar. Guía: docs/LOCUCION.md.
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { asegurarModeloVoz, costoVozUsd } from "@compartido/modelos";
import { elegirIdDeVoz } from "@compartido/voces";
import { config } from "./config";
import {
  acomodarPartes,
  esquemaPlanLocucion,
  factorDeEstiramiento,
  type PlanLocucion,
} from "./locucion-plan";

const exec = promisify(execFile);
const huella = (dato: string) => createHash("sha1").update(dato).digest("hex").slice(0, 12);

async function duracionMs(ruta: string): Promise<number> {
  const { stdout } = await exec("ffprobe", [
    "-v",
    "error",
    "-show_entries",
    "format=duration",
    "-of",
    "csv=p=0",
    ruta,
  ]);
  return Math.round(Number(stdout.trim()) * 1000);
}

/** Un párrafo con la voz de ElevenLabs, con el texto de los vecinos para que la entonación siga. */
async function grabarParte(
  plan: PlanLocucion,
  i: number,
  dir: string,
): Promise<{ ruta: string; costoUsd: number }> {
  const modelo = asegurarModeloVoz(plan.modelo);
  const idVoz = elegirIdDeVoz(plan.voz, {
    richard: config.ELEVENLABS_VOICE_ID,
    femenina: config.ELEVENLABS_VOICE_ID_FEMENINA,
    venezolana: config.ELEVENLABS_VOICE_ID_VENEZOLANA,
  });
  const texto = plan.partes[i]?.texto ?? "";
  const cuerpo = {
    text: texto,
    model_id: modelo,
    voice_settings: {
      stability: plan.ajustes.estabilidad,
      similarity_boost: plan.ajustes.parecido,
      style: plan.ajustes.estilo,
      use_speaker_boost: true,
      speed: plan.ajustes.velocidad,
    },
    previous_text: plan.partes[i - 1]?.texto,
    next_text: plan.partes[i + 1]?.texto,
  };
  const ruta = path.join(dir, `${huella(JSON.stringify({ idVoz, ...cuerpo }))}.mp3`);
  if (existsSync(ruta)) return { ruta, costoUsd: 0 };
  if (!config.ELEVENLABS_API_KEY) throw new Error("Falta ELEVENLABS_API_KEY en estacion/.env.");
  const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${idVoz}?output_format=mp3_44100_192`, {
    method: "POST",
    headers: { "xi-api-key": config.ELEVENLABS_API_KEY, "content-type": "application/json" },
    body: JSON.stringify(cuerpo),
  });
  if (!r.ok) throw new Error(`ElevenLabs respondió ${r.status}: ${(await r.text()).slice(0, 300)}`);
  await writeFile(ruta, Buffer.from(await r.arrayBuffer()));
  return { ruta, costoUsd: costoVozUsd(modelo, texto.length) };
}

/**
 * La locución entera: la voz párrafo por párrafo (lo ya grabado no se paga otra vez), el video estirado
 * si hace falta, la mezcla con la música y la versión para WhatsApp. `carpeta` es donde vive el plan
 * (ahí queda el video y su carpeta «trabajo»). La usan la herramienta de la terminal y el Director.
 */
export async function armarLocucion(
  plan: PlanLocucion,
  carpeta: string,
  avisar: (texto: string) => unknown = (t) => console.log(`  ${t}`),
): Promise<{ salida: string; liviana: string; costoUsd: number; duracionMs: number }> {
  const trabajo = path.join(carpeta, "trabajo");
  const dir = path.join(trabajo, "partes");
  await mkdir(dir, { recursive: true });
  const original = path.resolve(carpeta, plan.video);
  const largoOriginalMs = await duracionMs(original);
  let costo = 0;
  const grabadas: { ruta: string; duracionMs: number; desdeMs?: number }[] = [];
  for (const [i, p] of plan.partes.entries()) {
    await avisar(`haciendo la voz: párrafo ${i + 1} de ${plan.partes.length}`);
    const g = await grabarParte(plan, i, dir);
    costo += g.costoUsd;
    grabadas.push({ ruta: g.ruta, duracionMs: await duracionMs(g.ruta), desdeMs: p.desde_ms });
  }
  // Si la voz con calma no cabe, el video se estira parejo (nunca se acelera la voz).
  const factor = plan.estirar_video
    ? factorDeEstiramiento(
        grabadas.map((g) => ({ duracionMs: g.duracionMs, desdeMs: g.desdeMs })),
        {
          largoMs: largoOriginalMs,
          inicioMs: plan.inicio_ms,
          margenFinalMs: plan.margen_final_ms,
          pausaIdealMs: plan.pausa_ideal_ms,
          maximo: plan.estirar_max,
        },
      )
    : 1;
  let video = original;
  if (factor > 1) {
    video = path.join(trabajo, `video-x${factor}.mp4`);
    if (!existsSync(video)) {
      await avisar(`estirando el video ×${factor} para que la voz quepa con calma`);
      await exec("ffmpeg", [
        "-y",
        "-v",
        "error",
        "-i",
        original,
        "-an",
        "-filter:v",
        `setpts=${factor}*PTS,minterpolate=fps=30:mi_mode=blend`,
        "-c:v",
        "libx264",
        "-preset",
        "medium",
        "-crf",
        "18",
        "-pix_fmt",
        "yuv420p",
        video,
      ]);
    }
  }
  const largoMs = await duracionMs(video);
  for (const g of grabadas) if (g.desdeMs !== undefined) g.desdeMs = Math.round(g.desdeMs * factor);
  const { inicios, sobraMs } = acomodarPartes(grabadas, {
    largoMs,
    inicioMs: plan.inicio_ms,
    margenFinalMs: plan.margen_final_ms,
    pausaMinMs: plan.pausa_min_ms,
    pausaMaxMs: plan.pausa_max_ms,
  });
  const habla = grabadas.reduce((s, g) => s + g.duracionMs, 0);
  console.log(
    `  la voz dura ${(habla / 1000).toFixed(1)} s en un video de ${(largoMs / 1000).toFixed(1)} s; sobran ${(sobraMs / 1000).toFixed(1)} s al final`,
  );
  if (sobraMs < 0)
    throw new Error(
      `La voz no cabe en el video: faltan ${(-sobraMs / 1000).toFixed(1)} s. Sube un poco la velocidad o acorta el texto.`,
    );
  await writeFile(
    path.join(trabajo, "locucion.json"),
    JSON.stringify(
      grabadas.map((g, i) => ({ parte: i + 1, inicioMs: inicios[i], duracionMs: g.duracionMs })),
      null,
      2,
    ),
  );
  // La voz entera: cada párrafo en su sitio.
  const voz = path.join(trabajo, "voz.wav");
  const filtros = grabadas.map((_, i) => `[${i}:a]adelay=${inicios[i]}|${inicios[i]}[p${i}]`).join(";");
  const juntar = grabadas.map((_, i) => `[p${i}]`).join("");
  await exec("ffmpeg", [
    "-y",
    "-v",
    "error",
    ...grabadas.flatMap((g) => ["-i", g.ruta]),
    "-filter_complex",
    `${filtros};${juntar}amix=inputs=${grabadas.length}:normalize=0,aformat=channel_layouts=stereo,apad,atrim=0:${largoMs / 1000}[v]`,
    "-map",
    "[v]",
    "-ar",
    "48000",
    voz,
  ]);
  // La música debajo: entra y sale con desvanecido, y baja sola cuando habla la voz.
  const segundos = largoMs / 1000;
  const mezcla = path.join(trabajo, "mezcla.m4a");
  const conMusica = plan.musica ? path.resolve(carpeta, plan.musica) : null;
  await exec("ffmpeg", [
    "-y",
    "-v",
    "error",
    "-i",
    voz,
    ...(conMusica ? ["-stream_loop", "-1", "-i", conMusica] : []),
    "-filter_complex",
    conMusica
      ? `[0:a]asplit=2[va][vb];[1:a]atrim=0:${segundos},asetpts=N/SR/TB,volume=${plan.musica_volumen},afade=t=in:d=1.5,afade=t=out:st=${Math.max(0, segundos - 3)}:d=3,aformat=channel_layouts=stereo,aresample=48000[m];` +
        `[m][va]sidechaincompress=threshold=0.03:ratio=5:attack=150:release=900[mb];` +
        `[vb][mb]amix=inputs=2:normalize=0,loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000[a]`
      : `[0:a]loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000[a]`,
    "-map",
    "[a]",
    "-c:a",
    "aac",
    "-b:a",
    "192k",
    mezcla,
  ]);
  // El video tal cual con el audio nuevo, y una versión liviana para mandar por WhatsApp.
  const salida = path.join(carpeta, plan.salida);
  await exec("ffmpeg", [
    "-y",
    "-v",
    "error",
    "-i",
    video,
    "-i",
    mezcla,
    "-map",
    "0:v:0",
    "-map",
    "1:a:0",
    "-c:v",
    "copy",
    "-c:a",
    "copy",
    "-t",
    String(segundos),
    "-movflags",
    "+faststart",
    salida,
  ]);
  const liviana = salida.replace(/\.mp4$/i, " (WhatsApp).mp4");
  await exec("ffmpeg", [
    "-y",
    "-v",
    "error",
    "-i",
    salida,
    "-vf",
    "scale=-2:720",
    "-c:v",
    "libx264",
    "-preset",
    "slow",
    "-b:v",
    "650k",
    "-maxrate",
    "900k",
    "-bufsize",
    "1300k",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    "-b:a",
    "112k",
    "-movflags",
    "+faststart",
    liviana,
  ]);
  return { salida, liviana, costoUsd: costo, duracionMs: largoMs };
}

async function principal() {
  const rutaPlan = process.argv[2];
  if (!rutaPlan) throw new Error("Uso: locucion.ts plan.json [--muestra N]");
  const carpeta = path.dirname(path.resolve(rutaPlan));
  const plan = esquemaPlanLocucion.parse(JSON.parse(await readFile(path.resolve(rutaPlan), "utf8")));
  const trabajo = path.join(carpeta, "trabajo");
  const dir = path.join(trabajo, "partes");
  await mkdir(dir, { recursive: true });
  const iMuestra = process.argv.indexOf("--muestra");
  if (iMuestra !== -1) {
    const i = Number(process.argv[iMuestra + 1] ?? "1") - 1;
    const { ruta, costoUsd } = await grabarParte(plan, i, dir);
    const ms = await duracionMs(ruta);
    const letras = plan.partes[i]?.texto.length ?? 0;
    console.log(
      `Muestra ${i + 1}: ${(ms / 1000).toFixed(1)} s · ${((letras * 1000) / ms).toFixed(1)} letras/s · $${costoUsd.toFixed(4)} → ${ruta}`,
    );
    return;
  }
  const r = await armarLocucion(plan, carpeta);
  console.log(`Listo: ${r.salida} (y su versión de WhatsApp) · voz nueva $${r.costoUsd.toFixed(4)}`);
}

if (process.argv[1] && /^locucion\.(ts|js|mjs)$/.test(path.basename(process.argv[1]))) {
  principal().catch((e: unknown) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
