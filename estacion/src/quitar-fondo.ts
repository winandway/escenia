// Quitar el fondo de una foto con la propia Mac (Vision, sin costo): la persona queda en un PNG con
// transparencia y el borde se limpia un par de puntos (si no, quedan motas del fondo, sobre todo del
// «tablero de cuadritos» dibujado de las fotos que dicen ser transparentes y no lo son). La herramienta
// de Swift vive en `estacion/herramientas/quitar-fondo.swift`.
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { detectarTablero, restosDeTablero } from "./tablero";

const exec = promisify(execFile);
const aqui = path.dirname(fileURLToPath(import.meta.url));
export const HERRAMIENTA_QUITAR_FONDO = path.resolve(aqui, "../herramientas/quitar-fondo.swift");
export const HERRAMIENTA_CARA = path.resolve(aqui, "../herramientas/cara.swift");

/** Dónde está la cara más grande de la foto (fracciones, origen arriba a la izquierda); null si no hay. */
export async function detectarCara(
  ruta: string,
): Promise<{ x: number; y: number; ancho: number; alto: number } | null> {
  const { stdout } = await exec("swift", [HERRAMIENTA_CARA, ruta], { maxBuffer: 1024 * 1024 });
  const linea = stdout.trim().split("\n").pop() ?? "null";
  return JSON.parse(linea) as { x: number; y: number; ancho: number; alto: number } | null;
}

/** ¿La foto ya trae transparencia de verdad (algún punto transparente)? */
export async function tieneTransparencia(ruta: string): Promise<boolean> {
  const { default: sharp } = await import("sharp");
  const { isOpaque } = await sharp(ruta).stats();
  return !isOpaque;
}

/** Quita el fondo de `entrada` y deja la figura en `salida` (PNG), con el borde limpio. */
export async function quitarFondo(entrada: string, salida: string): Promise<void> {
  const crudo = salida.replace(/\.png$/i, "-crudo.png");
  await exec("swift", [HERRAMIENTA_QUITAR_FONDO, entrada, crudo], { maxBuffer: 1024 * 1024 });
  await borrarRestosDeTablero(entrada, crudo);
  await exec("ffmpeg", [
    "-y",
    "-v",
    "error",
    "-i",
    crudo,
    "-filter_complex",
    "[0]format=rgba,split[c][a];[a]alphaextract,erosion,erosion,gblur=sigma=0.8[m];[c][m]alphamerge",
    "-frames:v",
    "1",
    salida,
  ]);
}

/** Si la foto traía el tablero de cuadritos pintado, borra lo que quedó de él dentro de la figura. */
async function borrarRestosDeTablero(original: string, recorte: string): Promise<void> {
  const { default: sharp } = await import("sharp");
  const foto = await sharp(original).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const tablero = detectarTablero(new Uint8Array(foto.data), foto.info.width, foto.info.height);
  if (!tablero) return;
  const fig = await sharp(recorte).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  if (fig.info.width !== foto.info.width || fig.info.height !== foto.info.height) return;
  const n = fig.info.width * fig.info.height;
  const alfa = new Uint8Array(n);
  for (let p = 0; p < n; p++) alfa[p] = fig.data[p * 4 + 3] ?? 0;
  const borrar = restosDeTablero(new Uint8Array(foto.data), alfa, fig.info.width, fig.info.height, tablero);
  let borrados = 0;
  for (let p = 0; p < n; p++)
    if (borrar[p]) {
      fig.data[p * 4 + 3] = 0;
      borrados++;
    }
  if (borrados === 0) return;
  console.log(`  tablero de cuadritos: ${borrados} puntos borrados dentro de la figura`);
  await sharp(fig.data, { raw: { width: fig.info.width, height: fig.info.height, channels: 4 } })
    .png()
    .toFile(recorte + ".tmp.png");
  const { rename } = await import("node:fs/promises");
  await rename(recorte + ".tmp.png", recorte);
}

/**
 * La figura sin fondo lista para el avatar: si la foto ya es transparente se usa tal cual; si no, se le
 * quita el fondo una vez y se guarda en `carpeta` (por su huella: la misma foto no se procesa dos veces).
 */
export async function figuraSinFondo(ruta: string, carpeta: string): Promise<string> {
  if (await tieneTransparencia(ruta)) return ruta;
  const h = createHash("sha1")
    .update(await readFile(ruta))
    .digest("hex")
    .slice(0, 12);
  const salida = path.join(carpeta, `sin-fondo-${h}.png`);
  if (!existsSync(salida)) await quitarFondo(ruta, salida);
  return salida;
}
