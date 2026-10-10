import { describe, expect, it } from "vitest";
import { encuadresDeCaras } from "../estacion/src/avatar-encuadre";

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
