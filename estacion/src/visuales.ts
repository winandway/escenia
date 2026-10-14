// Clips de fondo desde Pexels (licencia libre para uso comercial; se cita al
// autor en la descripción). Se prueban varias búsquedas en orden hasta dar
// con un clip; solo si todas fallan la escena queda sin clip.
// Los clips se guardan en caché para no volver a bajarlos ni gastar cuota.
import { existsSync } from "node:fs";
import { copyFile, link, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { config } from "./config";
import { elegirVideo, idsRecientes } from "./fondo-escena";

export type Clip = { ruta: string; duracionSeg: number; credito: string };

type RespuestaPexels = {
  videos: {
    id: number;
    duration: number;
    width: number;
    height: number;
    user: { name: string; url: string };
    video_files: { link: string; width: number; height: number; file_type: string }[];
  }[];
};

// Ya usados en este proceso: así dos escenas seguidas no repiten clip.
const usados = new Set<number>();

// Los clips usados en los videos de los últimos días (C-FONDO-2), en el caché del banco de clips.
const RUTA_RECIENTES = () => path.join(config.CARPETA_CLIPS, "recientes.json");

async function leerRecientes(): Promise<Record<string, string>> {
  try {
    return JSON.parse(await readFile(RUTA_RECIENTES(), "utf8")) as Record<string, string>;
  } catch {
    // Sin archivo todavía (primera vez) o ilegible: se empieza de cero; no frena la producción.
    return {};
  }
}

async function anotarReciente(recientes: Record<string, string>, id: number): Promise<void> {
  const vigentes = idsRecientes(recientes);
  const limpio = Object.fromEntries(Object.entries(recientes).filter(([k]) => vigentes.has(Number(k))));
  limpio[String(id)] = new Date().toISOString();
  await mkdir(config.CARPETA_CLIPS, { recursive: true });
  await writeFile(RUTA_RECIENTES(), JSON.stringify(limpio));
}

/** Búsquedas de reserva por parte del guion, cuando la de la IA no da resultado. */
export const RESERVA_POR_PARTE: Record<string, string[]> = {
  gancho: ["city night timelapse", "abstract technology background"],
  problema: ["stressed person office", "messy desk papers"],
  contexto: ["people walking city", "modern office workspace"],
  demo: ["hands typing laptop", "smartphone app scrolling"],
  dato: ["data screen analytics", "digital numbers abstract"],
  opinion: ["thoughtful person window", "coffee cup desk morning"],
  cierre: ["sunrise city skyline", "person walking sunset"],
  cta: ["hands smartphone closeup", "laptop desk clean"],
};

// Biografías: nada de pantallas ni oficinas; ambiente de música y de época.
export const RESERVA_DOCUMENTAL: Record<string, string[]> = {
  gancho: ["vintage microphone stage lights", "old film projector flicker"],
  problema: ["rain on window night vintage", "empty street night old film"],
  contexto: ["old city street vintage film", "vintage radio close up"],
  demo: ["vinyl record player spinning", "piano keys close up"],
  dato: ["vinyl record spinning", "concert crowd lights"],
  opinion: ["empty theater seats spotlight", "stage spotlight smoke"],
  cierre: ["stage lights sunset", "vinyl record player"],
  cta: ["stage lights sunset", "concert crowd lights"],
  interludio: ["concert crowd dancing lights", "vintage microphone stage lights"],
};

export async function buscarClip(
  busquedas: string[],
  vertical: boolean,
  carpetaPublica: string,
): Promise<Clip | null> {
  if (!config.PEXELS_API_KEY) return null;
  for (const b of busquedas.map((x) => x.trim()).filter(Boolean)) {
    const clip = await buscarUna(b, vertical, carpetaPublica).catch((e) => {
      console.warn(`Pexels falló con «${b}»: ${e instanceof Error ? e.message : e}`);
      return null;
    });
    if (clip) return clip;
  }
  return null;
}

async function buscarUna(busqueda: string, vertical: boolean, carpetaPublica: string): Promise<Clip | null> {
  const q = new URLSearchParams({
    query: busqueda,
    per_page: "10",
    orientation: vertical ? "portrait" : "landscape",
    size: "medium",
  });
  const r = await fetch(`https://api.pexels.com/videos/search?${q}`, {
    headers: { Authorization: config.PEXELS_API_KEY ?? "" },
  });
  if (!r.ok) {
    console.warn(`Pexels respondió ${r.status} para «${busqueda}».`);
    return null;
  }
  const datos = (await r.json()) as RespuestaPexels;
  // Clips de 5 s o más, con la orientación correcta, sin repetir en este video ni en los recientes
  // (C-FONDO-2: el banco devolvía siempre el mismo primer clip de cada búsqueda de reserva).
  const recientes = await leerRecientes();
  const video = elegirVideo(datos.videos, vertical, usados, idsRecientes(recientes));
  if (!video) return null;
  const tope = vertical ? 1080 : 1920;
  const archivo = video.video_files
    .filter((f) => f.file_type === "video/mp4" && f.width <= tope && f.width >= (vertical ? 540 : 960))
    .sort((a, b) => b.width - a.width)[0];
  if (!archivo) return null;

  const carpeta = path.join(config.CARPETA_CLIPS);
  await mkdir(carpeta, { recursive: true });
  const nombre = `pexels-${video.id}-${archivo.width}.mp4`;
  const destino = path.join(carpeta, nombre);
  if (!existsSync(destino)) {
    const d = await fetch(archivo.link);
    if (!d.ok) return null;
    await writeFile(destino, Buffer.from(await d.arrayBuffer()));
  }
  usados.add(video.id);
  await anotarReciente(recientes, video.id);
  // Copia (enlace duro) del caché a la carpeta pública del trabajo.
  await mkdir(path.join(carpetaPublica, "clips"), { recursive: true });
  await link(destino, path.join(carpetaPublica, "clips", nombre)).catch(() =>
    copyFile(destino, path.join(carpetaPublica, "clips", nombre)),
  );
  return {
    ruta: `clips/${nombre}`,
    duracionSeg: video.duration,
    credito: `Video de ${video.user.name} en Pexels (${video.user.url})`,
  };
}
