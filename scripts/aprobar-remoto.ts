// Aprueba un guion EN BORRADOR desde la Mac y lo manda a producir, igual que el
// botón «Aprobar» del panel: exige la opinión (C-OPINION: sin opinión no hay
// video), la mete como escena propia y crea el trabajo para la Estación.
//
// SOLO se usa cuando Richard lo ordena de forma explícita («hazlo todo, no me
// esperes»). La opinión queda guardada tal cual y en las notas del guion queda
// escrito que la aprobación se hizo por encargo, para que él la pueda revisar.
//
// Uso (desde la raíz): estacion/node_modules/.bin/tsx scripts/aprobar-remoto.ts < aprobar.json
// aprobar.json: { "id": 7, "opinion": "…(al menos 40 letras)…", "nota"?: "…" }
import { readFileSync } from "node:fs";
import { z } from "zod";
import { esquemaGuion, insertarOpinion, OPINION_MINIMA } from "@compartido/guion";
import { db } from "./base-remota";

const esquemaPedido = z.object({
  id: z.number().int().positive(),
  opinion: z
    .string()
    .trim()
    .min(OPINION_MINIMA, `La opinión necesita al menos ${OPINION_MINIMA} letras.`)
    .max(2000),
  nota: z.string().trim().max(1500).default(""),
});

async function principal() {
  const pedido = esquemaPedido.parse(JSON.parse(readFileSync(0, "utf8")));
  const fila = await db.uno<{ estado: string; contenido: string }>(
    "SELECT estado, contenido FROM guiones WHERE id = ?",
    [pedido.id],
  );
  if (!fila) throw new Error(`El guion ${pedido.id} no existe.`);
  if (fila.estado !== "borrador")
    throw new Error(`El guion ${pedido.id} está «${fila.estado}»: solo se aprueba un borrador.`);
  const contenido = esquemaGuion.parse(JSON.parse(fila.contenido));
  const conOpinion = esquemaGuion.parse({
    ...contenido,
    escenas: insertarOpinion(contenido.escenas, pedido.opinion),
  });
  const hoy = new Date().toISOString().slice(0, 10);
  const nota = `Aprobado por encargo de Richard el ${hoy} (no desde el panel).${pedido.nota ? ` ${pedido.nota}` : ""}`;
  await db.ejecutar(
    `UPDATE guiones SET contenido = ?, opinion_richard = ?, notas_richard = ?, estado = 'aprobado', actualizado_en = datetime('now')
     WHERE id = ? AND estado = 'borrador'`,
    [JSON.stringify(conOpinion), pedido.opinion, nota, pedido.id],
  );
  // Se comprueba leyendo de nuevo: el trabajo solo se crea si el guion quedó aprobado de verdad.
  const despues = await db.uno<{ estado: string }>("SELECT estado FROM guiones WHERE id = ?", [pedido.id]);
  if (despues?.estado !== "aprobado") throw new Error("El guion no quedó aprobado; no se creó el trabajo.");
  await db.ejecutar("INSERT INTO trabajos (guion_id, tipo) VALUES (?, 'producir')", [pedido.id]);
  console.log(`Guion ${pedido.id} aprobado y en cola para la Estación.`);
}

principal().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
