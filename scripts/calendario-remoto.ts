// Carga publicaciones en el calendario EN VIVO desde la Mac, pasando por la
// misma puerta que el panel (`agendar`): las reglas y los avisos son los mismos.
// El token de la base sale de estacion/.env.
// Uso (desde la raíz): estacion/node_modules/.bin/tsx scripts/calendario-remoto.ts < plan.json
import { readFileSync } from "node:fs";
import {
  agendar,
  agendarEnProximoHueco,
  descartar,
  entradasDeGuion,
  mover,
  pendientes,
  type ResultadoAgendar,
} from "@/lib/calendario";
import { cuando } from "@compartido/calendario";
import { db } from "./base-remota";

type Paso =
  | { hacer: "agendar"; datos: Record<string, unknown> }
  | { hacer: "quitar-de-la-lista"; datos: Record<string, unknown> }
  | {
      hacer: "poner-hora";
      guion_id: number;
      pieza: "largo" | "short";
      indice: number;
      fecha: string;
      hora: string;
    }
  | {
      hacer: "proximo-hueco";
      guion_id: number;
      pieza: "largo" | "short";
      indice: number;
      plataforma: "youtube";
    };

/** Una línea por paso; si quedó pegado a otra publicación, el aviso debajo. */
function contar(r: ResultadoAgendar, titulo: string): boolean {
  if (!r.ok) {
    console.log(`MAL ${titulo}: ${r.error}`);
    return false;
  }
  console.log(`ok  ${cuando(r.fecha, r.hora)} · ${titulo}`);
  if (r.aviso) console.log(`    OJO: ${r.aviso}`);
  return true;
}

async function principal() {
  const plan = JSON.parse(readFileSync(0, "utf8")) as Paso[];
  const ahora = new Date();
  let fallos = 0;
  for (const paso of plan) {
    if (paso.hacer === "agendar") {
      if (!contar(await agendar(db, paso.datos, ahora), String(paso.datos.titulo))) fallos += 1;
    } else if (paso.hacer === "poner-hora") {
      const entrada = (await entradasDeGuion(db, paso.guion_id)).find(
        (e) => e.pieza === paso.pieza && e.indice === paso.indice && e.plataforma === "youtube",
      );
      if (!entrada) {
        console.log(`MAL guion ${paso.guion_id} ${paso.pieza} ${paso.indice}: no está en el calendario`);
        fallos += 1;
        continue;
      }
      if (!contar(await mover(db, entrada.id, paso.fecha, paso.hora, ahora), entrada.titulo)) fallos += 1;
    } else if (paso.hacer === "quitar-de-la-lista") {
      const r = await descartar(db, paso.datos);
      console.log(`${r.ok ? "ok " : "MAL"} fuera de la lista · ${String(paso.datos.titulo)}`);
      if (!r.ok) fallos += 1;
    } else {
      const pieza = (await pendientes(db, paso.plataforma)).find(
        (p) => p.guion_id === paso.guion_id && p.pieza === paso.pieza && p.indice === paso.indice,
      );
      if (!pieza) {
        console.log(`--  guion ${paso.guion_id} ${paso.pieza} ${paso.indice}: ya no está pendiente`);
        continue;
      }
      const r = await agendarEnProximoHueco(db, { ...pieza, plataforma: paso.plataforma }, ahora);
      if (!contar(r, pieza.titulo)) fallos += 1;
    }
  }
  if (fallos) process.exit(1);
}

principal().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
