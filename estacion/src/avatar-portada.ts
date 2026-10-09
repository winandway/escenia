// La miniatura de un Short de Chase (docs/AVATAR.md), con la misma pieza de las portadas de impacto
// del motor (docs/PORTADA.md): el muñeco recortado de la foto de su escena (nítida, no un cuadro
// borroso del video), un titular enorme, una línea y un remate en caja de color. Cada video lleva
// otra paleta y otra trama (`--variante`), para que ninguna miniatura se parezca a la anterior.
// Uso (desde estacion/):
//   npx tsx src/avatar-portada.ts --imagen ../avatar/chase-montes/fotos/escena-x.png \
//       --grande "¿PELUCA?" --linea "UN NIÑO ME LA JALÓ" --remate "*100%* PELO REAL" \
//       --variante 2 [--espejo] --salida ../avatar/chase-montes/publicar/portada-x.png
import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { encuadre, paletaDePieza, tramaDePieza } from "@compartido/portada";
import { config } from "./config";
import { recortar } from "./recorte";
import { empaquetar } from "./render";
import { renderizarPortada } from "./portadas";
import { esquemaPortada } from "./remotion/props";

const COLORES_CANAL = { fondo: ["#d00000", "#14000a"] as [string, string], acento: "#ffd60a" };

const opcion = (nombre: string): string | null => {
  const i = process.argv.indexOf(nombre);
  return i === -1 ? null : (process.argv[i + 1] ?? null);
};

async function principal() {
  const imagen = opcion("--imagen");
  const salida = opcion("--salida");
  if (!imagen || !salida)
    throw new Error(
      'Uso: avatar-portada.ts --imagen escena.png --grande "…" --linea "…" --remate "…" --variante N --salida x.png',
    );
  const variante = Number(opcion("--variante") ?? "1");
  const publica = path.join(config.CARPETA_PUBLICA, "chase-portadas");
  await mkdir(publica, { recursive: true });
  const base = path.basename(imagen, path.extname(imagen));
  const copia = path.join(publica, `${base}${path.extname(imagen)}`);
  await copyFile(path.resolve(imagen), copia);
  const recorte = await recortar(copia, path.join(publica, `${base}-recorte.png`));
  const cara = recorte.caras[0];
  if (!cara) throw new Error("No se encontró la cara de Chase en la foto: prueba con otra escena.");
  // Como el presentador en vertical: más lejos y más abajo, para que quepan la cabeza y los hombros.
  const sitio = encuadre("vertical", recorte, cara, 0.8);
  const props = esquemaPortada.parse({
    formato: "vertical",
    sujeto: {
      ruta: `${base}-recorte.png`,
      ...sitio,
      arriba: sitio.arriba + 90,
      espejo: process.argv.includes("--espejo"),
    },
    trama: tramaDePieza(variante),
    etiqueta: opcion("--etiqueta") ?? "CHASE, EL MONO CARIBE",
    cifra: opcion("--grande") ?? "",
    linea: opcion("--linea") ?? "",
    remate: opcion("--remate") ?? "",
    ...paletaDePieza(COLORES_CANAL, variante),
  });
  // Se empaqueta solo su carpeta (la carpeta pública entera lleva todos los videos y pesa mucho).
  const serveUrl = await empaquetar(publica);
  await mkdir(path.dirname(path.resolve(salida)), { recursive: true });
  await renderizarPortada(serveUrl, props, path.resolve(salida), null);
  console.log(`Listo: ${path.resolve(salida)}`);
}

principal().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
