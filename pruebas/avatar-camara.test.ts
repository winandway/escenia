import { describe, expect, it } from "vitest";
import { expresionDeZoom, filtroDeCamara, golpesDeCamara } from "../estacion/src/avatar-camara";

describe("avatar: movimiento de cámara en las risas y en el remate", () => {
  const eventos = [
    { text: "Parce", start: 0.2, end: 0.5, type: "word" },
    { text: "jalonazo", start: 6.1, end: 6.8, type: "word" },
    { text: "(risas)", start: 7.0, end: 8.0, type: "audio_event" },
    { text: "(laughs)", start: 8.1, end: 8.6, type: "audio_event" },
    { text: "¿peluca", start: 10.4, end: 10.9, type: "word" },
    { text: "Suscríbete", start: 22.0, end: 22.6, type: "word" },
  ];
  it("pone un golpe en cada risa y en las palabras pedidas, separados al menos 2,2 s", () => {
    const g = golpesDeCamara(eventos, ["peluca", "suscribete"]);
    expect(g.map((x) => x.t)).toEqual([7.0, 10.4, 22.0]);
    expect(g[0]?.motivo).toBe("risa");
    expect(golpesDeCamara(eventos)).toHaveLength(1);
  });
  it("el zoom crece despacio todo el clip y salta en cada golpe", () => {
    const z = expresionDeZoom(25, [{ t: 7, motivo: "risa" }]);
    expect(z).toContain("1+0.08*clip(it/25.000,0,1)");
    expect(z).toContain("+0.3*(");
    expect(z).toContain("it-6.850");
    expect(expresionDeZoom(25, [])).not.toContain("+0.3*");
    expect(() => expresionDeZoom(0, [])).toThrow(/no dura/);
  });
  it("el filtro agranda al doble, recorta sobre la cara y devuelve el mismo tamaño", () => {
    const f = filtroDeCamara(25, [], { cx: 0.5, cy: 0.25 }, 1088, 1920, 25);
    expect(f).toContain("scale=2176:3840");
    expect(f).toContain("s=1088x1920:fps=25");
    expect(f).toContain("ih*0.2500");
    // FlashTalk (448×768) sale a 1920 de alto con su misma proporción.
    expect(filtroDeCamara(25, [], { cx: 0.5, cy: 0.25 }, 448, 768, 25)).toContain("s=1120x1920");
  });
});
