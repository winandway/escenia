// C-TALLER-2: el taller en la nube no puede pasar de 6 dólares al mes (lo aprobado por Gerencia).
import { describe, expect, it } from "vitest";
import {
  AMARILLO_SEGUNDOS_MES,
  DOLARES_POR_SEGUNDO,
  estadoDelGasto,
  mesDe,
  TOPE_SEGUNDOS_MES,
} from "../taller/src/tope";

describe("tope del taller en la nube (C-TALLER-2)", () => {
  it("el tope del mes cuesta menos de 6 dólares en un standard-4", () => {
    expect(TOPE_SEGUNDOS_MES * DOLARES_POR_SEGUNDO).toBeLessThanOrEqual(6);
    expect(DOLARES_POR_SEGUNDO).toBeCloseTo(0.00011, 6);
  });
  it("verde, amarillo desde unos 60 comerciales, rojo en el tope (y ahí no se enciende)", () => {
    expect(estadoDelGasto(0)).toBe("verde");
    expect(estadoDelGasto(AMARILLO_SEGUNDOS_MES)).toBe("amarillo");
    expect(estadoDelGasto(TOPE_SEGUNDOS_MES)).toBe("rojo");
    expect(AMARILLO_SEGUNDOS_MES).toBeLessThan(TOPE_SEGUNDOS_MES);
  });
  it("el contador va por mes (se reinicia solo el día 1)", () => {
    expect(mesDe(new Date("2026-11-30T23:59:00Z"))).toBe("2026-11");
    expect(mesDe(new Date("2026-12-01T00:00:00Z"))).toBe("2026-12");
  });
});
