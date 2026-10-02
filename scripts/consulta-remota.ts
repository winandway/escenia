// Consulta de SOLO LECTURA a la base en vivo, desde la Mac. Rechaza todo lo que
// no sea un SELECT: para escribir están las herramientas con su lógica
// (guion-remoto, aprobar-remoto, calendario-remoto).
// Uso (desde la raíz): estacion/node_modules/.bin/tsx scripts/consulta-remota.ts "SELECT id, titulo FROM guiones"
import { db } from "./base-remota";

async function principal() {
  const sql = (process.argv[2] ?? "").trim();
  if (!/^select\b/i.test(sql) || /;\s*\S/.test(sql)) throw new Error("Solo se admite un SELECT.");
  console.log(JSON.stringify(await db.todos(sql, process.argv.slice(3)), null, 1));
}

principal().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
