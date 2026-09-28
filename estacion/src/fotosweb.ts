// Fotos reales del artista desde Google Imágenes (Custom Search JSON API).
// Con GOOGLE_CSE_KEY y GOOGLE_CSE_CX en estacion/.env; sin ellas, apagado y se
// dice. Cada consulta se guarda en caché (cache/fotos-web) para no repetir.
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { elegirCandidata, type CandidataWeb } from "@compartido/fotosweb";
import { config } from "./config";
import { enfoquesDe } from "./enfoque";

const exec = promisify(execFile);
const AGENTE =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Escenia/0.1";

export type FotoWeb = { rutaCache: string; ancho: number; alto: number; origen: string; url: string };

export function fotosWebActivas(): boolean {
  return Boolean(config.GOOGLE_CSE_KEY && config.GOOGLE_CSE_CX);
}

type Item = {
  link: string;
  mime?: string;
  image?: { width?: number; height?: number; contextLink?: string };
};

async function dimensiones(ruta: string): Promise<{ ancho: number; alto: number } | null> {
  try {
    const { stdout } = await exec("sips", ["-g", "pixelWidth", "-g", "pixelHeight", ruta]);
    const ancho = Number(/pixelWidth:\s*(\d+)/.exec(stdout)?.[1]);
    const alto = Number(/pixelHeight:\s*(\d+)/.exec(stdout)?.[1]);
    return ancho > 0 && alto > 0 ? { ancho, alto } : null;
  } catch {
    return null;
  }
}

/** La mejor foto real para una consulta («Luis Miguel 1987»): con cara, grande, guardada en caché. */
export async function buscarFotoWeb(consulta: string): Promise<FotoWeb | null> {
  if (!fotosWebActivas()) return null;
  const carpeta = path.resolve(config.CARPETA_CLIPS, "../fotos-web");
  await mkdir(carpeta, { recursive: true });
  const archivoCache = path.join(carpeta, "consultas.json");
  let cache: Record<string, FotoWeb | null> = {};
  try {
    cache = JSON.parse(await readFile(archivoCache, "utf8")) as typeof cache;
  } catch {
    cache = {};
  }
  const clave = consulta.trim().toLowerCase();
  const previa = cache[clave];
  if (previa !== undefined && (previa === null || existsSync(previa.rutaCache))) return previa;

  const q = new URLSearchParams({
    key: config.GOOGLE_CSE_KEY ?? "",
    cx: config.GOOGLE_CSE_CX ?? "",
    q: consulta,
    searchType: "image",
    num: "10",
    imgSize: "large",
    imgType: "photo",
    safe: "active",
  });
  const r = await fetch(`https://www.googleapis.com/customsearch/v1?${q}`);
  if (!r.ok) {
    console.warn(
      `Google Imágenes respondió ${r.status} para «${consulta}»: ${(await r.text()).slice(0, 160)}`,
    );
    return null;
  }
  const datos = (await r.json()) as { items?: Item[] };
  const items = (datos.items ?? []).filter(
    (i) =>
      /^https?:\/\//.test(i.link) &&
      (!i.mime || /jpeg|png|webp/i.test(i.mime)) &&
      (i.image?.width ?? 0) >= 500,
  );

  // Se bajan hasta 5 candidatas y se mira si tienen cara.
  const candidatas: (CandidataWeb & { rutaCache: string })[] = [];
  for (const item of items.slice(0, 5)) {
    const nombre = `web-${createHash("sha1").update(item.link).digest("hex").slice(0, 16)}.jpg`;
    const destino = path.join(carpeta, nombre);
    try {
      if (!existsSync(destino)) {
        const d = await fetch(item.link, {
          headers: { "user-agent": AGENTE },
          signal: AbortSignal.timeout(15_000),
        });
        if (!d.ok) continue;
        const crudo = path.join(carpeta, `${nombre}.descarga`);
        await writeFile(crudo, Buffer.from(await d.arrayBuffer()));
        // A JPEG normalizado (quita webp/png raros) y como mucho 2048 px.
        await exec("sips", ["-s", "format", "jpeg", "-Z", "2048", crudo, "--out", destino]);
        await exec("rm", ["-f", crudo]);
      }
      const dim = await dimensiones(destino);
      if (!dim) continue;
      candidatas.push({
        url: item.link,
        origen: item.image?.contextLink ?? item.link,
        ...dim,
        cara: null,
        rutaCache: destino,
      });
    } catch (e) {
      console.warn(`  (no se pudo bajar una foto de internet: ${e instanceof Error ? e.message : e})`);
    }
  }
  const enfoques = await enfoquesDe(candidatas.map((c) => c.rutaCache));
  for (const c of candidatas) {
    const e = enfoques.get(c.rutaCache);
    // El detector da el centro de la cara; el área la aproximamos por la que guarda el caché de caras.
    c.cara = e ? await areaDeCara(c.rutaCache) : null;
  }
  const mejor = elegirCandidata(candidatas);
  const resultado = mejor
    ? {
        rutaCache: (mejor as CandidataWeb & { rutaCache: string }).rutaCache,
        ancho: mejor.ancho,
        alto: mejor.alto,
        origen: mejor.origen,
        url: mejor.url,
      }
    : null;
  cache[clave] = resultado;
  await writeFile(archivoCache, JSON.stringify(cache));
  return resultado;
}

/** Área de la cara más grande (fracción), leída del detector; null si no hay cara. */
async function areaDeCara(ruta: string): Promise<number | null> {
  const binario = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../bin/caras");
  if (!existsSync(binario)) return 0.01;
  try {
    const { stdout } = await exec(binario, [ruta]);
    const caras = (stdout.split("\t")[1] ?? "").trim();
    if (!caras) return null;
    return Math.max(
      ...caras
        .split(";")
        .map((c) => c.split(",").map(Number))
        .map(([, , w = 0, h = 0]) => w * h),
    );
  } catch {
    return null;
  }
}
