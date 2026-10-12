// Un dibujo de monigote para los videos de intriga (docs/MONIGOTES.md): línea blanca fina sobre
// negro, cara expresiva y simple, un brillo de color en lo importante. Sin texto: los títulos y
// subtítulos los pone el motor después.
// Uso (desde estacion/):
//   npx tsx src/monigote.ts --escena "a man sitting on his bed at night holding his phone" --brillo "red" --salida dibujo.png
import path from "node:path";

/** El estilo fijo de los monigotes (el del reel viral de referencia, hecho propio). */
export function promptDeMonigote(escena: string, brillo: string): string {
  return [
    "Minimalist stick figure illustration, thin clean white line art on a pure black background, simple round heads with small expressive faces, hand-drawn look like a viral explainer animation.",
    `Scene: ${escena}.`,
    `The only color is a soft ${brillo} glow on the most important object of the scene; everything else is white lines on black.`,
    "Vertical composition: the characters stand in the MIDDLE band of the image, their heads between 35% and 60% of the image height, never in the lower third; simple line-drawn background objects.",
    // El título va arriba y el recuadro de la canción arriba a la izquierda (C-MONIGOTES-1): ahí no puede haber nada importante.
    "Keep the top quarter of the image almost empty black, keep the upper-left corner completely empty, and keep the lower quarter free of faces: no characters' heads, windows or important objects in those areas.",
    "No text, no letters, no words, no captions, no logos, no watermark.",
  ].join(" ");
}

const opcion = (nombre: string): string | null => {
  const i = process.argv.indexOf(nombre);
  return i === -1 ? null : (process.argv[i + 1] ?? null);
};

if (process.argv[1] && /^monigote\.(ts|js|mjs)$/.test(path.basename(process.argv[1]))) {
  const escena = opcion("--escena");
  const salida = opcion("--salida");
  if (!escena || !salida) {
    console.error('Uso: monigote.ts --escena "…" [--brillo red] --salida dibujo.png');
    process.exit(1);
  }
  // Se carga aquí: imagenes.ts lee estacion/.env al importarse, y las pruebas no lo tienen.
  import("./imagenes")
    .then(({ imagenLibre }) =>
      imagenLibre(promptDeMonigote(escena, opcion("--brillo") ?? "red"), path.resolve(salida)),
    )
    .then((c) => console.log(`Listo: ${path.resolve(salida)} ($${c.toFixed(2)})`))
    .catch((e: unknown) => {
      console.error(e instanceof Error ? e.message : e);
      process.exit(1);
    });
}
