// Detecta caras con la Mac (Vision, vía herramientas/caras.swift) para saber
// dónde recortar cada foto en vertical. Se compila una vez a bin/caras. Si no
// hay compilador, se avisa y las fotos se recortan por el centro.
import { existsSync } from "node:fs";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { elegirEnfoque, parsearCaras, type Cara, type Enfoque } from "@compartido/enfoque";
import { enSerie } from "./serie";
import { config } from "./config";

const exec = promisify(execFile);
const aqui = path.dirname(fileURLToPath(import.meta.url));
const FUENTE = path.resolve(aqui, "../herramientas/caras.swift");
const BINARIO = path.resolve(aqui, "../bin/caras");
let avisado = false;

async function asegurarDetector(): Promise<string | null> {
  if (existsSync(BINARIO)) return BINARIO;
  try {
    await mkdir(path.dirname(BINARIO), { recursive: true });
    await exec("swiftc", ["-O", FUENTE, "-o", BINARIO]);
    return BINARIO;
  } catch (e) {
    if (!avisado) {
      avisado = true;
      console.warn(
        `Sin detector de caras (no se pudo compilar caras.swift): ${e instanceof Error ? e.message : e}`,
      );
    }
    return null;
  }
}

/** Enfoque de cada foto (por ruta absoluta), con caché por tamaño de archivo. */
export function enfoquesDe(rutas: string[]): Promise<Map<string, Enfoque | null>> {
  // De una en una: varias búsquedas a la vez comparten el mismo archivo de caché.
  return enSerie("enfoques", () => enfoquesSinFila(rutas));
}

async function enfoquesSinFila(rutas: string[]): Promise<Map<string, Enfoque | null>> {
  const resultado = new Map<string, Enfoque | null>();
  if (rutas.length === 0) return resultado;
  const archivoCache = path.resolve(config.CARPETA_CLIPS, "../enfoques.json");
  let cache: Record<string, { bytes: number; enfoque: Enfoque | null }> = {};
  try {
    cache = JSON.parse(await readFile(archivoCache, "utf8")) as typeof cache;
  } catch {
    cache = {};
  }
  const pendientes: string[] = [];
  for (const r of rutas) {
    const bytes = (await stat(r).catch(() => null))?.size ?? -1;
    const c = cache[r];
    if (c && c.bytes === bytes) resultado.set(r, c.enfoque);
    else pendientes.push(r);
  }
  if (pendientes.length) {
    const detector = await asegurarDetector();
    if (detector) {
      const { stdout } = await exec(detector, pendientes, { maxBuffer: 16 * 1024 * 1024 });
      for (const linea of stdout.split("\n").filter(Boolean)) {
        const { ruta, caras } = parsearCaras(linea);
        const enfoque = elegirEnfoque(caras);
        resultado.set(ruta, enfoque);
        cache[ruta] = { bytes: (await stat(ruta).catch(() => null))?.size ?? -1, enfoque };
      }
    }
    for (const r of pendientes) if (!resultado.has(r)) resultado.set(r, null);
    await mkdir(path.dirname(archivoCache), { recursive: true });
    await writeFile(archivoCache, JSON.stringify(cache));
  }
  return resultado;
}

/**
 * Las caras (recuadros, en fracciones) que se ven en cada imagen, sin elegir ninguna y sin
 * caché: lo usa el formato Canción para saber hasta dónde llega la cabeza de Richard en su toma.
 */
export async function carasDe(rutas: string[]): Promise<Map<string, Cara[]>> {
  const resultado = new Map<string, Cara[]>();
  if (rutas.length === 0) return resultado;
  const detector = await asegurarDetector();
  if (!detector) return resultado;
  const { stdout } = await exec(detector, rutas, { maxBuffer: 16 * 1024 * 1024 });
  for (const linea of stdout.split("\n").filter(Boolean)) {
    const { ruta, caras } = parsearCaras(linea);
    resultado.set(ruta, caras);
  }
  return resultado;
}
