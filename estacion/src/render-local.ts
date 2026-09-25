// Produce un video desde un guion en JSON, sin panel. Sirve para probar la
// plantilla en la Mac:  npm run render -- pruebas/guion-ejemplo.json
import { readFile } from "node:fs/promises";
import path from "node:path";
import { esquemaGuion } from "@compartido/guion";
import { producir } from "./produccion";

const archivo = process.argv[2];
if (!archivo) {
  console.error("Uso: npm run render -- <ruta-del-guion.json>");
  process.exit(1);
}
const guion = esquemaGuion.parse(JSON.parse(await readFile(path.resolve(archivo), "utf8")));
const clave = `local-${path.basename(archivo, ".json")}`;
const r = await producir(
  clave,
  guion,
  { nombre: "Blisor", url: "https://blisor.com" },
  async (paso, progreso) => {
    console.log(`${String(progreso).padStart(3)}% ${paso}`);
  },
);
console.log(
  `\nVideo: ${r.rutaMp4}\n${(r.bytes / 1_048_576).toFixed(1)} MB · ${r.duracionSeg.toFixed(1)} s · voz ${r.vozDePrueba ? "de prueba" : "ElevenLabs"}`,
);
if (r.creditos.length) console.log("Créditos:\n" + r.creditos.join("\n"));
