// Lo mismo que el botón «Reintentar» del panel, desde la Mac: cancela el
// trabajo que esté a medias y pone uno nuevo en la cola. Si la Estación ya
// tiene ese video armado y sin entregar (por ejemplo tras `rearmar.ts`), no lo
// produce otra vez: retoma la entrega (C-ENTREGA-1).
// Uso (desde la raíz): estacion/node_modules/.bin/tsx scripts/reintentar-remoto.ts 7
import { db } from "./base-remota";

async function principal() {
  const id = Number(process.argv[2]);
  if (!Number.isInteger(id) || id <= 0) throw new Error("Uso: reintentar-remoto.ts <número del guion>");
  const guion = await db.uno<{ estado: string }>("SELECT estado FROM guiones WHERE id = ?", [id]);
  if (!guion) throw new Error(`El guion ${id} no existe.`);
  if (guion.estado !== "aprobado")
    throw new Error(`El guion ${id} no está aprobado: no hay nada que reintentar.`);
  await db.ejecutar(
    "UPDATE trabajos SET estado = 'cancelado' WHERE guion_id = ? AND estado IN ('pendiente','tomado','error')",
    [id],
  );
  await db.ejecutar("INSERT INTO trabajos (guion_id, tipo) VALUES (?, 'producir')", [id]);
  console.log(`Guion ${id}: trabajo nuevo en la cola.`);
}

principal().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
