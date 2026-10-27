// El Director con el video del cliente, en la Mac (docs/DIRECTOR.md, C-DIRECTOR-3). Dos tareas:
// 1) MIRAR cada video que suben en el chat: su duración, si trae sonido, si es vertical, y unas hojas con
//    un cuadro cada pocos segundos y su hora encima, para que la IA del panel vea qué pasa y cuándo.
// 2) ARMAR lo que Richard aprobó con el botón: la prueba en vivo (con los mismos pasos que el anuncio del
//    agua) o la locución (con los mismos que la de los quince años), y entregarlo al chat.
// Cada gasto se anota en el panel en el momento en que se hace.
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, stat } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { esquemaDemostracion, esquemaLocucion } from "@compartido/director";
import { sincronizarImagenes } from "./comerciales";
import { config } from "./config";
import { cuadrosDelVideo, hojasDe, horaDeCuadro, planDeDemostracion, planDeLocucion } from "./director-plan";
import { armarLocucion } from "./locucion";
import { prepararMusica } from "./musica";
import { panel, type TrabajoDelDirector } from "./panel";
import { pasoArmar, pasoPersonas, pasoVoz } from "./publicidad";
import { elegirLogo } from "./publicidad-plan";
import { acentoDelArchivo } from "./publicidades";

const exec = promisify(execFile);
const CARPETA = () => path.join(config.CARPETA_SALIDA, "director");
const hora = () => new Date().toLocaleTimeString("es-US", { hour12: false });

/** Lo que se sabe de un video con ffprobe (girado si el teléfono lo grabó de lado). */
async function medirVideo(
  ruta: string,
): Promise<{ duracionSeg: number; conSonido: boolean; vertical: boolean }> {
  const { stdout } = await exec("ffprobe", [
    "-v",
    "error",
    "-show_entries",
    "format=duration:stream=codec_type,width,height:stream_tags=rotate:stream_side_data=rotation",
    "-of",
    "json",
    ruta,
  ]);
  const info = JSON.parse(stdout) as {
    format?: { duration?: string };
    streams?: {
      codec_type?: string;
      width?: number;
      height?: number;
      tags?: { rotate?: string };
      side_data_list?: { rotation?: number }[];
    }[];
  };
  const video = info.streams?.find((s) => s.codec_type === "video");
  if (!video?.width || !video.height) throw new Error("El archivo no trae imagen de video.");
  const giro = Math.abs(
    Number(video.tags?.rotate ?? video.side_data_list?.find((x) => x.rotation)?.rotation ?? 0),
  );
  const deLado = giro === 90 || giro === 270;
  const ancho = deLado ? video.height : video.width;
  const alto = deLado ? video.width : video.height;
  const duracionSeg = Number(info.format?.duration ?? 0);
  if (!(duracionSeg > 0.5)) throw new Error("No se pudo leer cuánto dura el video.");
  return {
    duracionSeg,
    conSonido: Boolean(info.streams?.some((s) => s.codec_type === "audio")),
    vertical: alto >= ancho,
  };
}

/** Una hoja: los cuadros en una cuadrícula, cada uno con su hora en amarillo arriba a la izquierda. */
async function armarHoja(
  cuadros: { ruta: string; t: number }[],
  vertical: boolean,
  salida: string,
): Promise<void> {
  const { default: sharp } = await import("sharp");
  const columnas = vertical ? 5 : 3;
  const celda = vertical ? { w: 300, h: 533 } : { w: 480, h: 270 };
  const margen = 6;
  const filas = Math.ceil(cuadros.length / columnas);
  const piezas = await Promise.all(
    cuadros.map(async (c, i) => {
      const x = margen + (i % columnas) * (celda.w + margen);
      const y = margen + Math.floor(i / columnas) * (celda.h + margen);
      const imagen = await sharp(c.ruta).resize(celda.w, celda.h, { fit: "cover" }).toBuffer();
      const texto = horaDeCuadro(c.t);
      const etiqueta = Buffer.from(
        `<svg width="140" height="58" xmlns="http://www.w3.org/2000/svg"><rect width="140" height="58" rx="10" fill="#000" fill-opacity="0.78"/><text x="70" y="43" font-size="40" font-weight="700" font-family="Helvetica, Arial, sans-serif" fill="#ffd400" text-anchor="middle">${texto}</text></svg>`,
      );
      return [
        { input: imagen, left: x, top: y },
        { input: etiqueta, left: x + 6, top: y + 6 },
      ];
    }),
  );
  await sharp({
    create: {
      width: columnas * (celda.w + margen) + margen,
      height: filas * (celda.h + margen) + margen,
      channels: 3,
      background: "#111111",
    },
  })
    .composite(piezas.flat())
    .jpeg({ quality: 78 })
    .toFile(salida);
}

/** Dónde queda en la Mac el video original de un chat (lo baja una sola vez: mirar y armar lo comparten). */
function rutaDelOriginal(videoId: number, nombre: string): string {
  const ext =
    path
      .extname(nombre)
      .toLowerCase()
      .replace(/[^.a-z0-9]/g, "") || ".mp4";
  return path.join(CARPETA(), `video-${videoId}`, `original${ext}`);
}

async function bajarSiFalta(videoId: number, nombre: string, bytes: number): Promise<string> {
  const ruta = rutaDelOriginal(videoId, nombre);
  await mkdir(path.dirname(ruta), { recursive: true });
  const yaEsta = await stat(ruta).then(
    (s) => s.size === bytes,
    () => false,
  );
  if (!yaEsta) await panel.bajarVideoDelDirector(videoId, ruta, bytes);
  return ruta;
}

/** Mira un video del chat (si hay): lo baja, saca los cuadros, arma las hojas y las sube. */
export async function mirarVideoDelDirector(): Promise<boolean> {
  const v = await panel.videoDelDirectorPorMirar();
  if (!v) return false;
  console.log(`[${hora()}] Director: mirando el video V${v.id} «${v.nombre}»`);
  try {
    const ruta = await bajarSiFalta(v.id, v.nombre, v.bytes);
    const dir = path.dirname(ruta);
    const m = await medirVideo(ruta);
    const { paso, tiempos } = cuadrosDelVideo(m.duracionSeg);
    const cuadros: { ruta: string; t: number }[] = [];
    for (const t of tiempos) {
      const salida = path.join(dir, `cuadro-${t}.jpg`);
      if (!existsSync(salida))
        await exec("ffmpeg", [
          "-y",
          "-v",
          "error",
          "-ss",
          String(t),
          "-i",
          ruta,
          "-frames:v",
          "1",
          "-vf",
          "scale=480:-2",
          "-q:v",
          "4",
          salida,
        ]).catch(() => null);
      if (existsSync(salida)) cuadros.push({ ruta: salida, t });
    }
    if (!cuadros.length) throw new Error("No se pudo sacar ningún cuadro del video.");
    const hojas = hojasDe(cuadros);
    for (const [k, hoja] of hojas.entries()) {
      const salida = path.join(dir, `hoja-${k + 1}.jpg`);
      await armarHoja(hoja, m.vertical, salida);
      await panel.subirHojaDelVideo(v.id, k + 1, salida);
    }
    await panel.videoMirado(v.id, {
      duracion_seg: Math.round(m.duracionSeg * 10) / 10,
      con_sonido: m.conSonido,
      vertical: m.vertical,
      hojas: hojas.length,
      segundos_por_cuadro: paso,
    });
    console.log(
      `  V${v.id}: ${m.duracionSeg.toFixed(1)} s, ${m.vertical ? "vertical" : "acostado"}, ${cuadros.length} cuadros en ${hojas.length} hoja(s)`,
    );
  } catch (e) {
    const msj = e instanceof Error ? e.message : String(e);
    console.error(`  No se pudo mirar V${v.id}: ${msj}`);
    await panel.videoSinMirar(v.id, msj).catch(() => {});
  }
  return true;
}

/**
 * Los videos del chat se miran aparte del ciclo grande: un anuncio largo armándose no hace esperar al
 * Director. Cada diez segundos pregunta, y nunca mira dos a la vez.
 */
export function vigilarVideosDelDirector(cadaMs = 10_000): void {
  let ocupado = false;
  setInterval(() => {
    if (ocupado) return;
    ocupado = true;
    void (async () => {
      try {
        while (await mirarVideoDelDirector());
      } catch (e) {
        console.warn(
          `[${hora()}] Director: no se pudo preguntar por videos:`,
          e instanceof Error ? e.message : e,
        );
      } finally {
        ocupado = false;
      }
    })();
  }, cadaMs);
}

async function armarDemostracion(
  t: TrabajoDelDirector,
  original: string,
  dir: string,
  avisar: (paso: string) => unknown,
  gasto: (servicio: string, detalle: string, costo: number) => Promise<unknown>,
): Promise<{ salida: string; duracionSeg: number }> {
  const d = esquemaDemostracion.parse(t.datos);
  const imagenes = d.carpetas.length ? await sincronizarImagenes(d.carpetas, avisar) : [];
  const buscar = (nombre: string, que: string) => {
    if (!nombre) return undefined;
    const i = imagenes.find((x) => x.nombre === nombre);
    if (!i) throw new Error(`No encontré ${que} («${nombre}») en las carpetas elegidas.`);
    return i;
  };
  const avatar = buscar(d.avatar, "la foto de la persona");
  const producto = buscar(d.cierre.imagen, "la foto del producto");
  const logo = elegirLogo(
    imagenes.filter((i) => i.nombre !== d.cierre.imagen),
    d.avatar,
  );
  const musica = await prepararMusica("electronic tech synth minimal curious pulse", dir).catch(() => null);
  const plan = planDeDemostracion(d, {
    video: original,
    logo: logo?.ruta,
    avatar: avatar?.ruta,
    producto: producto?.ruta,
    musica: musica ? path.join(dir, musica.ruta) : undefined,
    acento: logo ? await acentoDelArchivo(logo.ruta).catch(() => null) : null,
  });
  await avisar("haciendo la voz");
  const voz = await pasoVoz(plan, dir, (x) => avisar(x), 120);
  if (voz.nueva) await gasto("elevenlabs", `voz (${Math.round(voz.duracionMs / 1000)} s)`, voz.costoUsd);
  if (avatar) {
    await avisar("haciendo hablar a la persona (tarda unos minutos)");
    const apariciones = await pasoPersonas(plan, dir, dir, (x) => avisar(`persona: ${x}`));
    await gasto(
      "fal",
      "persona que narra (FlashTalk)",
      apariciones.reduce((s, a) => s + a.costoUsd, 0),
    );
  }
  await avisar("armando el video");
  const r = await pasoArmar(plan, dir, dir);
  return { salida: r.salida, duracionSeg: r.duracionMs / 1000 };
}

async function armarLocucionDelDirector(
  t: TrabajoDelDirector,
  original: string,
  dir: string,
  avisar: (paso: string) => unknown,
  gasto: (servicio: string, detalle: string, costo: number) => Promise<unknown>,
): Promise<{ salida: string; duracionSeg: number }> {
  const d = esquemaLocucion.parse(t.datos);
  const musica =
    d.musica === "piano"
      ? await prepararMusica("piano ballad soft gentle emotional", dir).catch(() => null)
      : null;
  const plan = planDeLocucion(d, {
    video: original,
    musica: musica ? path.join(dir, musica.ruta) : undefined,
    salida: "locucion.mp4",
  });
  const r = await armarLocucion(plan, dir, avisar);
  await gasto("elevenlabs", "voz de la locución", r.costoUsd);
  return { salida: r.salida, duracionSeg: r.duracionMs / 1000 };
}

/** Arma un trabajo aprobado del Director (si hay) y lo entrega al chat. */
export async function atenderTrabajoDelDirector(): Promise<boolean> {
  const t = await panel.trabajoDelDirectorSiguiente();
  if (!t) return false;
  console.log(
    `[${hora()}] Director: trabajo #${t.id} (${t.tipo === "locucion" ? "locución" : "prueba en vivo"})`,
  );
  let ultimo = "bajando el video a la Mac";
  const avisar = (paso: string) => {
    console.log(`  ${paso}`);
    ultimo = paso;
    return panel.avanceTrabajoDelDirector(t.id, paso).catch(() => {});
  };
  const gasto = (servicio: string, detalle: string, costo: number) =>
    costo > 0
      ? panel
          .gastoTrabajoDelDirector(t.id, servicio, detalle, Math.round(costo * 10000) / 10000)
          .catch((e: unknown) => console.warn(`  (no se pudo anotar el gasto: ${String(e)})`))
      : Promise.resolve();
  const latido = setInterval(() => void panel.avanceTrabajoDelDirector(t.id, ultimo).catch(() => {}), 45_000);
  try {
    if (!t.video) throw new Error("El video del cliente ya no está en el panel.");
    const original = await bajarSiFalta(t.video.id, t.video.nombre, t.video.bytes);
    const dir = path.join(CARPETA(), `trabajo-${t.id}`);
    await mkdir(dir, { recursive: true });
    const r =
      t.tipo === "locucion"
        ? await armarLocucionDelDirector(t, original, dir, avisar, gasto)
        : await armarDemostracion(t, original, dir, avisar, gasto);
    await avisar("subiendo el video al chat");
    await panel.entregarTrabajoDelDirector(t.id, r.salida, r.duracionSeg);
    console.log(`[${hora()}] Director: trabajo #${t.id} listo, ${r.duracionSeg.toFixed(1)} s.`);
  } catch (e) {
    const msj = e instanceof Error ? e.message : String(e);
    console.error(`[${hora()}] Falló el trabajo #${t.id} del Director:`, msj);
    await panel.errorTrabajoDelDirector(t.id, msj).catch(() => {});
  } finally {
    clearInterval(latido);
  }
  return true;
}
