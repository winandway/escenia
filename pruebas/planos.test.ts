import { describe, expect, it } from "vitest";
import { esquemaEscena, insertarOpinion, type Escena } from "@compartido/guion";
import {
  ANTICIPO_MS,
  buscarFrase,
  claveDePalabra,
  QUIETO_MAXIMO_MS,
  rellenarHuecos,
  SEPARACION_MINIMA_MS,
  tiemposDePlanos,
  tramosQuietos,
} from "@compartido/planos";

// Una escena de 30 s: cada palabra dura 400 ms y empieza en el segundo 10.
const texto =
  "Años después grabó «Déjà Vu» con Shakira, un tema que hoy es 9 veces platino. El muchacho de El Bronx se había convertido en uno de los nombres más grandes de la bachata moderna.";
const palabras = texto.split(/\s+/).map((text, i) => ({
  text: ` ${text}`,
  startMs: 10_000 + i * 400,
  endMs: 10_000 + i * 400 + 380,
}));
const INICIO = 10_000;
const FIN = 40_000;

describe("los planos entran con la frase que se dice (C-RITMO-1)", () => {
  it("compara sin acentos, sin signos y sin mayúsculas", () => {
    expect(claveDePalabra("«Déjà")).toBe("deja");
    expect(claveDePalabra("Shakira,")).toBe("shakira");
    expect(claveDePalabra("9")).toBe("9");
    expect(claveDePalabra("—")).toBe("");
  });

  it("encuentra la frase donde se dice, y la segunda vez busca más adelante", () => {
    expect(buscarFrase(palabras, "con Shakira")).toBe(5);
    expect(buscarFrase(palabras, "deja vu")).toBe(3);
    expect(buscarFrase(palabras, "el bronx")).toBe(18);
    expect(buscarFrase(palabras, "de", 20)).toBe(25);
    expect(buscarFrase(palabras, "Romeo Santos")).toBeNull();
    expect(buscarFrase(palabras, "   ")).toBeNull();
  });

  it("la foto de Shakira entra justo antes de que la voz diga «Shakira»", () => {
    const { tiempos, sinFrase } = tiemposDePlanos(
      ["Shakira", "9 veces platino", "El Bronx"],
      palabras,
      INICIO,
      FIN,
    );
    expect(sinFrase).toBe(0);
    expect(tiempos[0]).toBe(palabras[6]!.startMs - ANTICIPO_MS);
    expect(tiempos[1]).toBe(palabras[12]!.startMs - ANTICIPO_MS);
    expect(tiempos[2]).toBe(palabras[18]!.startMs - ANTICIPO_MS);
  });

  it("un plano cuya frase no se dice se reparte entre sus vecinos, no se pierde", () => {
    const { tiempos, sinFrase } = tiemposDePlanos(
      ["Shakira", "esto no se dice", "El Bronx"],
      palabras,
      INICIO,
      FIN,
    );
    expect(sinFrase).toBe(1);
    const [a, b, c] = tiempos as number[];
    expect(b).toBeGreaterThan(a!);
    expect(b).toBeLessThan(c!);
  });

  it("dos planos nunca entran pegados ni cuando la escena ya se acaba", () => {
    const { tiempos } = tiemposDePlanos(["con", "Shakira"], palabras, INICIO, FIN);
    expect((tiempos[1] ?? 0) - (tiempos[0] ?? 0)).toBeGreaterThanOrEqual(SEPARACION_MINIMA_MS);
    const cortas = palabras.slice(0, 7);
    const fin = cortas[6]!.endMs;
    expect(tiemposDePlanos(["Shakira"], cortas, INICIO, fin).tiempos[0]).toBeNull();
  });
});

describe("ninguna imagen se queda quieta (C-RITMO-1)", () => {
  it("una escena de 30 s con una sola imagen recibe planos de relleno", () => {
    const nuevos = rellenarHuecos([], 0, 30_000);
    expect(nuevos.length).toBeGreaterThanOrEqual(6);
    const marcas = [0, ...nuevos, 30_000];
    for (let i = 0; i + 1 < marcas.length; i++)
      expect(marcas[i + 1]! - marcas[i]!).toBeLessThanOrEqual(QUIETO_MAXIMO_MS);
  });

  it("no toca los tramos que ya cambian a tiempo y rellena solo el hueco", () => {
    const cambios = [3000, 6500, 10_000];
    const nuevos = rellenarHuecos(cambios, 0, 24_000);
    expect(nuevos.every((t) => t > 10_000)).toBe(true);
    expect(nuevos.length).toBeGreaterThanOrEqual(2);
    expect(rellenarHuecos([3000, 7000], 0, 10_000)).toEqual([]);
  });

  it("el candado encuentra los tramos quietos de un video", () => {
    const quietos = tramosQuietos([
      { inicioMs: 0, finMs: 29_000, cambios: [] },
      { inicioMs: 29_000, finMs: 50_000, cambios: [33_000, 37_000, 41_000, 45_000] },
    ]);
    expect(quietos).toEqual([{ escena: 0, desdeMs: 0, hastaMs: 29_000 }]);
  });
});

describe("el guion admite planos por escena", () => {
  it("una escena con planos es válida y una con un tipo inventado no", () => {
    const base = {
      parte: "dato",
      narracion: "Grabó con Shakira.",
      visual: { tipo: "foto", busqueda: "Prince Royce 2013" },
    };
    const buena = esquemaEscena.safeParse({
      ...base,
      visual: {
        ...base.visual,
        planos: [
          { frase: "con Shakira", tipo: "foto", busqueda: "Shakira 2013", texto: "Shakira" },
          { frase: "Grabó", tipo: "dato", texto: "9 veces platino" },
        ],
      },
    });
    expect(buena.success).toBe(true);
    const mala = esquemaEscena.safeParse({
      ...base,
      visual: { ...base.visual, planos: [{ frase: "con Shakira", tipo: "holograma" }] },
    });
    expect(mala.success).toBe(false);
  });
});

describe("la opinión conserva sus planos al aprobar", () => {
  const escenas: Escena[] = [
    {
      parte: "gancho",
      narracion: "Quince nominaciones.",
      visual: { tipo: "foto", busqueda: "Prince Royce 2026" },
    },
    {
      parte: "opinion",
      narracion: "[opinión del editor]",
      visual: {
        tipo: "texto",
        texto_en_pantalla: "Mi opinión",
        planos: [{ frase: "completamente válida", tipo: "foto", busqueda: "Prince Royce sonriendo" }],
      },
    },
    {
      parte: "cierre",
      narracion: "La Academia no ha contestado.",
      visual: { tipo: "foto", busqueda: "Latin Grammy" },
    },
  ];

  it("al meter la opinión de Richard, los planos que ya tenía esa escena siguen ahí", () => {
    const r = insertarOpinion(escenas, "La molestia de Prince Royce es completamente válida.");
    const opinion = r.find((e) => e.parte === "opinion");
    expect(opinion?.narracion).toContain("completamente válida");
    expect(opinion?.visual.planos).toHaveLength(1);
    expect(r.map((e) => e.parte)).toEqual(["gancho", "opinion", "cierre"]);
  });

  it("un guion sin planos en la opinión queda como siempre", () => {
    const sin = escenas.map((e) =>
      e.parte === "opinion" ? { ...e, visual: { tipo: "texto" as const } } : e,
    );
    expect(
      insertarOpinion(sin, "Mi opinión de más de cuarenta letras para aprobar.")[1]?.visual.planos,
    ).toBeUndefined();
  });
});
