// Prueba suelta del avatar (docs/AVATAR.md, Fase 1): una foto, un audio y un modelo, y deja el
// clip donde se diga. Imprime el costo antes de pedirlo y lo anota en un registro al lado.
// Uso (desde estacion/):
//   npx tsx src/avatar-prueba.ts --imagen ../avatar/chase-montes/fotos/x.png --audio ../avatar/chase-montes/voces/x.mp3 \
//       --modelo kling|omnihuman --salida ../avatar/chase-montes/pruebas/x.mp4 [--prompt "..."]
import { appendFile } from "node:fs/promises";
import path from "node:path";
import { generarAvatar } from "./avatar";

const opcion = (nombre: string): string | null => {
  const i = process.argv.indexOf(nombre);
  return i === -1 ? null : (process.argv[i + 1] ?? null);
};
const MODELOS: Record<string, string> = {
  kling: "fal-ai/kling-video/ai-avatar/v2/standard",
  omnihuman: "fal-ai/bytedance/omnihuman/v1.5",
};

async function principal() {
  const imagen = opcion("--imagen");
  const audio = opcion("--audio");
  const salida = opcion("--salida");
  const modelo = MODELOS[opcion("--modelo") ?? ""];
  if (!imagen || !audio || !salida || !modelo)
    throw new Error(
      "Uso: avatar-prueba.ts --imagen foto --audio voz.mp3 --modelo kling|omnihuman --salida clip.mp4",
    );
  const r = await generarAvatar({
    imagen: path.resolve(imagen),
    audio: path.resolve(audio),
    modelo,
    salida: path.resolve(salida),
    prompt: opcion("--prompt") ?? undefined,
    avisar: (t) => console.log(`  ${t}`),
  });
  const linea = `${new Date().toISOString()}\t${r.modelo}\t${r.segundos.toFixed(1)} s\t$${r.costoUsd.toFixed(2)}\t${path.basename(r.ruta)}\n`;
  await appendFile(path.join(path.dirname(r.ruta), "gastos.txt"), linea);
  console.log(`Listo: ${r.ruta} (${r.segundos.toFixed(1)} s, $${r.costoUsd.toFixed(2)})`);
}

principal().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
