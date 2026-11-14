import { describe, expect, it } from "vitest";
import { propsDePrueba } from "../estacion/src/taller-prueba";

// C-TALLER-3: el video sintético con el que se mide el taller en la nube tiene que pasar el esquema de
// la plantilla. El 13 nov 2026 la primera prueba en la nube falló al instante porque le faltaban `clip`
// en cada escena y `producto` (el esquema había crecido y nadie lo comprobaba fuera de la nube).
describe("C-TALLER-3: el video de prueba del taller", () => {
  it("pasa el esquema de la plantilla y dura 62 s en escenas de 3,1 s", () => {
    const p = propsDePrueba();
    expect(p.duracionMs).toBe(62_000);
    expect(p.escenas).toHaveLength(20);
    expect(p.escenas.every((e) => e.clip === null)).toBe(true);
    expect(p.producto).toBeNull();
  });
});
