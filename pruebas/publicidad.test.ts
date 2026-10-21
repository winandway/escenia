import { describe, expect, it } from "vitest";
import {
  acentoDeLogo,
  aparicionesDelPlan,
  costoPublicidadUsd,
  elegirLogo,
  esquemaPlanPublicidad,
  planParaArmar,
  recorteDeEncuadre,
  textoDelPlan,
  SEGUNDOS_MAXIMOS,
  tiemposDeFrases,
} from "../estacion/src/publicidad-plan";
import {
  formatoCifra,
  mezclarVistas,
  subtitulosEnPantalla,
  vistaCompleta,
  vistaDeEnfoque,
  vistaPersonaEn,
} from "../estacion/src/remotion/publicidad-diseno";

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

describe("publicidad: capturas de cerca y la persona por tramos (anuncio de QRBott, 21 oct 2026)", () => {
  const caja = { ancho: 960, alto: 760 };
  const img = { ancho: 2400, alto: 1500 };

  it("la zona marcada se ve entera y llena la tarjeta (sin deformar ni dejar franjas)", () => {
    const v = vistaDeEnfoque(caja, img, { x: 0.345, y: 0.29, ancho: 0.31, alto: 0.38 });
    // La zona mide 744×570 puntos: entra entera, la manda el ancho (960/744).
    const escala = v.width / img.ancho;
    expect(escala).toBeCloseTo(960 / 744, 3);
    expect(v.height / v.width).toBeCloseTo(1500 / 2400, 5);
    // La zona queda dentro de la tarjeta.
    expect(v.left + 0.345 * v.width).toBeGreaterThanOrEqual(-0.5);
    expect(v.left + (0.345 + 0.31) * v.width).toBeLessThanOrEqual(960.5);
    expect(v.top + 0.29 * v.height).toBeGreaterThanOrEqual(-0.5);
    // Sin franjas vacías: la imagen cubre la tarjeta.
    expect(v.left).toBeLessThanOrEqual(0);
    expect(v.left + v.width).toBeGreaterThanOrEqual(960);
    expect(v.top).toBeLessThanOrEqual(0);
    expect(v.top + v.height).toBeGreaterThanOrEqual(760);
  });

  it("una zona en la esquina no deja vacío: se corre hacia adentro de la imagen", () => {
    const v = vistaDeEnfoque(caja, img, { x: 0.8, y: 0.8, ancho: 0.2, alto: 0.2 });
    expect(v.left + v.width).toBeCloseTo(960, 3);
    expect(v.top + v.height).toBeCloseTo(760, 3);
  });

  it("la imagen entera cabe en la tarjeta (de ahí arranca el acercamiento) y mezclar va de una a otra", () => {
    const entera = vistaCompleta(caja, img);
    expect(entera.width).toBeCloseTo(960, 5);
    expect(entera.top).toBeCloseTo((760 - 600) / 2, 5);
    const zona = vistaDeEnfoque(caja, img, { x: 0, y: 0, ancho: 0.5, alto: 0.5 });
    expect(mezclarVistas(entera, zona, 0)).toEqual(entera);
    expect(mezclarVistas(entera, zona, 1)).toEqual(zona);
  });

  it("la cifra lleva separador de miles y sus decimales", () => {
    expect(formatoCifra(3394.44, 2)).toBe("3,394.44");
    expect(formatoCifra(1300, 0)).toBe("1,300");
  });

  it("cada persona sale desde su momento hasta el siguiente cambio, y «ninguna» la saca", () => {
    const chica = { imagen: "chica.png", encuadre: "medio" as const };
    const cuerpo = { imagen: "chica.png", encuadre: "cuerpo" as const };
    const a = aparicionesDelPlan(
      [
        { inicioMs: 0, persona: cuerpo },
        { inicioMs: 2000 },
        { inicioMs: 4000, persona: chica },
        { inicioMs: 9000, persona: "ninguna" },
        { inicioMs: 12000, persona: chica },
      ],
      15000,
    );
    expect(a.map((x) => [x.encuadre, x.inicioMs, x.finMs])).toEqual([
      ["cuerpo", 0, 4000],
      ["medio", 4000, 9000],
      ["medio", 12000, 15000],
    ]);
  });

  it("ningún video de la persona pasa del tope: se parte en un cambio de momento", () => {
    const chica = { imagen: "chica.png", encuadre: "medio" as const };
    const a = aparicionesDelPlan(
      [{ inicioMs: 0, persona: chica }, { inicioMs: 20000 }, { inicioMs: 34000 }, { inicioMs: 50000 }],
      70000,
      35000,
    );
    expect(a.map((x) => [x.inicioMs, x.finMs])).toEqual([
      [0, 34000],
      [34000, 50000],
      [50000, 70000],
    ]);
    for (const x of a) expect(x.finMs - x.inicioMs).toBeLessThanOrEqual(35000);
    // Un solo momento largo, sin cambios adentro: se parte en pedazos iguales.
    const largo = aparicionesDelPlan([{ inicioMs: 0, persona: chica }], 80000, 35000);
    expect(largo.length).toBe(3);
    for (const x of largo) expect(x.finMs - x.inicioMs).toBeLessThanOrEqual(35000);
  });

  it("el medio cuerpo llega hasta la cadera y el cuerpo completo es toda la figura", () => {
    const figura = { x: 100, y: 50, ancho: 500, alto: 1300 };
    expect(recorteDeEncuadre(figura, "cuerpo")).toEqual(figura);
    expect(recorteDeEncuadre(figura, "medio")).toEqual({ x: 100, y: 50, ancho: 500, alto: 728 });
    expect(recorteDeEncuadre(figura, "medio", 0.5).alto).toBe(650);
  });

  it("el plan admite la voz por partes y exige que haya algo que decir", () => {
    const partes = esquemaPlanPublicidad.parse({
      marca: "QRBott",
      logo: "logo.png",
      partes: ["Tu negocio no necesita cinco programas.", "Necesita uno."],
      tema: "oscuro",
      maximo_seg: 95,
      momentos: [
        { frase: "Tu negocio", persona: { imagen: "chica.png", encuadre: "cuerpo" } },
        { frase: "cinco programas", sin_tarjeta: true },
        { frase: "Necesita uno", imagen: "a.png", enfoque: { x: 0.1, y: 0.1, ancho: 0.3, alto: 0.3 } },
      ],
      cierre: { frase: "Necesita uno", lineas: ["qrbott.com"] },
    });
    expect(textoDelPlan(partes)).toBe("Tu negocio no necesita cinco programas. Necesita uno.");
    expect(partes.maximo_seg).toBe(95);
    expect(() =>
      esquemaPlanPublicidad.parse({
        marca: "QRBott",
        logo: "l.png",
        momentos: partes.momentos,
        cierre: partes.cierre,
      }),
    ).toThrow();
  });
});

describe("publicidad, diseño «pantalla»: la persona se mueve alrededor de la captura (QRBott v2, 21 oct 2026)", () => {
  const tramos = [
    { inicioMs: 0, vistaPersona: { modo: "grande" as const, lado: "izquierda" as const } },
    { inicioMs: 5000, vistaPersona: { modo: "cabeza" as const, lado: "izquierda" as const } },
    { inicioMs: 8000, vistaPersona: null },
    { inicioMs: 9000, vistaPersona: { modo: "cabeza" as const, lado: "izquierda" as const } },
    { inicioMs: 12000, vistaPersona: { modo: "cabeza" as const, lado: "derecha" as const } },
    { inicioMs: 15000, vistaPersona: { modo: "oculta" as const, lado: "izquierda" as const } },
  ];

  it("manda el último momento que cambió el modo; repetir el mismo no reinicia la entrada", () => {
    expect(vistaPersonaEn(tramos, "medio", 6000)).toMatchObject({
      modo: "cabeza",
      lado: "izquierda",
      desdeMs: 5000,
    });
    // A los 9 s se repite «cabeza izquierda»: no es un cambio, la entrada sigue siendo la de los 5 s.
    expect(vistaPersonaEn(tramos, "medio", 10000).desdeMs).toBe(5000);
    expect(vistaPersonaEn(tramos, "medio", 13000)).toMatchObject({
      modo: "cabeza",
      lado: "derecha",
      desdeMs: 12000,
    });
    expect(vistaPersonaEn(tramos, "medio", 16000).modo).toBe("oculta");
    // Sin momentos que lo digan: la de cuerpo completo va grande y la de medio cuerpo, de medio.
    expect(vistaPersonaEn([], "cuerpo", 1000).modo).toBe("grande");
    expect(vistaPersonaEn([], "medio", 1000).modo).toBe("medio");
  });

  it("los subtítulos van del lado contrario a la persona, y al centro si no está", () => {
    const izq = subtitulosEnPantalla({ modo: "cabeza", lado: "izquierda" });
    const der = subtitulosEnPantalla({ modo: "cabeza", lado: "derecha" });
    expect(izq.left).toBeGreaterThan(400);
    expect(izq.right).toBeLessThan(100);
    expect(der.right).toBeGreaterThan(400);
    expect(der.left).toBeLessThan(100);
    const libre = subtitulosEnPantalla({ modo: "oculta", lado: "izquierda" });
    expect(libre.left).toBe(libre.right);
    expect(subtitulosEnPantalla(null)).toEqual(libre);
  });
});
