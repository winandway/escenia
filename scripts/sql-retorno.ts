// Las herramientas de scripts/ hablan con la base EN VIVO por HTTP, que no devuelve el id de lo insertado.
// Por eso a cada INSERT se le pide de vuelta su fila. Se pide `rowid AS id` y no `id`: hay tablas sin
// columna id (ajustes, con la clave de texto como llave), y con `RETURNING id` la consulta se caía
// («no se pudo ejecutar la consulta», 7 nov 2026, al conectar el Podcast IA).
export function sqlConRetorno(sql: string): string {
  const insertar = /^\s*INSERT/i.test(sql) && !/RETURNING/i.test(sql);
  return insertar ? `${sql.trim().replace(/;$/, "")} RETURNING rowid AS id` : sql;
}
