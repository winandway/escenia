import { describe, expect, it } from "vitest";
import {
  escalarAlineacion,
  FACTOR_MAXIMO,
  FACTOR_MINIMO,
  factorDeRitmo,
  LETRAS_POR_SEGUNDO_OBJETIVO,
  letrasHabladas,
} from "@compartido/ritmo";

describe("ritmo de lectura parejo (C-VOZ-4)", () => {
  const texto =
    "Celia Caridad Cruz y Alfonso nació el veintiuno de octubre de mil novecientos veinticinco, en el barrio de Santos Suárez.";

  it("cuenta solo letras pronunciadas", () => {
    expect(letrasHabladas("Hola, mundo.")).toBe(9);
  });

  it("acelera las piezas lentas y frena las rápidas hacia el mismo ritmo", () => {
    const letras = letrasHabladas(texto);
    expect(factorDeRitmo(texto, letras / 8.5)).toBeGreaterThan(1.2); // leía a 8,5 letras/s: se acelera
    expect(factorDeRitmo(texto, letras / 13)).toBeLessThan(0.95); // leía a 13: se frena un poco
    expect(factorDeRitmo(texto, letras / LETRAS_POR_SEGUNDO_OBJETIVO)).toBe(1);
  });

  it("nunca pasa de los topes ni toca piezas muy cortas", () => {
    expect(factorDeRitmo(texto, 60)).toBe(FACTOR_MAXIMO);
    expect(factorDeRitmo(texto, 1)).toBe(FACTOR_MINIMO);
    expect(factorDeRitmo("Sí.", 2)).toBe(1);
  });

  it("al acelerar, los tiempos de los subtítulos se acortan en la misma proporción", () => {
    const a = escalarAlineacion(
      { characters: ["a", "b"], character_start_times_seconds: [0, 1], character_end_times_seconds: [1, 2] },
      1.25,
    );
    expect(a.character_end_times_seconds).toEqual([0.8, 1.6]);
  });
});
