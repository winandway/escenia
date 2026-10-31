// La parte pura de la app (sin React Native): formatos, notas para el Director y llaves del borrador.
// La prueban las pruebas de la raíz (pruebas/app-iphone-logica.test.ts) contra lo que hace el panel.
export type Idioma = "en" | "es";

/** El precio como lo dice el panel: «7 centavos», «$1.20». En inglés: «7¢», «$1.20». */
export function dinero(usd: number, idioma: Idioma): string {
  if (usd >= 1) return `$${usd.toFixed(2)}`;
  const centavos = Math.round(usd * 100);
  if (idioma === "en") {
    if (centavos <= 0) return usd > 0 ? "less than 1¢" : "0¢";
    return `${centavos}¢`;
  }
  if (centavos <= 0) return usd > 0 ? "menos de 1 centavo" : "0 centavos";
  return centavos === 1 ? "1 centavo" : `${centavos} centavos`;
}

/** Un segundo del video como se lee en la tarjeta: «1:05». */
export const reloj = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

/**
 * Lo que se le agrega al mensaje para que el Director sepa qué se subió. Es el MISMO texto que manda el
 * chat del panel (la prueba lo compara): el Director lo entiende en cualquier idioma.
 */
export function notaDeFotos(nombres: string[], carpeta: string): string {
  if (!nombres.length) return "";
  const cuales = nombres.length === 1 ? "esta foto" : `estas ${nombres.length} fotos`;
  return `(Te subí ${cuales} a la carpeta «${carpeta}»: ${nombres.join(", ")})`;
}

export function notaDeVideos(nombres: string[]): string {
  if (!nombres.length) return "";
  const cuales = nombres.length === 1 ? "este video" : `estos ${nombres.length} videos`;
  return `(Te subí ${cuales}: ${nombres.join(", ")})`;
}

/** El mensaje completo: lo escrito más las notas de lo subido. Vacío si no hay nada que mandar. */
export function mensajeConNotas(escrito: string, fotos: string[], videos: string[], carpeta: string): string {
  return [escrito.trim(), notaDeFotos(fotos, carpeta), notaDeVideos(videos)].filter(Boolean).join("\n\n");
}

/** La llave del borrador: formulario + cuenta (regla de formularios: en un teléfono prestado no se mezclan). */
export const llaveDelBorrador = (formulario: string, cuenta: string) => `borrador:${cuenta}:${formulario}`;

/** El nombre del archivo que se sube: sin rutas, sin caracteres raros, con su extensión. */
export function nombreDeArchivo(
  original: string | null | undefined,
  tipo: "foto" | "video",
  n: number,
): string {
  const limpio = (original ?? "")
    .split("/")
    .pop()
    ?.replace(/[^\p{L}\p{N}._ -]/gu, "")
    .trim();
  if (limpio && /\.[a-z0-9]{2,5}$/i.test(limpio)) return limpio.slice(-120);
  return tipo === "video" ? `video-${n}.mov` : `foto-${n}.jpg`;
}

/** La extensión que acepta el panel para una foto (PNG, JPG, WEBP); HEIC y demás se piden como JPG. */
export function extensionDeFoto(nombre: string): "png" | "jpg" | "jpeg" | "webp" | null {
  const ext = nombre.toLowerCase().split(".").pop() ?? "";
  return ext === "png" || ext === "jpg" || ext === "jpeg" || ext === "webp" ? ext : null;
}

/** Los trozos de una subida por partes: [desde, largo] de cada uno. */
export function trozos(bytes: number, tamano: number): [number, number][] {
  const lista: [number, number][] = [];
  for (let desde = 0; desde < bytes; desde += tamano) lista.push([desde, Math.min(tamano, bytes - desde)]);
  return lista;
}

/** El nombre por defecto de un proyecto («Encargo 7», como lo crea el panel), en el idioma de la app. */
export function tituloDelProyecto(titulo: string, idioma: Idioma): string {
  const n = /^Encargo (\d+)$/.exec(titulo.trim())?.[1];
  if (!n) return titulo;
  return idioma === "en" ? `Project ${n}` : `Proyecto ${n}`;
}
