import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { esquemaPublicacionDeLaIA, esquemaPublicacionGenerada } from "@compartido/guion";
import {
  candidatasDePortada,
  CARA_EN_PORTADA,
  clavePieza,
  encuadre,
  instantesDeMuestra,
  MEDIDAS_PORTADA,
  mejorCuadroDePresentador,
  miniaturasPorPieza,
  nombreDeRotulo,
  paletaDePieza,
  tramaDePieza,
  recorteSirve,
  textoDePortada,
  type FotoRotulada,
} from "@compartido/portada";
import { instruccionesPublicacion } from "@/lib/publicacion";
import { esquemaPortada, letraQueCabe, partesDeLinea, partesDelRemate } from "../estacion/src/remotion/props";

const raiz = path.join(__dirname, "..");
const fila = (clave: string, meta: object = {}, id?: number) => ({
  tipo: "miniatura",
  clave,
  meta: JSON.stringify(meta),
  ...(id === undefined ? {} : { id }),
});

describe("portada de impacto: el texto", () => {
  it("la palabra entre asteriscos del remate va resaltada y sin asteriscos", () => {
    expect(partesDelRemate("*CERO* PREMIOS")).toEqual([
      { texto: "CERO", marcada: true },
      { texto: "PREMIOS", marcada: false },
    ]);
  });

  it("un asterisco suelto no resalta nada ni se pierde", () => {
    expect(partesDelRemate("5 * 3")).toEqual([
      { texto: "5", marcada: false },
      { texto: "*", marcada: false },
      { texto: "3", marcada: false },
    ]);
    expect(partesDelRemate("  ")).toEqual([]);
  });

  it("queda en mayúsculas, sin punto final y nunca cortado a media palabra", () => {
    const t = textoDePortada({
      grande: "nunca.",
      linea: "ha ganado un premio grande",
      remate: "*15* nominaciones",
    });
    expect(t.grande).toBe("NUNCA");
    expect(t.linea).toBe("HA GANADO");
    expect(t.remate).toBe("*15* NOMINACIONES");
    // Los asteriscos no cuentan como letras: «SIEMPRE ENCENDIDOS» cabe entero.
    expect(textoDePortada({ remate: "siempre *encendidos*" }).remate).toBe("SIEMPRE *ENCENDIDOS*");
  });

  it("la palabra tachada o fuerte nunca se recorta: si no cabe, la línea va entera (C-PORTADA-3)", () => {
    // Antes «NOT JUST A ~TEMPLATE~» (19 letras, tope 16) quedaba en «NOT JUST A»: sin el golpe.
    expect(textoDePortada({ linea: "not just a ~template~" }).linea).toBe("NOT JUST A ~TEMPLATE~");
    // El relleno que viene después de la palabra marcada sí se recorta.
    expect(textoDePortada({ linea: "~gratis~ para siempre jamás" }).linea).toBe("~GRATIS~ PARA");
    expect(textoDePortada({ remate: "*cero* premios en toda su carrera" }).remate).toBe(
      "*CERO* PREMIOS EN TODA",
    );
    // Sin palabra marcada, se sigue recortando por el final.
    expect(textoDePortada({ linea: "la inteligencia artificial gratis" }).linea).toBe("LA INTELIGENCIA");
    // Pasarse por poco no recorta («SIN SUERTE» quedaba en «SIN»); y una línea recortada no termina en «DE».
    expect(textoDePortada({ grande: "sin suerte" }).grande).toBe("SIN SUERTE");
    expect(textoDePortada({ linea: "décadas de micrófono" }).linea).toBe("DÉCADAS");
  });

  it("una palabra larga se achica para caber; una cifra corta va al máximo", () => {
    expect(letraQueCabe("15", 580, 286)).toBe(286);
    expect(letraQueCabe("NOMINACIONES", 610, 104)).toBeLessThan(104);
    expect(letraQueCabe("*CERO* PREMIOS", 900, 122)).toBe(letraQueCabe("CERO PREMIOS", 900, 122));
  });

  it("los guiones de antes (sin texto de portada) siguen siendo válidos", () => {
    const p = esquemaPublicacionGenerada.parse({
      titulo: "Un título de prueba",
      descripcion: "Una descripción de prueba lo bastante larga para pasar el mínimo.",
      etiquetas: Array.from({ length: 10 }, (_, k) => `palabra ${k}`),
      shorts: [{ indice: 1, titulo: "El primer short" }],
    });
    expect(p.portada).toBeUndefined();
    expect(p.shorts[0]?.portada).toBeUndefined();
  });
});

describe("portada de impacto: a quién se ve", () => {
  const fotos: FotoRotulada[] = [
    { ruta: "fotos/royce-1.jpg", rotulo: "Prince Royce", escena: 0 },
    { ruta: "fotos/bronx.jpg", rotulo: "El Bronx, Nueva York", escena: 1 },
    { ruta: "fotos/royce-2010.jpg", rotulo: "Prince Royce, 2010", escena: 2 },
    { ruta: "fotos/romeo-1.jpg", rotulo: "Romeo Santos", escena: 3 },
    { ruta: "fotos/estadio.jpg", rotulo: "Yankee Stadium · 2014", escena: 3 },
    { ruta: "fotos/los-dos.jpg", rotulo: "Romeo Santos y Prince Royce", escena: 4 },
    { ruta: "fotos/abud.jpg", rotulo: "Manuel Abud", escena: 11 },
    { ruta: "fotos/romeo-2.jpg", rotulo: "Romeo Santos", escena: 10 },
  ];

  it("del rótulo sale el nombre de UNA persona; un lugar, una fecha o dos personas no nombran a nadie", () => {
    expect(nombreDeRotulo("Prince Royce, 2010")).toBe("Prince Royce");
    expect(nombreDeRotulo("Yankee Stadium · 2014")).toBe("");
    expect(nombreDeRotulo("Romeo Santos y Prince Royce")).toBe("");
  });

  it("primero la persona pedida en las escenas de la pieza, después en el resto del video", () => {
    const c = candidatasDePortada(fotos, { inicio: 10, fin: 14 }, "romeo santos", "Prince Royce");
    expect(c.map((x) => x.ruta)).toEqual([
      "fotos/romeo-2.jpg",
      "fotos/romeo-1.jpg",
      "fotos/royce-1.jpg",
      "fotos/royce-2010.jpg",
    ]);
    expect(c[0]?.nombre).toBe("Romeo Santos");
  });

  it("nunca ofrece a otra persona: la portada no muestra a alguien de quien el texto no habla", () => {
    const c = candidatasDePortada(fotos, { inicio: 11, fin: 11 }, "Shakira", "Prince Royce");
    expect(c.map((x) => x.nombre)).toEqual(["Prince Royce", "Prince Royce"]);
    expect(candidatasDePortada(fotos, { inicio: 11, fin: 11 }, "", "GPT-6.1 Astra")).toEqual([]);
  });

  it("solo sirve el recorte de UNA persona, recortada de verdad y con la cara grande", () => {
    const cara = { x: 0.4, y: 0.1, ancho: 0.2, alto: 0.2 };
    const base = { ancho: 1000, alto: 1200, cobertura: 0.5, caras: [cara] };
    expect(recorteSirve(base)).toBe(true);
    expect(recorteSirve({ ...base, caras: [cara, cara] })).toBe(false); // foto de grupo
    expect(recorteSirve({ ...base, caras: [] })).toBe(false); // un lugar, un objeto
    expect(recorteSirve({ ...base, cobertura: 0.9 })).toBe(false); // la foto entera: una carátula
    expect(recorteSirve({ ...base, alto: 300 })).toBe(false); // cara de 60 puntos: borrosa
  });
});

describe("portada de impacto: dónde va la persona", () => {
  const cara = { x: 0.4, y: 0.1, ancho: 0.2, alto: 0.15 };

  it("de cuerpo entero: la cara queda del tamaño y en el sitio de siempre, y el cuerpo sale por abajo", () => {
    for (const formato of ["horizontal", "vertical"] as const) {
      const r = encuadre(formato, { ancho: 1100, alto: 1300 }, cara);
      const meta = CARA_EN_PORTADA[formato];
      expect(Math.abs(r.alto * cara.alto - meta.alto)).toBeLessThan(2);
      expect(Math.abs(r.arriba + r.alto * cara.y - meta.arriba)).toBeLessThan(2);
      expect(Math.abs(r.izquierda + r.ancho * (cara.x + cara.ancho / 2) - meta.centroX)).toBeLessThan(2);
      expect(r.arriba + r.alto).toBeGreaterThanOrEqual(MEDIDAS_PORTADA[formato].alto);
    }
  });

  it("un busto nunca queda flotando: llega hasta el borde de abajo", () => {
    const busto = { x: 0.3, y: 0.2, ancho: 0.4, alto: 0.5 };
    for (const formato of ["horizontal", "vertical"] as const) {
      const r = encuadre(formato, { ancho: 900, alto: 900 }, busto);
      expect(r.arriba + r.alto).toBe(MEDIDAS_PORTADA[formato].alto);
    }
  });
});

describe("portada de impacto: cuál miniatura es de cada pieza", () => {
  it("cada Short tiene la suya y el video largo nunca muestra la de un Short", () => {
    // De la más nueva a la más vieja, como llegan de la base.
    const m = miniaturasPorPieza([
      fila("short-4.png", { portada: true, pieza: "short", indice: 4 }),
      fila("short-1.png", { portada: true, pieza: "short", indice: 1 }),
      fila("largo-impacto.png", { portada: true }),
      fila("largo-automatica.png"),
    ]);
    expect(m.largo).toBe("largo-impacto.png");
    expect(m[clavePieza("short", 1)]).toBe("short-1.png");
    expect(m[clavePieza("short", 4)]).toBe("short-4.png");
    expect(m[clavePieza("short", 2)]).toBeUndefined();
  });

  it("la portada de impacto le gana a la automática aunque esta sea más nueva (una entrega repetida)", () => {
    const m = miniaturasPorPieza([
      fila("automatica-nueva.png"),
      fila("impacto.png", { portada: true, pieza: "largo" }),
    ]);
    expect(m.largo).toBe("impacto.png");
  });

  it("una ficha rota o un archivo de otro tipo no tumban nada", () => {
    expect(miniaturasPorPieza([{ tipo: "miniatura", clave: "a.png", meta: "{roto" }]).largo).toBe("a.png");
    expect(miniaturasPorPieza([{ tipo: "voz", clave: "voz.mp3", meta: "{}" }])).toEqual({});
  });
});

describe("portada de impacto: en el panel y en la plantilla", () => {
  it("la plantilla tiene los dos formatos y nace sin persona ni objeto", () => {
    const p = esquemaPortada.parse({});
    expect(p).toMatchObject({ formato: "horizontal", sujeto: null, objeto: null, fondoFoto: null });
    const raizRemotion = readFileSync(path.join(raiz, "estacion/src/remotion/Root.tsx"), "utf8");
    expect(raizRemotion).toContain('id="Portada"');
    expect(raizRemotion).toContain('id="PortadaVertical"');
  });

  it("la página del guion pone la miniatura de cada pieza al lado de su título, con su descarga", () => {
    const pagina = readFileSync(path.join(raiz, "src/app/guiones/[id]/page.tsx"), "utf8");
    expect(pagina).toContain("Descargar miniatura");
    expect(pagina).toContain('miniaturaDe("largo", 0)');
    expect(pagina).toContain('miniaturaDe("short", s.indice)');
  });

  it("al terminar un video, la Estación arma sola las miniaturas con los textos que manda el panel", () => {
    const estacion = readFileSync(path.join(raiz, "estacion/src/estacion.ts"), "utf8");
    expect(estacion).toContain("armarPortadas(producidoEn, trabajo.guion_id, textos)");
  });
});

describe("portada con presentador y diseño nuevo (C-PORTADA-2)", () => {
  const cuadro = (seg: number, ancho: number, caras = 1, altoCara = 0.2) => ({
    seg,
    recorte: {
      ancho,
      alto: 1000,
      cobertura: 0.8,
      caras: Array.from({ length: caras }, () => ({ x: 0.3, y: 0.08, ancho: 0.3, alto: altoCara })),
    },
  });

  it("de los cuadros del presentador se elige el de gesto más abierto, con su cara a la vista", () => {
    // Caso real del 5 oct 2026: las portadas del primer video de Richard salieron SIN él, solo
    // letras sobre un fondo morado. Ahora la persona de la portada es él, sacado de su grabación.
    const elegido = mejorCuadroDePresentador([
      cuadro(10, 560), // los brazos pegados al cuerpo
      cuadro(40, 720), // una mano levantada: la figura sale más ancha
      cuadro(70, 800, 0), // el gesto más abierto, pero no se le ve la cara (se dio vuelta)
      cuadro(90, 700, 1, 0.05), // la cara, demasiado chica
    ]);
    expect(elegido?.seg).toBe(40);
    expect(mejorCuadroDePresentador([cuadro(5, 600, 0)])).toBeNull();
    expect(mejorCuadroDePresentador([])).toBeNull();
  });

  it("la portada de un Short no repite el momento de la portada del video largo", () => {
    const candidatos = [cuadro(40, 720), cuadro(41, 715), cuadro(72, 690)];
    expect(mejorCuadroDePresentador(candidatos, [40])?.seg).toBe(72);
    // Si no hay otro momento, se repite antes que dejar la portada sin persona.
    expect(mejorCuadroDePresentador([cuadro(40, 720)], [40])?.seg).toBe(40);
  });

  it("los cuadros candidatos salen repartidos por la pieza, sin el arranque ni el final", () => {
    const instantes = instantesDeMuestra(0, 103_000);
    expect(instantes).toHaveLength(14);
    expect(instantes[0]).toBeGreaterThan(1);
    expect(instantes.at(-1)).toBeLessThan(101.5);
    expect([...instantes].sort((a, b) => a - b)).toEqual(instantes);
    // Un Short que arranca a mitad del video se muestrea dentro de su tramo.
    for (const t of instantesDeMuestra(60_000, 90_000)) {
      expect(t).toBeGreaterThan(61);
      expect(t).toBeLessThan(88.5);
    }
    expect(instantesDeMuestra(0, 1500)).toHaveLength(1);
  });

  it("una palabra entre virgulillas sale tachada, y las marcas no cuentan como letras", () => {
    expect(partesDeLinea("LA IA ~GRATIS~")).toEqual([
      { texto: "LA", marcada: false, tachada: false },
      { texto: "IA", marcada: false, tachada: false },
      { texto: "GRATIS", marcada: false, tachada: true },
    ]);
    expect(partesDeLinea("~ SUELTA")[0]).toEqual({ texto: "~", marcada: false, tachada: false });
    // «LA IA ~GRATIS~» son 12 letras: cabe en la línea (15) y no se le corta la palabra tachada.
    expect(textoDePortada({ linea: "la ia ~gratis~" }).linea).toBe("LA IA ~GRATIS~");
    expect(letraQueCabe("LA IA ~GRATIS~", 624, 400)).toBe(letraQueCabe("LA IA GRATIS", 624, 400));
    // «SE ACABÓ» (dos palabras cortas) entra entero en lo grande.
    expect(textoDePortada({ grande: "se acabó" }).grande).toBe("SE ACABÓ");
  });

  it("la portada admite hasta tres marcas y la IA sabe pedirlas, tachar una palabra y no escribir raro", () => {
    expect(esquemaPortada.parse({ chips: ["ChatGPT", "Gemini"] }).chips).toEqual(["ChatGPT", "Gemini"]);
    expect(esquemaPortada.safeParse({ chips: ["a", "b", "c", "d"] }).success).toBe(false);
    const reglas = instruccionesPublicacion();
    expect(reglas).toContain("`marcas`");
    expect(reglas).toContain("~GRATIS~");
    expect(reglas).toContain("TACHADA");
    // El texto que motivó el cambio («CERO IA GRATIS») queda como ejemplo de lo que NO se escribe.
    expect(reglas).toContain("«CERO IA GRATIS» no se entiende");
    // Si la IA no manda marcas, la publicación no se rechaza.
    const cruda = esquemaPublicacionDeLaIA.parse({
      titulo: "ChatGPT y Gemini ya no son gratis",
      descripcion: "Lo que cambia esta semana en la inteligencia artificial gratis y qué puedes hacer.",
      etiquetas: Array.from({ length: 10 }, (_, k) => `etiqueta ${k}`),
      portada: { grande: "SE ACABÓ", linea: "LA IA ~GRATIS~", remate: "*PAGAS* O VES ANUNCIOS" },
      shorts: [],
    });
    expect(cruda.portada.marcas).toEqual([]);
  });

  it("el fondo de rayos sobre morado no vuelve", () => {
    const portada = readFileSync(path.join(raiz, "estacion/src/remotion/Portada.tsx"), "utf8");
    expect(portada).not.toContain("repeating-conic-gradient");
    const colores = readFileSync(path.join(raiz, "estacion/src/portadas.ts"), "utf8");
    expect(colores).not.toContain("#6d28d9");
    // Y en un video con presentador, la persona de la portada es él.
    expect(colores).toContain("mejorCuadroDePresentador(candidatos, instantesUsados)");
  });

  it("cada pieza del mismo video sale con otro color y otra trama; una marca de varias palabras no deja asteriscos (C-PORTADA-4)", () => {
    const base = { fondo: ["#d00000", "#14000a"] as [string, string], acento: "#ffd60a" };
    expect(paletaDePieza(base, 0)).toEqual(base);
    const fondos = [0, 1, 2, 3].map((i) => paletaDePieza(base, i).fondo[0]);
    expect(new Set(fondos).size).toBe(4);
    expect([0, 1, 2, 3].map(tramaDePieza)).toEqual(["puntos", "lineas", "rejilla", "puntos"]);
    // «*SIN SOLTAR* EL»: las dos palabras marcadas, sin asteriscos a la vista.
    expect(partesDelRemate("*SIN SOLTAR* EL")).toEqual([
      { texto: "SIN", marcada: true },
      { texto: "SOLTAR", marcada: true },
      { texto: "EL", marcada: false },
    ]);
    expect(partesDelRemate("*CERO* PREMIOS").map((w) => w.texto)).toEqual(["CERO", "PREMIOS"]);
    expect(partesDeLinea("~YA NO~ GRATIS").map((w) => [w.texto, w.tachada])).toEqual([
      ["YA", true],
      ["NO", true],
      ["GRATIS", false],
    ]);
    // Al recortar, una marca de varias palabras no se parte por la mitad.
    expect(textoDePortada({ remate: "muy largo de verdad *sin soltar*" }).remate).toBe(
      "MUY LARGO DE VERDAD *SIN SOLTAR*",
    );
    // En el panel gana la miniatura más nueva de cada pieza (una rehecha reemplaza a la vieja).
    const m = miniaturasPorPieza([
      fila("short-3-vieja.png", { portada: true, pieza: "short", indice: 3 }, 10),
      fila("short-3-nueva.png", { portada: true, pieza: "short", indice: 3 }, 11),
    ]);
    expect(m[clavePieza("short", 3)]).toBe("short-3-nueva.png");
  });
});
