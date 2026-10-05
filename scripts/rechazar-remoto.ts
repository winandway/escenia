// Lo mismo que «Rechazar guion» en el panel, desde la Mac: saca un BORRADOR de la
// lista de pendientes (no lo borra: queda como rechazado). No toca guiones aprobados.
// Uso (desde la raíz): estacion/node_modules/.bin/tsx scripts/rechazar-remoto.ts 9
import { db } from "./base-remota";

async function principal() {
  const id = Number(process.argv[2]);
  if (!Number.isInteger(id) || id <= 0) throw new Error("Uso: rechazar-remoto.ts <número del guion>");
  const r = await db.ejecutar(
    `UPDATE guiones SET estado = 'rechazado', actualizado_en = datetime('now') WHERE id = ? AND estado = 'borrador'`,
    [id],
  );
  console.log(r.cambios ? `Guion ${id}: rechazado.` : `Guion ${id}: no era un borrador; no se tocó.`);
}

principal().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
