// Fase 3 (C-YOUTUBE-1): cada enlace de la descripción de un video lleva su marca UTM, para saber
// en la analítica de cada sitio cuántas visitas y ventas trajo cada video (y cada Short).
// Los enlaces de YouTube no se tocan (son del propio canal), y uno que ya trae UTM se deja como está.

export type MarcaUtm = {
  /** El video: «escenia-g20» (el número del guion, para cruzarlo con el panel). */
  campana: string;
  /** La pieza: «largo», «short-1»… */
  contenido: string;
};

const ENLACE = /https?:\/\/[^\s<>()"'«»]+/gi;
const DE_YOUTUBE = /^(?:www\.|m\.)?(?:youtube\.com|youtu\.be)$/i;
// Lo que suele cerrar una frase pegada al enlace («visita https://x.com.») no es parte de él.
const COLA = /[.,;:!?]+$/;

export const campanaDeGuion = (guionId: number) => `escenia-g${guionId}`;

/** Un enlace con su UTM. Si no es una dirección válida, o es de YouTube, o ya trae UTM, sale igual. */
export function enlaceConUtm(enlace: string, marca: MarcaUtm): string {
  let url: URL;
  try {
    url = new URL(enlace);
  } catch {
    return enlace;
  }
  if (DE_YOUTUBE.test(url.hostname)) return enlace;
  if ([...url.searchParams.keys()].some((k) => k.toLowerCase().startsWith("utm_"))) return enlace;
  url.searchParams.set("utm_source", "youtube");
  url.searchParams.set("utm_medium", "video");
  url.searchParams.set("utm_campaign", marca.campana);
  url.searchParams.set("utm_content", marca.contenido);
  return url.toString();
}

/** Todos los enlaces de un texto (la descripción) con su UTM; el resto del texto no cambia. */
export function textoConUtm(texto: string, marca: MarcaUtm): string {
  return texto.replace(ENLACE, (crudo) => {
    const cola = COLA.exec(crudo)?.[0] ?? "";
    const enlace = cola ? crudo.slice(0, -cola.length) : crudo;
    return enlaceConUtm(enlace, marca) + cola;
  });
}
