// Migración de las fichas del Podcast IA (7 nov 2026): las columnas `avatar` (quién sale en el estudio), `tipo` (historia o entrevista a la IA) y
// `origen` (ficción o real) en la base EN VIVO. Es la misma función que usa el panel cuando le falta una
// columna (asegurarColumnasDeLaFicha): mira cuáles faltan y agrega solo esas, con su valor por defecto (el robot
// de siempre, ficción e historia). NO borra ni cambia nada más. Se puede correr las veces que haga falta: si ya están,
// no hace nada.
// Uso (desde la raíz): estacion/node_modules/.bin/tsx scripts/migrar-podcast-fichas.ts
import { db } from "./base-remota";
import { asegurarColumnasDeLaFicha } from "@/lib/podcast";

async function principal() {
  const agregadas = await asegurarColumnasDeLaFicha(db);
  console.log(
    agregadas.length
      ? `Listo: se agregó a podcast_fichas: ${agregadas.join(", ")}.`
      : "Las fichas ya tenían avatar, origen y tipo: no había nada que migrar.",
  );
  const fichas = await db.todos<{
    id: number;
    nombre: string;
    tipo: string;
    avatar: string;
    origen: string;
    voz: string;
  }>("SELECT id, nombre, tipo, avatar, origen, voz FROM podcast_fichas ORDER BY id");
  for (const f of fichas)
    console.log(`  ficha ${f.id} · ${f.nombre} · ${f.tipo} · ${f.avatar} · ${f.origen} · voz ${f.voz}`);
}

principal().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
