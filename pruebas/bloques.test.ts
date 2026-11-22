import { describe, expect, it } from "vitest";
import {
  aplicarHomografia,
  asegurarSinJuegos,
  cambiosDelPlan,
  deformacionPantalla,
  efectosDelPlan,
  FICHA_ESTILO_BLOQUES,
  homografia,
  margenPalabra,
  matriz3dCss,
  momentoDe,
  nombresProhibidosEn,
  NEGATIVO_BLOQUES,
  PERSONAS_BLOQUES,
  promptEscenaBloques,
  promptEscenaConPersonaje,
  promptHojaPersonaje,
  revisarRitmo,
  trozosDeSubtitulos,
  type Cuadrilatero,
  type PalabraVoz,
  type PlanTutorialBloques,
} from "@compartido/bloques";

// Candado C-BLOQUES-1 (docs/TUTORIAL-BLOQUES.md): el formato «Tutorial en bloques».

describe("estilo de bloques ORIGINAL: ningún juego en los pedidos", () => {
  it("encuentra los nombres de juegos y marcas de bloques, sin importar mayúsculas ni acentos", () => {
    expect(nombresProhibidosEn("un mundo estilo Minecraft")).toEqual(["minecraft"]);
    expect(nombresProhibidosEn("personajes de ROBLOX y de GTA")).toEqual(["roblox", "gta"]);
    expect(nombresProhibidosEn("figuras de Lego")).toEqual(["lego"]);
  });

  it("no confunde palabras comunes que contienen esos nombres", () => {
    expect(nombresProhibidosEn("cuando llego al colegio en mi carro")).toEqual([]);
    expect(nombresProhibidosEn("Steve Jobs presentó el teléfono")).toEqual([]);
  });

  it("revienta antes de pedir una imagen que nombra un juego", () => {
    expect(() => asegurarSinJuegos("voxel art like Minecraft")).toThrow(/minecraft/);
    expect(() => promptEscenaBloques("a town in the style of GTA")).toThrow(/gta/);
    expect(() => promptEscenaConPersonaje("a lego city")).toThrow(/lego/);
  });

  it("la ficha de estilo es de bloques y no nombra ningún juego", () => {
    expect(FICHA_ESTILO_BLOQUES).toMatch(/voxel/i);
    expect(nombresProhibidosEn(FICHA_ESTILO_BLOQUES + NEGATIVO_BLOQUES + PERSONAS_BLOQUES)).toEqual([]);
  });

  it("la gente solo se describe en las escenas con gente (si no, el modelo metía un muñeco)", () => {
    expect(promptEscenaBloques("an empty desk")).not.toContain(PERSONAS_BLOQUES);
    expect(promptEscenaBloques("a plaza", { personas: true })).toContain(PERSONAS_BLOQUES);
    expect(promptEscenaConPersonaje("a plaza")).toContain(PERSONAS_BLOQUES);
    expect(promptHojaPersonaje("a driver")).toContain("reference sheet");
  });

  it("la pantalla verde se pide solo cuando hace falta", () => {
    expect(promptEscenaBloques("a phone", { pantallaVerde: true })).toContain("#00FF00");
    expect(promptEscenaBloques("a phone")).not.toContain("#00FF00");
  });
});

describe("la captura real pegada por cuatro esquinas", () => {
  const q: Cuadrilatero = [
    [380.9, 828],
    [676.1, 844.2],
    [804.8, 1409.8],
    [504.9, 1353.9],
  ];

  it("lleva cada esquina de la captura a su esquina de la pantalla", () => {
    const m = homografia(780, 1600, q);
    const esquinas: [number, number][] = [
      [0, 0],
      [780, 0],
      [780, 1600],
      [0, 1600],
    ];
    esquinas.forEach(([x, y], k) => {
      const [X, Y] = aplicarHomografia(m, x, y);
      expect(X).toBeCloseTo(q[k]![0], 3);
      expect(Y).toBeCloseTo(q[k]![1], 3);
    });
  });

  it("también sirve para una pantalla de frente (sin perspectiva)", () => {
    const recto: Cuadrilatero = [
      [100, 200],
      [500, 200],
      [500, 1020],
      [100, 1020],
    ];
    const m = homografia(400, 820, recto);
    expect(aplicarHomografia(m, 200, 410)).toEqual([300, 610]);
    expect(deformacionPantalla(400, 820, recto)).toBe(1);
  });

  it("se escribe como matrix3d de CSS con 16 números", () => {
    const css = matriz3dCss(homografia(780, 1600, q));
    expect(css.startsWith("matrix3d(")).toBe(true);
    expect(css.slice(9, -1).split(",")).toHaveLength(16);
  });

  it("no acepta esquinas alineadas ni una captura sin tamaño", () => {
    expect(() => homografia(0, 10, q)).toThrow();
    expect(() =>
      homografia(10, 10, [
        [0, 0],
        [1, 1],
        [2, 2],
        [3, 3],
      ]),
    ).toThrow(/alineadas/);
  });

  it("avisa cuánto se estiraría la captura en una pantalla de otra forma", () => {
    expect(deformacionPantalla(780, 1600, q)).toBeGreaterThan(1);
  });
});

describe("subtítulos tipo CapCut", () => {
  const w = (text: string, s: number): PalabraVoz => ({ text, startMs: s * 1000, endMs: s * 1000 + 300 });
  const palabras = [
    w("Descárgala", 0),
    w("en", 0.6),
    w("Google", 0.8),
    w("Play,", 1.1),
    w("ábrela", 1.8),
    w("y", 2.3),
    w("toca", 2.5),
  ];

  it("trozos de hasta 3 palabras, cortando en cada signo", () => {
    const t = trozosDeSubtitulos(palabras);
    expect(t.map((x) => x.palabras.map((p) => p.text).join(" "))).toEqual([
      "Descárgala en",
      "Google Play,",
      "ábrela y toca",
    ]);
    expect(t[0]!.hasta).toBe(t[1]!.desde);
    expect(t[2]!.hasta).toBeCloseTo(2.5 + 0.3 + 1.2, 5);
  });

  it("la palabra que se agranda no se come el espacio (Ica: «DEDICIEMBRE»)", () => {
    // Con 12 px por lado se pegaba; el margen tiene que cubrir lo que crece la palabra y dejar aire.
    expect(margenPalabra(88, 1.08)).toBeGreaterThanOrEqual(24);
    expect(margenPalabra(74, 1.1)).toBeGreaterThan(74 * 0.1 * 2);
  });
});

describe("ritmo, efectos y tiempos atados a la voz", () => {
  const palabras: PalabraVoz[] = [
    { text: "Descarga", startMs: 0, endMs: 400 },
    { text: "Divoox", startMs: 500, endMs: 900 },
    { text: "Driver", startMs: 950, endMs: 1300 },
    { text: "y", startMs: 1400, endMs: 1500 },
    { text: "Divoox", startMs: 2000, endMs: 2400 },
  ];

  it("encuentra la n-ésima vez que la voz dice una palabra, sin signos ni acentos", () => {
    expect(momentoDe(palabras, "Divoox", 2)).toBe(2);
    expect(momentoDe(palabras, "divoox", 1, 1)).toBe(2);
    expect(() => momentoDe(palabras, "Google")).toThrow(/no dice/);
  });

  it("marca los tramos de más de 5 s sin una imagen nueva", () => {
    expect(revisarRitmo([3, 6, 9], 12).tramosLargos).toEqual([]);
    expect(revisarRitmo([3, 9.5], 12).tramosLargos).toEqual([[3, 9.5]]);
  });

  const plan: PlanTutorialBloques = {
    duracion: 12,
    colores: { marca: "#F20D20", oscuro: "#101010", exito: "#14A44D", resalte: "#FFD400" },
    coloresCaptura: {},
    palabras,
    sinSubtitulos: [],
    portada: { hasta: 2, etiqueta: "", lineas: [], logo: "", remate: "", sello: { t: 1, texto: "" } },
    escenas: [
      { id: "a", inicio: 0, fondo: "a.png", camara: [{ t: 0, x: 0, y: 0, z: 1 }], transicion: "corte" },
      {
        id: "b",
        inicio: 4,
        fondo: "b.png",
        camara: [{ t: 4, x: 0, y: 0, z: 1 }],
        transicion: "diagonal",
        telefono: {
          desde: 4.5,
          capturas: [
            { t: 4.5, src: "x.png" },
            { t: 6, src: "y.png" },
          ],
          posiciones: [{ t: 4.5, x: 500, top: 470, ancho: 420 }],
        },
        sellos: [{ t: 6.1, texto: "LISTO", top: 700 }],
      },
    ],
    progresos: [],
    cierre: {
      desde: 9,
      logo: "",
      titulo: "",
      insignia: "",
      toque: 10,
      remate: { t: 11, texto: "" },
      legal: "",
    },
  };

  it("cuenta cada cosa nueva como un cambio de imagen", () => {
    expect(cambiosDelPlan(plan)).toEqual([0, 1, 4, 4.5, 6, 6.1, 9, 10, 11]);
  });

  it("un efecto por cambio, nunca dos pegados y ninguno encima del nombre de la marca", () => {
    const e = efectosDelPlan(plan, [2]);
    for (let k = 1; k < e.length; k++) expect(e[k]!.t - e[k - 1]!.t).toBeGreaterThanOrEqual(0.22);
    expect(e.some((x) => x.t > 1.7 && x.t < 2.6)).toBe(false);
    // el «pop» de la captura (6) y el golpe del sello (6,1) chocan: se queda el más fuerte
    expect(e.filter((x) => x.t >= 6 && x.t < 6.2).map((x) => x.sfx)).toEqual(["boom"]);
    expect(e.some((x) => x.sfx.startsWith("whoosh") && Math.abs(x.t - 3.88) < 0.01)).toBe(true);
  });
});
