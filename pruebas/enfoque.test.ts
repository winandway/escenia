import { describe, expect, it } from "vitest";
import { elegirEnfoque, parsearCaras } from "@compartido/enfoque";
import { posicionObjeto } from "../estacion/src/remotion/enfoque";

describe("enfoque para el recorte vertical (C-SHORTS-2)", () => {
  it("lee la línea del detector", () => {
    const { ruta, caras } = parsearCaras("/x/a.jpg\t0.5,0.3,0.1,0.18;0.85,0.33,0.07,0.13");
    expect(ruta).toBe("/x/a.jpg");
    expect(caras).toHaveLength(2);
    expect(parsearCaras("/x/b.jpg\t").caras).toHaveLength(0);
  });

  it("enfoca la cara más grande, y junta a la pareja si están cerca", () => {
    expect(
      elegirEnfoque([
        { cx: 0.5, cy: 0.3, w: 0.1, h: 0.18 },
        { cx: 0.85, cy: 0.33, w: 0.03, h: 0.05 },
      ]),
    ).toEqual({
      x: 0.5,
      y: 0.3,
    });
    const pareja = elegirEnfoque([
      { cx: 0.35, cy: 0.3, w: 0.1, h: 0.18 },
      { cx: 0.62, cy: 0.32, w: 0.09, h: 0.16 },
    ]);
    expect(pareja?.x).toBeCloseTo(0.485, 2);
    expect(elegirEnfoque([])).toBeNull();
  });

  it("coloca una foto 16:9 en un marco 9:16 sin sacar la cara del cuadro", () => {
    const img = { ancho: 2048, alto: 1152 };
    const marco = { ancho: 1080, alto: 1920 };
    expect(posicionObjeto(img, marco, { x: 0.5, y: 0.3 })).toEqual({ x: 50, y: 50 });
    expect(posicionObjeto(img, marco, { x: 0.05, y: 0.3 }).x).toBe(0);
    expect(posicionObjeto(img, marco, { x: 0.95, y: 0.3 }).x).toBe(100);
    const cerca = posicionObjeto(img, marco, { x: 0.3, y: 0.3 }).x;
    expect(cerca).toBeGreaterThan(15);
    expect(cerca).toBeLessThan(35);
    expect(posicionObjeto(img, marco, null)).toEqual({ x: 50, y: 50 });
  });
});
