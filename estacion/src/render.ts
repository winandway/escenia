// Render con Remotion en la Mac.
// Se empaqueta POR TRABAJO, con la carpeta pública de ese trabajo: Remotion
// copia el publicDir al empaquetar, así que un archivo escrito después de
// empaquetar no existe para él (nos pasó con voz.mp3 → 404).
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { PropsVideo } from "./remotion/props";

const aqui = path.dirname(fileURLToPath(import.meta.url));

export function empaquetar(carpetaPublica: string): Promise<string> {
  return bundle({
    entryPoint: path.join(aqui, "remotion/index.ts"),
    publicDir: carpetaPublica,
    onProgress: () => {},
  });
}

export async function renderizar(
  composicion: "TechExplainer" | "TechExplainerShort",
  props: PropsVideo,
  carpetaPublica: string,
  salida: string,
  avisar: (progreso: number) => void,
): Promise<{ bytes: number; duracionSeg: number }> {
  const serveUrl = await empaquetar(carpetaPublica);
  const comp = await selectComposition({ serveUrl, id: composicion, inputProps: props });
  await renderMedia({
    composition: comp,
    serveUrl,
    codec: "h264",
    outputLocation: salida,
    inputProps: props,
    onProgress: ({ progress }) => avisar(progress),
    chromiumOptions: { gl: "angle" },
  });
  const info = await stat(salida);
  return { bytes: info.size, duracionSeg: comp.durationInFrames / comp.fps };
}
