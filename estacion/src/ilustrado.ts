// Estilo ilustrado (docs/ESTILOS.md): las personas del video salen DIBUJADAS.
// De cada foto con rótulo (las únicas de las que se sabe de quién son) se hace
// una ilustración con la misma cara y la misma ropa, se recorta la figura y se
// le pone a sus planos. Los «datos» que vienen después heredan la figura: la
// persona se queda en pantalla y el titular le cae encima.
import { mkdir } from "node:fs/promises";
import path from "node:path";
import {
  figuraSirve,
  fotoSirveParaDibujar,
  repartirFiguras,
  type FiguraDePlano,
} from "@compartido/ilustrado";
import { ilustrarFoto, imagenesActivas } from "./imagenes";
import { recortar } from "./recorte";
import type { PropsVideo } from "./remotion/props";

/** Tope de dibujos por video: a $0.03 cada uno, un video no pasa de 72 centavos en ilustraciones. */
export const MAXIMO_DE_DIBUJOS = 24;
const A_LA_VEZ = 3;

/** Dibuja a la persona de una foto y recorta la figura. `null` si no se pudo (va la foto real). */
export async function figuraDe(
  rutaFoto: string,
  carpetaPublica: string,
): Promise<{ figura: FiguraDePlano; costoUsd: number; credito: string } | null> {
  // Antes de gastar en el dibujo: en la foto tiene que haber una sola persona (se mira gratis, en la Mac).
  await mkdir(path.join(carpetaPublica, "ia"), { recursive: true });
  const sujeto = path.join(
    carpetaPublica,
    "ia",
    `sujeto-${path.basename(rutaFoto, path.extname(rutaFoto))}.png`,
  );
  const enLaFoto = await recortar(rutaFoto, sujeto);
  if (!fotoSirveParaDibujar(enLaFoto)) {
    console.warn(
      `  dibujo de ${path.basename(rutaFoto)}: en la foto hay ${enLaFoto.caras.length} caras; se queda la foto real`,
    );
    return null;
  }
  const dibujo = await ilustrarFoto(rutaFoto, carpetaPublica);
  if (!dibujo) return null;
  const png = dibujo.ruta.replace(/\.jpg$/, ".png");
  const recorte = await recortar(path.join(carpetaPublica, dibujo.ruta), path.join(carpetaPublica, png));
  // Si no se separó la figura del fondo, quedaría un rectángulo pegado: mejor la foto real.
  if (!figuraSirve(recorte)) return null;
  return {
    figura: { ruta: png, ancho: recorte.ancho, alto: recorte.alto },
    costoUsd: dibujo.costoUsd,
    credito: dibujo.credito,
  };
}

/**
 * Pone las figuras dibujadas en los planos de un video. Si una falla, ese
 * plano sale con su foto real: el video nunca se cae por un dibujo.
 */
export async function ilustrarPlanos(
  escenas: PropsVideo["escenas"],
  carpetaPublica: string,
  alGasto: (detalle: string, costoUsd: number) => Promise<void>,
  alCredito: (credito: string) => void,
): Promise<{ dibujadas: number; fallidas: number; costoUsd: number }> {
  if (!imagenesActivas()) return { dibujadas: 0, fallidas: 0, costoUsd: 0 };
  const fotos = [
    ...new Set(
      escenas.flatMap((e) =>
        e.planos.flatMap((p) => (p.tipo === "foto" && p.foto && p.texto ? [p.foto.ruta] : [])),
      ),
    ),
  ].slice(0, MAXIMO_DE_DIBUJOS);
  const figuras = new Map<string, FiguraDePlano>();
  let fallidas = 0;
  let costoUsd = 0;
  for (let k = 0; k < fotos.length; k += A_LA_VEZ) {
    const lote = fotos.slice(k, k + A_LA_VEZ);
    const hechas = await Promise.all(
      lote.map((ruta) =>
        figuraDe(path.join(carpetaPublica, ruta), carpetaPublica).catch((e) => {
          console.warn(`  dibujo de ${path.basename(ruta)}: ${e instanceof Error ? e.message : e}`);
          return null;
        }),
      ),
    );
    for (const [i, hecha] of hechas.entries()) {
      const ruta = lote[i];
      if (!ruta) continue;
      if (!hecha) {
        fallidas++;
        continue;
      }
      figuras.set(ruta, hecha.figura);
      alCredito(hecha.credito);
      if (hecha.costoUsd > 0) {
        costoUsd += hecha.costoUsd;
        await alGasto(`dibujo de ${path.basename(ruta)}`, hecha.costoUsd);
      }
    }
  }
  repartirFiguras(escenas, figuras);
  return { dibujadas: figuras.size, fallidas, costoUsd };
}
