import { describe, expect, it } from "vitest";
import { acomodarPartes, esquemaPlanLocucion, factorDeEstiramiento } from "../estacion/src/locucion-plan";

// Locución sobre un video ya editado (23 oct 2026, el video de quince años): la voz entra con calma, con
// sus pausas, y nunca se sale del video.
describe("locución: dónde entra cada párrafo en el video", () => {
  const o = { largoMs: 60_000, inicioMs: 1000, margenFinalMs: 1000, pausaMinMs: 500, pausaMaxMs: 2500 };

  it("reparte parejo lo que sobra entre las pausas y termina antes del margen final", () => {
    const r = acomodarPartes([{ duracionMs: 18_000 }, { duracionMs: 18_000 }, { duracionMs: 18_000 }], o);
    // Ventana 58 s, voz 54 s: quedan 4 s para dos pausas de 2 s.
    expect(r.inicios).toEqual([1000, 21_000, 41_000]);
    expect(r.sobraMs).toBe(0);
  });

  it("ninguna pausa pasa del tope: lo que sobra queda al final", () => {
    const r = acomodarPartes([{ duracionMs: 5000 }, { duracionMs: 5000 }], o);
    expect(r.inicios).toEqual([1000, 8500]);
    expect(r.sobraMs).toBe(59_000 - 13_500);
  });

  it("un párrafo con hora fija no entra antes de su hora (el «felices quince años» en la tarjeta final)", () => {
    const r = acomodarPartes(
      [{ duracionMs: 10_000 }, { duracionMs: 10_000 }, { duracionMs: 2000, desdeMs: 50_000 }],
      o,
    );
    expect(r.inicios[2]).toBe(50_000);
    // Antes del párrafo fijo, las pausas no pasan del tope.
    expect((r.inicios[1] ?? 0) - 11_000).toBeLessThanOrEqual(o.pausaMaxMs);
  });

  it("si el anterior todavía habla, el párrafo fijo entra apenas termine con la pausa mínima", () => {
    const r = acomodarPartes([{ duracionMs: 30_000 }, { duracionMs: 5000, desdeMs: 20_000 }], o);
    expect(r.inicios[1]).toBe(1000 + 30_000 + o.pausaMinMs);
  });

  it("dice cuánto falta cuando la voz no cabe en el video", () => {
    const r = acomodarPartes([{ duracionMs: 40_000 }, { duracionMs: 30_000 }], o);
    expect(r.sobraMs).toBeLessThan(0);
  });
});

describe("locución: el video se estira parejo antes que acelerar la voz", () => {
  const o = { largoMs: 100_000, inicioMs: 1000, margenFinalMs: 1000, pausaIdealMs: 1000, maximo: 1.35 };

  it("no se toca si la voz ya cabe con calma", () => {
    expect(factorDeEstiramiento([{ duracionMs: 40_000 }, { duracionMs: 40_000 }], o)).toBe(1);
  });

  it("se estira lo justo para la voz, sus pausas, el inicio y el margen", () => {
    // 1 + 110 + 2 pausas de 1 + 1 = 114 s en un video de 100 s.
    expect(
      factorDeEstiramiento([{ duracionMs: 50_000 }, { duracionMs: 30_000 }, { duracionMs: 30_000 }], o),
    ).toBe(1.14);
  });

  it("el párrafo con hora fija alcanza a entrar a su hora con las pausas ideales (no quedan pegados)", () => {
    // Antes del párrafo fijo: 1 s de inicio, 40 s y 40 s de voz y dos pausas de 1 s = 83 s; su hora es
    // el segundo 70 del video original, así que hay que estirar 83 / 70.
    const f = factorDeEstiramiento(
      [{ duracionMs: 40_000 }, { duracionMs: 40_000 }, { duracionMs: 2000, desdeMs: 70_000 }],
      o,
    );
    expect(f).toBeCloseTo(83 / 70, 3);
    const r = acomodarPartes(
      [{ duracionMs: 40_000 }, { duracionMs: 40_000 }, { duracionMs: 2000, desdeMs: Math.round(70_000 * f) }],
      { largoMs: 100_000 * f, inicioMs: 1000, margenFinalMs: 1000, pausaMinMs: 500, pausaMaxMs: 2500 },
    );
    expect((r.inicios[1] ?? 0) - 41_000).toBeGreaterThanOrEqual(990);
  });

  it("nunca pasa del máximo", () => {
    expect(factorDeEstiramiento([{ duracionMs: 200_000 }], o)).toBe(1.35);
  });

  it("el plan arranca con la voz de Richard, su modelo y la calma por defecto", () => {
    const p = esquemaPlanLocucion.parse({ video: "v.mp4", partes: [{ texto: "Hola" }], salida: "s.mp4" });
    expect(p.voz).toBe("richard");
    expect(p.modelo).toBe("eleven_multilingual_v2");
    expect(p.estirar_video).toBe(true);
  });
});
