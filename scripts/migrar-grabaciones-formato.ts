// Migración de una sola vez (5 oct 2026): la tabla `grabaciones` nació con un CHECK que solo
// dejaba tres formatos, y SQLite no permite cambiar un CHECK. Los formatos van a seguir
// creciendo, así que el formato pasa a validarse en el código (zod), no en la tabla.
// Arma la tabla nueva, copia las filas y cambia los nombres. NO borra nada: la tabla vieja
// queda como `grabaciones_v1`. Se puede correr dos veces: si ya está hecha, no hace nada.
// Uso (desde la raíz): estacion/node_modules/.bin/tsx scripts/migrar-grabaciones-formato.ts
import { db } from "./base-remota";

const TABLA_NUEVA = `CREATE TABLE grabaciones_n (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tema TEXT NOT NULL DEFAULT '',
  formato TEXT NOT NULL DEFAULT 'neon',
  canal TEXT NOT NULL DEFAULT 'canal-ia' CHECK (canal IN ('canal-ia','caprichoso-tv')),
  archivo TEXT NOT NULL DEFAULT '',
  clave TEXT NOT NULL,
  bytes INTEGER NOT NULL DEFAULT 0,
  estado TEXT NOT NULL DEFAULT 'subiendo' CHECK (estado IN ('subiendo','subida','tomada','planeada','error','quitada')),
  paso TEXT NOT NULL DEFAULT '',
  error TEXT NOT NULL DEFAULT '',
  guion_id INTEGER REFERENCES guiones(id),
  creado_en TEXT NOT NULL DEFAULT (datetime('now')),
  actualizado_en TEXT NOT NULL DEFAULT (datetime('now'))
)`;

async function principal() {
  const actual = await db.uno<{ sql: string }>(
    "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'grabaciones'",
  );
  if (!actual) throw new Error("No existe la tabla grabaciones: publica el panel primero.");
  if (!/formato\s+IN/i.test(actual.sql)) {
    console.log("La tabla ya no limita el formato: no hay nada que migrar.");
    return;
  }
  const enCurso = await db.uno<{ n: number }>(
    "SELECT COUNT(id) AS n FROM grabaciones WHERE estado IN ('subiendo','subida','tomada') AND actualizado_en > datetime('now', '-30 minutes')",
  );
  if (enCurso?.n) throw new Error(`Hay ${enCurso.n} grabación(es) en marcha: se migra cuando terminen.`);
  await db.ejecutar(TABLA_NUEVA);
  await db.ejecutar("INSERT INTO grabaciones_n SELECT * FROM grabaciones");
  await db.ejecutar("CREATE INDEX IF NOT EXISTS grabaciones_por_estado ON grabaciones_n(estado, id)");
  await db.ejecutar("ALTER TABLE grabaciones RENAME TO grabaciones_v1");
  await db.ejecutar("ALTER TABLE grabaciones_n RENAME TO grabaciones");
  // Por si algo cambió entre la copia y el cambio de nombre: la tabla nueva queda igual a la vieja.
  await db.ejecutar("INSERT OR REPLACE INTO grabaciones SELECT * FROM grabaciones_v1");
  const filas = await db.uno<{ nuevas: number; viejas: number }>(
    "SELECT (SELECT COUNT(id) FROM grabaciones) AS nuevas, (SELECT COUNT(id) FROM grabaciones_v1) AS viejas",
  );
  console.log(`Migrada. Filas: ${filas?.nuevas} en la nueva, ${filas?.viejas} en la vieja (grabaciones_v1).`);
}

principal().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
