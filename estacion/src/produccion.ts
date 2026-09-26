// Produce UN video de punta a punta: voz → subtítulos → clips → render.
import { cp, mkdir, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Guion } from "@compartido/guion";
import { config } from "./config";
import type { PropsVideo } from "./remotion/props";
import { renderizar } from "./render";
import { buscarClip, RESERVA_POR_PARTE } from "./visuales";
import { generarVoz } from "./voz";

export type Avisar = (paso: string, progreso: number) => Promise<unknown>;

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
const CARPETA_SFX = path.resolve(aqui, "../recursos/sfx");

/** Copia los efectos de sonido propios a la carpeta pública del trabajo. */
async function prepararSfx(carpetaPublica: string): Promise<PropsVideo["sfx"]> {
  const destino = path.join(carpetaPublica, "sfx");
  await mkdir(destino, { recursive: true });
  const archivos = (await readdir(CARPETA_SFX).catch(() => [] as string[])).filter((a) => a.endsWith(".mp3"));
  for (const a of archivos) await cp(path.join(CARPETA_SFX, a), path.join(destino, a));
  const tiene = (n: string) => (archivos.includes(n) ? `sfx/${n}` : null);
  return {
    whoosh: archivos
      .filter((a) => a.startsWith("whoosh-"))
      .sort()
      .map((a) => `sfx/${a}`),
    pop: tiene("pop.mp3"),
    riser: tiene("riser.mp3"),
    ding: tiene("ding.mp3"),
  };
}

export async function producir(
  clave: string,
  guion: Guion,
  producto: { nombre: string; url: string } | null,
  avisar: Avisar,
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
    const c = await buscarClip(busquedas, false, carpetaPublica);
    if (c) creditos.push(c.credito);
    const esFrase = e.visual.tipo === "texto" || e.visual.tipo === "titulo";
    escenas.push({
      parte: e.parte,
      inicioMs: tramo.inicioMs,
      finMs: tramo.finMs,
      textoEnPantalla: e.visual.texto_en_pantalla ?? "",
      estilo: esFrase ? "frase" : "clip",
      clip: c ? { ruta: c.ruta, duracionSeg: c.duracionSeg } : null,
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
    sfx,
  };
  await writeFile(path.join(carpetaTrabajo, "props.json"), JSON.stringify(props, null, 2));

  await avisar("armando el video (16:9)", 40);
  const rutaMp4 = path.join(carpetaTrabajo, "video-16x9.mp4");
  let ultimo = 40;
  const r = await renderizar("TechExplainer", props, carpetaPublica, rutaMp4, (p) => {
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
