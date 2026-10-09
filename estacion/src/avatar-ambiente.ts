// Mezcla un sonido de ambiente (las olas de la playa, la calle, el mercado) debajo de la voz de un
// clip de avatar (docs/AVATAR.md). El ambiente se repite hasta cubrir el clip, entra y sale con un
// fundido y queda bajito para no tapar la voz. Si Richard sube un ambiente real en «Sonidos», se
// usa ese archivo; mientras tanto va el sintetizado de avatar/chase-montes/sonidos/.
// Uso (desde estacion/):
//   npx tsx src/avatar-ambiente.ts --clip x.mp4 --ambiente olas.mp3 --salida x-olas.mp4 [--volumen 0.2]
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";

const exec = promisify(execFile);
/** Volumen del ambiente respecto a la voz: 0,3 se oye detrás sin competir. */
export const VOLUMEN_AMBIENTE = 0.3;
const FUNDIDO_S = 1;

/** El filtro de ffmpeg: ambiente en bucle, recortado al largo del clip, con fundidos, mezclado con la voz. */
export function filtroAmbiente(segundos: number, volumen = VOLUMEN_AMBIENTE): string {
  if (!(segundos > 0)) throw new Error("El clip no dura nada.");
  if (!(volumen > 0 && volumen <= 1)) throw new Error("El volumen del ambiente va entre 0 y 1.");
  const fin = Math.max(0, segundos - FUNDIDO_S).toFixed(2);
  return (
    `[1:a]atrim=0:${segundos.toFixed(2)},volume=${volumen},afade=t=in:d=${FUNDIDO_S},afade=t=out:st=${fin}:d=${FUNDIDO_S}[amb];` +
    `[0:a][amb]amix=inputs=2:duration=first:dropout_transition=0:normalize=0[a]`
  );
}

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

export async function mezclarAmbiente(entrada: {
  clip: string;
  ambiente: string;
  salida: string;
  volumen?: number;
}): Promise<{ ruta: string; segundos: number }> {
  if (!existsSync(entrada.clip)) throw new Error(`No existe el clip ${entrada.clip}.`);
  if (!existsSync(entrada.ambiente)) throw new Error(`No existe el ambiente ${entrada.ambiente}.`);
  const segundos = await duracionSeg(entrada.clip);
  await exec("ffmpeg", [
    "-v",
    "error",
    "-y",
    "-i",
    entrada.clip,
    "-stream_loop",
    "-1",
    "-i",
    entrada.ambiente,
    "-filter_complex",
    filtroAmbiente(segundos, entrada.volumen),
    "-map",
    "0:v",
    "-map",
    "[a]",
    "-c:v",
    "copy",
    "-c:a",
    "aac",
    "-b:a",
    "160k",
    "-shortest",
    entrada.salida,
  ]);
  return { ruta: entrada.salida, segundos };
}

const opcion = (nombre: string): string | null => {
  const i = process.argv.indexOf(nombre);
  return i === -1 ? null : (process.argv[i + 1] ?? null);
};

if (process.argv[1] && path.basename(process.argv[1]).startsWith("avatar-ambiente")) {
  const clip = opcion("--clip");
  const ambiente = opcion("--ambiente");
  const salida = opcion("--salida");
  const volumen = opcion("--volumen");
  if (!clip || !ambiente || !salida) {
    console.error(
      "Uso: avatar-ambiente.ts --clip x.mp4 --ambiente olas.mp3 --salida x-olas.mp4 [--volumen 0.2]",
    );
    process.exit(1);
  }
  mezclarAmbiente({
    clip: path.resolve(clip),
    ambiente: path.resolve(ambiente),
    salida: path.resolve(salida),
    volumen: volumen ? Number(volumen) : undefined,
  })
    .then((r) => console.log(`Listo: ${r.ruta} (${r.segundos.toFixed(1)} s)`))
    .catch((e: unknown) => {
      console.error(e instanceof Error ? e.message : e);
      process.exit(1);
    });
}
