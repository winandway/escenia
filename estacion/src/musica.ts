// Música de fondo: catálogo local de pistas instrumentales (las hace Richard
// en Suno; ver docs/MUSICA.md), elegida por el estilo que pide el guion y
// normalizada de volumen una sola vez. Sin catálogo no hay música, y se dice.
import { existsSync } from "node:fs";
import { copyFile, link, mkdir, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { elegirPista } from "@compartido/musica";
import { config } from "./config";

const exec = promisify(execFile);
const aqui = path.dirname(fileURLToPath(import.meta.url));
// `musica` va en el repositorio (solo el LEEME); `musica-local` vive en la Mac y
// nunca sube al repo público. Si hay dos archivos con el mismo nombre, gana el local.
export const CARPETAS_MUSICA = [
  path.resolve(aqui, "../recursos/musica"),
  path.resolve(aqui, "../recursos/musica-local"),
  // La carpeta donde Richard deja lo que genera en Suno (raíz del proyecto, ignorada por git).
  path.resolve(aqui, "../../music-cortinas-libre-de-copy"),
];
const ES_AUDIO = /\.(mp3|m4a|wav|aac|ogg)$/i;

export type PistaCatalogo = { archivo: string; rutaCompleta: string };
export type MusicaLista = { ruta: string; duracionSeg: number; archivo: string; credito: string };

export async function catalogoMusica(): Promise<PistaCatalogo[]> {
  const porNombre = new Map<string, PistaCatalogo>();
  for (const carpeta of CARPETAS_MUSICA) {
    const lista = (await readdir(carpeta).catch(() => [] as string[])).filter((a) => ES_AUDIO.test(a));
    for (const archivo of lista)
      porNombre.set(archivo, { archivo, rutaCompleta: path.join(carpeta, archivo) });
  }
  return [...porNombre.values()].sort((a, b) => a.archivo.localeCompare(b.archivo));
}

export async function prepararMusica(estilo: string, carpetaPublica: string): Promise<MusicaLista | null> {
  const catalogo = await catalogoMusica();
  const elegida = elegirPista(
    estilo,
    catalogo.map((c) => c.archivo),
  );
  if (!elegida) return null;
  const origen = catalogo.find((c) => c.archivo === elegida.archivo)?.rutaCompleta;
  if (!origen) return null;

  // Volumen parejo entre pistas: se normaliza a -20 LUFS una vez y queda en cache/musica.
  const cache = path.resolve(config.CARPETA_CLIPS, "../musica");
  await mkdir(cache, { recursive: true });
  const normalizada = path.join(cache, `${elegida.archivo.replace(ES_AUDIO, "")}.mp3`);
  const infoOrigen = await stat(origen);
  if (!existsSync(normalizada) || (await stat(normalizada)).mtimeMs < infoOrigen.mtimeMs) {
    await exec("ffmpeg", [
      "-y",
      "-loglevel",
      "error",
      "-i",
      origen,
      "-af",
      "loudnorm=I=-20:TP=-2:LRA=11",
      "-ar",
      "44100",
      "-codec:a",
      "libmp3lame",
      "-b:a",
      "160k",
      normalizada,
    ]);
  }
  const destino = path.join(carpetaPublica, "musica.mp3");
  await link(normalizada, destino).catch(() => copyFile(normalizada, destino));
  const { stdout } = await exec("ffprobe", [
    "-v",
    "error",
    "-show_entries",
    "format=duration",
    "-of",
    "csv=p=0",
    normalizada,
  ]);
  const nombre = elegida.archivo.replace(ES_AUDIO, "").replace(/-/g, " ");
  return {
    ruta: "musica.mp3",
    duracionSeg: Number(stdout.trim()) || 0,
    archivo: elegida.archivo,
    credito: `Música de fondo: «${nombre}» (instrumental generada con IA)`,
  };
}
