// El taller en la nube (planes/TALLER-NUBE.md): la Estación también corre en Linux, donde no existe
// `sips` (la herramienta de imágenes de la Mac). En la Mac se sigue usando `sips` (lo probado); en
// Linux, ffprobe y ffmpeg, que van en el contenedor. Candado C-TALLER-1.
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const exec = promisify(execFile);
const enLaMac = () => process.platform === "darwin";

export type Medidas = { ancho: number; alto: number; alfa: boolean };

/** Lo que dice `sips -g pixelWidth -g pixelHeight -g hasAlpha`. */
export function leerSips(salida: string): Medidas {
  return {
    ancho: Number(/pixelWidth:\s*(\d+)/.exec(salida)?.[1]) || 0,
    alto: Number(/pixelHeight:\s*(\d+)/.exec(salida)?.[1]) || 0,
    alfa: /hasAlpha:\s*yes/.test(salida),
  };
}

// Formatos de píxel con canal de transparencia (rgba, ya8, yuva420p, pal8 de un PNG con transparencia…).
const CON_ALFA = /^(rgba|bgra|argb|abgr|ya|yuva|gbrap|pal8)/;

/** Lo que dice `ffprobe -show_entries stream=width,height,pix_fmt -of csv=p=0`: «561,587,rgba». */
export function leerFfprobe(salida: string): Medidas {
  const [ancho, alto, formato] = (salida.trim().split("\n")[0] ?? "").split(",");
  return { ancho: Number(ancho) || 0, alto: Number(alto) || 0, alfa: CON_ALFA.test(formato ?? "") };
}

/** Ancho, alto y si la imagen trae transparencia. */
export async function medirImagen(ruta: string): Promise<Medidas> {
  if (enLaMac()) {
    const { stdout } = await exec("sips", ["-g", "pixelWidth", "-g", "pixelHeight", "-g", "hasAlpha", ruta]);
    return leerSips(stdout);
  }
  const { stdout } = await exec("ffprobe", [
    "-v",
    "error",
    "-select_streams",
    "v:0",
    "-show_entries",
    "stream=width,height,pix_fmt",
    "-of",
    "csv=p=0",
    ruta,
  ]);
  return leerFfprobe(stdout);
}

/** El filtro de ffmpeg que deja la imagen dentro de un cuadro de `lado` (como `sips -Z`), sin agrandarla. */
export const filtroLadoMaximo = (lado: number) =>
  `scale='if(gte(iw,ih),min(${lado},iw),-2)':'if(gte(iw,ih),-2,min(${lado},ih))'`;

/** A JPEG con el lado mayor de como mucho `lado` píxeles (lo de `sips -s format jpeg -Z`). */
export async function aJpeg(origen: string, destino: string, lado: number): Promise<void> {
  if (enLaMac()) {
    await exec("sips", ["-s", "format", "jpeg", "-Z", String(lado), origen, "--out", destino]);
    return;
  }
  await exec("ffmpeg", [
    "-v",
    "error",
    "-y",
    "-i",
    origen,
    "-vf",
    filtroLadoMaximo(lado),
    "-q:v",
    "3",
    "-f",
    "image2",
    destino,
  ]);
}
