// Prueba sin gasto (C-COMERCIAL-3): arma la versión vertical de un comercial ya producido, con sus props.
// Uso: npx tsx src/probar-vertical.ts t40
import { readFile } from "node:fs/promises";
import path from "node:path";
import { config } from "./config";
import { renderizar } from "./render";

const clave = process.argv[2] ?? "";
if (!/^t\d+$/.test(clave)) throw new Error("Uso: npx tsx src/probar-vertical.ts t<número>");
const props = JSON.parse(await readFile(path.join(config.CARPETA_SALIDA, clave, "props.json"), "utf8"));
const salida = path.join(config.CARPETA_SALIDA, clave, "video-9x16-prueba.mp4");
const r = await renderizar(
  "TechExplainerShort",
  { ...props, ventana: null },
  path.join(config.CARPETA_PUBLICA, clave),
  salida,
  () => {},
);
console.log(`Listo: ${salida} · ${Math.round(r.duracionSeg)} s · ${(r.bytes / 1_048_576).toFixed(1)} MB`);
