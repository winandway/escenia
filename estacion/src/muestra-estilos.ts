// Muestra de los dos estilos nuevos (docs/ESTILOS.md) sin producir un video de
// verdad ni gastar en voz: arma una escena de ejemplo de cada uno, saca cuadros
// sueltos para revisarlos y, con --video, un clip corto (sin voz, con música,
// sonidos y subtítulos de ejemplo).
// Uso (desde estacion/):
//   npx tsx src/muestra-estilos.ts                    → cuadros de los dos estilos
//   npx tsx src/muestra-estilos.ts --video            → además, los clips en MP4
//   npx tsx src/muestra-estilos.ts --solo neon        → solo un estilo («neon» o «ilustrado»)
//   npx tsx src/muestra-estilos.ts --foto ruta.jpg    → la persona del estilo ilustrado (cuesta $0.03 la primera vez)
// Todo queda en out/muestra-estilos/.
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { cp, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { renderStill, selectComposition } from "@remotion/renderer";
import { MARCAS } from "@compartido/marcas";
import { config } from "./config";
import { figuraDe } from "./ilustrado";
import { FPS, type PropsVideo } from "./remotion/props";
import { empaquetar, renderizar } from "./render";

const exec = promisify(execFile);
const aqui = path.dirname(fileURLToPath(import.meta.url));
const publica = path.join(config.CARPETA_PUBLICA, "muestra-estilos");
const salida = path.join(config.CARPETA_SALIDA, "muestra-estilos");
const opcion = (nombre: string): string | null => {
  const i = process.argv.indexOf(nombre);
  return i === -1 ? null : (process.argv[i + 1] ?? null);
};

type Escena = PropsVideo["escenas"][number];
type Plano = Escena["planos"][number];

/** Palabras con su tiempo, repartidas parejo: hacen de voz para los subtítulos de la muestra. */
function palabrasDe(texto: string, inicioMs: number, finMs: number): PropsVideo["palabras"] {
  const lista = texto.split(/\s+/).filter(Boolean);
  const paso = (finMs - inicioMs) / lista.length;
  return lista.map((text, k) => ({
    text: `${k ? " " : ""}${text}`,
    startMs: Math.round(inicioMs + k * paso),
    endMs: Math.round(inicioMs + (k + 1) * paso - 40),
    timestampMs: Math.round(inicioMs + k * paso),
    confidence: 1,
  }));
}

const escenaBase = (parte: string, inicioMs: number, finMs: number, extra: Partial<Escena>): Escena => ({
  parte,
  inicioMs,
  finMs,
  textoEnPantalla: "",
  estilo: "clip",
  clip: null,
  foto: null,
  fotos: [],
  recorte: null,
  interludio: false,
  fondoFoto: null,
  planos: [],
  diagrama: null,
  ...extra,
});

async function recursos(): Promise<Pick<PropsVideo, "sfx" | "musica" | "marca" | "audio">> {
  await mkdir(path.join(publica, "sfx"), { recursive: true });
  await mkdir(path.join(publica, "marca"), { recursive: true });
  const sfx = path.resolve(aqui, "../recursos/sfx");
  for (const a of [
    "pop.mp3",
    "boom.mp3",
    "whoosh-1.mp3",
    "corte-1.mp3",
    "corte-2.mp3",
    "corte-3.mp3",
    "ding.mp3",
  ])
    await cp(path.join(sfx, a), path.join(publica, "sfx", a));
  const marca = MARCAS["full-codigo"];
  await cp(
    path.resolve(aqui, "../recursos/marcas", marca.carpeta, "logo.png"),
    path.join(publica, "marca/logo.png"),
  );
  const pista = path.resolve(aqui, "../recursos/musica/beat-kick-bass-driving-pulse-neutral.mp3");
  await cp(pista, path.join(publica, "musica.mp3"));
  // La «voz» de la muestra es silencio: el clip es para ver el diseño, no para oír un guion.
  if (!existsSync(path.join(publica, "voz.mp3")))
    await exec("ffmpeg", [
      "-y",
      "-f",
      "lavfi",
      "-i",
      "anullsrc=r=44100:cl=mono",
      "-t",
      "40",
      "-q:a",
      "9",
      path.join(publica, "voz.mp3"),
    ]);
  return {
    audio: "voz.mp3",
    sfx: {
      whoosh: ["sfx/whoosh-1.mp3"],
      pop: "sfx/pop.mp3",
      riser: null,
      ding: "sfx/ding.mp3",
      boom: "sfx/boom.mp3",
      corte: ["sfx/corte-1.mp3", "sfx/corte-2.mp3", "sfx/corte-3.mp3"],
    },
    musica: { ruta: "musica.mp3", duracionSeg: 30, nivel: 1.25 },
    marca: {
      id: marca.id,
      logo: "marca/logo.png",
      nombre: "Full Código",
      usuario: "@FullCodigo",
      lema: marca.lema,
      acento: marca.acento,
      secundario: marca.secundario,
    },
  };
}

/** El ejemplo de Richard: cómo se mueve una venta por su sistema, contado con diagramas. */
function muestraNeon(base: Awaited<ReturnType<typeof recursos>>): PropsVideo {
  const secciones = ["Ventas", "Depósito", "Resultado"];
  const t1 =
    "En ventas, el cliente compra. El vendedor le da salida al producto y la venta queda registrada.";
  const t2 =
    "El producto se descuenta del depósito. Y puedes agregar varios depósitos: cada uno lleva su propia cuenta.";
  const t3 = "Todo cuadra solo. Cada venta descuenta el inventario sin que nadie toque nada.";
  const escenas: Escena[] = [
    escenaBase("gancho", 0, 8000, {
      estilo: "diagrama",
      diagrama: {
        numero: 1,
        secciones,
        seccion: 0,
        titular: "La venta: quién hace qué",
        bajada: "",
        nodos: [
          { id: "cliente", icono: "persona", etiqueta: "Cliente", nota: "compra", entraMs: 700 },
          { id: "vendedor", icono: "vendedor", etiqueta: "Vendedor", nota: "da salida", entraMs: 2600 },
          { id: "producto", icono: "producto", etiqueta: "Producto", nota: "", entraMs: 4300 },
          { id: "venta", icono: "factura", etiqueta: "Venta registrada", nota: "", entraMs: 6100 },
        ],
        flechas: [
          { de: "cliente", a: "vendedor", texto: "", entraMs: 2600 },
          { de: "vendedor", a: "producto", texto: "", entraMs: 4300 },
          { de: "producto", a: "venta", texto: "", entraMs: 6100 },
        ],
        formula: "",
        formulaMs: null,
      },
    }),
    escenaBase("demo", 8000, 17000, {
      estilo: "diagrama",
      diagrama: {
        numero: 2,
        secciones,
        seccion: 1,
        titular: "El depósito: de dónde sale",
        bajada: "",
        nodos: [
          { id: "producto", icono: "producto", etiqueta: "Producto vendido", nota: "", entraMs: 8500 },
          {
            id: "principal",
            icono: "deposito",
            etiqueta: "Depósito principal",
            nota: "se descuenta",
            entraMs: 10200,
          },
          { id: "otro", icono: "deposito", etiqueta: "Depósito 2", nota: "su propia cuenta", entraMs: 13200 },
        ],
        flechas: [
          { de: "producto", a: "principal", texto: "", entraMs: 10200 },
          { de: "principal", a: "otro", texto: "", entraMs: 13200 },
        ],
        formula: "venta → salida → descuento del depósito",
        formulaMs: 14800,
      },
    }),
    escenaBase("cierre", 17000, 23000, {
      estilo: "diagrama",
      diagrama: {
        numero: 3,
        secciones,
        seccion: 2,
        titular: "TODO CUADRA SOLO",
        bajada: "Cada venta descuenta el inventario.",
        nodos: [
          {
            id: "ok",
            icono: "grafica",
            etiqueta: "Inventario al día",
            nota: "sin tocar nada",
            entraMs: 18200,
          },
        ],
        flechas: [],
        formula: "",
        formulaMs: null,
      },
    }),
  ];
  return {
    titulo: "Así se mueve una venta en tu sistema",
    ...base,
    duracionMs: 23000,
    palabras: [...palabrasDe(t1, 300, 7700), ...palabrasDe(t2, 8300, 16700), ...palabrasDe(t3, 17300, 22600)],
    escenas,
    producto: null,
    vozDePrueba: false,
    tema: "tech",
    idioma: "es",
    estilo: "neon",
    presentador: null,
    ventana: null,
    cierre: { canalNombre: "Full Código", canalUsuario: "@FullCodigo", miniatura: null },
  };
}

/** Una noticia de tecnología con la persona dibujada: la figura entra, y los titulares le caen encima. */
function muestraIlustrado(
  base: Awaited<ReturnType<typeof recursos>>,
  figura: NonNullable<Plano["figura"]>,
  foto: NonNullable<Plano["foto"]>,
): PropsVideo {
  const t1 =
    "OpenAI tenía listo su modelo más potente. Y un día antes del evento, lo frenó. No pasó sus propias pruebas de seguridad.";
  const plano = (
    inicioMs: number,
    tipo: Plano["tipo"],
    texto: string,
    extra: Partial<Plano> = {},
  ): Plano => ({
    inicioMs,
    tipo,
    foto: tipo === "foto" ? foto : null,
    clip: null,
    texto,
    figura: null,
    transparente: false,
    sigue: false,
    ...extra,
  });
  const escenas: Escena[] = [
    escenaBase("gancho", 0, 12000, {
      estilo: "clip",
      planos: [
        plano(0, "foto", "Sam Altman", { figura }),
        plano(2400, "dato", "El modelo más potente", { figura, sigue: true }),
        plano(4800, "dato", "Un día antes", { figura, sigue: true }),
        plano(7000, "dato", "Lo frenó", { figura, sigue: true }),
        plano(9200, "dato", "No pasó la prueba", { figura, sigue: true }),
      ],
    }),
  ];
  return {
    titulo: "El modelo que OpenAI frenó un día antes",
    ...base,
    duracionMs: 12000,
    palabras: palabrasDe(t1, 200, 11700),
    escenas,
    producto: null,
    vozDePrueba: false,
    tema: "tech",
    idioma: "es",
    estilo: "ilustrado",
    presentador: null,
    ventana: null,
    cierre: { canalNombre: "Full Código", canalUsuario: "@FullCodigo", miniatura: null },
  };
}

async function principal() {
  await mkdir(salida, { recursive: true });
  const base = await recursos();
  const solo = opcion("--solo");
  const conVideo = process.argv.includes("--video");
  const muestras: { nombre: string; props: PropsVideo; segundos: number[] }[] = [];
  if (solo !== "ilustrado")
    muestras.push({ nombre: "neon", props: muestraNeon(base), segundos: [1.5, 5, 7.5, 11.5, 15.5, 20] });
  if (solo !== "neon") {
    // La persona: una foto que ya esté en la Mac (la del último video de tecnología) o la que se diga.
    const pedida = opcion("--foto");
    const foto = pedida
      ? path.resolve(pedida)
      : path.join(config.CARPETA_PUBLICA, "t24/fotos/web-bb02e7ca9cb9e49d.jpg");
    if (!existsSync(foto)) throw new Error(`No está la foto ${foto}. Pasa una con --foto.`);
    await mkdir(path.join(publica, "fotos"), { recursive: true });
    await cp(foto, path.join(publica, "fotos", "persona.jpg"));
    const figura = await figuraDe(path.join(publica, "fotos", "persona.jpg"), publica);
    if (!figura) throw new Error("No se pudo dibujar a la persona (¿falta la clave de fal.ai?).");
    if (figura.costoUsd > 0) console.log(`  (dibujo nuevo: $${figura.costoUsd.toFixed(2)})`);
    muestras.push({
      nombre: "ilustrado",
      props: muestraIlustrado(base, figura.figura, {
        ruta: "fotos/persona.jpg",
        ancho: 1501,
        alto: 2048,
        enfoque: null,
      }),
      segundos: [0.25, 1.6, 3.2, 5.6, 9.8],
    });
  }

  const serveUrl = await empaquetar(publica);
  for (const m of muestras) {
    const vertical: PropsVideo = {
      ...m.props,
      ventana: { inicioMs: 0, finMs: m.props.duracionMs, titulo: m.props.titulo, indice: 1, total: 1 },
    };
    for (const [id, props, forma] of [
      ["TechExplainer", m.props, "horizontal"],
      ["TechExplainerShort", vertical, "vertical"],
    ] as const) {
      const comp = await selectComposition({ serveUrl, id, inputProps: props });
      for (const seg of m.segundos) {
        const archivo = path.join(salida, `${m.nombre}-${forma}-${String(seg).replace(".", "_")}.png`);
        await renderStill({
          composition: comp,
          serveUrl,
          output: archivo,
          inputProps: props,
          frame: Math.min(comp.durationInFrames - 1, Math.round(seg * FPS)),
          imageFormat: "png",
        });
      }
      console.log(`  cuadros ${m.nombre} ${forma}: ${m.segundos.length}`);
      if (conVideo) {
        const mp4 = path.join(salida, `${m.nombre}-${forma}.mp4`);
        await renderizar(id, props, publica, mp4, () => {}, serveUrl);
        console.log(`  clip: ${mp4}`);
      }
    }
  }
  console.log(`Listo: ${salida}`);
}

principal().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
