import { beforeEach, describe, expect, it } from "vitest";
import { baseEnMemoria } from "./base-memoria";
import { esquemaComercialNuevo, MIN_PALABRAS_COMERCIAL } from "@compartido/comerciales";
import { esquemaGuion, esquemaGuionGenerado, TIPOS_PLANO } from "@compartido/guion";
import { esquemaGuionDeLaIA, guionDesdeLaIA, tipoDePlanoValido } from "@compartido/guion-ia";
import { dejarSoloFiguras } from "@compartido/ilustrado";
import {
  buscarImagenPorNombre,
  esquemaImagenNueva,
  extensionDeImagen,
  nombreDeCarpeta,
} from "@compartido/imagenes";
import { logoDelCliente } from "@compartido/portada";
import { textoParaLaVoz } from "@compartido/pronunciacion";
import { buscarTematica } from "@compartido/tematicas";
import {
  comercialDeGuion,
  comercialesVisibles,
  comercialPorId,
  crearComercial,
  otraVersionComercial,
  planDeComercial,
  quitarComercial,
  registrarPlanComercial,
  tomarSiguienteComercial,
} from "@/lib/comerciales";
import {
  carpetasDeImagenes,
  guardarImagen,
  imagenesActivas,
  quitarCarpeta,
  quitarImagen,
} from "@/lib/imagenes";
import { mensajeDePlanComercial, planComercialLimpio } from "@/lib/plan-comercial";
import { mensajePublicacion } from "@/lib/publicacion";
import { esquemaPlanoVideo, esquemaPropsVideo } from "../estacion/src/remotion/props";

const TEXTO =
  "Your logo is the first thing your customers see. Let's make it count. I'm Andreea, a brand designer, and here on Fiverr I create clean, modern logos for small businesses, startups and online stores. Every concept is original.";

const PEDIDO = {
  nombre: "Andreea · gig de logos",
  narracion: TEXTO,
  idioma: "en",
  voz: "femenina",
  instrucciones: "Que pasen todos los logos cuando habla de sus trabajos.",
  carpetas: ["Logos Andreea"],
} as const;

const PLAN = esquemaGuion.parse({
  titulo: "Andreea · gig de logos",
  gancho: "Your logo is the first thing your customers see.",
  escenas: [
    {
      parte: "gancho",
      narracion: "Your logo is the first thing your customers see. Let's make it count.",
      visual: {
        tipo: "stock",
        titular: "Your logo, first",
        planos: [
          { frase: "Your logo is", tipo: "imagen", archivo: "01 Dame Mexico.png", texto: "" },
          { frase: "make it count", tipo: "dato", texto: "Make it count" },
        ],
      },
    },
    {
      parte: "contexto",
      narracion: "I'm Andreea, a brand designer, and here on Fiverr I create clean, modern logos.",
      visual: { tipo: "texto", titular: "Clean, modern logos" },
    },
    {
      parte: "cierre",
      narracion: "Every concept is original.",
      visual: { tipo: "texto", titular: "Original" },
    },
  ],
});

describe("biblioteca de imágenes (C-IMAGENES-1)", () => {
  let db: ReturnType<typeof baseEnMemoria>;
  const almacen = { put: async () => {} };
  beforeEach(() => {
    db = baseEnMemoria();
  });

  it("solo entran PNG, JPG, WEBP y PDF, en una carpeta con nombre limpio", () => {
    expect(extensionDeImagen("05 Pro In Shop (horizontal).PNG")).toBe("png");
    expect(extensionDeImagen("capturas.pdf")).toBe("pdf");
    expect(extensionDeImagen("programa.exe")).toBe("");
    expect(nombreDeCarpeta("  Logos / Andreea: cliente  ")).toBe("Logos Andreea cliente");
    expect(
      esquemaImagenNueva.safeParse({ carpeta: "Logos Andreea", nombre: "a.png", extension: "png" }).success,
    ).toBe(true);
    expect(esquemaImagenNueva.safeParse({ carpeta: "x", nombre: "a.png", extension: "png" }).success).toBe(
      false,
    );
    expect(
      esquemaImagenNueva.safeParse({ carpeta: "Logos", nombre: "a.exe", extension: "exe" }).success,
    ).toBe(false);
  });

  it("se guardan por carpeta, el mismo nombre reemplaza al anterior, y quitar no borra", async () => {
    await guardarImagen(
      db,
      almacen,
      { carpeta: "Logos Andreea", nombre: "01 Dame Mexico.png", extension: "png" },
      new ArrayBuffer(500),
    );
    await guardarImagen(
      db,
      almacen,
      { carpeta: "Logos Andreea", nombre: "02 Musso.png", extension: "png" },
      new ArrayBuffer(500),
    );
    await guardarImagen(
      db,
      almacen,
      { carpeta: "Capturas", nombre: "paginas.pdf", extension: "pdf" },
      new ArrayBuffer(900),
    );
    // El mismo archivo subido dos veces a la misma carpeta: queda uno solo (el nuevo).
    const otra = await guardarImagen(
      db,
      almacen,
      { carpeta: "Logos Andreea", nombre: "02 Musso.png", extension: "png" },
      new ArrayBuffer(700),
    );
    const activas = await imagenesActivas(db, "Logos Andreea");
    expect(activas.map((i) => i.nombre)).toEqual(["01 Dame Mexico.png", "02 Musso.png"]);
    expect(activas.find((i) => i.nombre === "02 Musso.png")?.id).toBe(otra.id);
    expect((await imagenesActivas(db, "Capturas"))[0]?.tipo).toBe("pdf");
    const carpetas = await carpetasDeImagenes(db);
    expect(carpetas.map((c) => [c.carpeta, c.archivos])).toEqual([
      ["Logos Andreea", 2],
      ["Capturas", 1],
    ]);
    await quitarImagen(db, otra.id);
    expect((await imagenesActivas(db, "Logos Andreea")).map((i) => i.nombre)).toEqual(["01 Dame Mexico.png"]);
    await quitarCarpeta(db, "Logos Andreea");
    expect(await imagenesActivas(db, "Logos Andreea")).toEqual([]);
    // Las filas siguen ahí: no se borró nada.
    expect((await db.uno<{ n: number }>("SELECT COUNT(id) AS n FROM imagenes"))?.n).toBe(4);
  });

  it("la IA pide una imagen por su nombre y se encuentra aunque lo escriba distinto", () => {
    const lista = [
      { nombre: "05 Pro In Shop (horizontal).png" },
      { nombre: "04 Pro In Shop (vertical).png" },
      { nombre: "capturas Andreea p3" },
      { nombre: "16 Design Blidar.png" },
    ];
    expect(buscarImagenPorNombre("05 Pro In Shop (horizontal).png", lista)?.nombre).toBe(
      "05 Pro In Shop (horizontal).png",
    );
    expect(buscarImagenPorNombre("pro in shop horizontal", lista)?.nombre).toBe(
      "05 Pro In Shop (horizontal).png",
    );
    expect(buscarImagenPorNombre("Capturas Andreea P3", lista)?.nombre).toBe("capturas Andreea p3");
    expect(buscarImagenPorNombre("Design Blidar", lista)?.nombre).toBe("16 Design Blidar.png");
    expect(buscarImagenPorNombre("logo inventado.png", lista)).toBeNull();
    expect(buscarImagenPorNombre("", lista)).toBeNull();
  });
});

describe("comerciales: el video publicitario de un cliente (C-COMERCIAL-1)", () => {
  let db: ReturnType<typeof baseEnMemoria>;
  beforeEach(() => {
    db = baseEnMemoria();
  });

  it("el pedido exige texto suficiente, idioma, voz y al menos una carpeta", () => {
    expect(esquemaComercialNuevo.safeParse(PEDIDO).success).toBe(true);
    expect(esquemaComercialNuevo.safeParse({ ...PEDIDO, narracion: "hola que tal" }).success).toBe(false);
    expect(esquemaComercialNuevo.safeParse({ ...PEDIDO, narracion: "palabra ".repeat(300) }).success).toBe(
      false,
    );
    expect(esquemaComercialNuevo.safeParse({ ...PEDIDO, idioma: "fr" }).success).toBe(false);
    expect(esquemaComercialNuevo.safeParse({ ...PEDIDO, carpetas: [] }).success).toBe(false);
    expect(MIN_PALABRAS_COMERCIAL).toBeGreaterThanOrEqual(20);
  });

  it("la Estación lo toma una sola vez; con el plan nace un guion aprobado del cliente, sin canal", async () => {
    const id = await crearComercial(db, esquemaComercialNuevo.parse(PEDIDO));
    const tomado = await tomarSiguienteComercial(db);
    expect(tomado?.id).toBe(id);
    expect(tomado?.carpetas).toBe(JSON.stringify(["Logos Andreea"]));
    expect(await tomarSiguienteComercial(db)).toBeNull();
    const r = await registrarPlanComercial(db, tomado!, PLAN, { modelo: "m", costoUsd: 0.03 });
    const guion = await db.uno<{ estado: string; tematica_id: string; titulo: string; contenido: string }>(
      "SELECT * FROM guiones WHERE id = ?",
      [r.guionId],
    );
    expect(guion).toMatchObject({ estado: "aprobado", tematica_id: "comercial", titulo: PEDIDO.nombre });
    // La voz del pedido queda en el guion, y la narración es la del cliente, literal.
    const contenido = esquemaGuion.parse(JSON.parse(guion!.contenido));
    expect(contenido.voz).toBe("femenina");
    expect(contenido.escenas[0]?.narracion).toBe(PLAN.escenas[0]?.narracion);
    expect(buscarTematica("comercial")?.activa).toBe(false);
    expect(await comercialDeGuion(db, r.guionId)).toMatchObject({ id, idioma: "en" });
    // Un segundo pedido del plan no crea otro guion.
    expect(await registrarPlanComercial(db, tomado!, PLAN, { modelo: "m", costoUsd: 0 })).toEqual(r);
    expect(await planDeComercial(db, id)).toEqual(r);
    expect((await db.uno<{ n: number }>("SELECT COUNT(id) AS n FROM guiones"))?.n).toBe(1);
    // «Armar otra versión» vuelve a la fila con el mismo pedido; «Quitar» no borra.
    const otra = await otraVersionComercial(db, id);
    expect((await comercialPorId(db, otra!))?.estado).toBe("subida");
    await quitarComercial(db, id);
    expect((await comercialesVisibles(db)).map((c) => c.id)).toEqual([otra]);
    expect((await comercialPorId(db, id))?.estado).toBe("quitada");
  });

  it("a la IA se le dan las imágenes por su nombre y se le prohíben las fotos de internet", () => {
    const m = mensajeDePlanComercial({
      nombre: PEDIDO.nombre,
      narracion: TEXTO,
      idioma: "en",
      instrucciones: PEDIDO.instrucciones,
      imagenes: [
        { nombre: "01 Dame Mexico.png", transparente: true, ancho: 561, alto: 587 },
        { nombre: "capturas p1", transparente: false, ancho: 1900, alto: 1200 },
      ],
    });
    expect(m).toContain("«01 Dame Mexico.png»");
    expect(m).toContain("logo o figura con fondo transparente");
    expect(m).toContain("NUNCA uses planos «foto» ni «stock»");
    expect(m).toContain("IDIOMA DEL TEXTO: inglés");
    expect(m).toContain(PEDIDO.instrucciones);
    expect(m).toContain("se COPIA");
    expect(m).toContain("Usa TODAS las imágenes de la lista");
  });

  it("lo que la IA no puede usar se limpia: fotos y clips fuera, imágenes sin archivo fuera", () => {
    const crudo = esquemaGuionGenerado.parse({
      ...PLAN,
      escenas: [
        {
          parte: "gancho",
          narracion: PLAN.escenas[0]?.narracion,
          visual: {
            tipo: "stock",
            titular: "x",
            planos: [
              { frase: "Your logo is", tipo: "foto", busqueda: "Andreea designer", texto: "Andreea" },
              { frase: "first thing", tipo: "stock", busqueda: "designer at work" },
              { frase: "make it count", tipo: "imagen", archivo: "" },
              { frase: "customers see", tipo: "imagen", archivo: "01 Dame Mexico.png" },
              { frase: "Let's make", tipo: "dato", texto: "Make it count" },
            ],
          },
        },
        ...PLAN.escenas.slice(1),
      ],
    });
    const limpio = planComercialLimpio(crudo);
    expect(limpio.escenas[0]?.visual.planos?.map((p) => p.tipo)).toEqual(["imagen", "dato"]);
    expect(limpio.hechos_a_verificar).toEqual([]);
  });

  it("el formato de la IA conoce el plano «imagen» y su archivo; «logo» también vale", () => {
    expect([...TIPOS_PLANO]).toContain("imagen");
    expect(tipoDePlanoValido("imagen")).toBe("imagen");
    expect(tipoDePlanoValido("logo")).toBe("imagen");
    const guion = guionDesdeLaIA(
      esquemaGuionDeLaIA.parse({
        titulo: "Andreea · gig de logos",
        gancho: "Your logo is the first thing your customers see.",
        escenas: PLAN.escenas.map((e) => ({
          parte: e.parte,
          narracion: e.narracion,
          visual: {
            tipo: "stock",
            busqueda: "",
            url: "",
            prompt_imagen: "",
            titular: e.visual.titular ?? "",
            cuerpo: "",
            fecha: "",
            texto_en_pantalla: "",
            foto_de: "",
            planos: [
              {
                frase: "Your logo is",
                tipo: "imagen",
                busqueda: "",
                foto_de: "",
                texto: "",
                archivo: "01 Dame Mexico.png",
              },
            ],
            diagrama: { seccion: "", nodos: [], flechas: [], formula: "" },
            cuadros: [],
          },
          duracion_seg: 0,
        })),
        hechos_a_verificar: [],
        descripcion_youtube: "",
        etiquetas: [],
        musica: "modern corporate tech, soft synth pulse",
      }),
    );
    expect(guion.escenas[0]?.visual.planos?.[0]).toMatchObject({
      tipo: "imagen",
      archivo: "01 Dame Mexico.png",
    });
    expect(
      esquemaPlanoVideo.parse({
        inicioMs: 0,
        tipo: "imagen",
        foto: { ruta: "imagenes/a.png", ancho: 10, alto: 10 },
        transparente: true,
      }).transparente,
    ).toBe(true);
  });

  it("en el video del cliente se quedan sus imágenes y los datos; en una grabación, solo lo dibujado", () => {
    const plano = (tipo: "imagen" | "dato" | "foto", texto = "") => ({
      tipo,
      foto: tipo === "dato" ? null : { ruta: "x" },
      texto,
      figura: null,
      sigue: false,
    });
    const comercial = [{ planos: [plano("imagen"), plano("dato", "100%"), plano("foto")] }];
    expect(dejarSoloFiguras(comercial, (p) => p.tipo === "imagen" || p.tipo === "dato")).toBe(1);
    expect(comercial[0]?.planos.map((p) => p.tipo)).toEqual(["imagen", "dato"]);
    const grabacion = [{ planos: [plano("imagen"), plano("dato", "100%")] }];
    expect(dejarSoloFiguras(grabacion)).toBe(2);
  });

  it("en inglés la voz recibe el texto tal cual: ni cifras en letras ni la H quitada", () => {
    const enLetras = (t: string) => t.replace("100", "cien");
    expect(textoParaLaVoz("you own 100 percent, here on Fiverr", "en", enLetras)).toEqual({
      subtitulos: "you own 100 percent, here on Fiverr",
      voz: "you own 100 percent, here on Fiverr",
    });
    const es = textoParaLaVoz("tiene 100 hoteles en La Habana", "es", enLetras);
    expect(es.subtitulos).toBe("tiene cien hoteles en La Habana");
    expect(es.voz).not.toContain("Habana");
  });
});

describe("comerciales: la voz lee el texto del cliente una vez, entero y en orden (C-COMERCIAL-2)", () => {
  const juntas = (g: { escenas: { narracion: string }[] }) =>
    g.escenas
      .map((e) => e.narracion)
      .join(" ")
      .split(/\s+/);
  const DOS_LOGOS = {
    parte: "demo",
    narracion:
      "I'm Andreea, a brand designer, and here on Fiverr I create clean, modern logos for small businesses, startups and online stores.",
    visual: {
      tipo: "stock",
      titular: "Clean, modern logos",
      planos: [{ frase: "clean, modern logos", tipo: "imagen", archivo: "01 Dame Mexico.png", texto: "" }],
    },
  };

  it("una escena que repite lo ya dicho sale del plan, y sus imágenes pasan a la escena anterior", () => {
    const crudo = esquemaGuionGenerado.parse({
      ...PLAN,
      escenas: [
        PLAN.escenas[0],
        DOS_LOGOS,
        {
          parte: "demo",
          narracion: "startups and online stores.",
          visual: {
            tipo: "stock",
            titular: "Online stores",
            planos: [{ frase: "online stores", tipo: "imagen", archivo: "02 Tienda.png", texto: "" }],
          },
        },
        PLAN.escenas[2],
      ],
    });
    const limpio = planComercialLimpio(crudo, TEXTO);
    expect(limpio.escenas).toHaveLength(3);
    expect(juntas(limpio)).toEqual(TEXTO.split(/\s+/));
    expect(limpio.escenas[1]?.visual.planos?.map((p) => p.archivo)).toEqual([
      "01 Dame Mexico.png",
      "02 Tienda.png",
    ]);
  });

  it("lo que la IA se saltó o reescribió vuelve a ser el texto del cliente, palabra por palabra", () => {
    const crudo = esquemaGuionGenerado.parse({
      ...PLAN,
      escenas: [
        PLAN.escenas[0],
        // Se come «for small businesses, startups and online stores.»
        {
          parte: "contexto",
          narracion: "I'm Andreea, a brand designer, and here on Fiverr I create clean, modern logos.",
          visual: { tipo: "texto", titular: "Clean, modern logos" },
        },
        // Reescrita: «Each» en vez de «Every».
        {
          parte: "cierre",
          narracion: "Each concept is original.",
          visual: { tipo: "texto", titular: "Original" },
        },
      ],
    });
    const limpio = planComercialLimpio(crudo, TEXTO);
    expect(juntas(limpio)).toEqual(TEXTO.split(/\s+/));
    expect(limpio.escenas[1]?.narracion).toMatch(/online stores\. Every concept is original\.$/);
  });

  it("si la primera escena no arranca con la primera palabra, lo que falta se le pone delante", () => {
    const crudo = esquemaGuionGenerado.parse({
      ...PLAN,
      escenas: [{ ...PLAN.escenas[0], narracion: "Let's make it count." }, DOS_LOGOS, PLAN.escenas[2]],
    });
    const limpio = planComercialLimpio(crudo, TEXTO);
    expect(juntas(limpio)).toEqual(TEXTO.split(/\s+/));
    expect(limpio.escenas[0]?.narracion).toMatch(/^Your logo is/);
  });

  it("sin el texto del cliente no se alinea nada (ese paso es solo de los comerciales)", () => {
    const crudo = esquemaGuionGenerado.parse({ ...PLAN, escenas: [PLAN.escenas[0], DOS_LOGOS, DOS_LOGOS] });
    expect(planComercialLimpio(crudo).escenas).toHaveLength(3);
    expect(planComercialLimpio(crudo, TEXTO).escenas).toHaveLength(2);
  });
});

describe("comerciales: lo que se ve y se lee va en el idioma del cliente", () => {
  it("los textos de YouTube y la miniatura se piden en inglés, sin «suscríbete»", () => {
    const m = mensajePublicacion(PLAN, "Comercial (video publicitario de un cliente)", [], "en");
    expect(m).toContain("este video es en INGLÉS");
    expect(m).toContain("Nada de «suscríbete»");
    expect(mensajePublicacion(PLAN, "Biografía de artista", [])).not.toContain("INGLÉS");
  });

  it("la plantilla sabe el idioma del video (por defecto español) y la miniatura lleva el logo del cliente", () => {
    const base = esquemaPropsVideo.parse({
      titulo: "x",
      audio: "voz.mp3",
      duracionMs: 1000,
      palabras: [],
      escenas: [],
      producto: null,
    });
    expect(base.idioma).toBe("es");
    const plano = (ruta: string, transparente: boolean) => ({
      inicioMs: 0,
      tipo: "imagen",
      foto: { ruta, ancho: 300, alto: 100, enfoque: null },
      transparente,
    });
    const props = esquemaPropsVideo.parse({
      ...base,
      idioma: "en",
      escenas: [
        {
          parte: "gancho",
          inicioMs: 0,
          finMs: 5000,
          estilo: "clip",
          clip: null,
          planos: [plano("imagenes/a.png", true)],
        },
        {
          parte: "cierre",
          inicioMs: 5000,
          finMs: 9000,
          estilo: "clip",
          clip: null,
          planos: [plano("imagenes/captura.png", false), plano("imagenes/marca.png", true)],
        },
      ],
    });
    expect(props.idioma).toBe("en");
    // El último logo sin fondo (el video cierra con la marca del cliente); una captura no sirve de logo.
    expect(logoDelCliente(props, 0, 1)?.ruta).toBe("imagenes/marca.png");
    expect(logoDelCliente(props, 0, 0)?.ruta).toBe("imagenes/a.png");
    expect(logoDelCliente({ ...props, escenas: [] }, 0, 0)).toBeNull();
  });
});
