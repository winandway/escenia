// Saca cuadros sueltos (PNG) de un trabajo ya producido, en los segundos que se
// pidan, sin renderizar el video entero. Sirve para revisar cómo se ve un
// cambio de la plantilla o una escena dudosa en segundos, no en minutos.
// Uso (desde estacion/):
//   npx tsx src/cuadros.ts 21 5,12.5,40            → cuadros del video largo
//   npx tsx src/cuadros.ts 21 5,12.5,40 --short 2  → cuadros del short 2
//   npx tsx src/cuadros.ts 21 5,12 --props ruta/props.json  → con otras props (misma carpeta pública)
// Quedan en out/t<número>/cuadros/.
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { renderStill, selectComposition } from "@remotion/renderer";
import { config } from "./config";
import type { ResultadoProduccion } from "./produccion";
import { esquemaPropsVideo, FPS, type PropsVideo } from "./remotion/props";
import { empaquetar } from "./render";

async function principal() {
  const numero = Number(process.argv[2]);
  const segundos = (process.argv[3] ?? "")
    .split(",")
    .map(Number)
    .filter((n) => Number.isFinite(n) && n >= 0);
  if (!Number.isInteger(numero) || segundos.length === 0)
    throw new Error(
      "Uso: npx tsx src/cuadros.ts <número del trabajo> <seg,seg,…> [--short N] [--props ruta]",
    );
  const opcion = (nombre: string) => {
    const i = process.argv.indexOf(nombre);
    return i === -1 ? null : (process.argv[i + 1] ?? null);
  };
  const carpetaTrabajo = path.join(config.CARPETA_SALIDA, `t${numero}`);
  const carpetaPublica = path.join(config.CARPETA_PUBLICA, `t${numero}`);
  const rutaProps = opcion("--props") ?? path.join(carpetaTrabajo, "props.json");
  const props: PropsVideo = esquemaPropsVideo.parse(JSON.parse(await readFile(rutaProps, "utf8")));
  const short = opcion("--short");
  let composicion = props.tema === "documental" ? "MiniDocumental" : "TechExplainer";
  let etiqueta = "largo";
  if (short) {
    const guardado = JSON.parse(await readFile(path.join(carpetaTrabajo, "resultado.json"), "utf8")) as {
      resultado: ResultadoProduccion;
    };
    const s = guardado.resultado.shorts.find((x) => x.indice === Number(short));
    const primera = s ? props.escenas[s.escenaInicio] : undefined;
    const ultima = s ? props.escenas[s.escenaFin] : undefined;
    if (!s || !primera || !ultima) throw new Error(`Ese trabajo no tiene el short ${short}.`);
    props.ventana = {
      inicioMs: primera.inicioMs,
      finMs: ultima.finMs,
      titulo: s.titulo,
      indice: s.indice,
      total: guardado.resultado.shorts.length,
    };
    composicion = "TechExplainerShort";
    etiqueta = `short${short}`;
  } else {
    props.ventana = null;
  }
  const salida = path.join(carpetaTrabajo, "cuadros");
  await mkdir(salida, { recursive: true });
  const serveUrl = await empaquetar(carpetaPublica);
  const comp = await selectComposition({ serveUrl, id: composicion, inputProps: props });
  for (const seg of segundos) {
    const archivo = path.join(salida, `${etiqueta}-${String(seg).replace(".", "_").padStart(5, "0")}.png`);
    await renderStill({
      composition: comp,
      serveUrl,
      output: archivo,
      inputProps: props,
      frame: Math.min(comp.durationInFrames - 1, Math.round(seg * FPS)),
      imageFormat: "png",
    });
    console.log(archivo);
  }
}

principal().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
