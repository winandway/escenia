// La Estación se considera viva si dio señal en los últimos 2 minutos.
export const LATIDO_MAX_MS = 2 * 60_000;

export function estacionViva(latido: { visto_en: string } | null, ahoraMs = Date.now()): boolean {
  if (!latido) return false;
  // SQLite guarda 'YYYY-MM-DD HH:MM:SS' en UTC, sin zona: se le agrega la Z.
  const visto = Date.parse(latido.visto_en.replace(" ", "T") + "Z");
  return Number.isFinite(visto) && ahoraMs - visto < LATIDO_MAX_MS;
}
