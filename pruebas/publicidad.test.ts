import { describe, expect, it } from "vitest";
import {
  acentoDeLogo,
  costoPublicidadUsd,
  elegirLogo,
  esquemaPlanPublicidad,
  planParaArmar,
  SEGUNDOS_MAXIMOS,
  tiemposDeFrases,
} from "../estacion/src/publicidad-plan";

describe("publicidad en Short: el plan, los tiempos y el costo (prototipo, 17 oct 2026)", () => {
  const base = {
    marca: "PRO IN SHOP",
    logo: "logo/logo.png",
    texto: "¿Se te va la luz? Mira esto. El generador de mil doscientos vatios.",
    momentos: [
      { frase: "Se te va la luz", imagen: "productos/a.png", texto: "¿SE TE VA LA LUZ?" },
      { frase: "Mira esto", imagen: "productos/b.png" },
      { frase: "mil doscientos vatios", texto: "1200W" },
    ],
    cierre: { frase: "Mira esto", lineas: ["@proinshop"] },
  };
  it("el plan pide la voz venezolana y el rojo de la marca si no se dice otra cosa", () => {
    const p = esquemaPlanPublicidad.parse(base);
    expect(p.voz).toBe("venezolana");
    expect(p.acento).toBe("#ff2a2a");
    expect(SEGUNDOS_MAXIMOS).toBe(45);
    expect(() => esquemaPlanPublicidad.parse({ ...base, momentos: base.momentos.slice(0, 2) })).toThrow();
  });
  it("cada frase entra cuando la voz la dice, en orden, sin tildes ni signos de por medio", () => {
    const palabras = [
      "¿Se",
      "te",
      "va",
      "la",
      "luz?",
      "Mira",
      "esto.",
      "El",
      "generador",
      "de",
      "mil",
      "doscientos",
      "vatios.",
    ].map((text, i) => ({ text, startMs: i * 400, endMs: i * 400 + 350 }));
    expect(
      tiemposDeFrases(["se te va la luz", "Mira esto", "mil doscientos vatios", "no está"], palabras),
    ).toEqual([0, 2000, 4000, null]);
  });
  it("el costo es la voz más 2 centavos por segundo de avatar", () => {
    expect(costoPublicidadUsd(35, true, 0.04)).toBeCloseTo(0.74, 3);
    expect(costoPublicidadUsd(35, false, 0.04)).toBeCloseTo(0.04, 3);
  });
});

describe("publicidad pedida desde el panel: logo, color de la marca y plan para armar", () => {
  const imgs = [
    { nombre: "chica.png", ruta: "/mac/chica.png", transparente: true },
    { nombre: "generador.jpg", ruta: "/mac/generador.jpg", transparente: false },
    { nombre: "Logo Pro In Shop.png", ruta: "/mac/logo.png", transparente: true },
  ];
  it("el logo es la imagen que se llama «logo»; si no hay, la primera sin fondo que no sea la persona", () => {
    expect(elegirLogo(imgs, "chica.png")?.ruta).toBe("/mac/logo.png");
    const sinLogo = imgs.filter((i) => !i.nombre.startsWith("Logo"));
    expect(elegirLogo(sinLogo, "chica.png")).toBeNull();
    expect(elegirLogo(sinLogo, "")?.nombre).toBe("chica.png");
  });

  it("el color de la marca sale del logo: gana el tono que más se repite y el gris no cuenta", () => {
    const puntos = (lista: [number, number, number, number, number][]) =>
      new Uint8Array(
        lista.flatMap(([n, r, g, b, a]) => Array.from({ length: n }, () => [r, g, b, a]).flat()),
      );
    // Mucho rojo, algo de azul, blanco y fondo transparente.
    expect(
      acentoDeLogo(
        puntos([
          [60, 230, 30, 30, 255],
          [20, 20, 40, 220, 255],
          [200, 255, 255, 255, 255],
          [300, 0, 0, 0, 0],
        ]),
      ),
    ).toBe("#e61e1e");
    expect(acentoDeLogo(puntos([[400, 128, 128, 128, 255]]))).toBeNull();
  });

  it("cada imagen del plan va a su archivo en la Mac; la que no está va sin imagen, nunca otra", () => {
    const plan = planParaArmar({
      marca: "Pro In Shop · generador",
      texto: "¿Se te va la luz? Mira esto. El generador de 1200 vatios. Pídelo hoy.",
      voz: "venezolana",
      idioma: "es",
      plan: {
        momentos: [
          { frase: "Se te va la luz", imagen: "generador.jpg", texto: "¿SE TE VA LA LUZ?" },
          { frase: "Mira esto", imagen: "no-existe.png" },
          { frase: "1200 vatios", chips: [{ texto: "1200 W", palabra: "1200" }] },
        ],
        cierre: { frase: "Pídelo hoy", lineas: ["@proinshop"] },
      },
      rutas: new Map(imgs.map((i) => [i.nombre, i.ruta])),
      logo: "/mac/logo.png",
      avatar: "/mac/chica.png",
      acento: null,
    });
    expect(plan.momentos.map((m) => m.imagen)).toEqual(["/mac/generador.jpg", undefined, undefined]);
    expect(plan.acento).toBe("#ff2a2a");
    expect(plan.voz).toBe("venezolana");
    expect(plan.logo).toBe("/mac/logo.png");
  });
});
