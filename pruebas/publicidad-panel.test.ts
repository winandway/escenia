import { execFileSync } from "node:child_process";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { costoEstimadoPublicidadUsd, esquemaPublicidadNueva, planDesdeLaIA } from "@compartido/publicidad";

const texto =
  "¿Se te va la luz y se te para todo? Mira esto. El generador a gasolina de 1200 vatios de Pro In Shop. Con él prendes las luces, el ventilador y la nevera. Escríbenos por Instagram. ¡Pídelo hoy!";

describe("Publicidad en el panel: el pedido y el plan de la IA (17 oct 2026)", () => {
  it("el pedido exige texto de 30 a 115 palabras, al menos una carpeta, y la voz del banco", () => {
    const base = {
      nombre: "Pro In Shop · generador",
      narracion: `${texto} ${texto}`,
      idioma: "es",
      voz: "venezolana",
      carpetas: ["Pro In Shop"],
    };
    expect(esquemaPublicidadNueva.parse(base).avatar).toBe("");
    expect(() => esquemaPublicidadNueva.parse({ ...base, narracion: "muy corto" })).toThrow();
    expect(() => esquemaPublicidadNueva.parse({ ...base, carpetas: [] })).toThrow();
    expect(() => esquemaPublicidadNueva.parse({ ...base, voz: "otra" })).toThrow();
  });

  it("del plan de la IA quedan solo las frases literales y en orden, y las imágenes que existen", () => {
    const plan = planDesdeLaIA(
      {
        momentos: [
          { frase: "Se te va la luz", imagen: "frente.jpg", texto: "¿se te va la luz?", chips: [] },
          { frase: "una frase inventada", imagen: "lado.jpg", texto: "NO VA", chips: [] },
          { frase: "Mira esto", imagen: "no-existe.jpg", texto: "", chips: [] },
          { frase: "1200 vatios", imagen: "lado.jpg", texto: "1200 W", chips: [] },
          {
            frase: "Con él prendes",
            imagen: "frente.jpg",
            texto: "",
            chips: [
              { texto: "💡 Luces", palabra: "luces" },
              { texto: "🍳 Cocina", palabra: "cocina" },
              { texto: "🧊 Nevera", palabra: "nevera" },
            ],
          },
        ],
        cierre: { frase: "Escríbenos por Instagram", lineas: ["@PROINSHOP", "", "¡PÍDELO HOY!"] },
      },
      texto,
      ["frente.jpg", "lado.jpg"],
    );
    expect(plan.momentos.map((m) => m.frase)).toEqual([
      "Se te va la luz",
      "Mira esto",
      "1200 vatios",
      "Con él prendes",
    ]);
    expect(plan.momentos[0]?.texto).toBe("¿SE TE VA LA LUZ?");
    expect(plan.momentos[1]?.imagen).toBeUndefined();
    expect(plan.momentos[3]?.chips?.map((c) => c.palabra)).toEqual(["luces", "nevera"]);
    expect(plan.cierre).toEqual({
      frase: "Escríbenos por Instagram",
      lineas: ["@PROINSHOP", "¡PÍDELO HOY!"],
    });
  });

  it("si casi nada calza, avisa en vez de armar un anuncio cojo", () => {
    expect(() =>
      planDesdeLaIA(
        {
          momentos: [{ frase: "nada que ver", imagen: "", texto: "", chips: [] }],
          cierre: { frase: "x", lineas: [] },
        },
        texto,
        [],
      ),
    ).toThrow(/menos de tres momentos/);
  });
});

describe("Publicidad en el panel: costo antes de gastar y voces del banco", () => {
  it("el estimado incluye plan, voz y persona (2 ¢ por segundo) y sin persona queda en centavos", () => {
    const cien = Array.from({ length: 96 }, () => "palabra").join(" ");
    expect(costoEstimadoPublicidadUsd(cien, false)).toBe(0.11);
    // 96 palabras ≈ 40 s → 80 ¢ de persona + 11 ¢.
    expect(costoEstimadoPublicidadUsd(cien, true)).toBeCloseTo(0.91, 2);
  });

  it("C-VOCES-2: ninguna lista de voces escrita a mano (dejaba fuera a la venezolana)", () => {
    const patron = `\\[[[:space:]]*["']richard["'][[:space:]]*,[[:space:]]*["']femenina["'][[:space:]]*\\]`;
    let encontrados = "";
    try {
      encontrados = execFileSync(
        "git",
        ["grep", "--untracked", "-n", "-E", patron, "--", "compartido", "src", "estacion/src", "scripts"],
        { cwd: path.resolve(__dirname, ".."), encoding: "utf8" },
      );
    } catch (e) {
      // git grep sale con 1 cuando no encuentra nada: eso es lo bueno.
      if ((e as { status?: number }).status !== 1) throw e;
    }
    expect(encontrados.trim()).toBe("");
  });
});
