// Pone al muñeco (un PNG recortado, con transparencia) sobre un fondo real y deja la foto lista
// para el avatar (docs/AVATAR.md): 1080×1920, de la cintura para arriba, como el reel de
// referencia. Sin esto, fal.ai aplana la transparencia a negro y el clip sale con ruido alrededor.
// El fondo puede ser una foto que mande Richard o uno generado con Seedream (3 ¢).
// Uso (desde estacion/):
//   npx tsx src/avatar-fondo.ts --muneco ../avatar/chase-montes/fotos/cuerpo-entero-fondo-blanco.png \
//       --salida ../avatar/chase-montes/fotos/chase-playa.png [--fondo foto.jpg | --generar "descripción en inglés"]
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { generarImagen } from "./imagenes";

const ANCHO = 1080;
const ALTO = 1920;
/** Alto del muñeco entero en el lienzo y cuánto se recorta por arriba para dejarlo de la cintura para arriba. */
const ALTO_MUNECO = 1500;
const RECORTE = { top: 380, height: 1200 };

const opcion = (nombre: string): string | null => {
  const i = process.argv.indexOf(nombre);
  return i === -1 ? null : (process.argv[i + 1] ?? null);
};

export async function componerMuneco(entrada: {
  muneco: string;
  fondo: string;
  salida: string;
  cuerpoEntero?: string;
}): Promise<void> {
  const fondo = await sharp(entrada.fondo).resize(ANCHO, ALTO, { fit: "cover" }).toBuffer();
  const muneco = await sharp(entrada.muneco).resize({ height: ALTO_MUNECO }).toBuffer();
  const m = await sharp(muneco).metadata();
  if (!m.hasAlpha) throw new Error("El muñeco tiene que ser un PNG recortado, con transparencia.");
  const entero = await sharp(fondo)
    .composite([
      { input: muneco, left: Math.round((ANCHO - (m.width ?? 0)) / 2), top: ALTO - ALTO_MUNECO + 60 },
    ])
    .png()
    .toBuffer();
  if (entrada.cuerpoEntero) await sharp(entero).toFile(entrada.cuerpoEntero);
  await sharp(entero)
    .extract({ left: 0, top: RECORTE.top, width: ANCHO, height: RECORTE.height })
    .resize(ANCHO, ALTO, { fit: "cover" })
    .png()
    .toFile(entrada.salida);
}

async function principal() {
  const muneco = opcion("--muneco");
  const salida = opcion("--salida");
  const generar = opcion("--generar");
  let fondo = opcion("--fondo");
  if (!muneco || !salida || (!fondo && !generar))
    throw new Error(
      'Uso: avatar-fondo.ts --muneco recorte.png --salida foto.png (--fondo foto.jpg | --generar "descripción")',
    );
  if (!fondo && generar) {
    const carpeta = await mkdtemp(path.join(os.tmpdir(), "chase-fondo-"));
    const img = await generarImagen(`${generar}, vertical, no people, no text`, carpeta, { vertical: true });
    if (!img) throw new Error("No se pudo generar el fondo (¿falta FAL_KEY?).");
    fondo = path.join(carpeta, img.ruta);
    console.log(`  fondo generado ($${img.costoUsd.toFixed(2)})`);
  }
  await componerMuneco({
    muneco: path.resolve(muneco),
    fondo: path.resolve(fondo as string),
    salida: path.resolve(salida),
    cuerpoEntero: path.resolve(salida).replace(/\.png$/i, "-cuerpo-entero.png"),
  });
  console.log(`Listo: ${path.resolve(salida)}`);
}

if (process.argv[1] && path.basename(process.argv[1]).startsWith("avatar-fondo")) {
  principal().catch((e: unknown) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
