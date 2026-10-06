// Arma las PORTADAS de impacto de un trabajo ya producido: una horizontal para
// el video largo y una vertical por cada Short. Usa las fotos que el video ya
// tiene (solo las que llevan rótulo: se sabe de quién son), recorta a la
// persona con el motor de macOS y la monta con el texto de la portada. No
// gasta: todo pasa en la Mac. La Estación lo corre sola al terminar cada video;
// a mano (desde estacion/):
//   npx tsx src/portadas.ts 27 --guion 8                  → todas, con los textos de out/t27/portadas.json
//   npx tsx src/portadas.ts 27 --guion 8 --solo short-2   → solo esa pieza
// Sin --guion no se suben: quedan en out/t<n>/portada-*.png para mirarlas.
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { renderStill, selectComposition } from "@remotion/renderer";
import { z } from "zod";
import { esquemaPublicacionGenerada } from "@compartido/guion";
import { textosMiniatura } from "@compartido/miniatura";
import {
  candidatasDePortada,
  encuadre,
  instantesDeMuestra,
  logoDelCliente,
  mejorCuadroDePresentador,
  recorteSirve,
  textoDePortada,
  type FormatoPortada,
  type FotoRotulada,
  type Recorte,
  type TextoPortada,
} from "@compartido/portada";
import { config } from "./config";
import { panel } from "./panel";
import { recortar } from "./recorte";
import type { ResultadoProduccion } from "./produccion";
import { esquemaPropsVideo, type PropsPortada, type PropsVideo } from "./remotion/props";
import { empaquetar } from "./render";

/**
 * Lo que lleva la portada de una pieza. Además del texto: `chips` (hasta tres marcas que la gente
 * reconoce, en pastillas) y `cuadroSeg` (en un video con presentador, el instante exacto de su
 * grabación que se quiere en la portada; sin decirlo, se elige solo el de gesto más abierto).
 */
export type TextoDePieza = Partial<TextoPortada> & { chips?: string[]; cuadroSeg?: number };
/** Los textos de las portadas de un video: el del largo y el de cada Short (por su número). */
export type TextosDePortadas = {
  largo?: TextoDePieza;
  shorts?: Record<string, TextoDePieza>;
};
export type PortadaHecha = { pieza: "largo" | "short"; indice: number; ruta: string; persona: string | null };

const exec = promisify(execFile);

/**
 * Colores de la portada según la marca del canal: la luz de atrás, el fondo y el acento.
 * Full Código: luz azul eléctrico sobre casi negro y amarillo en lo que grita. (El morado con
 * rayos de antes se retiró el 5 oct 2026: «no es un diseño serio».)
 */
const COLORES: Record<string, Pick<PropsPortada, "fondo" | "acento">> = {
  "full-codigo": { fondo: ["#1d5cff", "#04060d"], acento: "#ffd60a" },
};
const COLORES_BASE: Pick<PropsPortada, "fondo" | "acento"> = {
  fondo: ["#d00000", "#14000a"],
  acento: "#ffd60a",
};

export { recortar };

export function carpetasDeTrabajo(numero: number) {
  return {
    trabajo: path.join(config.CARPETA_SALIDA, `t${numero}`),
    publica: path.join(config.CARPETA_PUBLICA, `t${numero}`),
  };
}

/** Renderiza una portada (ya con todo colocado) y, si hay guion, la sube como la miniatura de esa pieza. */
export async function renderizarPortada(
  serveUrl: string,
  props: PropsPortada,
  salida: string,
  subir: { guion: number; pieza: "largo" | "short"; indice: number } | null,
): Promise<void> {
  const id = props.formato === "vertical" ? "PortadaVertical" : "Portada";
  const comp = await selectComposition({ serveUrl, id, inputProps: props });
  await renderStill({ composition: comp, serveUrl, output: salida, inputProps: props, imageFormat: "png" });
  if (subir)
    await panel.subirArchivo(subir.guion, "miniatura", "png", salida, {
      portada: true,
      pieza: subir.pieza,
      indice: subir.indice,
    });
}

/**
 * Dónde va el presentador en la portada. En horizontal, un poco más cerca que una foto de
 * archivo: es su cara la que trae el clic. En vertical, más lejos y más abajo: tienen que caber
 * la cabeza, los hombros y la mano que levanta, y la gorra no puede quedar debajo del texto.
 */
function sitioDelPresentador(
  formato: FormatoPortada,
  recorte: Recorte,
  cara: NonNullable<Recorte["caras"][number]>,
): { izquierda: number; arriba: number; ancho: number; alto: number } {
  if (formato === "horizontal") return encuadre(formato, recorte, cara, 1.12);
  const sitio = encuadre(formato, recorte, cara, 0.8);
  return { ...sitio, arriba: sitio.arriba + 90 };
}

/** Las fotos con rótulo del video (las únicas de las que se sabe de quién son) y en qué escena salen. */
function fotosRotuladas(props: PropsVideo): FotoRotulada[] {
  return props.escenas.flatMap((e, escena) =>
    e.planos.flatMap((p) =>
      p.tipo === "foto" && p.foto && p.texto ? [{ ruta: p.foto.ruta, rotulo: p.texto, escena }] : [],
    ),
  );
}

/**
 * Una foto para el fondo cuando no hay persona que recortar: la primera de las
 * escenas de la pieza; si la pieza no tiene ninguna, la última que se vio antes
 * de que empiece (y si tampoco, la primera del video).
 */
function fotoDeFondo(props: PropsVideo, inicio: number, fin: number): string | null {
  const deLaEscena = (e: PropsVideo["escenas"][number]) =>
    e.planos.find((p) => p.tipo === "foto" && p.foto)?.foto?.ruta ?? e.foto?.ruta ?? e.fondoFoto ?? null;
  const buscar = (escenas: PropsVideo["escenas"]) => escenas.map(deLaEscena).find((r) => r !== null) ?? null;
  return (
    buscar(props.escenas.slice(inicio, fin + 1)) ??
    buscar(props.escenas.slice(0, inicio).reverse()) ??
    buscar(props.escenas)
  );
}

/**
 * Arma las portadas de un trabajo. `solo` limita a unas piezas («largo», «short-2»).
 * Nunca tumba la entrega: una pieza que falla se avisa y se sigue con las demás.
 */
export async function armarPortadas(
  numero: number,
  guion: number | null,
  textos: TextosDePortadas,
  solo: Set<string> | null = null,
): Promise<PortadaHecha[]> {
  const carpetas = carpetasDeTrabajo(numero);
  const props = esquemaPropsVideo.parse(
    JSON.parse(await readFile(path.join(carpetas.trabajo, "props.json"), "utf8")),
  );
  const { resultado } = JSON.parse(await readFile(path.join(carpetas.trabajo, "resultado.json"), "utf8")) as {
    resultado: ResultadoProduccion;
  };
  await mkdir(path.join(carpetas.publica, "portada"), { recursive: true });
  const rotuladas = fotosRotuladas(props);
  const protagonista = textosMiniatura(props.titulo).nombre;
  const colores = COLORES[props.marca?.id ?? ""] ?? COLORES_BASE;

  type Pieza = {
    clave: string;
    pieza: "largo" | "short";
    indice: number;
    formato: FormatoPortada;
    escenas: { inicio: number; fin: number };
    texto: TextoPortada;
    chips: string[];
    cuadroSeg: number | null;
  };
  const extras = (t: TextoDePieza | undefined) => ({
    chips: (t?.chips ?? [])
      .map((c) => c.trim())
      .filter(Boolean)
      .slice(0, 3),
    cuadroSeg: typeof t?.cuadroSeg === "number" && t.cuadroSeg >= 0 ? t.cuadroSeg : null,
  });
  const piezas: Pieza[] = [
    {
      clave: "largo",
      pieza: "largo" as const,
      indice: 0,
      formato: "horizontal" as const,
      escenas: { inicio: 0, fin: props.escenas.length - 1 },
      texto: textoDePortada(textos.largo ?? {}),
      ...extras(textos.largo),
    },
    ...resultado.shorts.map((s) => ({
      clave: `short-${s.indice}`,
      pieza: "short" as const,
      indice: s.indice,
      formato: "vertical" as const,
      escenas: { inicio: s.escenaInicio, fin: s.escenaFin },
      texto: textoDePortada(textos.shorts?.[String(s.indice)] ?? {}),
      ...extras(textos.shorts?.[String(s.indice)]),
    })),
  ].filter((p) => (!solo || solo.has(p.clave)) && (p.texto.grande || p.texto.linea || p.texto.remate));

  // 1) Se elige y se recorta la persona de cada pieza. Cada foto se recorta una sola vez.
  const medidas = new Map<string, Recorte | null>();
  const medir = async (ruta: string): Promise<Recorte | null> => {
    if (medidas.has(ruta)) return medidas.get(ruta) ?? null;
    const destino = path.join(
      carpetas.publica,
      "portada",
      `rec-${path.basename(ruta, path.extname(ruta))}.png`,
    );
    const r = await recortar(path.join(carpetas.publica, ruta), destino).catch(() => null);
    medidas.set(ruta, r);
    return r;
  };
  const usadas = new Set<string>();
  const armadas: { pieza: Pieza; props: PropsPortada; persona: string | null }[] = [];
  // Formato Presentador: la persona de la portada es Richard, sacado de su grabación ya sin fondo.
  const presentador = props.presentador?.transparente ? props.presentador : null;
  const instantesUsados: number[] = [];
  const cuadroDelPresentador = async (seg: number) => {
    const png = `portada/pres-${Math.round(seg * 1000)}.png`;
    const destino = path.join(carpetas.publica, png);
    if (!existsSync(destino))
      await exec("ffmpeg", [
        "-y",
        "-v",
        "error",
        // Con este decodificador se conserva la transparencia del video.
        "-c:v",
        "libvpx-vp9",
        "-ss",
        seg.toFixed(2),
        "-i",
        path.join(carpetas.publica, presentador?.ruta ?? ""),
        "-frames:v",
        "1",
        "-pix_fmt",
        "rgba",
        destino,
      ]);
    const recortado = `portada/rec-pres-${Math.round(seg * 1000)}.png`;
    const recorte = await recortar(destino, path.join(carpetas.publica, recortado));
    return { seg, ruta: recortado, recorte };
  };
  for (const pieza of piezas) {
    const base = {
      formato: pieza.formato,
      objeto: null,
      cifra: pieza.texto.grande,
      linea: pieza.texto.linea,
      remate: pieza.texto.remate,
      chips: pieza.chips,
      logo: null,
      ...colores,
    };
    if (presentador) {
      const desdeMs = props.escenas[pieza.escenas.inicio]?.inicioMs ?? 0;
      const hastaMs = props.escenas[pieza.escenas.fin]?.finMs ?? props.duracionMs;
      const instantes = pieza.cuadroSeg !== null ? [pieza.cuadroSeg] : instantesDeMuestra(desdeMs, hastaMs);
      const candidatos = [];
      for (const seg of instantes) {
        const c = await cuadroDelPresentador(seg).catch(() => null);
        if (c) candidatos.push(c);
      }
      const elegido = mejorCuadroDePresentador(candidatos, instantesUsados);
      const cara = elegido?.recorte.caras[0];
      if (elegido && cara) {
        instantesUsados.push(elegido.seg);
        armadas.push({
          pieza,
          persona: "presentador",
          props: {
            ...base,
            etiqueta: "",
            fondoFoto: null,
            sujeto: { ruta: elegido.ruta, ...sitioDelPresentador(pieza.formato, elegido.recorte, cara) },
          },
        });
        console.log(`  portada ${pieza.clave}: el presentador, en el segundo ${elegido.seg} de su grabación`);
        continue;
      }
      console.warn(
        `  portada ${pieza.clave}: no se encontró un cuadro del presentador con la cara a la vista`,
      );
    }
    const candidatas = candidatasDePortada(rotuladas, pieza.escenas, pieza.texto.persona, protagonista);
    const buenas: { ruta: string; nombre: string; recorte: Recorte }[] = [];
    for (const c of candidatas.slice(0, 10)) {
      const recorte = await medir(c.ruta);
      if (recorte && recorteSirve(recorte)) buenas.push({ ...c, recorte });
    }
    // Se prefiere una foto que no esté ya en otra portada del mismo video.
    const elegida = buenas.find((b) => !usadas.has(b.ruta)) ?? buenas[0];
    const cara = elegida?.recorte.caras[0];
    if (elegida && cara) {
      usadas.add(elegida.ruta);
      armadas.push({
        pieza,
        persona: elegida.nombre,
        props: {
          ...base,
          etiqueta: elegida.nombre.toUpperCase(),
          fondoFoto: null,
          sujeto: {
            ruta: `portada/rec-${path.basename(elegida.ruta, path.extname(elegida.ruta))}.png`,
            ...encuadre(pieza.formato, elegida.recorte, cara),
          },
        },
      });
      console.log(`  portada ${pieza.clave}: ${elegida.nombre} (${path.basename(elegida.ruta)})`);
    } else {
      armadas.push({
        pieza,
        persona: null,
        props: {
          ...base,
          etiqueta: "",
          sujeto: null,
          logo: logoDelCliente(props, pieza.escenas.inicio, pieza.escenas.fin),
          fondoFoto: fotoDeFondo(props, pieza.escenas.inicio, pieza.escenas.fin),
        },
      });
      console.log(`  portada ${pieza.clave}: sin persona que recortar; va con una foto del video de fondo`);
    }
  }
  if (armadas.length === 0) return [];

  // 2) Se empaqueta una vez (con los recortes ya en su carpeta) y se arma cada una.
  const serveUrl = await empaquetar(carpetas.publica);
  const hechas: PortadaHecha[] = [];
  for (const a of armadas) {
    const ruta = path.join(carpetas.trabajo, `portada-${a.pieza.clave}.png`);
    try {
      await renderizarPortada(
        serveUrl,
        a.props,
        ruta,
        guion ? { guion, pieza: a.pieza.pieza, indice: a.pieza.indice } : null,
      );
      hechas.push({ pieza: a.pieza.pieza, indice: a.pieza.indice, ruta, persona: a.persona });
    } catch (e) {
      console.warn(`  (no se pudo armar la portada ${a.pieza.clave}: ${e instanceof Error ? e.message : e})`);
    }
  }
  return hechas;
}

/** Los textos de las miniaturas que vienen en la respuesta del panel al escribir los textos de YouTube. */
export function textosDeLaPublicacion(respuesta: unknown): TextosDePortadas | null {
  const parseo = z.object({ publicacion: esquemaPublicacionGenerada }).safeParse(respuesta);
  if (!parseo.success) return null;
  const { portada, shorts } = parseo.data.publicacion;
  // Las marcas que nombró la IA salen como pastillas en la portada.
  const dePieza = (p: NonNullable<typeof portada>): TextoDePieza => ({ ...p, chips: p.marcas });
  const deShorts = Object.fromEntries(
    shorts.flatMap((s) => (s.portada ? [[String(s.indice), dePieza(s.portada)] as const] : [])),
  );
  if (!portada && Object.keys(deShorts).length === 0) return null;
  return { largo: portada ? dePieza(portada) : undefined, shorts: deShorts };
}

/** Guarda los textos junto al trabajo: sirven para volver a armar las portadas a mano. */
export async function guardarTextos(numero: number, textos: TextosDePortadas): Promise<void> {
  await writeFile(
    path.join(carpetasDeTrabajo(numero).trabajo, "portadas.json"),
    JSON.stringify(textos, null, 1),
  );
}

const esElPrograma = process.argv[1]
  ? path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
  : false;
if (esElPrograma) {
  const opcion = (nombre: string): string | null => {
    const i = process.argv.indexOf(nombre);
    return i === -1 ? null : (process.argv[i + 1] ?? null);
  };
  const numero = Number(process.argv[2]);
  const guion = Number(opcion("--guion"));
  const solo = opcion("--solo");
  (async () => {
    if (!Number.isInteger(numero) || numero <= 0)
      throw new Error(
        "Uso: npx tsx src/portadas.ts <trabajo> [--guion N] [--solo largo,short-2] [--textos ruta.json]",
      );
    const rutaTextos = opcion("--textos") ?? path.join(carpetasDeTrabajo(numero).trabajo, "portadas.json");
    const textos = JSON.parse(await readFile(rutaTextos, "utf8")) as TextosDePortadas;
    const hechas = await armarPortadas(
      numero,
      Number.isInteger(guion) && guion > 0 ? guion : null,
      textos,
      solo ? new Set(solo.split(",")) : null,
    );
    for (const h of hechas) console.log(`Portada ${h.pieza}${h.indice ? ` ${h.indice}` : ""}: ${h.ruta}`);
    console.log(guion > 0 ? `Subidas al panel (guion ${guion}).` : "Sin --guion: no se subieron.");
  })().catch((e: unknown) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
