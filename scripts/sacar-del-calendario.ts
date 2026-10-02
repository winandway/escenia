// Saca de «Sin fecha todavía» todas las piezas de un guion que ya no se van a
// publicar (por ejemplo, la versión vieja de un video que se rehízo). No borra
// nada: quedan en «Fuera de la lista» y se pueden devolver desde el panel.
// Uso (desde la raíz): estacion/node_modules/.bin/tsx scripts/sacar-del-calendario.ts 6
import { descartar, pendientes } from "@/lib/calendario";
import { db } from "./base-remota";

async function principal() {
  const guionId = Number(process.argv[2]);
  if (!Number.isInteger(guionId) || guionId <= 0)
    throw new Error("Uso: sacar-del-calendario.ts <número del guion>");
  const suyas = (await pendientes(db, "youtube")).filter((p) => p.guion_id === guionId);
  if (suyas.length === 0) {
    console.log(`El guion ${guionId} no tiene piezas pendientes en el calendario.`);
    return;
  }
  for (const pieza of suyas) {
    const r = await descartar(db, { ...pieza, plataforma: "youtube" });
    console.log(
      `${r.ok ? "ok " : "MAL"} fuera de la lista · ${pieza.pieza} ${pieza.indice} · ${pieza.titulo}`,
    );
  }
}

principal().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
