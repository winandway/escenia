// Fotos reales del artista tomadas de internet (Google Imágenes por API).
// Decisión de negocio de Richard (28 sep 2026): para contar la historia se usan
// fotos públicas de la persona; se genera con IA solo lo que no existe en foto.
// Aquí viven las partes puras (armar la consulta y elegir la mejor foto).
export type CandidataWeb = {
  url: string;
  ancho: number;
  alto: number;
  origen: string;
  /** Área de la cara más grande (fracción 0-1), o null si no se detectó cara. */
  cara: number | null;
};

/** Consulta para Google Imágenes: la persona más la época («Luis Miguel 1987») o su infancia. */
export function consultaWeb(persona: string, anio: number | null, infancia = false): string {
  const base = persona.trim();
  if (infancia) return `${base} niño`;
  return anio ? `${base} ${anio}` : base;
}

/**
 * La mejor candidata: tiene cara, buen tamaño (≥ 600 px de ancho) y la cara
 * grande manda sobre la resolución. Sin cara no sirve (sería una portada,
 * un logo o un lugar).
 */
export function elegirCandidata(candidatas: CandidataWeb[], minAncho = 600): CandidataWeb | null {
  const validas = candidatas.filter((c) => c.cara !== null && c.cara > 0.004 && c.ancho >= minAncho);
  if (validas.length === 0) return null;
  const puntaje = (c: CandidataWeb) => (c.cara ?? 0) * 1000 + Math.min(2, (c.ancho * c.alto) / 1_500_000);
  return [...validas].sort((a, b) => puntaje(b) - puntaje(a))[0] ?? null;
}
