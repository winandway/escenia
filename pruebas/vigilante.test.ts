import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { LIMITE_SIN_VIDA_MS, seTrabo } from "../estacion/src/vigilante";

describe("la Estación se reinicia sola si se traba (13 oct 2026: diez horas callada)", () => {
  it("se da por trabada solo después de 10 minutos sin señal de vida", () => {
    expect(LIMITE_SIN_VIDA_MS).toBe(600_000);
    expect(seTrabo(0, 599_000)).toBe(false);
    expect(seTrabo(0, 601_000)).toBe(true);
  });
  it("cada consulta al panel y cada vuelta del ciclo dan señal de vida, y el vigilante está puesto", () => {
    const panel = readFileSync("estacion/src/panel.ts", "utf8");
    const estacion = readFileSync("estacion/src/estacion.ts", "utf8");
    expect(panel).toMatch(/senalDeVida\(\)/);
    expect(estacion).toMatch(/senalDeVida\(\)/);
    expect(estacion).toMatch(/vigilar\(/);
    expect(estacion).toMatch(/process\.exit\(1\)/);
  });
});
