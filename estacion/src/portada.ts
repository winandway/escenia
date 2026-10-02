// Arma la PORTADA de impacto de un video (la miniatura para YouTube): recorta a
// la persona de su foto, la monta sobre un fondo de color con una cifra enorme
// y un remate, y la sube al panel para que Richard la descargue.
// Uso (desde estacion/):
//   npx tsx src/portada.ts 27 --foto web-b0f0de3fdf0554ad.jpg --etiqueta "PRINCE ROYCE" \
//     --cifra 15 --linea NOMINACIONES --remate "*CERO* PREMIOS" --objeto web-3ca740db57aa9151.jpg \
//     --tachado --mostrar 0.62 --acercar 1.2 --guion 8
// En el remate, lo que va entre asteriscos sale en amarillo. --acercar agranda a la persona.
// --mostrar 0.62 enseña solo la parte de arriba del objeto (deja fuera la base del trofeo).
// La foto y el objeto son archivos que el trabajo ya tiene (cache/public/t<n>/fotos/).
// Sin --guion no se sube: queda en out/t<n>/portada.png para mirarla.
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { renderStill, selectComposition } from "@remotion/renderer";
import { config } from "./config";
import { panel } from "./panel";
import type { PropsPortada } from "./remotion/props";
import { empaquetar } from "./render";

const exec = promisify(execFile);
const aqui = path.dirname(fileURLToPath(import.meta.url));
const FUENTE = path.resolve(aqui, "../herramientas/recortar.swift");
const BINARIO = path.resolve(aqui, "../bin/recortar");

const opcion = (nombre: string): string | null => {
  const i = process.argv.indexOf(nombre);
  return i === -1 ? null : (process.argv[i + 1] ?? null);
};

/** Recorta al sujeto de una foto (fondo transparente) y devuelve su tamaño. */
async function recortar(origen: string, destino: string): Promise<{ ancho: number; alto: number }> {
  if (!existsSync(BINARIO)) {
    await mkdir(path.dirname(BINARIO), { recursive: true });
    await exec("swiftc", ["-O", FUENTE, "-o", BINARIO]);
  }
  const { stdout } = await exec(BINARIO, [origen, destino]);
  const [ancho, alto] = stdout.trim().split(/\s+/).map(Number);
  if (!ancho || !alto) throw new Error(`No se pudo recortar ${path.basename(origen)}.`);
  return { ancho, alto };
}

async function principal() {
  const numero = Number(process.argv[2]);
  const foto = opcion("--foto");
  if (!Number.isInteger(numero) || !foto)
    throw new Error(
      "Uso: npx tsx src/portada.ts <trabajo> --foto <archivo.jpg> --cifra … --linea … --remate …",
    );
  const carpetaTrabajo = path.join(config.CARPETA_SALIDA, `t${numero}`);
  const carpetaPublica = path.join(config.CARPETA_PUBLICA, `t${numero}`);
  await mkdir(path.join(carpetaPublica, "portada"), { recursive: true });

  const sujeto = await recortar(
    path.join(carpetaPublica, "fotos", foto),
    path.join(carpetaPublica, "portada", "sujeto.png"),
  );
  const archivoObjeto = opcion("--objeto");
  const objeto = archivoObjeto
    ? await recortar(
        path.join(carpetaPublica, "fotos", archivoObjeto),
        path.join(carpetaPublica, "portada", "objeto.png"),
      )
    : null;

  const props: PropsPortada = {
    sujeto: { ruta: "portada/sujeto.png", ...sujeto },
    objeto: objeto
      ? {
          ruta: "portada/objeto.png",
          ...objeto,
          tachado: process.argv.includes("--tachado"),
          mostrar: Number(opcion("--mostrar")) || 1,
        }
      : null,
    etiqueta: opcion("--etiqueta") ?? "",
    cifra: opcion("--cifra") ?? "",
    linea: opcion("--linea") ?? "",
    remate: opcion("--remate") ?? "",
    acercar: Number(opcion("--acercar")) || 1.2,
    fondo: [opcion("--color") ?? "#d00000", opcion("--color-oscuro") ?? "#14000a"],
    acento: opcion("--acento") ?? "#ffd60a",
  };
  const serveUrl = await empaquetar(carpetaPublica);
  const comp = await selectComposition({ serveUrl, id: "Portada", inputProps: props });
  const salida = path.join(carpetaTrabajo, "portada.png");
  await renderStill({ composition: comp, serveUrl, output: salida, inputProps: props, imageFormat: "png" });
  console.log(`Portada: ${salida}`);

  const guion = Number(opcion("--guion"));
  if (Number.isInteger(guion) && guion > 0) {
    await panel.subirArchivo(guion, "miniatura", "png", salida, { portada: true });
    console.log(`Subida al panel como la miniatura del guion ${guion}.`);
  }
}

principal().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
