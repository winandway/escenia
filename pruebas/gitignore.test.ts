import { execFileSync } from "node:child_process";
import path from "node:path";
import { describe, expect, it } from "vitest";

// C-GITIGNORE-1 (17 oct 2026): la regla «publicidad/» de las fotos de los clientes escondía también la
// página del panel (src/app/publicidad): nunca se habría subido y el panel publicado se habría quedado
// sin ella, sin ningún aviso. Ningún archivo nuevo del código puede quedar ignorado por git (lo mira el
// verify de la Mac antes de cada commit y cada push, que es donde un archivo se queda sin subir).
const raiz = path.resolve(__dirname, "..");
const CARPETAS_DE_CODIGO = ["src", "compartido", "estacion/src", "pruebas", "scripts", "docs"];

describe("C-GITIGNORE-1: git no esconde código", () => {
  it("ningún archivo de las carpetas del código queda ignorado", () => {
    const ignorados = execFileSync(
      "git",
      ["ls-files", "--others", "--ignored", "--exclude-standard", "--", ...CARPETAS_DE_CODIGO],
      { cwd: raiz, encoding: "utf8" },
    );
    expect(ignorados.trim().split("\n").filter(Boolean)).toEqual([]);
  });
});
