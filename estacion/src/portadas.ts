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
  recorteSirve,
  textoDePortada,
  type FormatoPortada,
  type FotoRotulada,
  type Recorte,
  type TextoPortada,
} from "@compartido/portada";
import { config } from "./config";
import { panel } from "./panel";
import type { ResultadoProduccion } from "./produccion";
import { esquemaPropsVideo, type PropsPortada, type PropsVideo } from "./remotion/props";
import { empaquetar } from "./render";

const exec = promisify(execFile);
const aqui = path.dirname(fileURLToPath(import.meta.url));
const FUENTE = path.resolve(aqui, "../herramientas/recortar.swift");
const BINARIO = path.resolve(aqui, "../bin/recortar");

/** Los textos de las portadas de un video: el del largo y el de cada Short (por su número). */
export type TextosDePortadas = {
  largo?: Partial<TextoPortada>;
  shorts?: Record<string, Partial<TextoPortada>>;
};
export type PortadaHecha = { pieza: "largo" | "short"; indice: number; ruta: string; persona: string | null };

/** Colores de la portada según la marca del canal (Full Código lleva los suyos). */
const COLORES: Record<string, Pick<PropsPortada, "fondo" | "acento">> = {
  "full-codigo": { fondo: ["#6d28d9", "#0b0616"], acento: "#10f08c" },
};
const COLORES_BASE: Pick<PropsPortada, "fondo" | "acento"> = {
  fondo: ["#d00000", "#14000a"],
  acento: "#ffd60a",
};

/** Recorta al sujeto de una foto (fondo transparente) y dice su tamaño y las caras que se ven. */
export async function recortar(origen: string, destino: string): Promise<Recorte> {
  if (!existsSync(BINARIO)) {
    await mkdir(path.dirname(BINARIO), { recursive: true });
    await exec("swiftc", ["-O", FUENTE, "-o", BINARIO]);
  }
  const { stdout } = await exec(BINARIO, [origen, destino]);
  const r = JSON.parse(stdout) as Partial<Recorte>;
  if (!r.ancho || !r.alto) throw new Error(`No se pudo recortar ${path.basename(origen)}.`);
  return { ancho: r.ancho, alto: r.alto, cobertura: r.cobertura ?? 1, caras: r.caras ?? [] };
}

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

/** Las fotos con rótulo del video (las únicas de las que se sabe de quién son) y en qué escena salen. */
function fotosRotuladas(props: PropsVideo): FotoRotulada[] {
  return props.escenas.flatMap((e, escena) =>
    e.planos.flatMap((p) =>
      p.tipo === "foto" && p.foto && p.texto ? [{ ruta: p.foto.ruta, rotulo: p.texto, escena }] : [],
    ),
  );
}

/** Una foto cualquiera de esas escenas, para el fondo cuando no hay persona que recortar. */
function fotoDeFondo(props: PropsVideo, inicio: number, fin: number): string | null {
  for (const e of props.escenas.slice(inicio, fin + 1)) {
    const deUnPlano = e.planos.find((p) => p.tipo === "foto" && p.foto)?.foto?.ruta;
    const ruta = deUnPlano ?? e.foto?.ruta ?? e.fondoFoto;
    if (ruta) return ruta;
  }
  return null;
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
  };
  const piezas: Pieza[] = [
    {
      clave: "largo",
      pieza: "largo" as const,
      indice: 0,
      formato: "horizontal" as const,
      escenas: { inicio: 0, fin: props.escenas.length - 1 },
      texto: textoDePortada(textos.largo ?? {}),
    },
    ...resultado.shorts.map((s) => ({
      clave: `short-${s.indice}`,
      pieza: "short" as const,
      indice: s.indice,
      formato: "vertical" as const,
      escenas: { inicio: s.escenaInicio, fin: s.escenaFin },
      texto: textoDePortada(textos.shorts?.[String(s.indice)] ?? {}),
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
  for (const pieza of piezas) {
    const candidatas = candidatasDePortada(rotuladas, pieza.escenas, pieza.texto.persona, protagonista);
    const buenas: { ruta: string; nombre: string; recorte: Recorte }[] = [];
    for (const c of candidatas.slice(0, 10)) {
      const recorte = await medir(c.ruta);
      if (recorte && recorteSirve(recorte)) buenas.push({ ...c, recorte });
    }
    // Se prefiere una foto que no esté ya en otra portada del mismo video.
    const elegida = buenas.find((b) => !usadas.has(b.ruta)) ?? buenas[0];
    const cara = elegida?.recorte.caras[0];
    const base = {
      formato: pieza.formato,
      objeto: null,
      cifra: pieza.texto.grande,
      linea: pieza.texto.linea,
      remate: pieza.texto.remate,
      ...colores,
    };
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
  const deShorts = Object.fromEntries(
    shorts.flatMap((s) => (s.portada ? [[String(s.indice), s.portada] as const] : [])),
  );
  if (!portada && Object.keys(deShorts).length === 0) return null;
  return { largo: portada, shorts: deShorts };
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
