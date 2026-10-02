import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { esquemaPortada, partesDelRemate } from "../estacion/src/remotion/props";

describe("portada de impacto (la miniatura que se lleva el clic)", () => {
  it("la palabra entre asteriscos del remate va resaltada y sin asteriscos", () => {
    expect(partesDelRemate("*CERO* PREMIOS")).toEqual([
      { texto: "CERO", marcada: true },
      { texto: "PREMIOS", marcada: false },
    ]);
  });

  it("un asterisco suelto no resalta nada ni se pierde", () => {
    expect(partesDelRemate("5 * 3")).toEqual([
      { texto: "5", marcada: false },
      { texto: "*", marcada: false },
      { texto: "3", marcada: false },
    ]);
    expect(partesDelRemate("  ")).toEqual([]);
  });

  it("sin pedir nada, el objeto se muestra entero y sin tachar", () => {
    const p = esquemaPortada.parse({
      sujeto: { ruta: "portada/sujeto.png", ancho: 1000, alto: 1200 },
      objeto: { ruta: "portada/objeto.png", ancho: 800, alto: 1000 },
    });
    expect(p.objeto).toMatchObject({ tachado: false, mostrar: 1 });
    expect(p.acercar).toBe(1.2);
  });

  it("la página del guion ofrece descargar la miniatura", () => {
    const pagina = readFileSync(path.join(__dirname, "../src/app/guiones/[id]/page.tsx"), "utf8");
    expect(pagina).toContain("Descargar miniatura");
    expect(pagina).toContain("?descargar=1");
  });
});
