// Corrige un guion EN BORRADOR desde la Mac, pasando por el mismo esquema del
// panel: si el resultado no es un guion válido, no se guarda nada.
// Uso (desde la raíz): estacion/node_modules/.bin/tsx scripts/guion-remoto.ts < cambios.json
// cambios.json: { "id": 6, "titulo"?: "...", "gancho"?: "...",
//                 "escenas"?: { "3": { "narracion"?: "...", "visual"?: { ... } } } }
import { readFileSync } from "node:fs";
import { z } from "zod";
import { esquemaGuion, esquemaVisual } from "@compartido/guion";
import { db } from "./base-remota";

const esquemaCambios = z.object({
  id: z.number().int().positive(),
  titulo: z.string().trim().min(5).max(100).optional(),
  gancho: z.string().trim().min(5).max(300).optional(),
  escenas: z
    .record(
      z.string().regex(/^\d+$/),
      z.object({ narracion: z.string().optional(), visual: esquemaVisual.optional() }),
    )
    .default({}),
});

async function principal() {
  const cambios = esquemaCambios.parse(JSON.parse(readFileSync(0, "utf8")));
  const fila = await db.uno<{ estado: string; contenido: string }>(
    "SELECT estado, contenido FROM guiones WHERE id = ?",
    [cambios.id],
  );
  if (!fila) throw new Error(`El guion ${cambios.id} no existe.`);
  if (fila.estado === "aprobado")
    throw new Error("Ese guion ya está aprobado y en producción: no se toca desde aquí.");
  const actual = esquemaGuion.parse(JSON.parse(fila.contenido));
  const escenas = actual.escenas.map((escena, i) => {
    const c = cambios.escenas[String(i + 1)];
    if (!c) return escena;
    return { ...escena, narracion: c.narracion ?? escena.narracion, visual: c.visual ?? escena.visual };
  });
  for (const n of Object.keys(cambios.escenas))
    if (Number(n) < 1 || Number(n) > actual.escenas.length) throw new Error(`No existe la escena ${n}.`);
  const nuevo = esquemaGuion.parse({
    ...actual,
    titulo: cambios.titulo ?? actual.titulo,
    gancho: cambios.gancho ?? actual.gancho,
    escenas,
  });
  await db.ejecutar(
    "UPDATE guiones SET titulo = ?, contenido = ?, actualizado_en = datetime('now') WHERE id = ? AND estado != 'aprobado'",
    [nuevo.titulo, JSON.stringify(nuevo), cambios.id],
  );
  console.log(
    `Guion ${cambios.id} corregido: ${Object.keys(cambios.escenas).length} escena(s)` +
      `${cambios.titulo ? ", título" : ""}${cambios.gancho ? ", gancho" : ""}.`,
  );
}

principal().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
