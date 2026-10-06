// Grabaciones que Richard sube desde el panel (formato Presentador, docs/PRESENTADOR.md).
// Dos momentos:
//  1) `atenderGrabacion`: la baja a la Mac, le saca la voz, la transcribe y le pide el plan
//     al panel. El panel guarda el guion y lo manda a producir.
//  2) `materialDeGrabacion`: cuando llega ese trabajo, prepara su voz y su imagen (sin
//     fondo, si se grabó con croma) para que la producción de siempre las use.
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { caraDeLaToma, momentosDeCancion, type CaraDelPresentador } from "@compartido/cancion";
import { extensionDeVideo } from "@compartido/grabaciones";
import type { Guion } from "@compartido/guion";
import {
  corteDeGrabacion,
  momentosDelPresentador,
  palabrasDesde,
  tramosDeGrabacion,
} from "@compartido/presentador";
import { config } from "./config";
import {
  detectarCroma,
  extraerVoz,
  medidasDeVideo,
  prepararVentana,
  quitarCroma,
  recortarVoz,
} from "./croma";
import { carasDe } from "./enfoque";
import { panel } from "./panel";
import type { producir } from "./produccion";
import { transcribir } from "./transcribir";
import { nivelar } from "./voz";

const exec = promisify(execFile);

type Material = NonNullable<Parameters<typeof producir>[9]>;

const carpetaDe = (id: number) => path.join(config.CARPETA_GRABACIONES, `g${id}`);

/** Dónde queda en la Mac la grabación `id` (con la extensión con la que se subió). */
export function rutaDeGrabacion(id: number, archivo: string): string {
  return path.join(carpetaDe(id), `original.${extensionDeVideo(archivo) ?? "mp4"}`);
}

/** La trae del panel si todavía no está completa en la Mac. */
async function asegurarArchivo(
  g: { id: number; archivo: string; bytes: number },
  avisar: (texto: string) => unknown,
): Promise<string> {
  await mkdir(carpetaDe(g.id), { recursive: true });
  const ruta = rutaDeGrabacion(g.id, g.archivo);
  let ultimo = -25;
  await panel.bajarGrabacion(g.id, ruta, g.bytes, (pct) => {
    if (pct >= ultimo + 25) {
      ultimo = pct;
      void avisar(`bajando la grabación a la Mac ${pct}%`);
    }
  });
  return ruta;
}

/**
 * Su voz: se saca una sola vez (queda guardada junto a la grabación), se empareja de volumen y
 * se transcribe. No se le toca el ritmo: la imagen tiene que seguir calzando con la boca.
 */
export async function vozDeGrabacion(entrada: string, carpeta: string) {
  const medidas = await medidasDeVideo(entrada);
  const rutaVoz = path.join(carpeta, "voz-grabada.mp3");
  if (!existsSync(rutaVoz)) {
    await extraerVoz(entrada, rutaVoz);
    await nivelar(rutaVoz);
  }
  const t = await transcribir(rutaVoz, medidas.duracionSeg);
  return { medidas, rutaVoz, t };
}

/**
 * Su imagen y sus tiempos, listos para la producción: en qué momento de la grabación empieza
 * cada escena del plan, él sin fondo (o en una ventana, si no hay croma) y cuándo sale en
 * grande y cuándo en la esquina.
 */
export async function montarPresentador(
  entrada: string,
  guion: Guion,
  voz: Awaited<ReturnType<typeof vozDeGrabacion>>,
  clave: string,
  avisar: (texto: string) => unknown,
  // `cancion`: formato Canción (docs/CANCION.md): su fondo real se queda, él sale entero todo el
  // tiempo y la imagen va a la resolución del video vertical.
  opciones: { sinCroma?: boolean; cancion?: boolean } = {},
): Promise<Material> {
  const { medidas, t } = voz;
  // Solo se usa el trozo en el que habla: lo de antes y lo de después (él acercándose a la cámara
  // para darle a grabar y a parar) se corta, en la voz y en la imagen por igual.
  const corte = corteDeGrabacion(t.palabras, Math.round(medidas.duracionSeg * 1000));
  const duracionMs = corte.hastaMs - corte.desdeMs;
  const palabras = palabrasDesde(t.palabras, corte.desdeMs);
  const carpetaPublica = path.join(config.CARPETA_PUBLICA, clave);
  await mkdir(carpetaPublica, { recursive: true });
  const rutaVoz = path.join(carpetaPublica, "voz-del-presentador.mp3");
  await recortarVoz(voz.rutaVoz, rutaVoz, corte);
  const tramos = tramosDeGrabacion(
    guion.escenas.map((e) => e.narracion),
    palabras,
    duracionMs,
  );
  const croma =
    opciones.sinCroma || opciones.cancion ? null : await detectarCroma(entrada, medidas.duracionSeg);
  let video: { ruta: string; ancho: number; alto: number; transparente: boolean };
  if (croma) {
    await avisar(`quitando el fondo verde de tu grabación (${croma.color})`);
    const r = await quitarCroma(entrada, path.join(carpetaPublica, "presentador.webm"), croma.color, {
      zona: croma.zona,
      corte,
    });
    video = { ruta: "presentador.webm", ...r, transparente: true };
  } else if (opciones.cancion) {
    await avisar("tu grabación va entera, con tu fondo real");
    const r = await prepararVentana(entrada, path.join(carpetaPublica, "presentador.mp4"), 1920, corte);
    video = { ruta: "presentador.mp4", ...r, transparente: false };
  } else {
    await avisar("tu grabación no tiene fondo de croma: va en una ventana");
    const r = await prepararVentana(entrada, path.join(carpetaPublica, "presentador.mp4"), 1080, corte);
    video = { ruta: "presentador.mp4", ...r, transparente: false };
  }
  // Canción: dónde llega su cabeza en toda la toma, para bajar el video justo debajo del papel.
  const cara = opciones.cancion
    ? await caraDelPresentador(path.join(carpetaPublica, video.ruta), duracionMs / 1000, carpetaPublica)
    : null;
  if (opciones.cancion)
    await avisar(
      cara
        ? `tu cabeza llega hasta el ${Math.round(cara.arriba * 100)}% de arriba: el video se baja justo debajo del papel`
        : "no se encontró tu cara en la toma: el video se baja un poco por si acaso",
    );
  const momentos = opciones.cancion
    ? momentosDeCancion()
    : momentosDelPresentador(
        guion.escenas.map((e, i) => ({
          parte: e.parte,
          inicioMs: tramos[i]?.inicioMs ?? 0,
          finMs: tramos[i]?.finMs ?? duracionMs,
        })),
      );
  return {
    voz: {
      rutaMp3: rutaVoz,
      palabras,
      tramos,
      duracionMs,
      vozDePrueba: false,
      costoUsd: t.costoUsd,
    },
    presentador: { ...video, momentos, cara },
  };
}

/** Seis cuadros repartidos por la toma, pasados por el detector de caras de la Mac. */
async function caraDelPresentador(
  rutaVideo: string,
  duracionSeg: number,
  carpeta: string,
): Promise<CaraDelPresentador | null> {
  const cuadros: string[] = [];
  for (let k = 1; k <= 6; k++) {
    const seg = (duracionSeg * k) / 7;
    const salida = path.join(carpeta, `cara-${k}.jpg`);
    await exec("ffmpeg", [
      "-v",
      "error",
      "-y",
      "-ss",
      seg.toFixed(2),
      "-i",
      rutaVideo,
      "-frames:v",
      "1",
      "-vf",
      "scale=540:-2",
      salida,
    ]);
    cuadros.push(salida);
  }
  const caras = await carasDe(cuadros);
  return caraDeLaToma(cuadros.map((c) => caras.get(c) ?? []));
}

/** Lo que necesita la producción de un trabajo que salió de una grabación del panel. */
export async function materialDeGrabacion(
  g: { id: number; archivo: string; bytes: number; formato?: string },
  guion: Guion,
  clave: string,
  avisar: (texto: string) => unknown,
): Promise<Material> {
  const entrada = await asegurarArchivo(g, avisar);
  await avisar("preparando tu voz");
  const voz = await vozDeGrabacion(entrada, carpetaDe(g.id));
  return montarPresentador(entrada, guion, voz, clave, avisar, { cancion: g.formato === "cancion" });
}

/**
 * Una vuelta: si Richard subió una grabación, se prepara y se le pide el plan al panel.
 * Devuelve `true` si atendió una (haya salido bien o no).
 */
export async function atenderGrabacion(): Promise<boolean> {
  const g = await panel.grabacionSiguiente();
  if (!g) return false;
  const hora = () => new Date().toLocaleTimeString("es-US", { hour12: false });
  console.log(
    `[${hora()}] Grabación #${g.id}: «${g.tema}» (${(g.bytes / 1_048_576).toFixed(0)} MB, ${g.formato})`,
  );
  let ultimo = "bajando la grabación a la Mac";
  const avisar = (paso: string) => {
    console.log(`  ${paso}`);
    ultimo = paso;
    return panel.avanceGrabacion(g.id, paso).catch(() => {});
  };
  // Señal de vida mientras baja o transcribe, para que el panel no la dé por perdida.
  const latido = setInterval(() => void panel.avanceGrabacion(g.id, ultimo).catch(() => {}), 45_000);
  try {
    const entrada = await asegurarArchivo(g, avisar);
    await avisar("sacando tu voz y transcribiendo lo que dices");
    const { t, medidas } = await vozDeGrabacion(entrada, carpetaDe(g.id));
    console.log(
      `  ${medidas.ancho}×${medidas.alto}, ${Math.round(medidas.duracionSeg)} s, ${t.palabras.length} palabras`,
    );
    await avisar("armando el plan de lo que va detrás de ti");
    const r = await panel.planDeGrabacion(g.id, t.texto, t.costoUsd);
    console.log(`[${hora()}] Plan listo: guion ${r.guion_id}, trabajo #${r.trabajo_id}.`);
  } catch (e) {
    const msj = e instanceof Error ? e.message : String(e);
    console.error(`[${hora()}] Falló la grabación #${g.id}:`, msj);
    await panel.errorGrabacion(g.id, msj).catch(() => {});
  } finally {
    clearInterval(latido);
  }
  return true;
}
