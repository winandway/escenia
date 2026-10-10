// Encuadre de medio cuerpo para el video de referencia de la transferencia de movimiento
// (docs/AVATAR.md). Problema (9 oct 2026, avatar de Richard): en su video va de cuerpo entero a primer
// plano acercándose a la cámara; el escenario generado tiene la cámara fija y lejos, y en los primeros
// planos su cuerpo «se hundía» en el piso (con Chase, «se salía de la tabla»). Arreglo: una cámara
// virtual que lo sigue por la cara y lo deja siempre de la cintura para arriba; así nunca aparecen
// los pies ni el borde del piso, y la escena se hace también de medio cuerpo.
// Uso (desde estacion/):
//   npx tsx src/avatar-encuadre.ts --video referencia.mov --salida referencia-medio-cuerpo.mp4 [--fijo [--alto 0.68]]
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const exec = promisify(execFile);

/** Cara en fracciones del cuadro (centro y tamaño), como la da el detector de la Mac. */
export type CaraCuadro = { cx: number; cy: number; w: number; h: number } | null;
export type Encuadre = { x: number; y: number; w: number; h: number }; // en píxeles del video original

/** La cara mide un sexto del alto del encuadre: de la cabeza a la cintura, con aire arriba. */
const CARAS_POR_ALTO = 6;
const AIRE_ARRIBA = 0.12; // fracción del encuadre sobre la frente
const SUAVIZADO = 15; // cuadros a cada lado (0,6 s a 25 cuadros por segundo)

/**
 * Un encuadre 9:16 por cuadro que sigue la cara: de la cintura para arriba, sin pasar del cuadro
 * original, suavizado para que la cámara no tiemble. Los cuadros sin cara toman la última conocida.
 */
export function encuadresDeCaras(caras: CaraCuadro[], ancho: number, alto: number): Encuadre[] {
  if (caras.length === 0) return [];
  // Rellenar huecos con la cara más cercana conocida.
  const primera = caras.find((c) => c !== null) ?? { cx: 0.5, cy: 0.2, w: 0.1, h: 0.06 };
  let ultima = primera;
  const llenas = caras.map((c) => (c ? (ultima = c) : ultima));
  const crudos = llenas.map((c) => {
    const h = Math.min(alto, Math.max(alto * 0.33, c.h * alto * CARAS_POR_ALTO));
    const w = Math.min(ancho, (h * 9) / 16);
    const hFinal = (w * 16) / 9;
    const topeCara = (c.cy - c.h / 2) * alto;
    const y = Math.min(alto - hFinal, Math.max(0, topeCara - AIRE_ARRIBA * hFinal));
    const x = Math.min(ancho - w, Math.max(0, c.cx * ancho - w / 2));
    return { x, y, w, h: hFinal };
  });
  return crudos.map((_, i) => {
    const desde = Math.max(0, i - SUAVIZADO);
    const hasta = Math.min(crudos.length - 1, i + SUAVIZADO);
    const tramo = crudos.slice(desde, hasta + 1);
    const prom = (k: keyof Encuadre) => tramo.reduce((s, e) => s + e[k], 0) / tramo.length;
    const w = Math.round(prom("w") / 2) * 2;
    const h = Math.round((w * 16) / 9 / 2) * 2;
    return {
      x: Math.round(Math.min(ancho - w, Math.max(0, prom("x")))),
      y: Math.round(Math.min(alto - h, Math.max(0, prom("y")))),
      w,
      h: Math.min(h, alto),
    };
  });
}

/**
 * Un solo encuadre FIJO para todo el video (sin movimiento de cámara): arriba del todo, `fraccion` del
 * alto, 9:16, centrado en la mediana de la cara. Con la cámara virtual en movimiento, Kling redibujaba
 * el fondo y la banda desaparecía (9 oct 2026); quieto, el fondo se queda. Devuelve también cuántos
 * cuadros dejan la cara fuera, para avisar.
 */
export function encuadreFijo(
  caras: CaraCuadro[],
  ancho: number,
  alto: number,
  fraccion = 0.68,
): { encuadre: Encuadre; fuera: number } {
  const h = Math.round((alto * fraccion) / 2) * 2;
  const w = Math.round(Math.min(ancho, (h * 9) / 16) / 2) * 2;
  const xs = caras.flatMap((c) => (c ? [c.cx * ancho] : [])).sort((a, b) => a - b);
  const mediana = xs.length ? (xs[Math.floor(xs.length / 2)] ?? ancho / 2) : ancho / 2;
  const x = Math.round(Math.min(ancho - w, Math.max(0, mediana - w / 2)));
  const encuadre = { x, y: 0, w, h: Math.round((w * 16) / 9 / 2) * 2 };
  const fuera = caras.filter(
    (c) => c && (c.cx * ancho < x || c.cx * ancho > x + w || (c.cy + c.h / 2) * alto > encuadre.h),
  ).length;
  return { encuadre, fuera };
}

const opcion = (nombre: string): string | null => {
  const i = process.argv.indexOf(nombre);
  return i === -1 ? null : (process.argv[i + 1] ?? null);
};

async function principal() {
  const video = opcion("--video");
  const salida = opcion("--salida");
  if (!video || !salida)
    throw new Error("Uso: avatar-encuadre.ts --video referencia.mov --salida medio-cuerpo.mp4");
  const { stdout } = await exec("ffprobe", [
    "-v",
    "error",
    "-select_streams",
    "v:0",
    "-show_entries",
    "stream=width,height,r_frame_rate",
    "-of",
    "csv=p=0",
    path.resolve(video),
  ]);
  const [anchoS, altoS, fpsS] = stdout.trim().split(",");
  const ancho = Number(anchoS);
  const alto = Number(altoS);
  const [n, m] = (fpsS ?? "25/1").split("/").map(Number);
  const fps = Math.round((n ?? 25) / (m || 1));
  const tmp = await mkdtemp(path.join(os.tmpdir(), "encuadre-"));
  const cuadros = path.join(tmp, "cuadros");
  await mkdir(cuadros);
  await exec(
    "ffmpeg",
    [
      "-v",
      "error",
      "-y",
      "-i",
      path.resolve(video),
      "-vf",
      `fps=${fps}`,
      "-q:v",
      "2",
      path.join(cuadros, "c%05d.jpg"),
    ],
    { maxBuffer: 64 * 1024 * 1024 },
  );
  const archivos = (await readdir(cuadros)).filter((f) => f.endsWith(".jpg")).sort();
  console.log(`  ${archivos.length} cuadros a ${fps} por segundo; buscando la cara…`);
  const { carasDe } = await import("./enfoque");
  const rutas = archivos.map((f) => path.join(cuadros, f));
  const mapa = await carasDe(rutas);
  const caras: CaraCuadro[] = rutas.map((r) => {
    const lista = mapa.get(r) ?? [];
    const mayor = [...lista].sort((a, b) => b.w * b.h - a.w * a.h)[0];
    return mayor ?? null;
  });
  console.log(`  cara encontrada en ${caras.filter(Boolean).length} de ${caras.length} cuadros`);
  // `--fijo`: un solo encuadre para todo el video (sin movimiento de cámara). Es el de los videos
  // con banda o escenario detrás: si el encuadre se mueve, Kling redibuja el fondo.
  let encuadres: Encuadre[];
  if (process.argv.includes("--fijo")) {
    const { encuadre, fuera } = encuadreFijo(caras, ancho, alto, Number(opcion("--alto") ?? "0.68"));
    console.log(
      `  encuadre fijo ${encuadre.w}×${encuadre.h} desde x=${encuadre.x}; cara fuera en ${fuera} cuadros`,
    );
    encuadres = caras.map(() => encuadre);
  } else {
    encuadres = encuadresDeCaras(caras, ancho, alto);
  }
  const sharp = (await import("sharp")).default;
  const salidaCuadros = path.join(tmp, "salida");
  await mkdir(salidaCuadros);
  for (let i = 0; i < rutas.length; i++) {
    const e = encuadres[i];
    if (!e) continue;
    await sharp(rutas[i] as string)
      .extract({ left: e.x, top: e.y, width: e.w, height: e.h })
      .resize(720, 1280)
      .jpeg({ quality: 92 })
      .toFile(path.join(salidaCuadros, `s${String(i + 1).padStart(5, "0")}.jpg`));
  }
  await exec(
    "ffmpeg",
    [
      "-v",
      "error",
      "-y",
      "-framerate",
      String(fps),
      "-i",
      path.join(salidaCuadros, "s%05d.jpg"),
      "-i",
      path.resolve(video),
      "-map",
      "0:v",
      "-map",
      "1:a",
      "-c:v",
      "libx264",
      "-crf",
      "18",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
      "-b:a",
      "160k",
      "-shortest",
      path.resolve(salida),
    ],
    { maxBuffer: 64 * 1024 * 1024 },
  );
  console.log(`Listo: ${path.resolve(salida)}`);
}

if (process.argv[1] && path.basename(process.argv[1]).startsWith("avatar-encuadre")) {
  principal().catch((e: unknown) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
