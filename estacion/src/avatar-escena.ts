// Regla de Richard (8 oct 2026): cada video de Chase cambia de escenografía y de ropa. «Hiciste dos
// videos iguales, con el mismo fondo, mismo todo, y eso no está bien.» Mejor si el fondo es un
// lugar real (un restaurante en el muelle, una tienda de playa con mesitas de plástico, debajo de
// una palmera, recostado a un carro). Aquí viven las dos piezas:
//   1. El candado: cada foto usada en un clip queda anotada por su huella en
//      `escenas-usadas.txt` (junto a los clips); la prueba suelta no deja repetirla (C-AVATAR-2).
//   2. La herramienta que arma la escena nueva: el muñeco (misma cara y pelo) con otra ropa, en
//      otra pose y otro lugar, con Seedream edit (3 ¢); si se pasa una foto real, la usa de fondo.
// Uso (desde estacion/):
//   npx tsx src/avatar-escena.ts --muneco ../avatar/chase-montes/fotos/cuerpo-entero-fondo-blanco.png \
//       --ropa "light blue linen shirt open over a white tank top, beige shorts" \
//       --escena "sitting at an outdoor restaurant table by the water, holding a fresh drink" \
//       [--fondo ../avatar/chase-montes/fondos/foto-real.jpg] [--cuerpo-entero] --salida ../avatar/chase-montes/fotos/escena-x.png
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { appendFile, mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";

export const REGISTRO_ESCENAS = "escenas-usadas.txt";

export async function huellaDeImagen(ruta: string): Promise<string> {
  return createHash("sha1")
    .update(await readFile(ruta))
    .digest("hex")
    .slice(0, 16);
}

/** El clip donde ya salió esa escena, o null si es nueva. El registro es «huella<TAB>clip<TAB>fecha» por línea. */
export function escenaRepetida(huella: string, registro: string): string | null {
  for (const linea of registro.split("\n")) {
    const [h, clip] = linea.split("\t");
    if (h === huella) return clip ?? "un clip anterior";
  }
  return null;
}

/** Revienta si la foto ya se usó en otro clip de la misma carpeta (salvo `rehacer`: corregir ESE mismo video). */
export async function asegurarEscenaNueva(imagen: string, carpetaClips: string): Promise<string> {
  const huella = await huellaDeImagen(imagen);
  const archivo = path.join(carpetaClips, REGISTRO_ESCENAS);
  const registro = existsSync(archivo) ? await readFile(archivo, "utf8") : "";
  const clip = escenaRepetida(huella, registro);
  if (clip)
    throw new Error(
      `Esta escena ya salió en ${clip}. Regla de Richard: cada video cambia de escenografía y de ropa, ` +
        "sin excepciones (tampoco para pruebas). Arma una escena nueva con avatar-escena.ts.",
    );
  return huella;
}

export async function registrarEscena(huella: string, carpetaClips: string, clip: string): Promise<void> {
  await appendFile(
    path.join(carpetaClips, REGISTRO_ESCENAS),
    `${huella}\t${clip}\t${new Date().toISOString()}\n`,
  );
}

/** El pedido a Seedream: mismo muñeco, ropa y lugar nuevos, vertical, de la cintura para arriba y mirando a cámara. */
export function promptDeEscena(
  ropa: string,
  escena: string,
  conFondoReal: boolean,
  cuerpoEntero = false,
): string {
  return [
    "Image 1 is the character: a real plastic fashion doll. Keep EXACTLY the same doll: same face, same blue eyes, same curly blond hair, same tanned glossy plastic skin and doll proportions. It must still look like a real doll photographed in real life, not a human and not a drawing.",
    `Dress him in: ${ropa}.`,
    `Scene: ${escena}.`,
    conFondoReal
      ? "Image 2 is the real place: put the doll inside this exact place, keep the background as it is in the photo, same light, same perspective."
      : "Real photograph of a real place, natural daylight.",
    cuerpoEntero
      ? "Vertical photo, the doll standing and seen FULL BODY from head to shoes, centered, facing the camera, arms relaxed at the sides, feet on the ground, some space above the head and below the feet, sharp focus on the doll."
      : "Vertical photo, the doll seen from the waist up, facing the camera, the whole head visible with space above the hair, both hands visible, sharp focus on the doll, softly blurred background.",
    "No text, no letters, no logos, no watermark, no other people close to the camera.",
  ].join(" ");
}

/**
 * El pedido de escena para una PERSONA real (el avatar de Richard), no para el muñeco. Lo que
 * aprendimos con Chase cantando (9 oct 2026): si la persona del video se acerca a la cámara, delante
 * de ella tiene que haber piso de sobra; con una tarima redonda se «salía de la tabla». Y las manos
 * vacías, sin micrófono de pie ni guitarra: el video de referencia no los tiene y el modelo los rompe.
 */
export function promptDeEscenaPersona(
  ropa: string,
  escena: string,
  referencias: number,
  medioCuerpo = false,
): string {
  return [
    `Images 1 to ${referencias} show the same real man. Keep EXACTLY his identity: the same face, the same thick black-framed glasses, the same hairstyle, skin tone, age, build and height proportions. Photorealistic, not a drawing.`,
    `Outfit: ${ropa}.`,
    `Scene: ${escena}.`,
    medioCuerpo
      ? // Para videos que se acercan a la cámara: de medio cuerpo nunca se ve el piso (C-AVATAR-3).
        "Vertical medium shot: he is seen from the WAIST UP, centered, facing the camera, the bottom edge of the photo cuts at his waist, the floor is NOT visible, some space above his head, both hands empty and visible in front of his chest. Nothing between him and the camera: no microphone stand, no instruments. He wears a thin skin-colored headset microphone. Sharp focus on him, the band softly out of focus behind him."
      : "Vertical photo, he stands FULL BODY from head to shoes in the middle of the frame, facing the camera, relaxed, both hands empty and visible. In front of him, all the way to the camera, there is plenty of empty flat floor: no stage edge, no steps, no microphone stand, no instruments and no objects between him and the camera. He wears a thin skin-colored headset microphone. Sharp focus on him.",
    "No text, no letters, no logos, no watermark.",
  ].join(" ");
}

const opcion = (nombre: string): string | null => {
  const i = process.argv.indexOf(nombre);
  return i === -1 ? null : (process.argv[i + 1] ?? null);
};

async function principal() {
  const muneco = opcion("--muneco");
  const ropa = opcion("--ropa");
  const escena = opcion("--escena");
  const salida = opcion("--salida");
  const fondo = opcion("--fondo");
  if ((!muneco && !opcion("--persona")) || !ropa || !escena || !salida)
    throw new Error(
      'Uso: avatar-escena.ts --muneco x.png --ropa "..." --escena "..." [--fondo foto.jpg] --salida y.png',
    );
  // `--persona ref1,ref2,…`: una persona real (el avatar de Richard) a partir de sus fotos; si no, el muñeco.
  const persona = opcion("--persona");
  const carpeta = await mkdtemp(path.join(os.tmpdir(), "chase-escena-"));
  let referencias: string[];
  let prompt: string;
  if (persona) {
    referencias = persona.split(",").map((r) => path.resolve(r.trim()));
    prompt = promptDeEscenaPersona(ropa, escena, referencias.length, process.argv.includes("--medio-cuerpo"));
  } else {
    // El recorte transparente se aplana sobre blanco: así el modelo ve el muñeco y no un fondo negro.
    const plano = path.join(carpeta, "muneco.jpg");
    await sharp(path.resolve(muneco as string))
      .flatten({ background: "#ffffff" })
      .jpeg({ quality: 92 })
      .toFile(plano);
    referencias = fondo ? [plano, path.resolve(fondo)] : [plano];
    prompt = promptDeEscena(ropa, escena, Boolean(fondo), process.argv.includes("--cuerpo-entero"));
  }
  // Se carga aquí y no arriba: imagenes.ts lee estacion/.env al importarse, y las pruebas no lo tienen.
  const { imagenConReferencias } = await import("./imagenes");
  const costo = await imagenConReferencias(prompt, referencias, path.resolve(salida));
  console.log(`Listo: ${path.resolve(salida)} ($${costo.toFixed(2)})`);
}

if (process.argv[1] && path.basename(process.argv[1]).startsWith("avatar-escena")) {
  principal().catch((e: unknown) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
