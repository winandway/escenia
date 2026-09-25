// Render con Remotion en la Mac. Se empaqueta una sola vez por arranque.
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "./config";
import type { PropsVideo } from "./remotion/props";

const aqui = path.dirname(fileURLToPath(import.meta.url));
let paquete: Promise<string> | null = null;

export function empaquetar(): Promise<string> {
  paquete ??= bundle({
    entryPoint: path.join(aqui, "remotion/index.ts"),
    publicDir: config.CARPETA_PUBLICA,
    onProgress: () => {},
  });
  return paquete;
}

export async function renderizar(
  composicion: "TechExplainer" | "TechExplainerShort",
  props: PropsVideo,
  salida: string,
  avisar: (progreso: number) => void,
): Promise<{ bytes: number; duracionSeg: number }> {
  const serveUrl = await empaquetar();
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
