// Saca cuadros sueltos (PNG) de cómo se ve un video CON la marca de un canal,
// sin producir nada ni gastar: sirve para revisar el aspecto antes de tocar un
// video de verdad. Uso (desde estacion/):  npx tsx src/muestra-marca.ts
// Los cuadros quedan en out/muestra-marca/.
import { execFile } from "node:child_process";
import { cp, mkdir, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { renderStill, selectComposition } from "@remotion/renderer";
import { MARCAS } from "@compartido/marcas";
import { config } from "./config";
import { FPS, type PropsVideo } from "./remotion/props";
import { empaquetar, renderizarMiniatura } from "./render";

const exec = promisify(execFile);
const aqui = path.dirname(fileURLToPath(import.meta.url));
const marca = MARCAS["full-codigo"];
const publica = path.join(config.CARPETA_PUBLICA, "muestra-marca");
const salida = path.join(config.CARPETA_SALIDA, "muestra-marca");

async function primero(carpeta: string, patron: RegExp): Promise<string | null> {
  const lista = (await readdir(carpeta).catch(() => [] as string[])).filter((a) => patron.test(a)).sort();
  return lista[0] ? path.join(carpeta, lista[0]) : null;
}

async function principal() {
  await mkdir(path.join(publica, "marca"), { recursive: true });
  await mkdir(salida, { recursive: true });
  await cp(
    path.resolve(aqui, "../recursos/marcas", marca.carpeta, "logo.png"),
    path.join(publica, "marca/logo.png"),
  );
  // Un clip y una foto cualesquiera de los que ya hay en la Mac, para ver la marca sobre imagen real.
  const clip = await primero(config.CARPETA_CLIPS, /\.mp4$/);
  if (clip) await cp(clip, path.join(publica, "clip.mp4"));
  const foto = process.argv[2] ? path.resolve(process.argv[2]) : null;
  if (foto) await cp(foto, path.join(publica, "foto.jpg"));
  await writeFile(path.join(publica, "voz.mp3"), "");

  const escena = (
    n: number,
    parte: string,
    estilo: PropsVideo["escenas"][number]["estilo"],
    extra: Partial<PropsVideo["escenas"][number]> = {},
  ): PropsVideo["escenas"][number] => ({
    parte,
    inicioMs: n * 5000,
    finMs: (n + 1) * 5000,
    textoEnPantalla: "",
    estilo,
    clip: clip ? { ruta: "clip.mp4", duracionSeg: 8 } : null,
    foto: null,
    fotos: [],
    recorte: null,
    interludio: false,
    fondoFoto: null,
    planos: [],
    diagrama: null,
    ...extra,
  });
  // Medidas reales de la foto (con `sips`, que trae la Mac), para que el recorte sea el de verdad.
  let medidas = { ancho: 1600, alto: 1067 };
  if (foto) {
    const { stdout } = await exec("sips", ["-g", "pixelWidth", "-g", "pixelHeight", foto]);
    const ancho = Number(/pixelWidth: (\d+)/.exec(stdout)?.[1]);
    const alto = Number(/pixelHeight: (\d+)/.exec(stdout)?.[1]);
    if (ancho > 0 && alto > 0) medidas = { ancho, alto };
  }
  const datosFoto = foto ? { ruta: "foto.jpg", ...medidas, enfoque: { x: 0.5, y: 0.35 } } : null;
  const escenas: PropsVideo["escenas"] = [
    escena(0, "gancho", datosFoto ? "foto" : "clip", {
      foto: datosFoto,
      textoEnPantalla: "El modelo que no salió",
    }),
    escena(1, "contexto", "clip", { textoEnPantalla: "Más de 20 lanzamientos" }),
    escena(2, "dato", "titular", {
      recorte: { tipo: "titular", titular: "Agentes siempre encendidos", fecha: "29 sep 2026", cuerpo: "" },
    }),
    escena(3, "dato", "recorte", {
      recorte: {
        tipo: "periodico",
        titular: "Un modelo frenado un día antes",
        fecha: "28 sep 2026",
        cuerpo:
          "No pasó las pruebas internas de seguridad. El lanzamiento se canceló; la investigación sigue.",
      },
    }),
    escena(4, "problema", "frase", { textoEnPantalla: "¿Quién aprueba lo que hace el agente?" }),
    escena(5, "opinion", "frase", { clip: null, textoEnPantalla: "Mi opinión" }),
    escena(6, "cierre", "recorte", {
      recorte: {
        tipo: "red",
        titular: "Comentario",
        fecha: "hoy",
        cuerpo: "Si el agente trabaja solo, la pregunta es quién responde.",
      },
    }),
  ];
  const duracionMs = escenas.length * 5000;
  const palabras = "Esto es lo que cambia para tu negocio desde hoy".split(" ").map((text, k) => ({
    text: `${k ? " " : ""}${text}`,
    startMs: 5600 + k * 300,
    endMs: 5900 + k * 300,
    timestampMs: 5600 + k * 300,
    confidence: 1,
  }));
  const props: PropsVideo = {
    titulo: "GPT-6.1 Astra: el modelo que OpenAI no se atrevió a lanzar",
    audio: "voz.mp3",
    duracionMs,
    palabras,
    escenas,
    producto: null,
    vozDePrueba: false,
    tema: "tech",
    estilo: "clasico",
    sfx: { whoosh: [], pop: null, riser: null, ding: null, boom: null, corte: [] },
    musica: null,
    marca: {
      id: marca.id,
      logo: "marca/logo.png",
      nombre: "Full Código",
      usuario: "@FullCodigo",
      lema: marca.lema,
      acento: marca.acento,
      secundario: marca.secundario,
    },
    ventana: null,
    cierre: { canalNombre: "Full Código", canalUsuario: "@FullCodigo", miniatura: null },
  };

  const serveUrl = await empaquetar(publica);
  await renderizarMiniatura(props, serveUrl, path.join(salida, "miniatura.png"));
  const cuadro = async (nombre: string, id: string, p: PropsVideo, seg: number) => {
    const comp = await selectComposition({ serveUrl, id, inputProps: p });
    await renderStill({
      composition: comp,
      serveUrl,
      output: path.join(salida, `${nombre}.png`),
      inputProps: p,
      frame: Math.min(comp.durationInFrames - 1, Math.round(seg * FPS)),
      imageFormat: "png",
    });
    console.log(`  ${nombre}.png`);
  };
  const largo: [string, number][] = [
    ["largo-1-titulo", 1.6],
    ["largo-2-rotulo", 6.5],
    ["largo-3-titular", 11.5],
    ["largo-4-noticia", 17],
    ["largo-5-frase", 22.5],
    ["largo-6-sin-clip", 27.5],
    ["largo-7-tarjeta", 32.5],
    ["largo-8-cierre", duracionMs / 1000 + 3.5],
  ];
  for (const [nombre, seg] of largo) await cuadro(nombre, "TechExplainer", props, seg);
  const corto: PropsVideo = {
    ...props,
    ventana: { inicioMs: 0, finMs: 25_000, titulo: "El modelo que OpenAI frenó", indice: 1, total: 3 },
  };
  const vertical: [string, number][] = [
    ["short-1-titulo", 1.6],
    ["short-2-rotulo", 6.5],
    ["short-3-titular", 11.5],
    ["short-4-noticia", 17],
    ["short-5-frase", 22.5],
    ["short-6-cierre", 28.5],
  ];
  for (const [nombre, seg] of vertical) await cuadro(nombre, "TechExplainerShort", corto, seg);
  console.log(`Cuadros en ${salida}`);
}

principal().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
