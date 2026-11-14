import { describe, expect, it } from "vitest";
import { logoDeMarca } from "../estacion/src/remotion/logos";

// C-LOGOS-1: en los diagramas de neón (y en Neón con personajes), el objeto que nombra a una empresa
// muestra su logo de verdad en vez de un ícono genérico. Lo pidió Richard el 5 oct 2026: «que también
// salgan los logos de las empresas que se nombran (OpenAI, Google), no solo las personas».
describe("C-LOGOS-1: logos de las empresas en el neón", () => {
  it("las empresas que se nombran tienen su logo (un trazo SVG de 24 × 24)", () => {
    for (const nombre of [
      "Google",
      "Anthropic",
      "Claude",
      "Meta",
      "YouTube",
      "WhatsApp",
      "TikTok",
      "NVIDIA",
      "Tesla",
    ]) {
      const logo = logoDeMarca(nombre);
      expect(logo, nombre).not.toBeNull();
      expect(logo?.trazo, nombre).toMatch(/^[Mm]/);
    }
  });

  it("sin importar mayúsculas, tildes o lo que venga después del nombre", () => {
    expect(logoDeMarca("google")?.marca).toBe("Google");
    expect(logoDeMarca("Google Cloud")?.marca).toBe("Google Cloud");
    expect(logoDeMarca("Gemini")?.marca).toBe("Google Gemini");
    expect(logoDeMarca("ChatGPT")?.marca).toBe("OpenAI");
    expect(logoDeMarca("Meta AI")?.marca).toBe("Meta");
  });

  it("OpenAI, que la biblioteca libre no trae, sale con su nombre en neón (sin inventar un logo)", () => {
    const logo = logoDeMarca("OpenAI");
    expect(logo?.marca).toBe("OpenAI");
    expect(logo?.trazo).toBeNull();
    expect(logo?.sigla).toBe("OpenAI");
  });

  it("las palabras corrientes no son marcas: el objeto sigue con su ícono", () => {
    for (const etiqueta of [
      "Cliente",
      "Producto vendido",
      "Depósito 2",
      "Venta registrada",
      "Una manzana",
      "X veces",
      "Metas",
    ])
      expect(logoDeMarca(etiqueta), etiqueta).toBeNull();
  });
});
