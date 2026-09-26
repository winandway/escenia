// Produce UN video de punta a punta: voz → subtítulos → clips → render.
import { cp, mkdir, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Guion } from "@compartido/guion";
import { config } from "./config";
import type { PropsVideo } from "./remotion/props";
import { renderizar } from "./render";
import { buscarFoto } from "./fotos";
import { generarImagen, imagenesActivas } from "./imagenes";
import { buscarClip, RESERVA_POR_PARTE } from "./visuales";
import { generarVoz } from "./voz";

export type Avisar = (paso: string, progreso: number) => Promise<unknown>;
export type Gastar = (servicio: string, detalle: string, costoUsd: number) => Promise<unknown>;

export type ResultadoProduccion = {
  rutaMp4: string;
  bytes: number;
  duracionSeg: number;
  vozDePrueba: boolean;
  rutaVoz: string;
  rutaSubtitulos: string;
  costoVozUsd: number;
  creditos: string[];
};

const aqui = path.dirname(fileURLToPath(import.meta.url));
// `sfx` va en el repositorio (sonidos generados, sin licencia de terceros).
// `sfx-local` vive solo en la Mac (los sonidos de Richard) y, si trae un
// archivo con el mismo nombre, gana.
const CARPETAS_SFX = [path.resolve(aqui, "../recursos/sfx"), path.resolve(aqui, "../recursos/sfx-local")];

/** Copia los efectos de sonido a la carpeta pública del trabajo. */
async function prepararSfx(carpetaPublica: string): Promise<PropsVideo["sfx"]> {
  const destino = path.join(carpetaPublica, "sfx");
  await mkdir(destino, { recursive: true });
  const archivos = new Set<string>();
  for (const carpeta of CARPETAS_SFX) {
    const lista = (await readdir(carpeta).catch(() => [] as string[])).filter((a) => a.endsWith(".mp3"));
    for (const a of lista) {
      await cp(path.join(carpeta, a), path.join(destino, a));
      archivos.add(a);
    }
  }
  const tiene = (n: string) => (archivos.has(n) ? `sfx/${n}` : null);
  return {
    whoosh: [...archivos]
      .filter((a) => a.startsWith("whoosh-"))
      .sort()
      .map((a) => `sfx/${a}`),
    pop: tiene("pop.mp3"),
    riser: tiene("riser.mp3"),
    ding: tiene("ding.mp3"),
    boom: tiene("boom.mp3"),
  };
}

export type Plantilla = "TechExplainer" | "MiniDocumental";

export async function producir(
  clave: string,
  guion: Guion,
  producto: { nombre: string; url: string } | null,
  avisar: Avisar,
  plantilla: Plantilla = "TechExplainer",
  gastar: Gastar = async () => {},
): Promise<ResultadoProduccion> {
  const carpetaTrabajo = path.join(config.CARPETA_SALIDA, clave);
  // Carpeta pública SOLO de este trabajo: voz + clips + sfx que usa. Se empaqueta con ella.
  const carpetaPublica = path.join(config.CARPETA_PUBLICA, clave);
  await mkdir(carpetaTrabajo, { recursive: true });
  await mkdir(carpetaPublica, { recursive: true });

  const voz = await generarVoz(
    guion.escenas.map((e) => e.narracion),
    carpetaTrabajo,
    avisar,
  );
  await cp(voz.rutaMp3, path.join(carpetaPublica, "voz.mp3"));
  const rutaSubtitulos = path.join(carpetaTrabajo, "subtitulos.json");
  await writeFile(rutaSubtitulos, JSON.stringify({ palabras: voz.palabras, tramos: voz.tramos }, null, 2));
  const sfx = await prepararSfx(carpetaPublica);

  await avisar("buscando clips de fondo", 35);
  const creditos: string[] = [];
  const escenas: PropsVideo["escenas"] = [];
  for (const [i, e] of guion.escenas.entries()) {
    const tramo = voz.tramos[i];
    if (!tramo) continue;
    // Toda escena lleva clip: primero la búsqueda de la IA, luego las de reserva por parte.
    const busquedas = [
      e.visual.busqueda ?? "",
      ...(RESERVA_POR_PARTE[e.parte] ?? RESERVA_POR_PARTE.contexto ?? []),
    ];
    let foto: PropsVideo["escenas"][number]["foto"] = null;
    if (e.visual.tipo === "foto" && e.visual.busqueda) {
      const f = await buscarFoto([e.visual.busqueda, guion.titulo.split(/[:—-]/)[0] ?? ""], carpetaPublica);
      if (f) {
        foto = { ruta: f.ruta, ancho: f.ancho, alto: f.alto };
        creditos.push(f.credito);
      }
    }
    // Imagen generada con IA para el momento sin foto (solo si hay FAL_KEY; si falla, va clip).
    if (e.visual.tipo === "ia" && e.visual.prompt_imagen && imagenesActivas()) {
      const epoca = /\b19[0-6]\d(s)?\b/.test(`${e.visual.prompt_imagen} ${e.visual.texto_en_pantalla ?? ""}`);
      // La persona del video tiene que estar en la imagen: si la IA no la nombró, se antepone.
      const persona = (guion.titulo.split(/[:—-]/)[0] ?? "").trim();
      const nombraPersona =
        persona && e.visual.prompt_imagen.toLowerCase().includes(persona.toLowerCase().split(" ")[0] ?? "");
      const promptImagen =
        nombraPersona || !persona ? e.visual.prompt_imagen : `${persona}, ${e.visual.prompt_imagen}`;
      const img = await generarImagen(promptImagen, carpetaPublica, { blancoYNegro: epoca }).catch((err) => {
        console.warn(`Imagen IA falló: ${err instanceof Error ? err.message : err}`);
        return null;
      });
      if (img) {
        foto = { ruta: img.ruta, ancho: img.ancho, alto: img.alto };
        creditos.push(img.credito);
        if (img.costoUsd > 0) await gastar("fal.ai", `imagen escena ${i + 1}`, img.costoUsd);
      }
    }
    const esRecorte = e.visual.tipo === "periodico" || e.visual.tipo === "red" || e.visual.tipo === "titular";
    const recorte: PropsVideo["escenas"][number]["recorte"] = esRecorte
      ? {
          tipo: e.visual.tipo as "periodico" | "red" | "titular",
          titular: e.visual.titular ?? e.visual.texto_en_pantalla ?? "",
          fecha: e.visual.fecha ?? "",
          cuerpo: e.visual.cuerpo ?? "",
        }
      : null;
    // El clip de fondo va siempre (detrás de la foto o del recorte, difuminado).
    const c = await buscarClip(foto ? busquedas.slice(1) : busquedas, false, carpetaPublica);
    if (c) creditos.push(c.credito);
    const esFrase = e.visual.tipo === "texto" || e.visual.tipo === "titulo";
    const estilo: PropsVideo["escenas"][number]["estilo"] = foto
      ? "foto"
      : recorte
        ? recorte.tipo === "titular"
          ? "titular"
          : "recorte"
        : esFrase
          ? "frase"
          : "clip";
    escenas.push({
      parte: e.parte,
      inicioMs: tramo.inicioMs,
      finMs: tramo.finMs,
      textoEnPantalla: e.visual.texto_en_pantalla ?? "",
      estilo,
      clip: c ? { ruta: c.ruta, duracionSeg: c.duracionSeg } : null,
      foto,
      recorte,
    });
    void avisar(
      `clips de fondo: escena ${i + 1} de ${guion.escenas.length}`,
      35 + Math.round((i / guion.escenas.length) * 5),
    );
  }

  const props: PropsVideo = {
    titulo: guion.titulo,
    audio: "voz.mp3",
    duracionMs: voz.duracionMs,
    palabras: voz.palabras,
    escenas,
    producto,
    vozDePrueba: voz.vozDePrueba,
    tema: plantilla === "MiniDocumental" ? "documental" : "tech",
    sfx,
  };
  await writeFile(path.join(carpetaTrabajo, "props.json"), JSON.stringify(props, null, 2));

  await avisar("armando el video (16:9)", 40);
  const rutaMp4 = path.join(carpetaTrabajo, "video-16x9.mp4");
  let ultimo = 40;
  const r = await renderizar(plantilla, props, carpetaPublica, rutaMp4, (p) => {
    const pct = 40 + Math.round(p * 58);
    if (pct >= ultimo + 5) {
      ultimo = pct;
      void avisar(`armando el video (16:9) ${Math.round(p * 100)}%`, pct);
    }
  });

  if (creditos.length)
    await writeFile(path.join(carpetaTrabajo, "creditos.txt"), [...new Set(creditos)].join("\n"));

  return {
    rutaMp4,
    bytes: r.bytes,
    duracionSeg: r.duracionSeg,
    vozDePrueba: voz.vozDePrueba,
    rutaVoz: voz.rutaMp3,
    rutaSubtitulos,
    costoVozUsd: voz.costoUsd,
    creditos: [...new Set(creditos)],
  };
}
