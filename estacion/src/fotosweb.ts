// Fotos reales del artista desde Google Imágenes, a través de Serper
// (https://serper.dev: la API oficial de Google Custom Search está cerrada a
// clientes nuevos desde 2026). Con SERPER_API_KEY en estacion/.env; sin ella,
// apagado y se dice. Cada consulta se guarda en caché (cache/fotos-web).
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import {
  candidatasDeSerper,
  elegirCandidata,
  esDeAgencia,
  esImagen,
  type CandidataWeb,
} from "@compartido/fotosweb";
import { enSerie } from "./serie";
import { config } from "./config";
import { enfoquesDe } from "./enfoque";

const exec = promisify(execFile);
const AGENTE =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Escenia/0.1";
export const URL_SERPER_IMAGENES = "https://google.serper.dev/images";

export type FotoWeb = { rutaCache: string; ancho: number; alto: number; origen: string; url: string };

export function fotosWebActivas(): boolean {
  return Boolean(config.SERPER_API_KEY);
}

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
export async function buscarFotoWeb(
  consulta: string,
  opciones: { persona?: boolean } = {},
): Promise<FotoWeb | null> {
  const persona = opciones.persona ?? true;
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
  const clave = `${persona ? "" : "lugar:"}${consulta.trim().toLowerCase()}`;
  const previa = cache[clave];
  // Una foto guardada de una agencia (con marca de agua) ya no vale: se busca otra vez.
  const deAgencia = previa ? esDeAgencia(previa.url) || esDeAgencia(previa.origen) : false;
  if (previa !== undefined && !deAgencia && (previa === null || existsSync(previa.rutaCache))) return previa;

  const r = await fetch(URL_SERPER_IMAGENES, {
    method: "POST",
    headers: { "X-API-KEY": config.SERPER_API_KEY ?? "", "content-type": "application/json" },
    body: JSON.stringify({ q: consulta, num: 10, gl: "us", hl: "es" }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!r.ok) {
    console.warn(
      `Serper (Google Imágenes) respondió ${r.status} para «${consulta}»: ${(await r.text()).slice(0, 160)}`,
    );
    return null;
  }
  const items = candidatasDeSerper(await r.json());

  // Se bajan hasta 5 candidatas y se mira si tienen cara.
  const candidatas: (CandidataWeb & { rutaCache: string })[] = [];
  let noEranImagenes = 0;
  for (const item of items.slice(0, 5)) {
    const nombre = `web-${createHash("sha1").update(item.url).digest("hex").slice(0, 16)}.jpg`;
    const destino = path.join(carpeta, nombre);
    try {
      if (!existsSync(destino)) {
        const d = await fetch(item.url, {
          headers: { "user-agent": AGENTE },
          signal: AbortSignal.timeout(15_000),
        });
        if (!d.ok) continue;
        const cuerpo = Buffer.from(await d.arrayBuffer());
        if (!esImagen(d.headers.get("content-type"), cuerpo.subarray(0, 12))) {
          noEranImagenes += 1; // el sitio mandó su página, no la foto
          continue;
        }
        const crudo = path.join(carpeta, `${nombre}.descarga`);
        await writeFile(crudo, cuerpo);
        // A JPEG normalizado (quita webp/png raros) y como mucho 2048 px.
        await exec("sips", ["-s", "format", "jpeg", "-Z", "2048", crudo, "--out", destino]);
        await exec("rm", ["-f", crudo]);
      }
      const dim = await dimensiones(destino);
      if (!dim) continue;
      candidatas.push({ url: item.url, origen: item.origen, ...dim, cara: null, rutaCache: destino });
    } catch (e) {
      console.warn(`  (no se pudo bajar una foto de internet: ${e instanceof Error ? e.message : e})`);
    }
  }
  if (noEranImagenes > 0) {
    console.log(
      `  (${noEranImagenes} resultado(s) de «${consulta}» no eran fotos sino páginas; se saltaron)`,
    );
  }
  const enfoques = await enfoquesDe(candidatas.map((c) => c.rutaCache));
  for (const c of candidatas) {
    const e = enfoques.get(c.rutaCache);
    // El detector da el centro de la cara; el área la aproximamos por la que guarda el caché de caras.
    c.cara = e ? await areaDeCara(c.rutaCache) : null;
  }
  const mejor = elegirCandidata(candidatas, 600, persona, consulta);
  const resultado = mejor
    ? {
        rutaCache: (mejor as CandidataWeb & { rutaCache: string }).rutaCache,
        ancho: mejor.ancho,
        alto: mejor.alto,
        origen: mejor.origen,
        url: mejor.url,
      }
    : null;
  // Varias búsquedas a la vez comparten este archivo: se vuelve a leer y se anota
  // de una en una, para que ninguna borre lo que anotó otra.
  await enSerie("fotos-web", async () => {
    let actual: Record<string, FotoWeb | null> = {};
    try {
      actual = JSON.parse(await readFile(archivoCache, "utf8")) as typeof actual;
    } catch {
      actual = {};
    }
    actual[clave] = resultado;
    await writeFile(archivoCache, JSON.stringify(actual));
  });
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
