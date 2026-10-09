// Movimiento de cámara para los clips de Chase (docs/AVATAR.md). Richard, 8 oct 2026: «hacer un
// poco más de movimiento de cámara… que muestre los ojos, la cara, las pausas, la risa». No se le
// pide al modelo de video (cobra por segundo): se hace después, gratis, con ffmpeg:
//   - un acercamiento lento a lo largo de todo el clip, centrado en la cara;
//   - un golpe de cámara (acercamiento rápido a la cara, se sostiene y vuelve) en cada risa y en
//     las palabras que se le digan (el remate del chiste, el «suscríbete»).
// Los tiempos salen de la transcripción de ElevenLabs con sus eventos de audio (la risa viene
// marcada); la cara, del detector de caras de la Mac.
// Uso (desde estacion/):
//   npx tsx src/avatar-camara.ts --clip x.mp4 --salida x-camara.mp4 [--golpe-en "peluca,suscríbete"]
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const exec = promisify(execFile);

/** Una palabra o evento de la transcripción (ElevenLabs Scribe). `type` = "word" | "audio_event" | "spacing". */
export type Evento = { text: string; start?: number; end?: number; type?: string };
export type Golpe = { t: number; motivo: string };

const SEPARACION_MIN_S = 2.2;
const ACERCAMIENTO_BASE = 0.08; // de 1,00 a 1,08 a lo largo del clip
const ACERCAMIENTO_GOLPE = 0.3; // +30 % en cada golpe

const normalizar = (s: string): string =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9ñ]/g, "");

/** Dónde va cada golpe: en cada risa (evento de audio) y en las palabras pedidas; nunca dos a menos de 2,2 s. */
export function golpesDeCamara(eventos: Evento[], palabras: string[] = []): Golpe[] {
  const buscadas = palabras.map(normalizar).filter(Boolean);
  const candidatos: Golpe[] = [];
  for (const e of eventos) {
    if (typeof e.start !== "number") continue;
    if (e.type === "audio_event" && /laugh|risa|rie|ríe/i.test(e.text))
      candidatos.push({ t: e.start, motivo: "risa" });
    else if ((e.type ?? "word") === "word" && buscadas.includes(normalizar(e.text)))
      candidatos.push({ t: e.start, motivo: e.text.trim() });
  }
  candidatos.sort((a, b) => a.t - b.t);
  const golpes: Golpe[] = [];
  for (const c of candidatos) {
    const ultimo = golpes[golpes.length - 1];
    if (!ultimo || c.t - ultimo.t >= SEPARACION_MIN_S) golpes.push(c);
  }
  return golpes;
}

const rampa = (a: number, b: number): string => `clip((it-${a.toFixed(3)})/${(b - a).toFixed(3)},0,1)`;
const suave = (x: string): string => `(${x}*${x}*(3-2*${x}))`;

/** El zoom en función del tiempo del clip (`it`, en segundos), para el filtro zoompan de ffmpeg. */
export function expresionDeZoom(duracion: number, golpes: Golpe[]): string {
  if (!(duracion > 0)) throw new Error("El clip no dura nada.");
  const base = `1+${ACERCAMIENTO_BASE}*clip(it/${duracion.toFixed(3)},0,1)`;
  const bultos = golpes.map((g) => {
    const entra = suave(rampa(g.t - 0.15, g.t + 0.25));
    const sale = suave(rampa(g.t + 1.4, g.t + 1.9));
    return `${entra}*(1-${sale})`;
  });
  return bultos.length ? `${base}+${ACERCAMIENTO_GOLPE}*(${bultos.join("+")})` : base;
}

/** El filtro completo: se agranda al doble (para que el encuadre no tiemble) y se recorta sobre la cara. */
export function filtroDeCamara(
  duracion: number,
  golpes: Golpe[],
  cara: { cx: number; cy: number },
  ancho: number,
  alto: number,
  fps: number,
): string {
  const cx = Math.min(0.9, Math.max(0.1, cara.cx));
  const cy = Math.min(0.9, Math.max(0.1, cara.cy));
  // Un vaivén lateral muy suave para que la toma no quede de trípode.
  const x = `clip(iw*(${cx.toFixed(4)}+0.008*sin(it*0.6))-iw/zoom/2,0,iw-iw/zoom)`;
  const y = `clip(ih*${cy.toFixed(4)}-ih/zoom/2,0,ih-ih/zoom)`;
  return (
    `scale=${ancho * 2}:${alto * 2}:flags=lanczos,` +
    `zoompan=z='${expresionDeZoom(duracion, golpes)}':x='${x}':y='${y}':d=1:s=${ancho}x${alto}:fps=${fps}`
  );
}

async function medir(clip: string): Promise<{ ancho: number; alto: number; fps: number; duracion: number }> {
  const { stdout } = await exec("ffprobe", [
    "-v",
    "error",
    "-select_streams",
    "v:0",
    "-show_entries",
    "stream=width,height,r_frame_rate:format=duration",
    "-of",
    "json",
    clip,
  ]);
  const d = JSON.parse(stdout) as {
    streams: { width: number; height: number; r_frame_rate: string }[];
    format: { duration: string };
  };
  const s = d.streams[0];
  if (!s) throw new Error("El clip no tiene video.");
  const [n, m] = s.r_frame_rate.split("/").map(Number);
  return {
    ancho: s.width,
    alto: s.height,
    fps: Math.round((n ?? 25) / (m || 1)),
    duracion: Number(d.format.duration),
  };
}

/** Palabras y eventos (la risa) del audio del clip, con ElevenLabs Scribe (22 centavos por hora). */
async function eventosDelAudio(clip: string, duracion: number): Promise<Evento[]> {
  const { config } = await import("./config");
  const { asegurarModeloTranscripcion, MODELO_TRANSCRIPCION } = await import("@compartido/modelos");
  if (!config.ELEVENLABS_API_KEY) throw new Error("Falta ELEVENLABS_API_KEY en estacion/.env.");
  const carpeta = await mkdtemp(path.join(os.tmpdir(), "chase-camara-"));
  const audio = path.join(carpeta, "voz.mp3");
  await exec("ffmpeg", ["-v", "error", "-y", "-i", clip, "-vn", "-c:a", "libmp3lame", "-q:a", "3", audio]);
  const cuerpo = new FormData();
  cuerpo.set("model_id", asegurarModeloTranscripcion(MODELO_TRANSCRIPCION));
  cuerpo.set("language_code", "es");
  cuerpo.set("timestamps_granularity", "word");
  cuerpo.set("tag_audio_events", "true");
  cuerpo.set("file", new Blob([new Uint8Array(await readFile(audio))], { type: "audio/mpeg" }), "voz.mp3");
  const r = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
    method: "POST",
    headers: { "xi-api-key": config.ELEVENLABS_API_KEY },
    body: cuerpo,
    signal: AbortSignal.timeout(Math.round(Math.max(60_000, duracion * 10_000))),
  });
  if (!r.ok)
    throw new Error(`ElevenLabs respondió ${r.status} al transcribir: ${(await r.text()).slice(0, 200)}`);
  return ((await r.json()) as { words?: Evento[] }).words ?? [];
}

/** Centro de la cara más grande en un cuadro del clip; si no se encuentra, arriba al centro. */
async function caraDelClip(clip: string): Promise<{ cx: number; cy: number }> {
  const carpeta = await mkdtemp(path.join(os.tmpdir(), "chase-cara-"));
  const cuadro = path.join(carpeta, "cuadro.jpg");
  await exec("ffmpeg", ["-v", "error", "-y", "-ss", "1", "-i", clip, "-frames:v", "1", cuadro]);
  const { carasDe } = await import("./enfoque");
  const caras = (await carasDe([cuadro])).get(cuadro) ?? [];
  const mayor = [...caras].sort((a, b) => b.w * b.h - a.w * a.h)[0];
  return mayor ? { cx: mayor.cx, cy: mayor.cy } : { cx: 0.5, cy: 0.3 };
}

export async function moverCamara(entrada: {
  clip: string;
  salida: string;
  palabras?: string[];
  avisar?: (t: string) => void;
}): Promise<{ golpes: Golpe[]; cara: { cx: number; cy: number } }> {
  if (!existsSync(entrada.clip)) throw new Error(`No existe el clip ${entrada.clip}.`);
  const avisar = entrada.avisar ?? (() => {});
  const m = await medir(entrada.clip);
  const [eventos, cara] = await Promise.all([
    eventosDelAudio(entrada.clip, m.duracion),
    caraDelClip(entrada.clip),
  ]);
  const golpes = golpesDeCamara(eventos, entrada.palabras ?? []);
  avisar(
    `cara en ${cara.cx.toFixed(2)}, ${cara.cy.toFixed(2)} · golpes: ${golpes.map((g) => `${g.t.toFixed(1)} s (${g.motivo})`).join(", ") || "ninguno"}`,
  );
  await exec(
    "ffmpeg",
    [
      "-v",
      "error",
      "-y",
      "-i",
      entrada.clip,
      "-vf",
      filtroDeCamara(m.duracion, golpes, cara, m.ancho, m.alto, m.fps),
      "-c:v",
      "libx264",
      "-crf",
      "18",
      "-preset",
      "medium",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "copy",
      entrada.salida,
    ],
    { maxBuffer: 16 * 1024 * 1024 },
  );
  return { golpes, cara };
}

const opcion = (nombre: string): string | null => {
  const i = process.argv.indexOf(nombre);
  return i === -1 ? null : (process.argv[i + 1] ?? null);
};

if (process.argv[1] && path.basename(process.argv[1]).startsWith("avatar-camara")) {
  const clip = opcion("--clip");
  const salida = opcion("--salida");
  if (!clip || !salida) {
    console.error(
      'Uso: avatar-camara.ts --clip x.mp4 --salida x-camara.mp4 [--golpe-en "peluca,suscríbete"]',
    );
    process.exit(1);
  }
  moverCamara({
    clip: path.resolve(clip),
    salida: path.resolve(salida),
    palabras: (opcion("--golpe-en") ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    avisar: (t) => console.log(`  ${t}`),
  })
    .then(() => console.log(`Listo: ${path.resolve(salida)}`))
    .catch((e: unknown) => {
      console.error(e instanceof Error ? e.message : e);
      process.exit(1);
    });
}
