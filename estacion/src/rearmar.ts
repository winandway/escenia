// Vuelve a armar un trabajo YA producido, con la misma voz: no gasta ni vuelve
// a buscar nada. Sirve para corregir lo que se ve al revisar los cuadros (una
// foto que no era, un rótulo): se edita out/t<numero>/props.json y se corre
// esto. Deja el video largo, la miniatura y los Shorts nuevos, y marca la
// producción como «sin entregar» para que «Reintentar» en el panel la suba.
// Uso (desde estacion/):  npx tsx src/rearmar.ts 24
//   npx tsx src/rearmar.ts 24 --solo-shorts 3,4   → solo esos Shorts (si el armado se cortó a medias)
import { existsSync } from "node:fs";
import { readFile, rename, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { config } from "./config";
import type { ResultadoProduccion } from "./produccion";
import { esquemaPropsVideo, type PropsVideo } from "./remotion/props";
import { empaquetar, renderizar, renderizarMiniatura } from "./render";

const numero = Number(process.argv[2]);
if (!Number.isInteger(numero) || numero <= 0) {
  console.error("Uso: npx tsx src/rearmar.ts <número del trabajo>");
  process.exit(1);
}
// Con «--solo-shorts 3,4» no se toca el video largo: se arman esos Shorts y se anota todo.
const iSolo = process.argv.indexOf("--solo-shorts");
const soloShorts =
  iSolo === -1
    ? null
    : new Set(
        (process.argv[iSolo + 1] ?? "")
          .split(",")
          .map(Number)
          .filter((n) => Number.isInteger(n) && n > 0),
      );
const carpetaTrabajo = path.join(config.CARPETA_SALIDA, `t${numero}`);
const carpetaPublica = path.join(config.CARPETA_PUBLICA, `t${numero}`);

/** Un render que falla por un tropiezo del navegador se intenta una vez más antes de rendirse. */
async function conUnReintento<T>(que: string, tarea: () => Promise<T>): Promise<T> {
  try {
    return await tarea();
  } catch (e) {
    console.warn(`  (${que} falló: ${e instanceof Error ? e.message : e}; se intenta otra vez)`);
    return tarea();
  }
}

/** Guarda la versión anterior al lado («video-16x9.anterior.mp4») por si hay que comparar. */
async function apartar(ruta: string) {
  if (!existsSync(ruta)) return;
  const ext = path.extname(ruta);
  await rename(ruta, `${ruta.slice(0, -ext.length)}.anterior${ext}`);
}

async function principal() {
  const rutaResultado = path.join(carpetaTrabajo, "resultado.json");
  const guardado = JSON.parse(await readFile(rutaResultado, "utf8")) as {
    huella: string;
    entregado: boolean;
    resultado: ResultadoProduccion;
  };
  const props: PropsVideo = esquemaPropsVideo.parse(
    JSON.parse(await readFile(path.join(carpetaTrabajo, "props.json"), "utf8")),
  );
  const plantilla = props.tema === "documental" ? "MiniDocumental" : "TechExplainer";
  const datosCierre = props.cierre;
  props.ventana = null;
  props.cierre = null;

  console.log(`Trabajo ${numero}: empaquetando…`);
  const serveUrl = await empaquetar(carpetaPublica);
  const r = guardado.resultado;
  if (r.rutaMiniatura) {
    if (!soloShorts) await renderizarMiniatura(props, serveUrl, r.rutaMiniatura);
    const png = await readFile(r.rutaMiniatura);
    props.cierre = {
      canalNombre: datosCierre?.canalNombre ?? props.marca?.nombre ?? "",
      canalUsuario: datosCierre?.canalUsuario ?? props.marca?.usuario ?? "",
      miniatura: `data:image/png;base64,${png.toString("base64")}`,
    };
    console.log("  miniatura lista");
  } else {
    props.cierre = datosCierre;
  }

  if (!soloShorts) {
    await apartar(r.rutaMp4);
    let ultimo = -10;
    const largo = await conUnReintento("el video largo", () =>
      renderizar(
        plantilla,
        props,
        carpetaPublica,
        r.rutaMp4,
        (p) => {
          const pct = Math.round(p * 100);
          if (pct >= ultimo + 10) {
            ultimo = pct;
            console.log(`  video largo ${pct}%`);
          }
        },
        serveUrl,
      ),
    );
    r.duracionSeg = largo.duracionSeg;
  }
  r.bytes = (await stat(r.rutaMp4)).size;

  // Los Shorts son los mismos trozos de antes (mismas escenas), con la imagen corregida.
  for (const s of r.shorts) {
    const primera = props.escenas[s.escenaInicio];
    const ultima = props.escenas[s.escenaFin];
    if (!primera || !ultima) throw new Error(`El short ${s.indice} apunta a escenas que ya no existen.`);
    if (soloShorts && !soloShorts.has(s.indice)) {
      s.bytes = (await stat(s.ruta)).size;
      continue;
    }
    await apartar(s.ruta);
    const ventana = {
      inicioMs: primera.inicioMs,
      finMs: ultima.finMs,
      titulo: s.titulo,
      indice: s.indice,
      total: r.shorts.length,
    };
    const rs = await conUnReintento(`el short ${s.indice}`, () =>
      renderizar("TechExplainerShort", { ...props, ventana }, carpetaPublica, s.ruta, () => {}, serveUrl),
    );
    s.bytes = rs.bytes;
    s.duracionSeg = rs.duracionSeg;
    console.log(`  short ${s.indice} de ${r.shorts.length} listo`);
  }

  await writeFile(rutaResultado, JSON.stringify({ ...guardado, entregado: false, resultado: r }, null, 1));
  console.log(`Listo. «Reintentar» en el panel sube esta versión (trabajo ${numero}).`);
}

principal().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
