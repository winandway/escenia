// Clips de fondo desde Pexels (licencia libre para uso comercial; se cita al
// autor en la descripción). Sin clave, la plantilla usa fondos de color.
// Los clips se guardan en caché para no volver a bajarlos ni gastar cuota.
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { config } from "./config";

export type Clip = { ruta: string; duracionSeg: number; credito: string };

type RespuestaPexels = {
  videos: {
    id: number;
    duration: number;
    user: { name: string; url: string };
    video_files: { link: string; width: number; height: number; file_type: string }[];
  }[];
};

const usados = new Set<number>();

export async function buscarClip(busqueda: string, vertical: boolean): Promise<Clip | null> {
  if (!config.PEXELS_API_KEY || !busqueda.trim()) return null;
  const q = new URLSearchParams({
    query: busqueda,
    per_page: "8",
    orientation: vertical ? "portrait" : "landscape",
    size: "medium",
  });
  const r = await fetch(`https://api.pexels.com/videos/search?${q}`, {
    headers: { Authorization: config.PEXELS_API_KEY },
  });
  if (!r.ok) {
    console.warn(`Pexels respondió ${r.status} para «${busqueda}»; se usa fondo de color.`);
    return null;
  }
  const datos = (await r.json()) as RespuestaPexels;
  const candidatos = datos.videos.filter((v) => v.duration >= 4 && !usados.has(v.id));
  const video = candidatos[0] ?? datos.videos[0];
  if (!video) return null;
  // El archivo más grande que no pase de 1920 de ancho (o 1080 en vertical).
  const tope = vertical ? 1080 : 1920;
  const archivo = video.video_files
    .filter((f) => f.file_type === "video/mp4" && (vertical ? f.width : f.width) <= tope)
    .sort((a, b) => b.width - a.width)[0];
  if (!archivo) return null;

  const carpeta = path.join(config.CARPETA_PUBLICA, "clips");
  await mkdir(carpeta, { recursive: true });
  const nombre = `pexels-${video.id}-${archivo.width}.mp4`;
  const destino = path.join(carpeta, nombre);
  if (!existsSync(destino)) {
    const d = await fetch(archivo.link);
    if (!d.ok) return null;
    await writeFile(destino, Buffer.from(await d.arrayBuffer()));
  }
  usados.add(video.id);
  return {
    ruta: `clips/${nombre}`,
    duracionSeg: video.duration,
    credito: `Video de ${video.user.name} en Pexels (${video.user.url})`,
  };
}
