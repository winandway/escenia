import { describe, expect, it } from "vitest";
import {
  costoPublicidadUsd,
  esquemaPlanPublicidad,
  SEGUNDOS_MAXIMOS,
  tiemposDeFrases,
} from "../estacion/src/publicidad-plan";

describe("publicidad en Short: el plan, los tiempos y el costo (prototipo, 17 oct 2026)", () => {
  const base = {
    marca: "PRO IN SHOP",
    logo: "logo/logo.png",
    texto: "¿Se te va la luz? Mira esto. El generador de mil doscientos vatios.",
    momentos: [
      { frase: "Se te va la luz", imagen: "productos/a.png", texto: "¿SE TE VA LA LUZ?" },
      { frase: "Mira esto", imagen: "productos/b.png" },
      { frase: "mil doscientos vatios", texto: "1200W" },
    ],
    cierre: { frase: "Mira esto", lineas: ["@proinshop"] },
  };
  it("el plan pide voz femenina y el rojo de la marca si no se dice otra cosa", () => {
    const p = esquemaPlanPublicidad.parse(base);
    expect(p.voz).toBe("femenina");
    expect(p.acento).toBe("#ff2a2a");
    expect(SEGUNDOS_MAXIMOS).toBe(45);
    expect(() => esquemaPlanPublicidad.parse({ ...base, momentos: base.momentos.slice(0, 2) })).toThrow();
  });
  it("cada frase entra cuando la voz la dice, en orden, sin tildes ni signos de por medio", () => {
    const palabras = [
      "¿Se",
      "te",
      "va",
      "la",
      "luz?",
      "Mira",
      "esto.",
      "El",
      "generador",
      "de",
      "mil",
      "doscientos",
      "vatios.",
    ].map((text, i) => ({ text, startMs: i * 400, endMs: i * 400 + 350 }));
    expect(
      tiemposDeFrases(["se te va la luz", "Mira esto", "mil doscientos vatios", "no está"], palabras),
    ).toEqual([0, 2000, 4000, null]);
  });
  it("el costo es la voz más 2 centavos por segundo de avatar", () => {
    expect(costoPublicidadUsd(35, true, 0.04)).toBeCloseTo(0.74, 3);
    expect(costoPublicidadUsd(35, false, 0.04)).toBeCloseTo(0.04, 3);
  });
});
