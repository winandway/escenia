// Voz: ElevenLabs con tiempos por letra (una llamada por escena), o la voz de
// prueba del sistema (macOS `say`) cuando no hay clave, para poder ver el
// video completo sin gastar. Devuelve un MP3 y las palabras con sus tiempos.
import { execFile } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import {
  alineacionAproximada,
  palabrasDesdeAlineacion,
  type Alineacion,
  type Palabra,
} from "@compartido/subtitulos";
import { asegurarModeloVoz, costoVozUsd } from "@compartido/modelos";
import { config } from "./config";

const exec = promisify(execFile);
const PAUSA_ENTRE_ESCENAS_MS = 350;

export type ResultadoVoz = {
  rutaMp3: string;
  palabras: Palabra[];
  tramos: { indice: number; inicioMs: number; finMs: number }[];
  duracionMs: number;
  vozDePrueba: boolean;
  costoUsd: number;
};

export async function generarVoz(
  textos: string[],
  carpeta: string,
  avisar: (paso: string, progreso: number) => Promise<unknown>,
): Promise<ResultadoVoz> {
  await mkdir(carpeta, { recursive: true });
  const usaElevenLabs = Boolean(config.ELEVENLABS_API_KEY && config.ELEVENLABS_VOICE_ID);
  const piezas: string[] = [];
  const palabras: Palabra[] = [];
  const tramos: ResultadoVoz["tramos"] = [];
  let cursorMs = 0;
  let costoUsd = 0;

  for (let i = 0; i < textos.length; i++) {
    const texto = (textos[i] ?? "").trim();
    await avisar(`voz: escena ${i + 1} de ${textos.length}`, Math.round(5 + (i / textos.length) * 25));
    const rutaPieza = path.join(carpeta, `escena-${i + 1}.mp3`);
    let alineacion: Alineacion;
    if (usaElevenLabs) {
      alineacion = await vozElevenLabs(texto, rutaPieza);
      costoUsd += costoVozUsd(asegurarModeloVoz(config.ELEVENLABS_MODELO), texto.length);
    } else {
      alineacion = await vozDelSistema(texto, rutaPieza);
    }
    const r = palabrasDesdeAlineacion(alineacion, [texto]);
    for (const p of r.palabras) {
      palabras.push({
        ...p,
        text: palabras.length === 0 ? p.text.trimStart() : p.text.startsWith(" ") ? p.text : ` ${p.text}`,
        startMs: p.startMs + cursorMs,
        endMs: p.endMs + cursorMs,
        timestampMs: p.timestampMs === null ? null : p.timestampMs + cursorMs,
      });
    }
    const duracionPieza = await duracionMs(rutaPieza);
    tramos.push({ indice: i, inicioMs: cursorMs, finMs: cursorMs + duracionPieza + PAUSA_ENTRE_ESCENAS_MS });
    cursorMs += duracionPieza + PAUSA_ENTRE_ESCENAS_MS;
    piezas.push(rutaPieza);
  }

  const rutaMp3 = path.join(carpeta, "voz.mp3");
  await unirConPausas(piezas, rutaMp3, PAUSA_ENTRE_ESCENAS_MS);
  const total = await duracionMs(rutaMp3);
  const ultimo = tramos[tramos.length - 1];
  if (ultimo) ultimo.finMs = total;
  return { rutaMp3, palabras, tramos, duracionMs: total, vozDePrueba: !usaElevenLabs, costoUsd };
}

async function vozElevenLabs(texto: string, destino: string): Promise<Alineacion> {
  const modelo = asegurarModeloVoz(config.ELEVENLABS_MODELO);
  const r = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${config.ELEVENLABS_VOICE_ID}/with-timestamps?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: { "xi-api-key": config.ELEVENLABS_API_KEY ?? "", "content-type": "application/json" },
      body: JSON.stringify({ text: texto, model_id: modelo }),
    },
  );
  if (!r.ok) throw new Error(`ElevenLabs respondió ${r.status}: ${(await r.text()).slice(0, 300)}`);
  const datos = (await r.json()) as {
    audio_base64: string;
    alignment: Alineacion | null;
    normalized_alignment: Alineacion | null;
  };
  await writeFile(destino, Buffer.from(datos.audio_base64, "base64"));
  const alineacion = datos.alignment ?? datos.normalized_alignment;
  if (!alineacion) throw new Error("ElevenLabs no devolvió la alineación de letras.");
  return alineacion;
}

async function vozDelSistema(texto: string, destino: string): Promise<Alineacion> {
  const aiff = destino.replace(/\.mp3$/, ".aiff");
  // Voz en español del sistema. Si no existe, macOS usa la predeterminada.
  await exec("say", ["-v", "Paulina", "-r", "175", "-o", aiff, texto]).catch(() =>
    exec("say", ["-r", "175", "-o", aiff, texto]),
  );
  await exec("ffmpeg", [
    "-y",
    "-loglevel",
    "error",
    "-i",
    aiff,
    "-codec:a",
    "libmp3lame",
    "-b:a",
    "128k",
    destino,
  ]);
  const dur = await duracionMs(destino);
  return alineacionAproximada(texto, dur / 1000);
}

async function unirConPausas(piezas: string[], destino: string, pausaMs: number): Promise<void> {
  // Concatena con un silencio corto entre escenas para que respire.
  const entradas = piezas.flatMap((p) => ["-i", p]);
  const n = piezas.length;
  const filtro =
    piezas.map((_, i) => `[${i}:a]apad=pad_dur=${pausaMs / 1000}[a${i}]`).join(";") +
    ";" +
    piezas.map((_, i) => `[a${i}]`).join("") +
    `concat=n=${n}:v=0:a=1[out]`;
  await exec("ffmpeg", [
    "-y",
    "-loglevel",
    "error",
    ...entradas,
    "-filter_complex",
    filtro,
    "-map",
    "[out]",
    "-codec:a",
    "libmp3lame",
    "-b:a",
    "128k",
    destino,
  ]);
}

export async function duracionMs(ruta: string): Promise<number> {
  const { stdout } = await exec("ffprobe", [
    "-v",
    "error",
    "-show_entries",
    "format=duration",
    "-of",
    "csv=p=0",
    ruta,
  ]);
  const seg = Number(stdout.trim());
  if (!Number.isFinite(seg)) throw new Error(`No se pudo leer la duración de ${ruta}`);
  return Math.round(seg * 1000);
}
