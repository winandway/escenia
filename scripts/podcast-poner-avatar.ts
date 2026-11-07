// Le pone un avatar del catálogo a UNA ficha del Podcast IA en la base EN VIVO, buscándola por su nombre exacto.
// Cambia solo la columna `avatar` (ni la voz, ni la historia, ni la fecha): ponerAvatarALaFicha en
// src/lib/podcast.ts. Se usó el 7 nov 2026 para dejar a «Mia IA» con su avatar, Mia.
// Correrlo DESPUÉS de publicar el panel que ya conoce ese avatar (si no, el panel viejo lo vería como el robot
// de siempre).
// Uso (desde la raíz): estacion/node_modules/.bin/tsx scripts/podcast-poner-avatar.ts "Mia IA" mia
import { db } from "./base-remota";
import { ponerAvatarALaFicha } from "@/lib/podcast";

async function principal() {
  const [nombre, avatar] = process.argv.slice(2);
  if (!nombre || !avatar) throw new Error('Uso: podcast-poner-avatar.ts "<nombre de la ficha>" <avatar>');
  const { id, antes } = await ponerAvatarALaFicha(db, nombre, avatar);
  const ahora = await db.uno<{ nombre: string; avatar: string; voz: string; tipo: string }>(
    "SELECT nombre, avatar, voz, tipo FROM podcast_fichas WHERE id = ?",
    [id],
  );
  console.log(
    `Ficha ${id} «${ahora?.nombre}»: avatar ${antes} → ${ahora?.avatar} (voz ${ahora?.voz}, ${ahora?.tipo}).`,
  );
}

principal().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
