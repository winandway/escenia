// Sube a una carpeta de la biblioteca de Imágenes los archivos que ya están en la Mac (lo mismo
// que hace el panel desde el navegador). Uso (desde estacion/):
//   npx tsx src/subir-imagenes.ts "Logos Andreea" /ruta/a/01.png /ruta/a/02.png …
//   npx tsx src/subir-imagenes.ts "Capturas Andreea" /ruta/a/capturas.pdf
import { readFile } from "node:fs/promises";
import path from "node:path";
import { extensionDeImagen, nombreDeCarpeta } from "@compartido/imagenes";
import { panel } from "./panel";

async function principal() {
  const carpeta = nombreDeCarpeta(process.argv[2] ?? "");
  const archivos = process.argv.slice(3);
  if (carpeta.length < 2 || archivos.length === 0)
    throw new Error('Uso: npx tsx src/subir-imagenes.ts "<carpeta>" <archivo> [<archivo> …]');
  for (const [k, archivo] of archivos.entries()) {
    const extension = extensionDeImagen(archivo);
    if (!extension) {
      console.warn(`  (se salta ${path.basename(archivo)}: no es PNG, JPG, WEBP ni PDF)`);
      continue;
    }
    const r = await panel.subirImagen(await readFile(archivo), carpeta, path.basename(archivo), extension);
    console.log(`  ${k + 1}/${archivos.length} ${path.basename(archivo)} → imagen ${r.id}`);
  }
  console.log(`Listo: carpeta «${carpeta}».`);
}

principal().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
