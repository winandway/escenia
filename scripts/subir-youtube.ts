// Fase 3 (C-YOUTUBE-1, docs/YOUTUBE.md): sube UNA pieza de un guion aprobado a YouTube, EN PRIVADO,
// con sus textos del panel, la marca de contenido sintético, la miniatura y los enlaces con UTM.
// Richard la hace pública o la programa en YouTube Studio. Anota el enlace en su ficha del calendario.
//
// Uso (desde la raíz):
//   estacion/node_modules/.bin/tsx scripts/subir-youtube.ts --guion 20 --pieza largo --prueba
//   estacion/node_modules/.bin/tsx scripts/subir-youtube.ts --guion 20 --pieza short-2
// Con --prueba solo muestra lo que se mandaría (no hace falta la llave de YouTube).
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { clavePieza } from "@compartido/portada";
import { esquemaGuion } from "@compartido/guion";
import { buscarTematica } from "@compartido/tematicas";
import {
  leerLlave,
  leerPieza,
  metadatosDeSubida,
  piezaParaSubir,
  ponerMiniatura,
  subirVideo,
  tokenDeAcceso,
} from "../estacion/src/youtube";
import { db } from "./base-remota";

async function principal() {
  const opcion = (nombre: string) => {
    const i = process.argv.indexOf(nombre);
    return i === -1 ? null : (process.argv[i + 1] ?? null);
  };
  const guionId = Number(opcion("--guion"));
  if (!Number.isInteger(guionId) || guionId <= 0) throw new Error("Falta --guion <número>.");
  const pieza = leerPieza(opcion("--pieza") ?? "largo");
  const prueba = process.argv.includes("--prueba");
  const REGISTRO = path.resolve("estacion/cache/youtube-subidos.json");

  const fila = await db.uno<{ contenido: string; estado: string; tematica_id: string }>(
    "SELECT contenido, estado, tematica_id FROM guiones WHERE id = ?",
    [guionId],
  );
  if (!fila) throw new Error(`No existe el guion ${guionId}.`);
  if (fila.estado !== "aprobado") throw new Error("Ese guion no está aprobado: no se sube nada.");
  const guion = esquemaGuion.parse(JSON.parse(fila.contenido));
  if (!guion.publicacion) throw new Error("El panel todavía no escribió los textos de YouTube de ese guion.");

  const datos = piezaParaSubir({
    guionId,
    tematicaId: fila.tematica_id,
    canal: buscarTematica(fila.tematica_id)?.canal ?? null,
    publicacion: guion.publicacion,
    pieza,
  });

  // El MP4 está en la Mac: el último que se entregó de este guion.
  const renders = await db.todos<{ ruta_local: string; formato: string }>(
    "SELECT ruta_local, formato FROM renders WHERE guion_id = ? ORDER BY id DESC LIMIT 20",
    [guionId],
  );
  const carpeta = renders[0] ? path.dirname(renders[0].ruta_local) : "";
  const video =
    pieza.tipo === "largo"
      ? renders.find((r) => r.formato === "16x9" && path.dirname(r.ruta_local) === carpeta)?.ruta_local
      : path.join(carpeta, `short-${pieza.indice}.mp4`);
  if (!video || !existsSync(video)) throw new Error(`No está el video en la Mac (${video ?? "sin render"}).`);
  const portada = path.join(carpeta, `portada-${clavePieza(pieza.tipo, pieza.indice)}.png`);
  const miniatura = existsSync(portada) ? portada : null;

  const clave = `g${guionId}:${clavePieza(pieza.tipo, pieza.indice)}`;
  const registro = existsSync(REGISTRO)
    ? (JSON.parse(await readFile(REGISTRO, "utf8")) as Record<string, string>)
    : {};
  if (registro[clave] && !process.argv.includes("--otra-vez"))
    throw new Error(
      `Esa pieza ya se subió (https://youtu.be/${registro[clave]}). Para subirla de nuevo: --otra-vez.`,
    );

  console.log(`Video: ${video}\nMiniatura: ${miniatura ?? "(sin miniatura)"}`);
  if (prueba) {
    console.log(JSON.stringify(metadatosDeSubida(datos), null, 2));
    console.log("Prueba: no se subió nada.");
    return;
  }

  const token = await tokenDeAcceso(await leerLlave());
  console.log("Subiendo a YouTube en privado…");
  const id = await subirVideo(token, video, datos);
  console.log(`Subido: https://youtu.be/${id} (privado)`);
  if (miniatura)
    await ponerMiniatura(token, id, miniatura).catch((e) =>
      console.warn(
        `  (la miniatura no entró: ${e instanceof Error ? e.message : e}. Los Shorts no admiten miniatura por la API.)`,
      ),
    );
  registro[clave] = id;
  await mkdir(path.dirname(REGISTRO), { recursive: true });
  await writeFile(REGISTRO, JSON.stringify(registro, null, 1));
  // Una escritura: el enlace en su ficha del calendario, si la tiene (de ahí sale la miniatura en el panel).
  const r = await db.ejecutar(
    `UPDATE calendario SET enlace = ?, actualizado_en = datetime('now')
     WHERE guion_id = ? AND pieza = ? AND indice = ? AND plataforma = 'youtube' AND enlace = ''`,
    [`https://youtu.be/${id}`, guionId, pieza.tipo, pieza.indice],
  );
  console.log(
    r.cambios
      ? "Enlace anotado en el calendario."
      : "No había ficha en el calendario para esa pieza: el enlace queda en estacion/cache/youtube-subidos.json.",
  );
}

principal().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
