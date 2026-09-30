// La base EN VIVO del panel, alcanzada desde la Mac por HTTP con el token de
// estacion/.env. La usan las herramientas de scripts/ que pasan por la misma
// lógica del panel (calendario, guiones). Se corre desde la raíz del proyecto.
import { readFileSync } from "node:fs";
import type { BaseDatos, Valor } from "@/lib/db";

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

export const db: BaseDatos = {
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
