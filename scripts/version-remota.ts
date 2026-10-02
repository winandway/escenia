// Lo mismo que el botón «Crear versión nueva» del panel, desde la Mac: copia un
// guion ya aprobado a un borrador nuevo para corregirlo y volver a producirlo.
// Uso (desde la raíz): estacion/node_modules/.bin/tsx scripts/version-remota.ts 6
import { crearVersionNueva } from "@/lib/versiones";
import { db } from "./base-remota";

async function principal() {
  const id = Number(process.argv[2]);
  if (!Number.isInteger(id) || id <= 0) throw new Error("Uso: version-remota.ts <número del guion>");
  const r = await crearVersionNueva(db, id);
  if (!r.ok) throw new Error(r.error);
  console.log(`Versión nueva del guion ${id}: guion ${r.guionId} (borrador).`);
}

principal().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
