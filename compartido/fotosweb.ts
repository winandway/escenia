// Fotos reales del artista tomadas de internet (Google Imágenes vía Serper).
// Decisión de negocio de Richard (28 sep 2026): para contar la historia se usan
// fotos públicas de la persona; se genera con IA solo lo que no existe en foto.
// Aquí viven las partes puras (armar la consulta, leer la respuesta y elegir).
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

/** Una imagen tal como la devuelve Serper en `images[]` (solo lo que usamos). */
export type ImagenSerper = {
  imageUrl?: string;
  imageWidth?: number;
  imageHeight?: number;
  link?: string;
  source?: string;
};

/**
 * Las candidatas que valen la pena bajar de una respuesta de Serper: con URL
 * http(s) y, si Serper dice el tamaño, de al menos 500 px de ancho. El origen
 * es la página donde vive la foto (para el crédito), o la propia imagen.
 */
export function candidatasDeSerper(datos: unknown): { url: string; origen: string }[] {
  const imagenes = (datos as { images?: ImagenSerper[] } | null)?.images;
  if (!Array.isArray(imagenes)) return [];
  return imagenes
    .filter(
      (i): i is ImagenSerper & { imageUrl: string } =>
        typeof i?.imageUrl === "string" &&
        /^https?:\/\//.test(i.imageUrl) &&
        (typeof i.imageWidth !== "number" || i.imageWidth >= 500),
    )
    .map((i) => ({ url: i.imageUrl, origen: i.link ?? i.source ?? i.imageUrl }));
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
