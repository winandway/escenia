// Recorta al sujeto de una foto con el motor de macOS (el de «copiar sujeto» de
// Fotos): fondo transparente, sin gastar y sin salir de la Mac. Lo usan las
// portadas de impacto y las figuras del estilo ilustrado.
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import type { Recorte } from "@compartido/portada";

const exec = promisify(execFile);
const aqui = path.dirname(fileURLToPath(import.meta.url));
const FUENTE = path.resolve(aqui, "../herramientas/recortar.swift");
const BINARIO = path.resolve(aqui, "../bin/recortar");

/** Recorta al sujeto de una foto (fondo transparente) y dice su tamaño y las caras que se ven. */
export async function recortar(origen: string, destino: string): Promise<Recorte> {
  if (!existsSync(BINARIO)) {
    await mkdir(path.dirname(BINARIO), { recursive: true });
    await exec("swiftc", ["-O", FUENTE, "-o", BINARIO]);
  }
  const { stdout } = await exec(BINARIO, [origen, destino]);
  const r = JSON.parse(stdout) as Partial<Recorte>;
  if (!r.ancho || !r.alto) throw new Error(`No se pudo recortar ${path.basename(origen)}.`);
  return {
    ancho: r.ancho,
    alto: r.alto,
    cobertura: r.cobertura ?? 1,
    lleno: r.lleno ?? 1,
    caras: r.caras ?? [],
  };
}
