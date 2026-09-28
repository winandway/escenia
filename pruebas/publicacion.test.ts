import { describe, expect, it } from "vitest";
import { esquemaGuion, esquemaPublicacionGenerada, etiquetasParaYouTube } from "@compartido/guion";
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
});
