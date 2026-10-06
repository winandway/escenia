// Saca de la lista un comercial que quedó REEMPLAZADO por otra versión del mismo pedido: el
// comercial pasa a «quitado» y su guion a «rechazado», con «[Reemplazado]» en el título. No
// borra nada (el video y el guion siguen ahí). Uso (desde la raíz):
//   estacion/node_modules/.bin/tsx scripts/retirar-comercial-remoto.ts 1
import { db } from "./base-remota";

async function principal() {
  const id = Number(process.argv[2]);
  if (!Number.isInteger(id) || id <= 0)
    throw new Error("Uso: retirar-comercial-remoto.ts <número del comercial>");
  const c = await db.uno<{ estado: string; guion_id: number | null; nombre: string }>(
    "SELECT estado, guion_id, nombre FROM comerciales WHERE id = ?",
    [id],
  );
  if (!c) throw new Error(`El comercial ${id} no existe.`);
  if (c.estado === "tomada") throw new Error("La Estación lo tiene tomado: espera a que termine.");
  await db.ejecutar(
    "UPDATE comerciales SET estado = 'quitada', actualizado_en = datetime('now') WHERE id = ?",
    [id],
  );
  if (c.guion_id)
    await db.ejecutar(
      `UPDATE guiones SET estado = 'rechazado', actualizado_en = datetime('now'),
         titulo = CASE WHEN titulo LIKE '[Reemplazado]%' THEN titulo ELSE '[Reemplazado] ' || titulo END
       WHERE id = ?`,
      [c.guion_id],
    );
  console.log(
    `Comercial ${id} («${c.nombre}»): fuera de la lista.${c.guion_id ? ` Guion ${c.guion_id}: marcado como reemplazado.` : ""}`,
  );
}

principal().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
