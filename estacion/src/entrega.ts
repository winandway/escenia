// Guarda en la Mac el resultado de cada producción para poder retomar la
// entrega si el panel no la recibió (C-ENTREGA-1).
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { elegirProduccionSinEntregar, type ProduccionGuardada } from "@compartido/entrega";
import type { Guion } from "@compartido/guion";
import { config } from "./config";
import type { ResultadoProduccion } from "./produccion";

const ARCHIVO = "resultado.json";
type Guardado = { huella: string; entregado: boolean; resultado: ResultadoProduccion };

/** Huella de lo que decide cómo sale el video: si el guion cambia, la huella cambia. */
export function huellaDeGuion(guion: Guion): string {
  const loQueCuenta = {
    titulo: guion.titulo,
    voz: guion.voz,
    musica: guion.musica,
    escenas: guion.escenas.map((e) => ({
      parte: e.parte,
      narracion: e.narracion,
      visual: e.visual,
      duracion_seg: e.duracion_seg ?? null,
    })),
  };
  return createHash("sha256").update(JSON.stringify(loQueCuenta)).digest("hex");
}

const rutaDe = (numero: number) => path.join(config.CARPETA_SALIDA, `t${numero}`, ARCHIVO);

export async function guardarProduccion(numero: number, huella: string, resultado: ResultadoProduccion) {
  const guardado: Guardado = { huella, entregado: false, resultado };
  await writeFile(rutaDe(numero), JSON.stringify(guardado, null, 1));
}

export async function marcarEntregada(numero: number) {
  try {
    const guardado = JSON.parse(await readFile(rutaDe(numero), "utf8")) as Guardado;
    await writeFile(rutaDe(numero), JSON.stringify({ ...guardado, entregado: true }, null, 1));
  } catch (e) {
    console.warn(
      `  (no se pudo anotar la entrega del trabajo ${numero}: ${e instanceof Error ? e.message : e})`,
    );
  }
}

function archivosDe(r: ResultadoProduccion): string[] {
  return [r.rutaMp4, r.rutaVoz, r.rutaSubtitulos, ...r.shorts.map((s) => s.ruta)];
}

/** Una producción de este mismo guion que se armó completa y nunca llegó al panel. */
export async function buscarProduccionSinEntregar(
  huella: string,
): Promise<(ProduccionGuardada & { resultado: ResultadoProduccion }) | null> {
  let carpetas: string[] = [];
  try {
    carpetas = await readdir(config.CARPETA_SALIDA);
  } catch {
    return null;
  }
  const guardadas: (ProduccionGuardada & { resultado: ResultadoProduccion })[] = [];
  for (const carpeta of carpetas) {
    const numero = Number(/^t(\d+)$/.exec(carpeta)?.[1]);
    if (!Number.isInteger(numero)) continue;
    try {
      const g = JSON.parse(await readFile(rutaDe(numero), "utf8")) as Guardado;
      guardadas.push({
        numero,
        huella: g.huella,
        entregado: g.entregado,
        completa: archivosDe(g.resultado).every((ruta) => existsSync(ruta)),
        resultado: g.resultado,
      });
    } catch {
      // Carpeta de un trabajo viejo, sin resultado guardado: no sirve para retomar.
    }
  }
  return elegirProduccionSinEntregar(guardadas, huella);
}
