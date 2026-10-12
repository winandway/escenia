// Un dibujo de monigote para los videos de intriga (docs/MONIGOTES.md): línea blanca fina sobre
// negro, cara expresiva y simple, un brillo de color en lo importante. Sin texto: los títulos y
// subtítulos los pone el motor después.
// Uso (desde estacion/):
//   npx tsx src/monigote.ts --escena "a man sitting on his bed at night holding his phone" --brillo "red" --salida dibujo.png
import path from "node:path";
import { imagenLibre } from "./imagenes";

/** El estilo fijo de los monigotes (el del reel viral de referencia, hecho propio). */
export function promptDeMonigote(escena: string, brillo: string): string {
  return [
    "Minimalist stick figure illustration, thin clean white line art on a pure black background, simple round heads with small expressive faces, hand-drawn look like a viral explainer animation.",
    `Scene: ${escena}.`,
    `The only color is a soft ${brillo} glow on the most important object of the scene; everything else is white lines on black.`,
    "Vertical composition, the characters in the middle of the frame with space above, simple line-drawn background objects.",
    "No text, no letters, no words, no captions, no logos, no watermark.",
  ].join(" ");
}

const opcion = (nombre: string): string | null => {
  const i = process.argv.indexOf(nombre);
  return i === -1 ? null : (process.argv[i + 1] ?? null);
};

if (process.argv[1] && path.basename(process.argv[1]).startsWith("monigote")) {
  const escena = opcion("--escena");
  const salida = opcion("--salida");
  if (!escena || !salida) {
    console.error('Uso: monigote.ts --escena "…" [--brillo red] --salida dibujo.png');
    process.exit(1);
  }
  imagenLibre(promptDeMonigote(escena, opcion("--brillo") ?? "red"), path.resolve(salida))
    .then((c) => console.log(`Listo: ${path.resolve(salida)} ($${c.toFixed(2)})`))
    .catch((e: unknown) => {
      console.error(e instanceof Error ? e.message : e);
      process.exit(1);
    });
}
