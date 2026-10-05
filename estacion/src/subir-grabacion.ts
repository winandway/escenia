// Sube a «Grabaciones» del panel un video que ya está en la Mac (lo mismo que hace Richard
// desde el navegador). Desde ahí la Estación lo toma sola y arma el video.
// Uso (desde estacion/):
//   npx tsx src/subir-grabacion.ts <video.mp4> --tema "de qué habla" [--formato neon|ilustrado|clasico]
//       [--canal canal-ia|caprichoso-tv]
import path from "node:path";
import { esquemaGrabacionNueva } from "@compartido/grabaciones";
import { ESTILOS_VIDEO, type Canal, type EstiloVideo } from "@compartido/tematicas";
import { panel } from "./panel";

const opcion = (nombre: string): string | null => {
  const i = process.argv.indexOf(nombre);
  return i === -1 ? null : (process.argv[i + 1] ?? null);
};

async function principal() {
  const video = process.argv[2];
  const tema = opcion("--tema");
  if (!video || video.startsWith("--") || !tema)
    throw new Error('Uso: npx tsx src/subir-grabacion.ts <video.mp4> --tema "de qué habla" [--formato neon]');
  const formato: EstiloVideo = ESTILOS_VIDEO.find((x) => x === opcion("--formato")) ?? "neon";
  const canal: Canal = opcion("--canal") === "caprichoso-tv" ? "caprichoso-tv" : "canal-ia";
  const ruta = path.resolve(video);
  // Las mismas reglas del formulario del panel, antes de mandar nada.
  const datos = esquemaGrabacionNueva.pick({ tema: true, formato: true, canal: true }).parse({
    tema,
    formato,
    canal,
  });
  let ultimo = -20;
  const r = await panel.subirGrabacion(ruta, datos, (pct) => {
    if (pct >= ultimo + 20) {
      ultimo = pct;
      console.log(`  subiendo ${pct}%`);
    }
  });
  console.log(
    `Grabación #${r.id} subida (${(r.bytes / 1_048_576).toFixed(1)} MB). La Estación la toma sola.`,
  );
}

principal().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
