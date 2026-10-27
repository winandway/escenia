import { describe, expect, it } from "vitest";
import {
  acentoDeLogo,
  aparicionesDelPlan,
  costoPublicidadUsd,
  elegirLogo,
  esquemaPlanPublicidad,
  gananciaDeVoz,
  iniciosDePartes,
  planParaArmar,
  puntaDelDedo,
  recorteDeEncuadre,
  textoDelPlan,
  textoDeParte,
  SEGUNDOS_MAXIMOS,
  tiemposDeFrases,
  tramoConVoz,
  vaVolteada,
} from "../estacion/src/publicidad-plan";
import {
  capturaEnTelefono,
  contenidoDelTelefono,
  esquemaPublicidad,
  formatoCifra,
  ladoDelTelefonoEn,
  mezclarVistas,
  personaEnPizarra,
  subtitulosEnPantalla,
  tarjetaTelefono,
  telefonoPizarra,
  vistaCompleta,
  vistaDeEnfoque,
  vistaPersonaEn,
  ZONA_PUBLICIDAD,
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

describe("C-PUBLICIDAD-ENTERA: en el diseño «teléfono» la pantalla se ve entera (22 oct 2026)", () => {
  // Richard, sobre la versión dos de QRBott: las capturas «se salían de la pantalla y el cliente no lo
  // veía». En el diseño «teléfono» cada pantalla se presenta entera, sin acercar.
  const caja = { ancho: ZONA_PUBLICIDAD.telefono.ancho, alto: ZONA_PUBLICIDAD.telefono.alto };
  it.each([
    [1170, 1992],
    [1236, 2517],
    [1236, 2745],
    [1170, 2532],
    [2400, 1500],
  ])("una pantalla de %i×%i cabe completa en la tarjeta", (ancho, alto) => {
    const v = vistaCompleta(caja, { ancho, alto });
    expect(v.left).toBeGreaterThanOrEqual(-0.01);
    expect(v.top).toBeGreaterThanOrEqual(-0.01);
    expect(v.left + v.width).toBeLessThanOrEqual(caja.ancho + 0.01);
    expect(v.top + v.height).toBeLessThanOrEqual(caja.alto + 0.01);
  });

  it("la tarjeta del teléfono queda dentro del video y debajo del texto grande", () => {
    const t = ZONA_PUBLICIDAD.telefono;
    expect(t.x + t.ancho).toBeLessThanOrEqual(1080);
    expect(t.y + t.alto).toBeLessThan(t.subtitulos);
    expect(t.y).toBeGreaterThanOrEqual(ZONA_PUBLICIDAD.texto.y + ZONA_PUBLICIDAD.texto.alto);
  });
});

describe("publicidad: cada video con su armonía y su portada (Cashea, 22 oct 2026)", () => {
  it("la tarjeta del teléfono toma la forma de la pantalla y la muestra entera, sin franjas", () => {
    for (const [ancho, alto] of [
      [1400, 875],
      [1400, 615],
      [955, 1400],
      [637, 1400],
      [1170, 1992],
    ] as const) {
      const t = tarjetaTelefono({ ancho, alto });
      // Misma forma que la imagen.
      expect(t.ancho / t.alto).toBeCloseTo(ancho / alto, 1);
      // Dentro del video, debajo del texto grande y encima de los subtítulos.
      expect(t.x).toBeGreaterThanOrEqual(0);
      expect(t.x + t.ancho).toBeLessThanOrEqual(1080);
      expect(t.y).toBeGreaterThanOrEqual(ZONA_PUBLICIDAD.texto.y + ZONA_PUBLICIDAD.texto.alto);
      expect(t.y + t.alto).toBeLessThan(ZONA_PUBLICIDAD.telefono.subtitulos);
    }
    // La ancha va arriba a lo ancho; la alta, a la derecha.
    expect(tarjetaTelefono({ ancho: 1400, alto: 875 }).ancho).toBe(960);
    const alta = tarjetaTelefono({ ancho: 637, alto: 1400 });
    expect(alta.x + alta.ancho).toBe(ZONA_PUBLICIDAD.telefono.x + ZONA_PUBLICIDAD.telefono.ancho);
  });

  it("el plan admite paleta y portada, y la portada no pasa de dos líneas", () => {
    const base = {
      marca: "QRBott",
      logo: "l.png",
      partes: ["¿Tu tienda es aliada de Cashea? Con QRBott cobras con Cashea."],
      momentos: [{ frase: "Tu tienda" }, { frase: "aliada de" }, { frase: "Con QRBott" }],
      cierre: { frase: "cobras con", lineas: [] },
    };
    const p = esquemaPlanPublicidad.parse({
      ...base,
      paleta: { fondo: ["#3b1470", "#12052a"], patron: "lineas" },
      portada: { lineas: ["¿ACEPTAS CASHEA?", "COBRA CON QRBOTT"], etiqueta: "PASO A PASO" },
    });
    expect(p.portada?.hasta_ms).toBe(2200);
    expect(() => esquemaPlanPublicidad.parse({ ...base, portada: { lineas: ["A", "B", "C"] } })).toThrow();
    expect(() =>
      esquemaPlanPublicidad.parse({ ...base, paleta: { fondo: ["morado", "#000000"] } }),
    ).toThrow();
  });
});

describe("C-PIZARRA-1: el diseño «pizarra», el teléfono y la persona que lo señala (23 oct 2026)", () => {
  // Richard: «poner las capturas de pantalla bien centradas en la pantalla del teléfono de forma
  // vertical… que la mano apunte hacia la pantalla… que ella en algunos momentos se ponga como de
  // espalda y apunte como cuando uno está apuntando a una pizarra».
  const Z = ZONA_PUBLICIDAD.pizarra;

  it.each([
    [1170, 1992],
    [1024, 1320],
    [896, 1736],
    [510, 1472],
    [816, 632],
    [1052, 358],
    [2880, 1800],
  ])("una captura de %i×%i cabe entera y centrada en la pantalla del teléfono", (ancho, alto) => {
    const c = contenidoDelTelefono();
    const v = capturaEnTelefono({ ancho, alto });
    expect(v.left).toBeGreaterThanOrEqual(-0.01);
    expect(v.top).toBeGreaterThanOrEqual(-0.01);
    expect(v.left + v.width).toBeLessThanOrEqual(c.ancho + 0.01);
    expect(v.top + v.height).toBeLessThanOrEqual(c.alto + 0.01);
    // Centrada: el mismo espacio a cada lado.
    expect(Math.abs(v.left - (c.ancho - v.left - v.width))).toBeLessThan(0.5);
    expect(Math.abs(v.top - (c.alto - v.top - v.height))).toBeLessThan(0.5);
    // Nunca deformada.
    expect(v.width / v.height).toBeCloseTo(ancho / alto, 3);
  });

  it("el teléfono es grande y ella va delante tapándole un pedazo, como en una pizarra (23 oct 2026)", () => {
    // Richard, al ver el teléfono de 520 px: «estirar un poquito más la pantalla… que el cuerpo de ella
    // quede por arriba como si fuese una pizarra… eso no importa».
    expect(contenidoDelTelefono().ancho).toBeGreaterThanOrEqual(620);
    expect(contenidoDelTelefono().alto).toBeGreaterThanOrEqual(1100);
    expect(Z.solape).toBeGreaterThanOrEqual(100);
    expect(Z.solapeQuieta).toBeGreaterThan(Z.solape);
  });

  it("el teléfono va del lado contrario a la persona, dentro del video y debajo del texto grande", () => {
    const izq = telefonoPizarra("izquierda");
    const der = telefonoPizarra("derecha");
    const centro = telefonoPizarra(null);
    expect(izq.x + izq.ancho / 2).toBeGreaterThan(540);
    expect(der.x + der.ancho / 2).toBeLessThan(540);
    expect(centro.x * 2 + centro.ancho).toBe(1080);
    for (const t of [izq, der, centro]) {
      expect(t.x).toBeGreaterThanOrEqual(0);
      expect(t.x + t.ancho).toBeLessThanOrEqual(1080);
      expect(t.y).toBeGreaterThanOrEqual(ZONA_PUBLICIDAD.texto.y + ZONA_PUBLICIDAD.texto.alto);
      expect(t.y + t.alto).toBeLessThan(Z.subtitulos);
    }
  });

  const figura = {
    ancho: 700,
    alto: 1300,
    encuadre: "cuerpo" as const,
    espejo: false,
    quieta: false,
    cara: { x: 0.3, y: 0.05, ancho: 0.15, alto: 0.1 },
  };

  it("a la izquierda, su mano (el borde derecho) entra sobre el borde del teléfono", () => {
    const tel = telefonoPizarra("izquierda");
    const p = personaEnPizarra({ ...figura, ancho: 520, lado: "izquierda" }, tel);
    expect(p.left + p.ancho).toBe(tel.x + Z.solape);
    expect(p.alto).toBe(Z.persona.cuerpo);
  });

  it("a la derecha y volteada, su mano (el borde izquierdo) entra sobre el borde del teléfono", () => {
    const tel = telefonoPizarra("derecha");
    const p = personaEnPizarra({ ...figura, ancho: 520, lado: "derecha", espejo: true }, tel);
    expect(p.left).toBe(tel.x + tel.ancho - Z.solape);
  });

  it("la de espaldas toca más adentro, como en una pizarra", () => {
    const tel = telefonoPizarra("izquierda");
    const p = personaEnPizarra({ ...figura, ancho: 520, lado: "izquierda", quieta: true }, tel);
    expect(p.left + p.ancho).toBe(tel.x + Z.solapeQuieta);
  });

  it("si la figura es muy ancha, se corre hacia adentro para que su cara no se salga del video", () => {
    for (const lado of ["izquierda", "derecha"] as const) {
      const espejo = lado === "derecha";
      const p = personaEnPizarra({ ...figura, ancho: 1200, lado, espejo }, telefonoPizarra(lado));
      const cara = espejo
        ? { desde: 1 - figura.cara.x - figura.cara.ancho, hasta: 1 - figura.cara.x }
        : { desde: figura.cara.x, hasta: figura.cara.x + figura.cara.ancho };
      expect(p.left + cara.desde * p.ancho).toBeGreaterThanOrEqual(Z.margenCara - 1);
      expect(p.left + cara.hasta * p.ancho).toBeLessThanOrEqual(1080 - Z.margenCara + 1);
    }
  });

  it("la de medio cuerpo es más corta que la de cuerpo entero", () => {
    const tel = telefonoPizarra("izquierda");
    const medio = personaEnPizarra({ ...figura, encuadre: "medio", lado: "izquierda" }, tel);
    const cuerpo = personaEnPizarra({ ...figura, lado: "izquierda" }, tel);
    expect(medio.alto).toBeLessThan(cuerpo.alto);
  });

  it("el teléfono sigue a la persona y recuerda de qué lado viene para cruzar deslizándose", () => {
    const ap = [
      { inicioMs: 0, finMs: 10_000, lado: "izquierda" as const },
      { inicioMs: 10_000, finMs: 15_000, lado: "izquierda" as const },
      { inicioMs: 15_000, finMs: 20_000, lado: "derecha" as const },
    ];
    expect(ladoDelTelefonoEn(ap, 5_000)).toEqual({ lado: "izquierda", antes: "izquierda", desdeMs: 0 });
    // Dos apariciones seguidas del mismo lado no mueven el teléfono.
    expect(ladoDelTelefonoEn(ap, 12_000)).toEqual({ lado: "izquierda", antes: "izquierda", desdeMs: 0 });
    expect(ladoDelTelefonoEn(ap, 16_000)).toEqual({ lado: "derecha", antes: "izquierda", desdeMs: 15_000 });
    // Sin nadie, vuelve al centro.
    expect(ladoDelTelefonoEn(ap, 21_000)).toEqual({ lado: null, antes: "derecha", desdeMs: 20_000 });
  });

  it("la foto se voltea solo cuando su mano no apunta al teléfono", () => {
    expect(vaVolteada({})).toBe(false);
    expect(vaVolteada({ lado: "izquierda" })).toBe(false);
    expect(vaVolteada({ lado: "derecha" })).toBe(true);
    expect(vaVolteada({ lado: "izquierda", apunta: "izquierda" })).toBe(true);
    expect(vaVolteada({ lado: "derecha", apunta: "izquierda" })).toBe(false);
  });

  it("la punta del dedo es la figura más metida hacia donde apunta", () => {
    // Una figura de 10×10: el cuerpo en las columnas 2 a 5 y el brazo que llega a la columna 8, en la fila 3.
    const alfa = new Uint8Array(100);
    for (let y = 0; y < 10; y++) for (let x = 2; x <= 5; x++) alfa[y * 10 + x] = 255;
    for (let x = 6; x <= 8; x++) {
      alfa[3 * 10 + x] = 255;
      alfa[2 * 10 + x] = 255;
    }
    const d = puntaDelDedo(alfa, 10, 10, "derecha");
    expect(d?.x).toBeCloseTo(0.85, 5);
    expect(d?.y).toBeCloseTo(0.3, 5);
    expect(puntaDelDedo(alfa, 10, 10, "izquierda")?.x).toBeCloseTo(0.25, 5);
    expect(puntaDelDedo(new Uint8Array(100), 10, 10)).toBeNull();
  });

  it("las apariciones viejas (sin lado ni espejo) siguen valiendo: a la izquierda y sin voltear", () => {
    const props = esquemaPublicidad.shape.apariciones.parse([
      { inicioMs: 0, finMs: 1000, ruta: "p.webm", ancho: 10, alto: 20, encuadre: "medio" },
    ]);
    expect(props[0]).toMatchObject({ lado: "izquierda", espejo: false, quieta: false, dedo: null });
  });

  it("el plan acepta la persona quieta de espaldas con su lado, y la lleva a su aparición", () => {
    const plan = esquemaPlanPublicidad.parse({
      marca: "QRBott",
      logo: "logo.png",
      diseno: "pizarra",
      texto: "Tu número es tu celular y trae su código para pagar.",
      momentos: [
        { frase: "Tu número", persona: { imagen: "a.png", encuadre: "cuerpo", lado: "derecha" } },
        { frase: "y trae", persona: { imagen: "b.png", encuadre: "cuerpo", lado: "derecha", quieta: true } },
        { frase: "para pagar" },
      ],
      cierre: { frase: "para pagar", lineas: [] },
    });
    const ap = aparicionesDelPlan(
      plan.momentos.map((m, i) => ({ inicioMs: i * 1000, persona: m.persona })),
      5000,
    );
    expect(ap.map((a) => [a.lado, a.quieta ?? false])).toEqual([
      ["derecha", false],
      ["derecha", true],
    ]);
  });
});

describe("publicidad sin marca: el anuncio que crea expectativa (franquicias, 25 oct 2026)", () => {
  // Richard: «acá no estamos revelando el nombre de la empresa todavía en este comercial». Sin logo, no
  // sale ninguna marca: ni arriba a la izquierda ni en el cierre (que señala hacia abajo, al formulario).
  it("el plan acepta un anuncio sin logo", () => {
    const plan = esquemaPlanPublicidad.parse({
      marca: "Franquicias",
      texto: "¿Conoces una app así? Toca aquí abajo y llena el formulario.",
      momentos: [{ frase: "Conoces una" }, { frase: "app así" }, { frase: "Toca aquí" }],
      cierre: { frase: "Toca aquí", lineas: ["TOCA AQUÍ ABAJO"] },
    });
    expect(plan.logo).toBe("");
  });

  it("las props del video aceptan el logo vacío", () => {
    expect(esquemaPublicidad.shape.logo.parse("")).toBe("");
  });
});

describe("C-VOZ-PUBLICIDAD: sin pausas largas entre escenas y la voz al volumen de las redes (25 oct 2026)", () => {
  // Richard, con el comercial de franquicias: «en los cambios de escena hay una pausa, como que se queda
  // un poquito allí» y «su volumen está bajo… nada de efectos». Cada parte traía medio segundo de
  // silencio en las puntas (dentro de las frases las pausas son de 50 a 100 ms) y la voz sonaba a −17.
  it("cada parte se queda sin el silencio de sus puntas, con un margen corto", () => {
    const t = tramoConVoz(
      [
        { desdeMs: 0, hastaMs: 120 },
        { desdeMs: 2000, hastaMs: 2080 },
        { desdeMs: 4600, hastaMs: 5000 },
      ],
      5000,
    );
    expect(t).toEqual({ desdeMs: 100, hastaMs: 4670 });
  });

  it("sin silencio en una punta, esa punta se queda entera", () => {
    expect(tramoConVoz([{ desdeMs: 2000, hastaMs: 2100 }], 4000)).toEqual({ desdeMs: 0, hastaMs: 4000 });
  });

  it("una parte que fuera casi todo silencio no se recorta (no se tira voz pagada)", () => {
    expect(tramoConVoz([{ desdeMs: 0, hastaMs: 3000 }], 3100)).toEqual({ desdeMs: 0, hastaMs: 3100 });
  });

  it("la voz se sube lo que le falta para −14 LUFS, con tope", () => {
    expect(gananciaDeVoz(-17.1)).toBe(3.1);
    expect(gananciaDeVoz(-12)).toBe(-2);
    expect(gananciaDeVoz(-40)).toBe(12);
    expect(gananciaDeVoz(Number.NaN)).toBe(0);
  });

  it("la pausa entre partes por defecto es corta y el volumen por defecto es el de las redes", () => {
    const plan = esquemaPlanPublicidad.parse({
      marca: "Marca",
      texto: "Una frase de prueba para el plan.",
      momentos: [{ frase: "Una frase" }, { frase: "de prueba" }, { frase: "para el" }],
      cierre: { frase: "para el", lineas: [] },
    });
    expect(plan.pausa_ms).toBeLessThanOrEqual(150);
    expect(plan.voz_lufs).toBe(-14);
  });
});

describe("publicidad con el video real del cliente de fondo (Pro In Shop, 27 oct 2026)", () => {
  // Richard: «quiero el video real con un avatar hablando». El video del cliente va a pantalla completa
  // detrás de la persona, desde el segundo que se pida y más rápido para quitar los tiempos muertos.
  const base = {
    marca: "Pro In Shop",
    texto: "Mira esta prueba con el agua del grifo y con la del sistema.",
    momentos: [{ frase: "Mira esta" }, { frase: "agua del grifo" }, { frase: "la del sistema" }],
    cierre: { frase: "la del sistema", lineas: ["@marca"] },
  };

  it("un momento acepta un video con su segundo de inicio y su velocidad", () => {
    const plan = esquemaPlanPublicidad.parse({
      ...base,
      momentos: [
        { frase: "Mira esta", video: { archivo: "videos/prueba.mp4", desde_s: 18 } },
        ...base.momentos.slice(1),
      ],
    });
    expect(plan.momentos[0]?.video).toEqual({
      archivo: "videos/prueba.mp4",
      desde_s: 18,
      velocidad: 1,
      sonido: 0,
    });
  });

  it("la velocidad tiene tope (ni cámara lenta extrema ni un borrón)", () => {
    expect(() =>
      esquemaPlanPublicidad.parse({
        ...base,
        momentos: [
          { frase: "Mira esta", video: { archivo: "v.mp4", velocidad: 8 } },
          ...base.momentos.slice(1),
        ],
      }),
    ).toThrow();
  });

  it("la tarjeta final acepta la foto del producto", () => {
    const plan = esquemaPlanPublicidad.parse({
      ...base,
      cierre: { ...base.cierre, imagen: "productos/equipo.png" },
    });
    expect(plan.cierre.imagen).toBe("productos/equipo.png");
  });

  it("las props viejas siguen valiendo: sin video en el momento y sin foto en el cierre", () => {
    expect(esquemaPublicidad.shape.cierre.parse({ inicioMs: 0, lineas: [] }).imagen).toBeNull();
    const tramo = esquemaPublicidad.shape.tramos.element.parse({
      inicioMs: 0,
      finMs: 1000,
      imagen: null,
      texto: null,
      chips: [],
    });
    expect(tramo.video).toBeNull();
  });
});

describe("C-DEMO-1: la demostración en vivo, sin cortes y con la voz a su hora (Pro In Shop, 27 oct 2026)", () => {
  // Richard: «el video se grabó con la intención de que no hubiera un corte… esa parte no se puede
  // cortar… que el agua suene, que el chorro está cayendo, y la chica diga allí». La voz va donde pasa
  // cada cosa en el video, no seguida; el video corre entero y suena.
  it("una parte con hora espera hasta esa hora; sin hora, va seguida", () => {
    expect(
      iniciosDePartes([{ duracionMs: 5000 }, { duracionMs: 3000, desdeMs: 9000 }, { duracionMs: 2000 }], 150),
    ).toEqual([0, 9000, 12150]);
  });

  it("si la anterior todavía habla a esa hora, entra apenas termine: nunca se pisan", () => {
    expect(iniciosDePartes([{ duracionMs: 10_000 }, { duracionMs: 2000, desdeMs: 4000 }], 150)).toEqual([
      0, 10_150,
    ]);
  });

  it("la primera parte también puede tener su hora", () => {
    expect(iniciosDePartes([{ duracionMs: 1000, desdeMs: 2500 }], 150)).toEqual([2500]);
  });

  it("el plan acepta partes con hora y el texto entero las junta", () => {
    const plan = esquemaPlanPublicidad.parse({
      marca: "Pro In Shop",
      partes: ["Hola, te habla la tienda.", { texto: "Rojo. Mira de cerca.", desde_ms: 28_500 }],
      momentos: [{ frase: "Hola te" }, { frase: "la tienda" }, { frase: "Rojo Mira" }],
      cierre: { frase: "Mira de cerca", lineas: [] },
    });
    expect(textoDelPlan(plan)).toBe("Hola, te habla la tienda. Rojo. Mira de cerca.");
    expect(textoDeParte(plan.partes![1]!)).toBe("Rojo. Mira de cerca.");
    expect(plan.musica_volumen).toBe(0.13);
  });

  it("el video del momento puede sonar (el chorro del agua) y por defecto va mudo", () => {
    const plan = esquemaPlanPublicidad.parse({
      marca: "Pro In Shop",
      texto: "Mira la prueba con el agua del grifo ahora.",
      momentos: [
        { frase: "Mira la", video: { archivo: "v.mp4", sonido: 1 } },
        { frase: "prueba con", video: { archivo: "v.mp4" } },
        { frase: "agua del" },
      ],
      cierre: { frase: "grifo ahora", lineas: [] },
    });
    expect(plan.momentos[0]?.video?.sonido).toBe(1);
    expect(plan.momentos[1]?.video?.sonido).toBe(0);
  });
});
