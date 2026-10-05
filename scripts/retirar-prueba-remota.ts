// Saca de las listas de Richard una PRUEBA TÉCNICA que pasó por el panel en vivo: la
// grabación queda como «quitada» y su guion como «rechazado», con «[Prueba técnica]» en el
// título. No borra nada. Solo actúa si el tema de la grabación empieza por «Prueba técnica»:
// así no puede tocar una grabación de verdad.
// Uso (desde la raíz): estacion/node_modules/.bin/tsx scripts/retirar-prueba-remota.ts 1
import { db } from "./base-remota";

const MARCA = "Prueba técnica";

async function principal() {
  const id = Number(process.argv[2]);
  if (!Number.isInteger(id) || id <= 0)
    throw new Error("Uso: retirar-prueba-remota.ts <número de la grabación>");
  const g = await db.uno<{ tema: string; estado: string; guion_id: number | null }>(
    "SELECT tema, estado, guion_id FROM grabaciones WHERE id = ?",
    [id],
  );
  if (!g) throw new Error(`La grabación ${id} no existe.`);
  if (!g.tema.startsWith(MARCA))
    throw new Error(`La grabación ${id} no es una prueba técnica («${g.tema}»): no se toca.`);
  if (g.estado === "tomada") throw new Error("La Estación la tiene tomada: espera a que termine.");
  await db.ejecutar(
    "UPDATE grabaciones SET estado = 'quitada', actualizado_en = datetime('now') WHERE id = ?",
    [id],
  );
  if (g.guion_id) {
    await db.ejecutar(
      `UPDATE guiones SET estado = 'rechazado', actualizado_en = datetime('now'),
         titulo = CASE WHEN titulo LIKE '[${MARCA}]%' THEN titulo ELSE '[${MARCA}] ' || titulo END
       WHERE id = ?`,
      [g.guion_id],
    );
    await db.ejecutar(
      "UPDATE calendario SET estado = 'descartado', actualizado_en = datetime('now') WHERE guion_id = ? AND estado != 'publicado'",
      [g.guion_id],
    );
  }
  console.log(
    `Grabación ${id}: fuera de la lista.${g.guion_id ? ` Guion ${g.guion_id}: marcado como prueba técnica y rechazado.` : ""}`,
  );
}

principal().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
