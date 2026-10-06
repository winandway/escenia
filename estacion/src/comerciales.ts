// Comerciales (docs/COMERCIALES.md): el video publicitario de un cliente, con sus
// imágenes. Dos momentos, como en una grabación:
//  1) `atenderComercial`: baja las imágenes de sus carpetas a la Mac (un PDF se parte en
//     páginas), le dice al panel qué hay, y el panel arma el plan y lo manda a producir.
//  2) `materialDeComercial`: cuando llega ese trabajo, la lista de imágenes locales que la
//     producción pone en pantalla.
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { config } from "./config";
import { panel, type ImagenDelPanel } from "./panel";

const exec = promisify(execFile);

/** Una imagen que ya está en la Mac, lista para el video. */
export type ImagenLocal = {
  /** Cómo se la nombra en el plan («05 Pro In Shop (horizontal).png», «capturas.pdf p3»). */
  nombre: string;
  carpeta: string;
  ruta: string;
  ancho: number;
  alto: number;
  /** Un logo o una figura sin fondo: se muestra flotando, no como una tarjeta. */
  transparente: boolean;
};

const seguro = (nombre: string) => nombre.replace(/[^\w.() -]+/g, "_");

/**
 * ¿Es una página casi vacía (una portada oscura, una hoja en blanco)? Se mira el cuadro en
 * chiquito: si todos sus puntos se parecen, no hay captura que mostrar.
 */
async function paginaVacia(ruta: string): Promise<boolean> {
  const { stdout } = await exec(
    "ffmpeg",
    ["-v", "error", "-i", ruta, "-vf", "scale=32:18", "-f", "rawvideo", "-pix_fmt", "gray", "-"],
    { encoding: "buffer", maxBuffer: 1024 * 1024 },
  );
  const puntos = [...stdout];
  if (puntos.length === 0) return false;
  const media = puntos.reduce((s, v) => s + v, 0) / puntos.length;
  const desvio = Math.sqrt(puntos.reduce((s, v) => s + (v - media) ** 2, 0) / puntos.length);
  return desvio < 14;
}

/** Medidas de una imagen y si tiene fondo transparente (lo dice el propio archivo). */
async function medir(ruta: string): Promise<{ ancho: number; alto: number; transparente: boolean }> {
  const { stdout } = await exec("sips", ["-g", "pixelWidth", "-g", "pixelHeight", "-g", "hasAlpha", ruta]);
  // Cada dato sale en su línea («  pixelWidth: 561»).
  const valor = (clave: string) =>
    stdout
      .split("\n")
      .find((l) => l.trim().startsWith(`${clave}:`))
      ?.split(":")[1]
      ?.trim() ?? "";
  return {
    ancho: Number(valor("pixelWidth")) || 1,
    alto: Number(valor("pixelHeight")) || 1,
    transparente: valor("hasAlpha") === "yes" && /\.(png|webp)$/i.test(ruta),
  };
}

/**
 * Un PDF de capturas se parte en una imagen por página. Cada página trae un marco oscuro
 * alrededor de la captura: se mide (cropdetect) y se recorta, para que en el video se vea la
 * captura y no el marco.
 */
async function paginasDelPdf(rutaPdf: string, base: string): Promise<string[]> {
  await exec("pdftoppm", ["-r", "110", "-png", rutaPdf, base]);
  const carpeta = path.dirname(base);
  const prefijo = path.basename(base);
  const crudas = (await readdir(carpeta))
    .filter((a) => a.startsWith(`${prefijo}-`) && a.endsWith(".png") && !a.includes("-p"))
    .sort();
  const salidas: string[] = [];
  for (const [k, cruda] of crudas.entries()) {
    const entrada = path.join(carpeta, cruda);
    const salida = path.join(carpeta, `${prefijo}-p${k + 1}.png`);
    // El recuadro útil, mirando el cuadro entero (un marco parejo se va; una captura queda).
    const { stderr } = await exec("ffmpeg", [
      "-v",
      "info",
      "-i",
      entrada,
      "-vf",
      "cropdetect=limit=40:round=2:skip=0",
      "-frames:v",
      "1",
      "-f",
      "null",
      "-",
    ]);
    const recorte = [...stderr.matchAll(/crop=(\d+):(\d+):(\d+):(\d+)/g)].pop();
    if (recorte && Number(recorte[1]) > 200 && Number(recorte[2]) > 120)
      await exec("ffmpeg", [
        "-y",
        "-v",
        "error",
        "-i",
        entrada,
        "-vf",
        `crop=${recorte[1]}:${recorte[2]}:${recorte[3]}:${recorte[4]}`,
        salida,
      ]);
    else await exec("cp", [entrada, salida]);
    salidas.push(salida);
  }
  return salidas;
}

/**
 * Deja en la Mac las imágenes de unas carpetas de la biblioteca (las que falten) y devuelve la
 * lista completa, con medidas. Lo ya bajado no se vuelve a pedir.
 */
export async function sincronizarImagenes(
  carpetas: string[],
  avisar: (texto: string) => unknown = () => {},
): Promise<ImagenLocal[]> {
  const lista = await panel.imagenes(carpetas);
  const salida: ImagenLocal[] = [];
  for (const [k, i] of lista.entries()) {
    const carpetaLocal = path.join(config.CARPETA_IMAGENES, seguro(i.carpeta));
    await mkdir(carpetaLocal, { recursive: true });
    const destino = path.join(carpetaLocal, `${i.id}-${seguro(i.nombre)}`);
    if (!existsSync(destino)) {
      await avisar(`bajando las imágenes a la Mac (${k + 1} de ${lista.length})`);
      await writeFile(destino, await panel.bajarImagen(i.id));
    }
    salida.push(...(await imagenesDe(i, destino)));
  }
  return salida;
}

async function imagenesDe(i: ImagenDelPanel, destino: string): Promise<ImagenLocal[]> {
  if (i.tipo !== "pdf") {
    const m = await medir(destino);
    return [{ nombre: i.nombre, carpeta: i.carpeta, ruta: destino, ...m }];
  }
  const base = destino.replace(/\.pdf$/i, "");
  const yaHechas = (await readdir(path.dirname(destino)))
    .filter((a) => a.startsWith(`${path.basename(base)}-p`) && a.endsWith(".png"))
    .sort((a, b) => Number(a.match(/-p(\d+)\.png$/)?.[1]) - Number(b.match(/-p(\d+)\.png$/)?.[1]))
    .map((a) => path.join(path.dirname(destino), a));
  const paginas = yaHechas.length ? yaHechas : await paginasDelPdf(destino, base);
  const sinExt = i.nombre.replace(/\.pdf$/i, "");
  const salida: ImagenLocal[] = [];
  for (const [k, ruta] of paginas.entries()) {
    // La portada oscura del PDF o una hoja vacía no son capturas: no se ofrecen.
    if (await paginaVacia(ruta)) continue;
    const m = await medir(ruta);
    salida.push({ nombre: `${sinExt} p${k + 1}`, carpeta: i.carpeta, ruta, ...m, transparente: false });
  }
  return salida;
}

/** Lo que el panel necesita saber de cada imagen para que la IA la pida por su nombre. */
export const paraElPlan = (imagenes: ImagenLocal[]) =>
  imagenes.map((i) => ({ nombre: i.nombre, transparente: i.transparente, ancho: i.ancho, alto: i.alto }));

/** Una vuelta: si hay un comercial pedido, se bajan sus imágenes y se le pide el plan al panel. */
export async function atenderComercial(): Promise<boolean> {
  const c = await panel.comercialSiguiente();
  if (!c) return false;
  const hora = () => new Date().toLocaleTimeString("es-US", { hour12: false });
  console.log(`[${hora()}] Comercial #${c.id}: «${c.nombre}» (${c.idioma}, ${c.carpetas.join(", ")})`);
  let ultimo = "bajando las imágenes a la Mac";
  const avisar = (paso: string) => {
    console.log(`  ${paso}`);
    ultimo = paso;
    return panel.avanceComercial(c.id, paso).catch(() => {});
  };
  const latido = setInterval(() => void panel.avanceComercial(c.id, ultimo).catch(() => {}), 45_000);
  try {
    const imagenes = await sincronizarImagenes(c.carpetas, avisar);
    console.log(
      `  imágenes listas: ${imagenes.length} (${imagenes.filter((i) => i.transparente).length} sin fondo)`,
    );
    await avisar("armando el plan del video con tus imágenes");
    const r = await panel.planDeComercial(c.id, paraElPlan(imagenes));
    console.log(`[${hora()}] Plan listo: guion ${r.guion_id}, trabajo #${r.trabajo_id}.`);
  } catch (e) {
    const msj = e instanceof Error ? e.message : String(e);
    console.error(`[${hora()}] Falló el comercial #${c.id}:`, msj);
    await panel.errorComercial(c.id, msj).catch(() => {});
  } finally {
    clearInterval(latido);
  }
  return true;
}

/** Las imágenes locales de un comercial, para la producción (se bajan las que falten). */
export async function materialDeComercial(
  comercial: { carpetas: string[] },
  avisar: (texto: string) => unknown,
): Promise<ImagenLocal[]> {
  return sincronizarImagenes(comercial.carpetas, avisar);
}
