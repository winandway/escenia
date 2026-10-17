import { describe, expect, it } from "vitest";
import { elegirVideo, fondoDeEscena } from "../estacion/src/fondo-escena";

// 14 oct 2026: el primer cuadro de casi todos los videos era la misma calle con carros, borrosa: era
// el clip de reserva «city night timelapse» detrás de la foto de la primera escena, y el banco de
// clips siempre devolvía el mismo.
describe("el fondo de una escena con foto es su propia foto, nunca un clip de reserva", () => {
  it("con foto propia, en cualquier estilo, el fondo es esa foto", () => {
    expect(
      fondoDeEscena({ sinFondo: false, propia: "fotos/a.jpg", documental: false, pideFondoDePersona: false }),
    ).toEqual({ tipo: "foto", ruta: "fotos/a.jpg" });
    expect(
      fondoDeEscena({ sinFondo: false, propia: "fotos/a.jpg", documental: true, pideFondoDePersona: true }),
    ).toEqual({ tipo: "foto", ruta: "fotos/a.jpg" });
  });
  it("sin foto: en biografías va la persona; en lo demás, un clip; en neón, nada", () => {
    expect(
      fondoDeEscena({ sinFondo: false, propia: null, documental: true, pideFondoDePersona: true }),
    ).toEqual({ tipo: "persona" });
    expect(
      fondoDeEscena({ sinFondo: false, propia: null, documental: false, pideFondoDePersona: false }),
    ).toEqual({ tipo: "clip" });
    expect(
      fondoDeEscena({ sinFondo: true, propia: "fotos/a.jpg", documental: false, pideFondoDePersona: false }),
    ).toEqual({ tipo: "ninguno" });
  });
});

describe("el banco de clips no repite el mismo video de un video a otro", () => {
  const videos = [
    { id: 1, width: 1920, height: 1080, duration: 12 },
    { id: 2, width: 1920, height: 1080, duration: 9 },
    { id: 3, width: 1920, height: 1080, duration: 3 },
  ];
  it("salta los usados en videos recientes y en este mismo video", () => {
    expect(elegirVideo(videos, false, new Set(), new Set())?.id).toBe(1);
    expect(elegirVideo(videos, false, new Set(), new Set([1]))?.id).toBe(2);
    expect(elegirVideo(videos, false, new Set([2]), new Set([1]))?.id).toBe(1); // mejor uno de otro video que uno de 3 s
  });
  it("si todos se usaron, igual devuelve uno (mejor repetir que quedarse sin imagen)", () => {
    expect(elegirVideo(videos, false, new Set([1, 2, 3]), new Set())).not.toBeNull();
    expect(elegirVideo([], false, new Set(), new Set())).toBeNull();
  });
});

describe("la producción y el banco de clips usan estas reglas (C-FONDO-2)", () => {
  it("produccion.ts decide el fondo con fondoDeEscena y visuales.ts elige con elegirVideo y la memoria de recientes", async () => {
    const { readFileSync } = await import("node:fs");
    const produccion = readFileSync("estacion/src/produccion.ts", "utf8");
    const visuales = readFileSync("estacion/src/visuales.ts", "utf8");
    expect(produccion).toMatch(/fondoDeEscena\(\{/);
    expect(produccion).not.toMatch(/const fondoDePersona = documental &&/);
    expect(visuales).toMatch(/elegirVideo\(datos\.videos/);
    expect(visuales).toMatch(/anotarReciente\(/);
  });
});

describe("el relleno solo repite fotos del protagonista (Juan Gabriel, 17 oct 2026)", () => {
  it("salta las fotos de otras personas y las de lugares; se queda con las del protagonista", async () => {
    const { fotosParaRelleno } = await import("../estacion/src/fondo-escena");
    const f = (ruta: string) => ({ ruta, ancho: 1000, alto: 1000, enfoque: null });
    const pool = fotosParaRelleno(
      [
        {
          foto: f("lecumberri.jpg"),
          fotos: [],
          busqueda: "Palacio de Lecumberri cárcel",
          deLugar: true,
          planos: [
            { foto: f("jg-joven.jpg"), texto: "Juan Gabriel" },
            { foto: f("prieta.jpg"), texto: "La Prieta Linda" },
            { foto: f("juarez.jpg"), texto: "" },
          ],
        },
        { foto: f("jg-1984.jpg"), fotos: [], busqueda: "Juan Gabriel 1984", deLugar: false, planos: [] },
        { foto: f("durcal.jpg"), fotos: [], busqueda: "Rocío Dúrcal 1984", deLugar: false, planos: [] },
      ],
      "Juan Gabriel",
    ).map((x) => x.ruta);
    expect(pool.sort()).toEqual(["jg-1984.jpg", "jg-joven.jpg"]);
  });
});

describe("la producción rellena solo con fotos del protagonista (C-RELLENO-1)", () => {
  it("produccion.ts arma el relleno con fotosParaRelleno y el nombre del título", async () => {
    const { readFileSync } = await import("node:fs");
    const produccion = readFileSync("estacion/src/produccion.ts", "utf8");
    expect(produccion).toMatch(/const fotosDelVideo = fotosParaRelleno\(/);
    expect(produccion).toMatch(/personaDelTitulo,\s*\);/);
  });
});
