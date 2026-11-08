// Fase 3 (docs/YOUTUBE.md): las cifras de los videos ya subidos (vistas, me gusta, comentarios).
// Lee los enlaces del calendario y los que subió la Mac; NO escribe en la base (regla de presupuesto
// del 5 nov 2026): el resultado queda en estacion/cache/metricas-youtube.json y en pantalla.
//
// Uso (desde la raíz): estacion/node_modules/.bin/tsx scripts/metricas-youtube.ts
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { idDeEnlace, leerLlave, metricasDe, tokenDeAcceso } from "../estacion/src/youtube";
import { db } from "./base-remota";

const SALIDA = path.resolve("estacion/cache/metricas-youtube.json");
const REGISTRO = path.resolve("estacion/cache/youtube-subidos.json");

async function principal() {
  const delCalendario = await db.todos<{ enlace: string; titulo: string }>(
    "SELECT enlace, titulo FROM calendario WHERE plataforma = 'youtube' AND enlace != '' ORDER BY id DESC LIMIT 200",
  );
  const subidos = existsSync(REGISTRO)
    ? Object.values(JSON.parse(await readFile(REGISTRO, "utf8")) as Record<string, string>)
    : [];
  const ids = [
    ...new Set([
      ...delCalendario.map((c) => idDeEnlace(c.enlace)).filter((x): x is string => !!x),
      ...subidos,
    ]),
  ];
  if (ids.length === 0) {
    console.log("No hay videos de YouTube anotados todavía.");
    return;
  }
  const token = await tokenDeAcceso(await leerLlave());
  const metricas = (await metricasDe(token, ids)).sort((a, b) => b.vistas - a.vistas);
  await mkdir(path.dirname(SALIDA), { recursive: true });
  await writeFile(SALIDA, JSON.stringify({ leido_en: new Date().toISOString(), metricas }, null, 1));
  for (const m of metricas)
    console.log(
      `${String(m.vistas).padStart(8)} vistas · ${String(m.meGusta).padStart(5)} me gusta · ${String(m.comentarios).padStart(4)} coment. · ${m.privacidad.padEnd(8)} · ${m.titulo}`,
    );
  console.log(`\n${metricas.length} videos · guardado en estacion/cache/metricas-youtube.json`);
}

principal().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
