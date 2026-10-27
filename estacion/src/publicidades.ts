// Publicidad en Short pedida desde el panel (menú «Publicidad», docs/PUBLICIDAD.md). Una vuelta: la Mac
// toma el pedido, baja las imágenes de sus carpetas, le pide el plan a la IA del panel (qué foto y qué
// texto en cada frase), hace la voz, la persona que habla y el video, y lo sube. Cada gasto se anota en
// el panel en el momento en que se hace.
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { paraElPlan, sincronizarImagenes } from "./comerciales";
import { config } from "./config";
import { prepararMusica } from "./musica";
import { panel } from "./panel";
import { pasoArmar, pasoAvatar, pasoVoz } from "./publicidad";
import { acentoDeLogo, elegirLogo, planParaArmar } from "./publicidad-plan";

/** Un anuncio pedido desde el panel puede durar un poco más que el prototipo (el texto ya viene medido). */
const MAXIMO_SEG_PANEL = 60;
const MUSICA_DE_ANUNCIO = "upbeat kick bass driving pulse";

/** El color de la marca, sacado del logo (en chiquito); null si el logo no tiene color. */
export async function acentoDelArchivo(ruta: string): Promise<string | null> {
  const { default: sharp } = await import("sharp");
  const datos = await sharp(ruta).resize(80, 80, { fit: "inside" }).ensureAlpha().raw().toBuffer();
  return acentoDeLogo(new Uint8Array(datos));
}

export async function atenderPublicidad(): Promise<boolean> {
  const p = await panel.publicidadSiguiente();
  if (!p) return false;
  const hora = () => new Date().toLocaleTimeString("es-US", { hour12: false });
  console.log(`[${hora()}] Anuncio #${p.id}: «${p.nombre}» (${p.voz}, ${p.carpetas.join(", ")})`);
  let ultimo = "bajando las imágenes a la Mac";
  const avisar = (paso: string) => {
    console.log(`  ${paso}`);
    ultimo = paso;
    return panel.avancePublicidad(p.id, paso).catch(() => {});
  };
  const gasto = (servicio: string, detalle: string, costo: number) =>
    costo > 0
      ? panel
          .gastoPublicidad(p.id, servicio, detalle, Math.round(costo * 10000) / 10000)
          .catch((e: unknown) => console.warn(`  (no se pudo anotar el gasto: ${String(e)})`))
      : Promise.resolve();
  const latido = setInterval(() => void panel.avancePublicidad(p.id, ultimo).catch(() => {}), 45_000);
  try {
    const imagenes = await sincronizarImagenes(p.carpetas, avisar);
    if (!imagenes.length) throw new Error("Las carpetas elegidas no tienen imágenes en la biblioteca.");
    const avatar = p.avatar ? imagenes.find((i) => i.nombre === p.avatar) : undefined;
    if (p.avatar && !avatar)
      throw new Error(`No encontré la foto de la persona («${p.avatar}») en las carpetas elegidas.`);
    const logo = elegirLogo(imagenes, p.avatar);
    if (!logo)
      throw new Error(
        "No encontré el logo: sube a una de las carpetas una imagen que se llame «logo» (mejor sin fondo).",
      );
    await avisar("la IA está armando el plan con tus imágenes");
    const plan = await panel.planDePublicidad(
      p.id,
      paraElPlan(imagenes.filter((i) => i.nombre !== p.avatar)),
    );
    const trabajo = path.join(config.CARPETA_SALIDA, `anuncio-${p.id}`);
    await mkdir(trabajo, { recursive: true });
    const musica = await prepararMusica(MUSICA_DE_ANUNCIO, trabajo).catch(() => null);
    const armar = planParaArmar({
      marca: p.nombre,
      texto: p.narracion,
      voz: p.voz,
      idioma: p.idioma,
      plan,
      rutas: new Map(imagenes.map((i) => [i.nombre, i.ruta])),
      logo: logo.ruta,
      avatar: avatar?.ruta,
      musica: musica ? path.join(trabajo, musica.ruta) : undefined,
      acento: await acentoDelArchivo(logo.ruta).catch(() => null),
    });
    console.log(`  logo: ${logo.nombre} · color ${armar.acento} · música: ${musica?.archivo ?? "ninguna"}`);
    await avisar("haciendo la voz");
    const voz = await pasoVoz(armar, trabajo, (t) => avisar(t), MAXIMO_SEG_PANEL);
    if (voz.nueva) await gasto("elevenlabs", `voz (${Math.round(voz.duracionMs / 1000)} s)`, voz.costoUsd);
    if (avatar) {
      await avisar("haciendo hablar a la persona (tarda unos minutos)");
      const persona = await pasoAvatar(armar, trabajo, trabajo, (t) => avisar(`persona: ${t}`));
      if (persona) await gasto("fal", "persona que habla (FlashTalk)", persona.costoUsd);
    }
    await avisar("armando el video");
    const r = await pasoArmar(armar, trabajo, trabajo);
    await avisar("subiendo el video al panel");
    await panel.subirVideoPublicidad(p.id, r.salida, r.duracionMs / 1000);
    console.log(`[${hora()}] Anuncio #${p.id} listo: ${(r.duracionMs / 1000).toFixed(1)} s.`);
  } catch (e) {
    const msj = e instanceof Error ? e.message : String(e);
    console.error(`[${hora()}] Falló el anuncio #${p.id}:`, msj);
    await panel.errorPublicidad(p.id, msj).catch(() => {});
  } finally {
    clearInterval(latido);
  }
  return true;
}
