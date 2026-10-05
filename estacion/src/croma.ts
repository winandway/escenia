// Formato Presentador: prepara la grabación de Richard para montarla encima de
// los gráficos. Si se grabó con fondo verde (o azul), se le quita el fondo y
// queda un video transparente recortado a su figura; si no, se deja como una
// ventana. Todo con ffmpeg, en la Mac y sin gastar.
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { cromaDeCuadro, juntarCromas, umbralesDeCroma, zonaEnPuntos, type Croma } from "@compartido/croma";

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

/** Un cuadro de la grabación, achicado (el lado más largo de 160 puntos), como puntos RGB. */
async function cuadroChico(
  ruta: string,
  seg: number,
  origen: MedidasDeVideo,
): Promise<{ rgb: Uint8Array; ancho: number; alto: number }> {
  const escala = 160 / Math.max(origen.ancho, origen.alto);
  const ancho = Math.max(4, Math.round(origen.ancho * escala));
  const alto = Math.max(4, Math.round(origen.alto * escala));
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
      `scale=${ancho}:${alto}`,
      "-f",
      "rawvideo",
      "-pix_fmt",
      "rgb24",
      "-",
    ],
    { encoding: "buffer", ...GRANDE },
  );
  return { rgb: new Uint8Array(stdout), ancho, alto };
}

/**
 * ¿Se grabó con croma? Mira cinco cuadros repartidos por la grabación y busca la tela verde
 * (o azul) DONDE ESTÉ: casi nunca llena el cuadro (arriba se ve el techo, a un lado una pared).
 * Devuelve su color y la zona que cubre; si no hay tela (fondo negro, una sala), `null`.
 * Antes solo se miraban las dos esquinas de arriba, y la primera grabación real de Richard
 * —con el techo en el tercio de arriba— salió «sin croma», en una ventana (C-CROMA-1).
 */
export async function detectarCroma(ruta: string, duracionSeg: number): Promise<Croma | null> {
  const origen = await medidasDeVideo(ruta);
  const momentos = [0.1, 0.3, 0.5, 0.7, 0.9].map((f) => Math.max(0, duracionSeg * f));
  const cuadros = [];
  for (const seg of momentos) {
    const c = await cuadroChico(ruta, seg, origen);
    cuadros.push(cromaDeCuadro(c.rgb, c.ancho, c.alto));
  }
  return juntarCromas(cuadros);
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
  /** Alto del video que sale, en puntos. */
  alto?: number;
  /** La zona del cuadro que cubre la tela (fracciones): lo de afuera se recorta antes de borrar el color. */
  zona?: Croma["zona"];
  /** El trozo de la grabación que se usa (sin el principio ni el final en los que no habla). */
  corte?: Corte;
};

/** Un trozo de la grabación, en milisegundos. */
export type Corte = { desdeMs: number; hastaMs: number };

/** Las opciones de ffmpeg que hacen leer solo ese trozo (van ANTES de la entrada). */
const soloElTrozo = (corte?: Corte): string[] =>
  corte
    ? ["-ss", (corte.desdeMs / 1000).toFixed(3), "-t", ((corte.hastaMs - corte.desdeMs) / 1000).toFixed(3)]
    : [];

/**
 * El trozo de filtro que saca, de una imagen, cuánto hay que dejar ver de cada punto (su «alfa»):
 * blanco donde está la persona, negro donde está la tela. Deja también los tres colores sueltos,
 * con el de la tela ya rebajado (para que no le quede un borde verde a la persona).
 * Entra una imagen sin etiqueta y salen `[uno]`, `[dos]`, `[tres]` (verde, azul y rojo) y `[alfa]`.
 */
function filtroDeCroma(color: string): string {
  const { verde, bajo, alto } = umbralesDeCroma(color);
  // La tela es del color `tela`; los otros dos son `otroA` y `otroB`.
  const [tela, otroA, otroB] = verde ? ["g", "r", "b"] : ["b", "r", "g"];
  return [
    `format=gbrp,extractplanes=r+g+b[r][g][b]`,
    `[${otroA}]split[a1][a2]`,
    `[${otroB}]split[b1][b2]`,
    `[${tela}]split[t1][t2]`,
    // El mayor de los otros dos colores, punto por punto.
    `[a1][b1]blend=all_mode=lighten,split[m1][m2]`,
    // Cuánto le sobra del color de la tela a cada punto; de ahí, cuánto se deja ver.
    `[t1][m1]blend=all_mode=subtract,lut=y='255-clip((val-${bajo})*255/(${alto - bajo})\\,0\\,255)'[alfa]`,
    // El color de la tela nunca pasa del mayor de los otros dos: sin reflejo verde en la piel.
    `[t2][m2]blend=all_mode=darken[limpio]`,
    verde
      ? `[limpio]null[uno];[b2]null[dos];[a2]null[tres]`
      : `[b2]null[uno];[limpio]null[dos];[a2]null[tres]`,
  ].join(";");
}

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
  const alto = opciones.alto ?? 1080;
  const llave = filtroDeCroma(color);
  // Primero se recorta a la tela: el techo, una pared o una lámpara no son verdes y quedarían pegados.
  const original = await medidasDeVideo(entrada);
  const tela = opciones.zona ? zonaEnPuntos(opciones.zona, original) : null;
  const aLaTela = tela ? `crop=${tela.ancho}:${tela.alto}:${tela.x}:${tela.y},` : "";

  // 1) Dónde está la persona: el recuadro que ocupa su figura en toda la grabación (a baja
  //    resolución, dos cuadros por segundo). OJO: `cropdetect` no sirve aquí; decide por el
  //    promedio de cada fila y se come la cabeza (una fila con solo la cabeza es casi toda negra).
  const { stderr } = await exec(
    "ffmpeg",
    [
      ...soloElTrozo(opciones.corte),
      "-i",
      entrada,
      "-an",
      "-filter_complex",
      `[0:v]fps=2,${aLaTela}scale=480:-2,${llave};[alfa]bbox=min_val=110[v];[uno][dos][tres]mergeplanes=0x001020:gbrp,nullsink`,
      "-map",
      "[v]",
      "-f",
      "null",
      "-",
    ],
    GRANDE,
  );
  const cajas = [...stderr.matchAll(/x1:(\d+) x2:(\d+) y1:(\d+) y2:(\d+)/g)].map((m) =>
    m.slice(1, 5).map(Number),
  );
  const origen = tela ? { ancho: tela.ancho, alto: tela.alto } : original;
  const recorte = recorteDeFigura(cajas, 480, origen);
  // 2) El video transparente.
  await exec(
    "ffmpeg",
    [
      "-y",
      ...soloElTrozo(opciones.corte),
      "-i",
      entrada,
      "-an",
      "-filter_complex",
      `[0:v]fps=30,${aLaTela}${recorte ? `crop=${recorte.ancho}:${recorte.alto}:${recorte.x}:${recorte.y},` : ""}scale=-2:${alto},${llave};[uno][dos][tres][alfa]mergeplanes=0x00102030:gbrap,format=yuva420p[v]`,
      "-map",
      "[v]",
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
  corte?: Corte,
): Promise<{ ancho: number; alto: number }> {
  await exec(
    "ffmpeg",
    [
      "-y",
      ...soloElTrozo(corte),
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

/** El mismo trozo, de la voz ya emparejada (se vuelve a codificar para que el corte sea exacto). */
export async function recortarVoz(entradaMp3: string, salidaMp3: string, corte: Corte): Promise<void> {
  await exec(
    "ffmpeg",
    ["-y", "-i", entradaMp3, ...soloElTrozo(corte), "-ac", "1", "-ar", "44100", "-b:a", "192k", salidaMp3],
    GRANDE,
  );
}

/** La voz de la grabación, sola, para transcribirla y usarla de pista del video. */
export async function extraerVoz(entrada: string, salidaMp3: string): Promise<void> {
  await exec(
    "ffmpeg",
    ["-y", "-i", entrada, "-vn", "-ac", "1", "-ar", "44100", "-b:a", "192k", salidaMp3],
    GRANDE,
  );
}
