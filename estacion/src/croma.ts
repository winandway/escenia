// Formato Presentador: prepara la grabación de Richard para montarla encima de
// los gráficos. Si se grabó con fondo verde (o azul), se le quita el fondo y
// queda un video transparente recortado a su figura; si no, se deja como una
// ventana. Todo con ffmpeg, en la Mac y sin gastar.
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const exec = promisify(execFile);
const GRANDE = { maxBuffer: 64 * 1024 * 1024 };

export type MedidasDeVideo = { ancho: number; alto: number; duracionSeg: number };

export async function medidasDeVideo(ruta: string): Promise<MedidasDeVideo> {
  const { stdout } = await exec("ffprobe", [
    "-v",
    "error",
    "-select_streams",
    "v:0",
    "-show_entries",
    "stream=width,height:stream_side_data=rotation:format=duration",
    "-of",
    "json",
    ruta,
  ]);
  const d = JSON.parse(stdout) as {
    streams?: { width?: number; height?: number; side_data_list?: { rotation?: number }[] }[];
    format?: { duration?: string };
  };
  const v = d.streams?.[0];
  if (!v?.width || !v.height) throw new Error("La grabación no tiene imagen.");
  // Un teléfono graba «acostado» y anota el giro: las medidas reales son las giradas.
  const girado = Math.abs(v.side_data_list?.[0]?.rotation ?? 0) % 180 === 90;
  return {
    ancho: girado ? v.height : v.width,
    alto: girado ? v.width : v.height,
    duracionSeg: Number(d.format?.duration ?? 0),
  };
}

/** El color promedio de un trozo del cuadro (fracciones 0-1), como [r, g, b]. */
async function colorDeZona(
  ruta: string,
  x: number,
  y: number,
  seg: number,
): Promise<[number, number, number]> {
  const { stdout } = await exec(
    "ffmpeg",
    [
      "-v",
      "error",
      "-ss",
      String(seg),
      "-i",
      ruta,
      "-frames:v",
      "1",
      "-vf",
      `crop=iw*0.1:ih*0.1:iw*${x}:ih*${y},scale=1:1`,
      "-f",
      "rawvideo",
      "-pix_fmt",
      "rgb24",
      "-",
    ],
    { encoding: "buffer", ...GRANDE },
  );
  return [stdout[0] ?? 0, stdout[1] ?? 0, stdout[2] ?? 0];
}

/**
 * ¿Se grabó con croma? Mira las dos esquinas de arriba (donde casi nunca está
 * la persona) en dos momentos. Si son de un verde o un azul parejo, devuelve
 * ese color para quitarlo; si no (fondo negro, una sala), `null`.
 */
export async function colorDeCroma(ruta: string, duracionSeg: number): Promise<string | null> {
  const momentos = [Math.min(1, duracionSeg / 4), Math.max(0, duracionSeg / 2)];
  const muestras: [number, number, number][] = [];
  for (const seg of momentos) {
    muestras.push(await colorDeZona(ruta, 0.02, 0.03, seg), await colorDeZona(ruta, 0.88, 0.03, seg));
  }
  return colorSiEsCroma(muestras);
}

/** De unas muestras de color del fondo, el color de croma (en hexadecimal) o `null` si no es verde ni azul parejo. */
export function colorSiEsCroma(muestras: [number, number, number][]): string | null {
  if (muestras.length === 0) return null;
  const esVerde = (c: [number, number, number]) => c[1] > 70 && c[1] > c[0] * 1.35 && c[1] > c[2] * 1.35;
  const esAzul = (c: [number, number, number]) => c[2] > 70 && c[2] > c[0] * 1.35 && c[2] > c[1] * 1.2;
  const todas = (prueba: (c: [number, number, number]) => boolean) => muestras.every(prueba);
  if (!todas(esVerde) && !todas(esAzul)) return null;
  const prom = [0, 1, 2].map((k) =>
    Math.round(muestras.reduce((s, c) => s + (c[k] ?? 0), 0) / muestras.length),
  );
  return `0x${prom.map((n) => n.toString(16).padStart(2, "0")).join("")}`;
}

/**
 * De los recuadros de la figura en cada cuadro de muestra (medidos en un video
 * de `anchoMuestra` puntos de ancho) al recorte de la grabación entera: el
 * mayor recuadro, con un margen para que un gesto con la mano no quede cortado.
 * Por abajo no se recorta nunca: la figura llega al borde y así queda anclada.
 */
export function recorteDeFigura(
  cajas: number[][],
  anchoMuestra: number,
  origen: { ancho: number; alto: number },
): { x: number; y: number; ancho: number; alto: number } | null {
  const buenas = cajas.filter(
    (c) => c.length === 4 && (c[1] ?? 0) > (c[0] ?? 0) && (c[3] ?? 0) > (c[2] ?? 0),
  );
  if (buenas.length === 0) return null;
  const escala = origen.ancho / anchoMuestra;
  const margen = origen.alto * 0.04;
  const par = (n: number) => Math.max(2, Math.floor(n / 2) * 2);
  const x0 = Math.max(0, Math.floor(Math.min(...buenas.map((c) => c[0] ?? 0)) * escala - margen));
  const x1 = Math.min(origen.ancho, Math.ceil(Math.max(...buenas.map((c) => c[1] ?? 0)) * escala + margen));
  const y0 = Math.max(0, Math.floor(Math.min(...buenas.map((c) => c[2] ?? 0)) * escala - margen));
  return { x: par(x0), y: par(y0), ancho: par(x1 - x0), alto: par(origen.alto - y0) };
}

export type OpcionesDeCroma = {
  /** Qué tan parecido al color del fondo tiene que ser un punto para borrarse (0.05 a 0.4). */
  similitud?: number;
  /** Cuánto se suaviza el borde. */
  mezcla?: number;
  /** Alto del video que sale, en puntos. */
  alto?: number;
};

/**
 * Quita el fondo de croma y deja un video transparente (WebM con canal alfa),
 * recortado al espacio que ocupa la persona a lo largo de toda la grabación.
 * Devuelve las medidas del recorte.
 */
export async function quitarCroma(
  entrada: string,
  salida: string,
  color: string,
  opciones: OpcionesDeCroma = {},
): Promise<{ ancho: number; alto: number }> {
  const similitud = opciones.similitud ?? 0.14;
  const mezcla = opciones.mezcla ?? 0.06;
  const alto = opciones.alto ?? 1080;
  const verde = parseInt(color.slice(4, 6), 16) >= parseInt(color.slice(6, 8), 16);
  const llave = `chromakey=${color}:${similitud}:${mezcla},despill=type=${verde ? "green" : "blue"}:mix=0.6:expand=0.1`;

  // 1) Dónde está la persona: el recuadro que ocupa su figura en toda la grabación (a baja
  //    resolución, dos cuadros por segundo). OJO: `cropdetect` no sirve aquí; decide por el
  //    promedio de cada fila y se come la cabeza (una fila con solo la cabeza es casi toda negra).
  const { stderr } = await exec(
    "ffmpeg",
    [
      "-i",
      entrada,
      "-an",
      "-vf",
      `fps=2,scale=480:-2,${llave},format=yuva420p,alphaextract,format=gray,bbox=min_val=40`,
      "-f",
      "null",
      "-",
    ],
    GRANDE,
  );
  const cajas = [...stderr.matchAll(/x1:(\d+) x2:(\d+) y1:(\d+) y2:(\d+)/g)].map((m) =>
    m.slice(1, 5).map(Number),
  );
  const origen = await medidasDeVideo(entrada);
  const recorte = recorteDeFigura(cajas, 480, origen);
  // 2) El video transparente.
  await exec(
    "ffmpeg",
    [
      "-y",
      "-i",
      entrada,
      "-an",
      "-vf",
      `fps=30,${recorte ? `crop=${recorte.ancho}:${recorte.alto}:${recorte.x}:${recorte.y},` : ""}scale=-2:${alto},${llave},format=yuva420p`,
      "-c:v",
      "libvpx-vp9",
      "-pix_fmt",
      "yuva420p",
      "-b:v",
      "0",
      "-crf",
      "32",
      "-deadline",
      "realtime",
      "-cpu-used",
      "6",
      "-row-mt",
      "1",
      "-auto-alt-ref",
      "0",
      salida,
    ],
    GRANDE,
  );
  const { stdout } = await exec("ffprobe", [
    "-v",
    "error",
    "-select_streams",
    "v:0",
    "-show_entries",
    "stream=width,height",
    "-of",
    "csv=p=0",
    salida,
  ]);
  const [ancho, altoReal] = stdout.trim().split(",").map(Number);
  return { ancho: ancho || 1920, alto: altoReal || alto };
}

/** Sin croma: la grabación se deja como un video normal, más liviano, para mostrarla en una ventana. */
export async function prepararVentana(
  entrada: string,
  salida: string,
  alto = 1080,
): Promise<{ ancho: number; alto: number }> {
  await exec(
    "ffmpeg",
    [
      "-y",
      "-i",
      entrada,
      "-an",
      "-vf",
      `fps=30,scale=-2:${alto}`,
      "-c:v",
      "libx264",
      "-crf",
      "20",
      "-preset",
      "veryfast",
      "-pix_fmt",
      "yuv420p",
      salida,
    ],
    GRANDE,
  );
  const m = await medidasDeVideo(salida);
  return { ancho: m.ancho, alto: m.alto };
}

/** La voz de la grabación, sola, para transcribirla y usarla de pista del video. */
export async function extraerVoz(entrada: string, salidaMp3: string): Promise<void> {
  await exec(
    "ffmpeg",
    ["-y", "-i", entrada, "-vn", "-ac", "1", "-ar", "44100", "-b:a", "192k", salidaMp3],
    GRANDE,
  );
}
