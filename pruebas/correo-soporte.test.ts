// El correo de soporte que ven los clientes de Escenia es el buzón único de Windoce con la etiqueta de
// la app (orden de Richard, 1 nov 2026, C-SOPORTE-1). Si un texto público vuelve al correo personal, esto
// se pone rojo.
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { CORREO_SOPORTE, PRIVACIDAD, SOPORTE } from "@/app/legal/textos";

const raiz = path.resolve(__dirname, "..");
const MOVIL = readFileSync(path.join(raiz, "movil/src/textos.ts"), "utf8");
const PUBLICOS: [string, string][] = [
  ["textos legales", readFileSync(path.join(raiz, "src/app/legal/textos.ts"), "utf8")],
  ["app", MOVIL],
  ["ficha de Apple", readFileSync(path.join(raiz, "scripts/tiendas/fichas-app-store.mjs"), "utf8")],
];

describe("correo de soporte", () => {
  it("es el buzón de soporte con la etiqueta de Escenia", () => {
    expect(CORREO_SOPORTE).toBe("soporte+escenia@windoce.com");
  });

  it("la privacidad y el soporte, en los dos idiomas, lo muestran", () => {
    for (const t of [PRIVACIDAD.en, PRIVACIDAD.es, SOPORTE.en, SOPORTE.es])
      expect(JSON.stringify(t)).toContain(CORREO_SOPORTE);
  });

  it("ningún texto público usa el correo personal (el contacto del revisor de Apple sí es el titular)", () => {
    for (const [nombre, texto] of PUBLICOS)
      expect(texto.replace(/contactEmail: "go@windoce\.com"/, ""), nombre).not.toContain("go@windoce.com");
    expect(MOVIL).toContain(CORREO_SOPORTE);
  });
});
