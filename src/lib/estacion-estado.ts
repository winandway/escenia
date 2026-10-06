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

/**
 * Los trabajos que la Estación tomó y nunca va a terminar vuelven a la fila (C-ESTACION-2):
 * uno «tomado» hace más de 2 horas, y uno que se quedó en «tomado» sin dar ni un paso en
 * 3 minutos (la Estación se reinició justo después de tomarlo, 6 oct 2026: el trabajo 49 de
 * «De Cero a Reina» quedó colgado y el siguiente de la fila pasó por delante).
 */
export async function devolverTrabajosPerdidos(db: BaseDatos): Promise<number> {
  const r = await db.ejecutar(
    `UPDATE trabajos SET estado = 'pendiente', paso = 'reintento tras corte', tomado_en = NULL
     WHERE estado = 'tomado'
       AND (tomado_en < datetime('now', '-2 hours')
            OR (paso = 'tomado' AND tomado_en < datetime('now', '-3 minutes')))`,
  );
  return r.cambios;
}
