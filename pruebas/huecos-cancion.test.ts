import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { esquemaEscena, HUECO_CANCION_SEG } from "@compartido/guion";
import { guionDesdeLaIA, type GuionDeLaIA } from "@compartido/guion-ia";
import { esquemaEscenaVideo } from "../estacion/src/remotion/props";
import { volumenMusica, VOLUMEN_BAJO } from "../estacion/src/remotion/musica";

// Regla de Richard (17 oct 2026): en los videos de música, después de nombrar una canción va un hueco
// de 5 s (voz callada, música apagada, recuadro pequeño con el nombre) para pegar la canción original.
describe("huecos de canción en las biografías y videos de música", () => {
  const visual = { tipo: "foto" as const, busqueda: "Juan Gabriel concierto 1990" };
  it("un interludio puede llevar su canción; una escena con voz no", () => {
    const hueco = esquemaEscena.safeParse({
      parte: "interludio",
      narracion: "",
      duracion_seg: HUECO_CANCION_SEG,
      visual,
      cancion: { titulo: "Amor eterno", artista: "Juan Gabriel" },
    });
    expect(hueco.success).toBe(true);
    const mal = esquemaEscena.safeParse({
      parte: "dato",
      narracion: "Escribió Amor eterno.",
      visual,
      cancion: { titulo: "Amor eterno", artista: "Juan Gabriel" },
    });
    expect(mal.success).toBe(false);
    expect(HUECO_CANCION_SEG).toBe(5);
  });

  it("lo que escribe la IA pasa a hueco de 5 s solo en un interludio con canción", () => {
    const vacio = { seccion: "", nodos: [], flechas: [], formula: "" };
    const v = (extra: Partial<GuionDeLaIA["escenas"][number]["visual"]> = {}) => ({
      tipo: "stock",
      busqueda: "concert crowd",
      url: "",
      prompt_imagen: "",
      cuadros: [],
      titular: "",
      fecha: "",
      cuerpo: "",
      texto_en_pantalla: "",
      foto_de: "persona",
      planos: [],
      diagrama: vacio,
      ...extra,
    });
    const g = guionDesdeLaIA({
      titulo: "Juan Gabriel: la canción que no podía cantar",
      gancho: "Hay una canción que Juan Gabriel casi nunca pudo cantar completa.",
      escenas: [
        {
          parte: "gancho",
          narracion: "Hay una canción que casi no pudo cantar.",
          duracion_seg: 0,
          cancion: "Amor eterno",
          cancion_artista: "Juan Gabriel",
          visual: v(),
        },
        {
          parte: "interludio",
          narracion: "",
          duracion_seg: 7,
          cancion: "  Amor eterno ",
          cancion_artista: "Juan Gabriel",
          visual: v(),
        },
        {
          parte: "interludio",
          narracion: "",
          duracion_seg: 7,
          cancion: "",
          cancion_artista: "",
          visual: v(),
        },
        {
          parte: "cierre",
          narracion: "Su música sigue viva.",
          duracion_seg: 0,
          cancion: "",
          cancion_artista: "",
          visual: v(),
        },
      ],
      hechos_a_verificar: [],
      descripcion_youtube: "",
      etiquetas: [],
      musica: "romantic mariachi strings",
    } as GuionDeLaIA);
    expect(g.escenas[0]?.cancion).toBeUndefined();
    expect(g.escenas[1]?.cancion).toEqual({ titulo: "Amor eterno", artista: "Juan Gabriel" });
    expect(g.escenas[1]?.duracion_seg).toBe(HUECO_CANCION_SEG);
    expect(g.escenas[2]?.cancion).toBeUndefined();
    expect(g.escenas[2]?.duracion_seg).toBe(7);
  });

  it("la escena del video lleva la canción, y en el hueco la música se apaga", () => {
    const e = esquemaEscenaVideo.parse({
      parte: "interludio",
      inicioMs: 0,
      finMs: 5000,
      estilo: "foto",
      clip: null,
      interludio: true,
      cancion: { titulo: "Querida", artista: "Juan Gabriel" },
    });
    expect(e.cancion?.titulo).toBe("Querida");
    expect(
      esquemaEscenaVideo.parse({ parte: "dato", inicioMs: 0, finMs: 5000, estilo: "foto", clip: null })
        .cancion,
    ).toBeNull();
    const huecos = [{ inicioMs: 10_000, finMs: 15_000 }];
    expect(volumenMusica(12_500, [], 60_000, 70_000, 1, huecos)).toBe(0);
    expect(volumenMusica(5_000, [], 60_000, 70_000, 1, huecos)).toBeCloseTo(VOLUMEN_BAJO, 3);
    expect(volumenMusica(20_000, [], 60_000, 70_000, 1, huecos)).toBeCloseTo(VOLUMEN_BAJO, 3);
  });

  it("la plantilla dibuja el recuadro del hueco y el guionista sabe pedirlos", () => {
    const plantilla = readFileSync("estacion/src/remotion/TechExplainer.tsx", "utf8");
    expect(plantilla).toMatch(/HuecoCancion/);
    const prompt = readFileSync("src/lib/prompt.ts", "utf8");
    expect(prompt).toMatch(/cancion_artista/);
  });
});

describe("el hueco se reconoce aunque la IA lo etiquete mal (guion 20, 17 oct 2026)", () => {
  it("una escena con canción cuyo texto es solo el título pasa a hueco de 5 s; una narración de verdad no", () => {
    const vacio = { seccion: "", nodos: [], flechas: [], formula: "" };
    const v = {
      tipo: "foto",
      busqueda: "Juan Gabriel 1971",
      url: "",
      prompt_imagen: "",
      cuadros: [],
      titular: "",
      fecha: "",
      cuerpo: "",
      texto_en_pantalla: "",
      foto_de: "persona",
      planos: [],
      diagrama: vacio,
    };
    const g = guionDesdeLaIA({
      titulo: "Juan Gabriel: la canción de la cárcel",
      gancho: "A los veinte años estaba preso.",
      escenas: [
        {
          parte: "gancho",
          narracion: "A los veinte años estaba preso.",
          duracion_seg: 0,
          cancion: "",
          cancion_artista: "",
          visual: v,
        },
        {
          parte: "dato",
          narracion: "No tengo dinero",
          duracion_seg: 0,
          cancion: "No tengo dinero",
          cancion_artista: "Juan Gabriel",
          visual: v,
        },
        {
          parte: "hueco de canción",
          narracion: "",
          duracion_seg: 0,
          cancion: "Amor eterno",
          cancion_artista: "Juan Gabriel",
          visual: v,
        },
        {
          parte: "dato",
          narracion: "En 1984 salió Querida y fue un récord.",
          duracion_seg: 0,
          cancion: "Querida",
          cancion_artista: "Juan Gabriel",
          visual: v,
        },
        {
          parte: "cierre",
          narracion: "Su música sigue viva.",
          duracion_seg: 0,
          cancion: "",
          cancion_artista: "",
          visual: v,
        },
      ],
      hechos_a_verificar: [],
      descripcion_youtube: "",
      etiquetas: [],
      musica: "mariachi",
    } as GuionDeLaIA);
    expect(g.escenas[1]).toMatchObject({
      parte: "interludio",
      narracion: "",
      duracion_seg: 5,
      cancion: { titulo: "No tengo dinero" },
    });
    expect(g.escenas[2]).toMatchObject({
      parte: "interludio",
      narracion: "",
      duracion_seg: 5,
      cancion: { titulo: "Amor eterno" },
    });
    expect(g.escenas[3]?.parte).toBe("dato");
    expect(g.escenas[3]?.cancion).toBeUndefined();
  });
});
