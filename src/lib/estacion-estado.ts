// La Estación se considera viva si dio señal en los últimos 2 minutos.
import type { BaseDatos } from "./db";

export const LATIDO_MAX_MS = 2 * 60_000;

/**
 * Deja constancia de que la Estación acaba de hablar con el panel. Lo llaman
 * TODAS las rutas de la Estación (pedir trabajo, avisar avance, subir archivos),
 * no solo la de pedir trabajo: mientras arma un video largo no pide trabajo y,
 * si solo contara eso, el panel la daría por apagada (candado C-LATIDO-1).
 */
export async function tocarLatido(db: BaseDatos, version = ""): Promise<void> {
  await db.ejecutar(
    `INSERT INTO estacion_latido (id, visto_en, version) VALUES (1, datetime('now'), ?)
     ON CONFLICT(id) DO UPDATE SET
       visto_en = excluded.visto_en,
       version = CASE WHEN excluded.version = '' THEN estacion_latido.version ELSE excluded.version END`,
    [version],
  );
}

export function estacionViva(latido: { visto_en: string } | null, ahoraMs = Date.now()): boolean {
  if (!latido) return false;
  // SQLite guarda 'YYYY-MM-DD HH:MM:SS' en UTC, sin zona: se le agrega la Z.
  const visto = Date.parse(latido.visto_en.replace(" ", "T") + "Z");
  return Number.isFinite(visto) && ahoraMs - visto < LATIDO_MAX_MS;
}
