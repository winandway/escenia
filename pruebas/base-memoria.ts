// SQLite en memoria (node:sqlite, Node 22.5+) con el MISMO esquema de producción.
// Así las pruebas ejercen el SQL real sin tocar ninguna base remota.
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import path from "node:path";
import type { BaseDatos, Valor } from "@/lib/db";

export function baseEnMemoria(): BaseDatos & { cruda: DatabaseSync } {
  const db = new DatabaseSync(":memory:");
  db.exec(readFileSync(path.resolve(__dirname, "../schema.sql"), "utf8"));
  return {
    cruda: db,
    async todos<T>(sql: string, params: Valor[] = []) {
      return db.prepare(sql).all(...params) as T[];
    },
    async uno<T>(sql: string, params: Valor[] = []) {
      return (db.prepare(sql).get(...params) as T | undefined) ?? null;
    },
    async ejecutar(sql: string, params: Valor[] = []) {
      const r = db.prepare(sql).run(...params);
      return {
        cambios: Number(r.changes),
        ultimoId: r.lastInsertRowid === undefined ? null : Number(r.lastInsertRowid),
      };
    },
  };
}
