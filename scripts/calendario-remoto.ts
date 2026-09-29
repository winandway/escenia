// Carga publicaciones en el calendario EN VIVO desde la Mac, pasando por la
// misma puerta que el panel (`agendar`): las reglas y los avisos son los mismos.
// El token de la base sale de estacion/.env.
// Uso (desde la raíz): estacion/node_modules/.bin/tsx scripts/calendario-remoto.ts < plan.json
import { readFileSync } from "node:fs";
import { agendar, agendarEnProximoHueco, descartar, pendientes } from "@/lib/calendario";
import type { BaseDatos, Valor } from "@/lib/db";
import { cuando } from "@compartido/calendario";

// Se corre desde la raíz del proyecto; el plan entra por la entrada estándar.
const entorno = Object.fromEntries(
  readFileSync("estacion/.env", "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
);
const token = entorno.YAPANEL_DB_TOKEN;
if (!token) throw new Error("Falta YAPANEL_DB_TOKEN en estacion/.env");

async function consulta(sql: string, params: Valor[] = []) {
  const r = await fetch("https://yapanel.yadominios.com/api/hosting/db/query", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ sitio: "escenia", token, sql, params }),
  });
  const datos = (await r.json()) as {
    results?: unknown[];
    error?: string;
    lastRowId?: number;
    rowsWritten?: number;
  };
  if (!r.ok || datos.error) throw new Error(datos.error ?? `La base respondió ${r.status}`);
  return datos;
}

const db: BaseDatos = {
  async todos<T>(sql: string, params: Valor[] = []) {
    return ((await consulta(sql, params)).results ?? []) as T[];
  },
  async uno<T>(sql: string, params: Valor[] = []) {
    return (((await consulta(sql, params)).results ?? [])[0] as T | undefined) ?? null;
  },
  async ejecutar(sql: string, params: Valor[] = []) {
    const insertar = /^\s*INSERT/i.test(sql) && !/RETURNING/i.test(sql);
    const d = await consulta(insertar ? `${sql.trim().replace(/;$/, "")} RETURNING id` : sql, params);
    const fila = (d.results ?? [])[0] as { id?: number } | undefined;
    return { cambios: d.rowsWritten ?? 0, ultimoId: fila?.id ?? null };
  },
};

type Paso =
  | { hacer: "agendar"; datos: Record<string, unknown> }
  | { hacer: "quitar-de-la-lista"; datos: Record<string, unknown> }
  | {
      hacer: "proximo-hueco";
      guion_id: number;
      pieza: "largo" | "short";
      indice: number;
      plataforma: "youtube";
    };

async function principal() {
  const plan = JSON.parse(readFileSync(0, "utf8")) as Paso[];
  const ahora = new Date();
  let fallos = 0;
  for (const paso of plan) {
    if (paso.hacer === "agendar") {
      const r = await agendar(db, paso.datos, ahora);
      console.log(
        r.ok
          ? `ok  ${cuando(r.fecha, r.hora)} · ${String(paso.datos.titulo)}`
          : `MAL ${String(paso.datos.titulo)}: ${r.error}`,
      );
      if (!r.ok) fallos += 1;
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
      console.log(
        r.ok ? `ok  ${cuando(r.fecha, r.hora)} · ${pieza.titulo}` : `MAL ${pieza.titulo}: ${r.error}`,
      );
      if (!r.ok) fallos += 1;
    }
  }
  if (fallos) process.exit(1);
}

principal().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
