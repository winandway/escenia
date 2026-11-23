// C-MARCA-1: en el material de Divoox no se nombra ni se dibuja la marca de motos Bera ni sus modelos
// (regla de Richard, 22 nov 2026). Ver docs/CANDADOS.md.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { asegurarSinJuegos, promptEscenaBloques } from "@compartido/bloques";
import { asegurarSinMarcasVetadas, marcasVetadasEn } from "@compartido/marcas-vetadas";

const RAIZ = join(__dirname, "..");

function archivos(dir: string): string[] {
  const salida: string[] = [];
  // eslint-disable-next-line security/detect-non-literal-fs-filename -- rutas del propio repo, armadas aquí
  for (const nombre of readdirSync(dir)) {
    if (nombre === "node_modules" || nombre.startsWith(".")) continue;
    const ruta = join(dir, nombre);
    // eslint-disable-next-line security/detect-non-literal-fs-filename -- rutas del propio repo, armadas aquí
    if (statSync(ruta).isDirectory()) salida.push(...archivos(ruta));
    else if (/\.(ts|tsx|mts|mjs|js|json|py|swift)$/.test(nombre)) salida.push(ruta);
  }
  return salida;
}

describe("C-MARCA-1 · marcas vetadas para Divoox", () => {
  it("encuentra la marca y sus modelos, escritos de cualquier forma", () => {
    expect(marcasVetadasEn("una moto Bera SBR 150 roja")).toEqual(["bera", "sbr"]);
    expect(marcasVetadasEn("Moto: Bera • SBR • Negro")).toEqual(["bera", "sbr"]);
    expect(marcasVetadasEn("la BR200 y la BRF")).toEqual(["br200", "brf"]);
    expect(marcasVetadasEn("la BR 200 nueva")).toEqual(["br 200"]);
    expect(marcasVetadasEn("motos BÉRA")).toEqual(["bera", "motos bera"]);
  });

  it("no confunde palabras normales", () => {
    expect(marcasVetadasEn("un señor con guayabera blanca")).toEqual([]);
    expect(marcasVetadasEn("la libera al entrar; berenjena y Berazategui")).toEqual([]);
    expect(marcasVetadasEn("una moto roja de Motos Divoox")).toEqual([]);
  });

  it("frena el pedido de imagen y el texto que la nombren", () => {
    expect(() => asegurarSinMarcasVetadas("the red Bera motorcycle")).toThrow(/vetada/);
    expect(() => asegurarSinJuegos("a voxel SBR 150 street bike")).toThrow(/vetada/);
    expect(() => promptEscenaBloques("a driver next to his red Bera bike")).toThrow(/vetada/);
    expect(promptEscenaBloques("a driver next to a generic red street motorcycle")).toContain(
      "generic red street",
    );
  });

  it("ningún archivo del motor nombra la marca fuera de su lista", () => {
    const carpetas = ["compartido", "estacion/src", "estacion/herramientas", "scripts", "src"].map((c) =>
      join(RAIZ, c),
    );
    const culpables: string[] = [];
    for (const carpeta of carpetas) {
      let lista: string[] = [];
      try {
        lista = archivos(carpeta);
      } catch {
        continue;
      }
      for (const archivo of lista) {
        const rel = relative(RAIZ, archivo);
        if (rel === join("compartido", "marcas-vetadas.ts")) continue;
        // eslint-disable-next-line security/detect-non-literal-fs-filename -- rutas del propio repo, armadas aquí
        const malas = marcasVetadasEn(readFileSync(archivo, "utf8"));
        if (malas.length > 0) culpables.push(`${rel}: ${malas.join(", ")}`);
      }
    }
    expect(culpables).toEqual([]);
  });
});
