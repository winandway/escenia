import { describe, expect, it } from "vitest";
import { encuadreFijo, encuadresDeCaras } from "../estacion/src/avatar-encuadre";

describe("avatar: encuadre de medio cuerpo que sigue la cara (nunca se ven los pies)", () => {
  it("lejos encuadra de la cintura para arriba, cerca abre a todo el cuadro, siempre 9:16 y dentro del video", () => {
    const lejos = { cx: 0.5, cy: 0.2, w: 0.1, h: 0.06 };
    const cerca = { cx: 0.5, cy: 0.25, w: 0.4, h: 0.25 };
    const e = encuadresDeCaras([...Array(40).fill(lejos), ...Array(40).fill(cerca)], 1080, 1920);
    const a = e[0];
    const b = e[79];
    expect(a && b).toBeTruthy();
    if (!a || !b) return;
    // Lejos: un sexto del alto por cara → 691 px de alto, muy por debajo del cuadro entero (sin pies).
    expect(a.h).toBeLessThan(800);
    expect(a.y + a.h).toBeLessThan(1920 * 0.7);
    // Cerca: el encuadre se abre hasta el cuadro entero.
    expect(b.h).toBeGreaterThan(1800);
    for (const x of e) {
      expect(Math.abs(x.w / x.h - 9 / 16)).toBeLessThan(0.01);
      expect(x.x).toBeGreaterThanOrEqual(0);
      expect(x.y + x.h).toBeLessThanOrEqual(1920);
      expect(x.x + x.w).toBeLessThanOrEqual(1080);
    }
  });
  it("los cuadros sin cara toman la última conocida y el cambio es suave", () => {
    const c = { cx: 0.5, cy: 0.2, w: 0.1, h: 0.06 };
    const e = encuadresDeCaras([c, null, null, c], 1080, 1920);
    expect(e).toHaveLength(4);
    expect(e[1]?.h).toBe(e[0]?.h);
  });
});

describe("avatar: encuadre fijo (sin movimiento de cámara, para que Kling no redibuje el fondo)", () => {
  it("un solo encuadre arriba, 9:16, centrado en la mediana de la cara, y cuenta las caras que quedan fuera", () => {
    const caras = [
      { cx: 0.5, cy: 0.15, w: 0.1, h: 0.06 },
      { cx: 0.52, cy: 0.2, w: 0.2, h: 0.12 },
      { cx: 0.95, cy: 0.2, w: 0.1, h: 0.06 },
    ];
    const { encuadre, fuera } = encuadreFijo(caras, 1080, 1920, 0.68);
    expect(encuadre.y).toBe(0);
    expect(Math.abs(encuadre.w / encuadre.h - 9 / 16)).toBeLessThan(0.01);
    expect(encuadre.h).toBeLessThan(1920 * 0.7);
    expect(encuadre.x + encuadre.w / 2).toBeCloseTo(0.52 * 1080, -1);
    expect(fuera).toBe(1);
  });
});
