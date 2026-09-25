// Sesiones del panel. El token viaja en una cookie httpOnly; en la base solo
// queda su huella, así que cerrar sesión la mata de verdad en el servidor.
import type { BaseDatos } from "./db";
import { b64url, sha256Hex } from "./clave";

export const COOKIE_SESION = "escenia_sesion";
export const DURACION_SESION_DIAS = 30;
export const MAX_INTENTOS = 5;
export const VENTANA_INTENTOS_MIN = 15;

export async function crearSesion(db: BaseDatos): Promise<{ token: string; expira: Date }> {
  const token = b64url(crypto.getRandomValues(new Uint8Array(32)));
  const expira = new Date(Date.now() + DURACION_SESION_DIAS * 86_400_000);
  await db.ejecutar("INSERT INTO sesiones (id, expira_en) VALUES (?, ?)", [
    await sha256Hex(token),
    aSqlite(expira),
  ]);
  return { token, expira };
}

export async function sesionValida(db: BaseDatos, token: string | undefined): Promise<boolean> {
  if (!token || token.length > 200) return false;
  const fila = await db.uno<{ id: string }>(
    "SELECT id FROM sesiones WHERE id = ? AND expira_en > datetime('now')",
    [await sha256Hex(token)],
  );
  return fila !== null;
}

export async function cerrarSesion(db: BaseDatos, token: string | undefined): Promise<void> {
  if (!token) return;
  await db.ejecutar("DELETE FROM sesiones WHERE id = ?", [await sha256Hex(token)]);
  await db.ejecutar("DELETE FROM sesiones WHERE expira_en <= datetime('now')");
}

/** ¿Esta IP ya gastó sus intentos? (límite contra fuerza bruta) */
export async function demasiadosIntentos(db: BaseDatos, ip: string): Promise<boolean> {
  const fila = await db.uno<{ n: number }>(
    `SELECT COUNT(*) AS n FROM intentos_entrada WHERE ip = ? AND creado_en > datetime('now', ?)`,
    [ip, `-${VENTANA_INTENTOS_MIN} minutes`],
  );
  return (fila?.n ?? 0) >= MAX_INTENTOS;
}

export async function anotarIntentoFallido(db: BaseDatos, ip: string): Promise<void> {
  await db.ejecutar("INSERT INTO intentos_entrada (ip) VALUES (?)", [ip]);
  await db.ejecutar("DELETE FROM intentos_entrada WHERE creado_en < datetime('now', '-1 day')");
}

export async function limpiarIntentos(db: BaseDatos, ip: string): Promise<void> {
  await db.ejecutar("DELETE FROM intentos_entrada WHERE ip = ?", [ip]);
}

/** SQLite guarda fechas como 'YYYY-MM-DD HH:MM:SS' en UTC. */
export function aSqlite(fecha: Date): string {
  return fecha.toISOString().slice(0, 19).replace("T", " ");
}
