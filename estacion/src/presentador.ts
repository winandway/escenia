// Formato PRESENTADOR (docs/PRESENTADOR.md): arma un video a partir de una
// grabación de Richard hablando. Le saca la voz, la transcribe para saber cuándo
// dice cada cosa, le quita el fondo verde (si lo hay) y lo monta encima de los
// gráficos del plan, que entran justo cuando él los nombra.
// Uso (desde estacion/):
//   npx tsx src/presentador.ts <grabacion.mp4> [plan.json] [--estilo neon|mixto|ilustrado|clasico]
//       [--tema "de qué va"] [--solo-plan] [--canal canal-ia|caprichoso-tv] [--similitud 0.14] [--sin-croma]
// Sin plan, se lo pide a la IA del panel con la transcripción (unos centavos) y lo deja en
// out/p-<nombre>/plan.json. Con --solo-plan se detiene ahí, para leerlo o corregirlo antes de armar.
// El plan es un guion (el mismo formato de siempre) cuya `narracion` es lo que él
// dijo en cada tramo, en orden, y cuyos `planos` o `diagrama` dicen qué va detrás.
// Deja el video largo y sus Shorts en out/p-<nombre>/ (no sube nada al panel).
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { CANALES } from "@compartido/canales";
import { esquemaGuion, type Guion } from "@compartido/guion";
import { marcaDeCanal } from "@compartido/marcas";
import { ESTILOS_VIDEO, type Canal, type EstiloVideo } from "@compartido/tematicas";
import { config } from "./config";
import { montarPresentador, vozDeGrabacion } from "./grabaciones";
import { panel } from "./panel";
import { producir } from "./produccion";

const opcion = (nombre: string): string | null => {
  const i = process.argv.indexOf(nombre);
  return i === -1 ? null : (process.argv[i + 1] ?? null);
};

async function principal() {
  const grabacion = process.argv[2];
  const tercero = process.argv[3];
  const archivoPlan = tercero && !tercero.startsWith("--") ? tercero : null;
  if (!grabacion || grabacion.startsWith("--"))
    throw new Error(
      "Uso: npx tsx src/presentador.ts <grabacion.mp4> [plan.json] [--estilo neon|mixto|ilustrado|clasico]",
    );
  const estilo: EstiloVideo = ESTILOS_VIDEO.find((x) => x === opcion("--estilo")) ?? "clasico";
  const canal: Canal = opcion("--canal") === "caprichoso-tv" ? "caprichoso-tv" : "canal-ia";
  const clave = `p-${path.basename(grabacion, path.extname(grabacion)).replace(/[^a-zA-Z0-9_-]+/g, "-")}`;
  const carpetaTrabajo = path.join(config.CARPETA_SALIDA, clave);
  await mkdir(carpetaTrabajo, { recursive: true });
  const entrada = path.resolve(grabacion);
  const paso = (texto: string) => console.log(`  ${texto}`);

  // 1) Su voz: se saca, se empareja de volumen y se transcribe (sin tocarle el ritmo: la imagen
  //    tiene que seguir calzando con la boca).
  const voz = await vozDeGrabacion(entrada, carpetaTrabajo);
  const { medidas, t } = voz;
  paso(`grabación: ${medidas.ancho}×${medidas.alto}, ${Math.round(medidas.duracionSeg)} s`);
  paso(
    `transcripción: ${t.palabras.length} palabras${t.costoUsd ? ` ($${t.costoUsd.toFixed(3)})` : " (ya estaba guardada)"}`,
  );

  // 2) El plan: qué va detrás de él. Si no se trajo uno, lo arma la IA del panel con lo que dijo.
  let guion: Guion;
  if (archivoPlan) {
    guion = esquemaGuion.parse(JSON.parse(await readFile(path.resolve(archivoPlan), "utf8")));
  } else {
    paso("armando el plan con la IA del panel…");
    const r = (await panel.plan(t.texto, estilo, opcion("--tema") ?? "")) as {
      guion?: unknown;
      costo_usd?: number;
    };
    guion = esquemaGuion.parse(r.guion);
    const rutaPlan = path.join(carpetaTrabajo, "plan.json");
    await writeFile(rutaPlan, JSON.stringify(guion, null, 2));
    paso(`plan: ${guion.escenas.length} escenas ($${(r.costo_usd ?? 0).toFixed(3)}) → ${rutaPlan}`);
  }
  if (process.argv.includes("--solo-plan")) {
    console.log("Plan listo. Para armar el video con ese plan, corre lo mismo pasándole el plan.json.");
    return;
  }

  // 3) Su imagen (sin fondo si se grabó con croma; si no, en una ventana) y sus tiempos.
  const material = await montarPresentador(entrada, guion, voz, clave, paso, {
    sinCroma: process.argv.includes("--sin-croma"),
    similitud: Number(opcion("--similitud")) || undefined,
  });
  paso(
    `presentador: ${material.presentador.momentos.filter((m) => m.modo === "completo").length} veces en grande, el resto en la esquina`,
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
    material,
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
