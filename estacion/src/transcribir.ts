// De una voz grabada a sus palabras con tiempo (ElevenLabs Scribe v2, 22
// centavos por hora de audio). Lo usa el formato Presentador: con los tiempos
// de lo que Richard dijo de verdad, cada imagen entra cuando él la nombra.
// La transcripción de un mismo audio se guarda y no se cobra dos veces.
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  asegurarModeloTranscripcion,
  costoTranscripcionUsd,
  MODELO_TRANSCRIPCION,
} from "@compartido/modelos";
import {
  palabrasDeTranscripcion,
  type PalabraDeVideo,
  type PalabraTranscrita,
} from "@compartido/presentador";
import { config } from "./config";

export type Transcripcion = { texto: string; palabras: PalabraDeVideo[]; costoUsd: number };

export async function transcribir(rutaAudio: string, duracionSeg: number): Promise<Transcripcion> {
  if (!config.ELEVENLABS_API_KEY)
    throw new Error(
      "Falta ELEVENLABS_API_KEY en estacion/.env: sin ella no se puede transcribir la grabación.",
    );
  const modelo = asegurarModeloTranscripcion(MODELO_TRANSCRIPCION);
  const audio = await readFile(rutaAudio);
  const carpeta = path.join(config.CARPETA_CLIPS, "transcripciones");
  await mkdir(carpeta, { recursive: true });
  const guardada = path.join(
    carpeta,
    `${createHash("sha1").update(audio).update(modelo).digest("hex").slice(0, 20)}.json`,
  );
  let crudo: { text?: string; words?: PalabraTranscrita[] };
  let costoUsd = 0;
  if (existsSync(guardada)) {
    crudo = JSON.parse(await readFile(guardada, "utf8")) as typeof crudo;
  } else {
    const cuerpo = new FormData();
    cuerpo.set("model_id", modelo);
    cuerpo.set("language_code", "es");
    cuerpo.set("timestamps_granularity", "word");
    cuerpo.set("tag_audio_events", "false");
    cuerpo.set("file", new Blob([new Uint8Array(audio)], { type: "audio/mpeg" }), path.basename(rutaAudio));
    const r = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
      method: "POST",
      headers: { "xi-api-key": config.ELEVENLABS_API_KEY },
      body: cuerpo,
      signal: AbortSignal.timeout(600_000),
    });
    if (!r.ok)
      throw new Error(`ElevenLabs respondió ${r.status} al transcribir: ${(await r.text()).slice(0, 300)}`);
    crudo = (await r.json()) as typeof crudo;
    await writeFile(guardada, JSON.stringify(crudo));
    costoUsd = costoTranscripcionUsd(modelo, duracionSeg);
  }
  const palabras = palabrasDeTranscripcion(crudo.words ?? []);
  if (palabras.length === 0) throw new Error("La transcripción salió vacía: ¿la grabación tiene voz?");
  return { texto: (crudo.text ?? "").trim(), palabras, costoUsd };
}
