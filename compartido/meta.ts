// La ficha («meta») que acompaña a un archivo que la Estación sube al panel: por
// ejemplo, la lista de créditos de las fotos y los clips. Antes viajaba en la
// dirección de la petición, con tope de 4.000 letras; un video con más de cien
// imágenes trae más créditos que eso y la entrega fallaba en el último paso
// (C-ENTREGA-2). Ahora viaja en una cabecera, con mucho más margen.
export const CABECERA_META = "x-escenia-meta";
export const META_MAXIMA = 60_000;

/** La ficha lista para viajar en la cabecera: en base64, que pesa poco y solo usa letras seguras. */
export function metaParaCabecera(meta: Record<string, unknown>): string {
  const bytes = new TextEncoder().encode(JSON.stringify(meta));
  let binario = "";
  for (const b of bytes) binario += String.fromCharCode(b);
  return btoa(binario);
}

function deBase64(texto: string): string {
  const binario = atob(texto);
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}

/**
 * Lee la ficha de una subida: primero la cabecera (lo nuevo) y, si no viene, el
 * parámetro de la dirección (Estaciones viejas). Devuelve el JSON como texto, o
 * null si no es un JSON válido o es demasiado grande.
 */
export function leerMeta(cabecera: string | null, parametro: string | null): string | null {
  let texto = "{}";
  if (cabecera) {
    try {
      texto = deBase64(cabecera);
    } catch {
      return null;
    }
  } else if (parametro) {
    texto = parametro;
  }
  if (texto.length > META_MAXIMA) return null;
  try {
    const valor: unknown = JSON.parse(texto);
    return valor !== null && typeof valor === "object" && !Array.isArray(valor) ? texto : null;
  } catch {
    return null;
  }
}
