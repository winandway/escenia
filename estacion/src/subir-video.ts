// Sube al panel un video que ya está renderizado en la Mac (por ejemplo, uno
// hecho antes de que existiera la subida automática).
//   npm run subir-video -- <guion_id> <ruta-del-mp4> [16x9|9x16]
import path from "node:path";
import { panel } from "./panel";
import { duracionMs } from "./voz";

const [idTexto, rutaTexto, formatoTexto = "16x9"] = process.argv.slice(2);
const guionId = Number(idTexto);
if (!Number.isInteger(guionId) || guionId <= 0 || !rutaTexto) {
  console.error("Uso: npm run subir-video -- <guion_id> <ruta-del-mp4> [16x9|9x16]");
  process.exit(1);
}
const formato = formatoTexto === "9x16" ? "9x16" : "16x9";
const ruta = path.resolve(rutaTexto);
const duracion = (await duracionMs(ruta)) / 1000;
const vozDePrueba = process.argv.includes("--voz-de-prueba");
const r = await panel.subirVideo(
  guionId,
  formato,
  ruta,
  { duracion_seg: duracion, voz_de_prueba: vozDePrueba },
  (pct) => console.log(`${pct}%`),
);
console.log(`Listo: ${r.clave} (${(r.bytes / 1_048_576).toFixed(1)} MB)`);
