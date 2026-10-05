// Formato PRESENTADOR (docs/PRESENTADOR.md): arma un video a partir de una
// grabación de Richard hablando. Le saca la voz, la transcribe para saber cuándo
// dice cada cosa, le quita el fondo verde (si lo hay) y lo monta encima de los
// gráficos del plan, que entran justo cuando él los nombra.
// Uso (desde estacion/):
//   npx tsx src/presentador.ts <grabacion.mp4> <plan.json> [--estilo neon|ilustrado|clasico]
//       [--canal canal-ia|caprichoso-tv] [--similitud 0.14] [--sin-croma]
// El plan es un guion (el mismo formato de siempre) cuya `narracion` es lo que él
// dijo en cada tramo, en orden, y cuyos `planos` o `diagrama` dicen qué va detrás.
// Deja el video largo y sus Shorts en out/p-<nombre>/ (no sube nada al panel).
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { CANALES } from "@compartido/canales";
import { esquemaGuion } from "@compartido/guion";
import { marcaDeCanal } from "@compartido/marcas";
import { momentosDelPresentador, tramosDeGrabacion } from "@compartido/presentador";
import { ESTILOS_VIDEO, type Canal, type EstiloVideo } from "@compartido/tematicas";
import { config } from "./config";
import { colorDeCroma, extraerVoz, medidasDeVideo, prepararVentana, quitarCroma } from "./croma";
import { producir } from "./produccion";
import { transcribir } from "./transcribir";
import { nivelar } from "./voz";

const opcion = (nombre: string): string | null => {
  const i = process.argv.indexOf(nombre);
  return i === -1 ? null : (process.argv[i + 1] ?? null);
};

async function principal() {
  const grabacion = process.argv[2];
  const archivoPlan = process.argv[3];
  if (!grabacion || !archivoPlan || grabacion.startsWith("--") || archivoPlan.startsWith("--"))
    throw new Error(
      "Uso: npx tsx src/presentador.ts <grabacion.mp4> <plan.json> [--estilo neon|ilustrado|clasico]",
    );
  const estilo: EstiloVideo = ESTILOS_VIDEO.find((x) => x === opcion("--estilo")) ?? "clasico";
  const canal: Canal = opcion("--canal") === "caprichoso-tv" ? "caprichoso-tv" : "canal-ia";
  const clave = `p-${path.basename(grabacion, path.extname(grabacion)).replace(/[^a-zA-Z0-9_-]+/g, "-")}`;
  const carpetaTrabajo = path.join(config.CARPETA_SALIDA, clave);
  const carpetaPublica = path.join(config.CARPETA_PUBLICA, clave);
  await mkdir(carpetaTrabajo, { recursive: true });
  await mkdir(carpetaPublica, { recursive: true });
  const entrada = path.resolve(grabacion);
  const paso = (texto: string) => console.log(`  ${texto}`);

  const medidas = await medidasDeVideo(entrada);
  paso(`grabación: ${medidas.ancho}×${medidas.alto}, ${Math.round(medidas.duracionSeg)} s`);

  // 1) Su voz: se saca, se empareja de volumen y se transcribe (sin tocarle el ritmo: la imagen
  //    tiene que seguir calzando con la boca).
  const rutaVoz = path.join(carpetaTrabajo, "voz-grabada.mp3");
  await extraerVoz(entrada, rutaVoz);
  await nivelar(rutaVoz);
  const t = await transcribir(rutaVoz, medidas.duracionSeg);
  paso(
    `transcripción: ${t.palabras.length} palabras${t.costoUsd ? ` ($${t.costoUsd.toFixed(3)})` : " (ya estaba guardada)"}`,
  );

  // 2) El plan: en qué momento de la grabación empieza cada escena.
  const guion = esquemaGuion.parse(JSON.parse(await readFile(path.resolve(archivoPlan), "utf8")));
  const duracionMs = Math.round(medidas.duracionSeg * 1000);
  const tramos = tramosDeGrabacion(
    guion.escenas.map((e) => e.narracion),
    t.palabras,
    duracionMs,
  );

  // 3) Su imagen: sin fondo si se grabó con croma; si no, en una ventana.
  const color = process.argv.includes("--sin-croma")
    ? null
    : await colorDeCroma(entrada, medidas.duracionSeg);
  let video: { ruta: string; ancho: number; alto: number; transparente: boolean };
  if (color) {
    paso(`fondo de croma detectado (${color}): quitándolo…`);
    const similitud = Number(opcion("--similitud")) || undefined;
    const r = await quitarCroma(entrada, path.join(carpetaPublica, "presentador.webm"), color, { similitud });
    video = { ruta: "presentador.webm", ...r, transparente: true };
  } else {
    paso("sin fondo de croma: la grabación va en una ventana");
    const r = await prepararVentana(entrada, path.join(carpetaPublica, "presentador.mp4"));
    video = { ruta: "presentador.mp4", ...r, transparente: false };
  }
  const momentos = momentosDelPresentador(
    guion.escenas.map((e, i) => ({
      parte: e.parte,
      inicioMs: tramos[i]?.inicioMs ?? 0,
      finMs: tramos[i]?.finMs ?? duracionMs,
    })),
  );
  paso(
    `presentador: ${momentos.filter((m) => m.modo === "completo").length} veces en grande, el resto en la esquina`,
  );

  // 4) Lo demás es la producción de siempre, con su voz y su imagen en vez de la voz generada.
  const r = await producir(
    clave,
    guion,
    null,
    async (texto, progreso) => {
      console.log(`${String(progreso).padStart(3)}% ${texto}`);
    },
    canal === "caprichoso-tv" ? "MiniDocumental" : "TechExplainer",
    async () => {},
    CANALES[canal].porDefecto,
    marcaDeCanal(canal),
    estilo,
    {
      voz: {
        rutaMp3: rutaVoz,
        palabras: t.palabras,
        tramos,
        duracionMs,
        vozDePrueba: false,
        costoUsd: t.costoUsd,
      },
      presentador: { ...video, momentos },
    },
  );
  console.log(
    `\nVideo: ${r.rutaMp4}\n${(r.bytes / 1_048_576).toFixed(1)} MB · ${r.duracionSeg.toFixed(1)} s`,
  );
  for (const s of r.shorts) console.log(`Short ${s.indice}: ${s.ruta}`);
}

principal().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
