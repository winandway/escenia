// Recoge los clips de avatar que fal.ai terminó pero que no se bajaron (la espera se cortó o el
// proceso murió): lee pedidos-fal.jsonl de la carpeta y baja los que falten (docs/AVATAR.md).
// Uso (desde estacion/): npx tsx src/avatar-recoger.ts ../avatar/chase-montes/pruebas
import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { PEDIDOS_FAL, type PedidoFal } from "./avatar";
import { config } from "./config";

function urlDeFal(direccion: string): string {
  const u = new URL(direccion);
  if (u.protocol !== "https:" || u.hostname !== "queue.fal.run")
    throw new Error(`Dirección inesperada: ${u.hostname}`);
  return u.toString();
}

async function principal() {
  const carpeta = path.resolve(process.argv[2] ?? ".");
  const archivo = path.join(carpeta, PEDIDOS_FAL);
  if (!existsSync(archivo)) throw new Error(`No hay ${PEDIDOS_FAL} en ${carpeta}.`);
  const cabeceras = { authorization: `Key ${config.FAL_KEY}` };
  const pedidos = (await readFile(archivo, "utf8"))
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l) as PedidoFal);
  for (const p of pedidos) {
    if (existsSync(p.salida)) continue;
    const estado = (await (await fetch(urlDeFal(p.status_url), { headers: cabeceras })).json()) as {
      status: string;
    };
    if (estado.status !== "COMPLETED") {
      console.log(`  ${p.request_id}: ${estado.status} (todavía no)`);
      continue;
    }
    const r = (await (await fetch(urlDeFal(p.response_url), { headers: cabeceras })).json()) as {
      video?: { url: string };
    };
    if (!r.video?.url) {
      console.log(`  ${p.request_id}: terminó sin video (${JSON.stringify(r).slice(0, 120)})`);
      continue;
    }
    const d = await fetch(r.video.url);
    await writeFile(p.salida, Buffer.from(await d.arrayBuffer()));
    console.log(`  recogido: ${p.salida} ($${p.costoUsd.toFixed(2)})`);
  }
}

principal().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
