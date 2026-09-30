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

// Agencias que venden fotos: en internet solo muestran la versión con su marca
// de agua encima. Una foto así se ve mal en el video y no se usa (C-IMAGEN-4).
const AGENCIAS = [
  "gettyimages",
  "istockphoto",
  "shutterstock",
  "alamy",
  "dreamstime",
  "depositphotos",
  "123rf",
  "agefotostock",
  "imago-images",
  "wireimage",
  "zumapress",
  "stock.adobe",
  "bigstockphoto",
  "pond5",
];

/** ¿Esa dirección es de una agencia que pone marca de agua? */
export function esDeAgencia(direccion: string): boolean {
  const d = direccion.toLowerCase();
  return AGENCIAS.some((a) => d.includes(a));
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
        !esDeAgencia(i.imageUrl) &&
        !esDeAgencia(i.link ?? "") &&
        !esDeAgencia(i.source ?? "") &&
        (typeof i.imageWidth !== "number" || i.imageWidth >= 500),
    )
    .map((i) => ({ url: i.imageUrl, origen: i.link ?? i.source ?? i.imageUrl }));
}

/**
 * Si lo que se bajó es una imagen de verdad. Muchos sitios (TikTok, Pinterest,
 * tiendas) devuelven una página HTML en vez de la foto cuando no eres un
 * navegador; a esas se les pide el tipo de contenido y los primeros bytes.
 */
export function esImagen(tipoContenido: string | null, primerosBytes: Uint8Array): boolean {
  if (tipoContenido && /^image\//i.test(tipoContenido.trim())) return true;
  const b = primerosBytes;
  if (b.length < 12) return false;
  const jpeg = b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
  const png = b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47;
  const webp =
    b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45;
  const gif = b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46;
  return jpeg || png || webp || gif;
}

/**
 * La mejor candidata.
 * - Foto de una PERSONA: tiene cara, buen tamaño (≥ 600 px de ancho) y la cara
 *   grande manda sobre la resolución. Sin cara no sirve (sería una portada, un
 *   logo o un lugar).
 * - Foto de un LUGAR, un objeto o un evento (`exigirCara = false`): se prefiere
 *   la que NO tiene una cara en primer plano, para no meter en el video a una
 *   persona que no tiene que ver con la historia; entre esas, la más grande.
 */
export function elegirCandidata(
  candidatas: CandidataWeb[],
  minAncho = 600,
  exigirCara = true,
): CandidataWeb | null {
  const grandes = candidatas.filter((c) => c.ancho >= minAncho);
  if (!exigirCara) {
    const tamano = (c: CandidataWeb) => c.ancho * c.alto;
    const sinPrimerPlano = grandes.filter((c) => c.cara === null || c.cara < 0.02);
    const orden = (lista: CandidataWeb[]) => [...lista].sort((a, b) => tamano(b) - tamano(a))[0] ?? null;
    return orden(sinPrimerPlano) ?? orden(grandes);
  }
  const validas = grandes.filter((c) => c.cara !== null && c.cara > 0.004);
  if (validas.length === 0) return null;
  const puntaje = (c: CandidataWeb) => (c.cara ?? 0) * 1000 + Math.min(2, (c.ancho * c.alto) / 1_500_000);
  return [...validas].sort((a, b) => puntaje(b) - puntaje(a))[0] ?? null;
}

/**
 * Con qué se busca la foto de una escena: lo que pide el guion y, SOLO en una
 * biografía de persona, el nombre que abre el título como reserva («Celia
 * Cruz: …»). En un video de tecnología el título no empieza por una persona
 * («GPT-6.1 Astra: …» daría «GPT»): sin reserva, y si no hay foto la escena
 * cae en un clip en vez de mostrar a cualquiera (C-IMAGEN-5).
 */
export function busquedasDeFoto(
  busqueda: string,
  titulo: string,
  opciones: { documental: boolean; deLugar: boolean },
): string[] {
  const propia = busqueda.trim();
  const nombre = (titulo.split(/[:—-]/)[0] ?? "").trim();
  const reserva = opciones.documental && !opciones.deLugar && nombre ? [nombre] : [];
  return [propia, ...reserva].filter(Boolean);
}
