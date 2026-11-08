// C-COMERCIAL-4 (8 nov 2026): la miniatura del comercial que Richard eligió en el panel (una de las
// imágenes del cliente y sus dos textos). La Mac la vuelve a dibujar con la misma plantilla y las
// mismas props del video ya armado: no gasta nada (ni voz ni IA) y la sube como la miniatura del largo.
import { copyFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { buscarImagenPorNombre } from "@compartido/imagenes";
import { sincronizarImagenes } from "./comerciales";
import { config } from "./config";
import { panel, type PortadaComercialDelPanel } from "./panel";
import { propsConPortada } from "./portada-elegida";
import { esquemaPropsVideo } from "./remotion/props";
import { empaquetar, renderizarMiniatura } from "./render";

export async function dibujarPortadaComercial(p: PortadaComercialDelPanel): Promise<string> {
  const carpetaTrabajo = path.join(config.CARPETA_SALIDA, `t${p.trabajo_id}`);
  const carpetaPublica = path.join(config.CARPETA_PUBLICA, `t${p.trabajo_id}`);
  const crudo = await readFile(path.join(carpetaTrabajo, "props.json"), "utf8").catch(() => {
    throw new Error("Esta Mac no tiene guardado el armado de ese video: vuelve a armarlo y elige otra vez.");
  });
  const props = esquemaPropsVideo.parse(JSON.parse(crudo));
  const imagenes = await sincronizarImagenes(p.carpetas);
  const elegida = buscarImagenPorNombre(p.archivo, imagenes);
  if (!elegida) throw new Error(`La imagen «${p.archivo}» ya no está en las carpetas del cliente.`);
  await mkdir(path.join(carpetaPublica, "imagenes"), { recursive: true });
  await copyFile(elegida.ruta, path.join(carpetaPublica, "imagenes", path.basename(elegida.ruta)));
  const salida = path.join(carpetaTrabajo, "miniatura-elegida.png");
  const serveUrl = await empaquetar(carpetaPublica);
  await renderizarMiniatura(propsConPortada(props, elegida, p), serveUrl, salida);
  return salida;
}

/** ¿Hay una miniatura de comercial por dibujar? Si hay, la dibuja, la sube y avisa cómo le fue. */
export async function atenderPortadaComercial(): Promise<boolean> {
  const p = await panel.portadaComercialSiguiente();
  if (!p) return false;
  const hora = () => new Date().toLocaleTimeString("es-US", { hour12: false });
  console.log(`[${hora()}] Miniatura del comercial #${p.comercial_id}: «${p.titulo}» con ${p.archivo}`);
  try {
    const ruta = await dibujarPortadaComercial(p);
    // Con `portada: true` gana a la automática en el panel (miniaturasPorPieza): la más nueva manda.
    await panel.subirArchivo(p.guion_id, "miniatura", "png", ruta, {
      pieza: "largo",
      indice: 0,
      portada: true,
      elegida: true,
    });
    await panel.portadaComercialTerminada(p.comercial_id, null);
    console.log(`[${hora()}]   miniatura elegida lista y subida.`);
  } catch (e) {
    const msj = e instanceof Error ? e.message : String(e);
    console.error(`[${hora()}]   no se pudo dibujar la miniatura:`, msj);
    await panel.portadaComercialTerminada(p.comercial_id, msj).catch(() => {});
  }
  return true;
}
