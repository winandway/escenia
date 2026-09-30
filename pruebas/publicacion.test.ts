import { describe, expect, it } from "vitest";
import {
  esquemaGuion,
  esquemaPublicacionDeLaIA,
  esquemaPublicacionGenerada,
  etiquetasParaYouTube,
  unirEtiquetas,
} from "@compartido/guion";
import { instruccionesPublicacion, mensajePublicacion } from "@/lib/publicacion";

const guion = esquemaGuion.parse({
  titulo: "Celia Cruz: la niña que gritaba azúcar",
  gancho: "Una niña de La Habana cantaba para dormir a sus hermanos.",
  escenas: [
    { parte: "gancho", narracion: "Celia nació en 1925 en Santos Suárez.", visual: { tipo: "ia" } },
    { parte: "interludio", narracion: "", duracion_seg: 6, visual: { tipo: "stock", busqueda: "havana" } },
    {
      parte: "cierre",
      narracion: "Murió en 2003 en Nueva Jersey.",
      visual: { tipo: "foto", busqueda: "Celia Cruz" },
    },
  ],
});

describe("textos para YouTube (C-PUBLICACION-1)", () => {
  it("el mensaje a la IA lleva las escenas numeradas y los shorts con su rango", () => {
    const m = mensajePublicacion(guion, "Biografía de artista", [
      {
        indice: 1,
        titulo_original: "Santos Suárez, 1925",
        escena_inicio: 0,
        escena_fin: 1,
        duracion_seg: 99,
      },
    ]);
    expect(m).toContain("1. [gancho] Celia nació en 1925");
    expect(m).toContain("2. [interludio] (sin voz: respiro musical)");
    expect(m).toContain("Short 1 (escenas 1 a 2, 99 s; título provisional: «Santos Suárez, 1925»)");
    expect(instruccionesPublicacion()).toContain("30 palabras clave");
  });

  it("acepta como máximo 30 palabras clave y las deja en una línea de 500 letras", () => {
    const treinta = Array.from({ length: 30 }, (_, i) => `palabra ${i + 1}`);
    expect(() =>
      esquemaPublicacionGenerada.parse({
        titulo: "Celia Cruz: de niña pobre a Reina de la Salsa",
        descripcion: "Un video sobre la vida de Celia Cruz, de La Habana a Nueva York. #CeliaCruz",
        etiquetas: treinta,
        shorts: [{ indice: 1, titulo: "Su papá quería una maestra" }],
      }),
    ).not.toThrow();
    expect(() =>
      esquemaPublicacionGenerada.parse({
        titulo: "Celia Cruz: de niña pobre a Reina de la Salsa",
        descripcion: "Un video sobre la vida de Celia Cruz, de La Habana a Nueva York. #CeliaCruz",
        etiquetas: [...treinta, "una más"],
        shorts: [],
      }),
    ).toThrow();
    const largas = Array.from({ length: 30 }, (_, i) => `una etiqueta bastante larga número ${i + 1}`);
    expect(etiquetasParaYouTube(largas).length).toBeLessThanOrEqual(500);
    expect(etiquetasParaYouTube(["a", "b"])).toBe("a, b");
  });

  it("un guion viejo sin publicación sigue siendo válido", () => {
    expect(guion.publicacion).toBeNull();
  });

  it("si la IA manda palabras clave de más, quedan 30 con las de inglés adentro (C-PUBLICACION-2)", () => {
    const espanol = Array.from({ length: 30 }, (_, i) => `clave ${i + 1}`);
    const ingles = Array.from({ length: 12 }, (_, i) => `keyword ${i + 1}`);
    // Lo que rompió el 30 sep 2026: 30 en español más las de inglés. Ya no se rechaza.
    const cruda = esquemaPublicacionDeLaIA.parse({
      titulo: "Un título de prueba para el video",
      descripcion: "Una descripción de prueba suficientemente larga para pasar el esquema.",
      etiquetas: espanol,
      etiquetas_ingles: ingles,
      shorts: [],
    });
    const unidas = unirEtiquetas(cruda.etiquetas, cruda.etiquetas_ingles);
    expect(unidas.length).toBe(30);
    expect(unidas.filter((e) => e.startsWith("keyword")).length).toBe(8);
    expect(unidas.filter((e) => e.startsWith("clave")).length).toBe(22);
    expect(esquemaPublicacionGenerada.safeParse({ ...cruda, etiquetas: unidas }).success).toBe(true);
    // Sin repetir (aunque cambie la mayúscula) y sin vacías.
    expect(unirEtiquetas(["Bachata", "bachata", " ", "El Bronx"], ["Bachata", "bachata story"])).toEqual([
      "El Bronx",
      "Bachata",
      "bachata story",
    ]);
    expect(unirEtiquetas(["solo español"], [])).toEqual(["solo español"]);
  });
});
