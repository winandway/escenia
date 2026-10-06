// Biblioteca de imágenes (C-IMAGENES-1): los logos, las capturas de pantalla y los
// PDF que manda un cliente para que salgan en su video. Se suben al panel en
// carpetas (una por cliente o por trabajo) y la Estación las baja a la Mac. Aquí
// está lo que comparten el panel (que las recibe) y la Estación (que las usa).
import { z } from "zod";

export const EXTENSIONES_IMAGEN = ["png", "jpg", "jpeg", "webp", "pdf"] as const;
export type ExtensionImagen = (typeof EXTENSIONES_IMAGEN)[number];
export const TIPO_DE_CONTENIDO_IMAGEN: Record<ExtensionImagen, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  pdf: "application/pdf",
};
/** Un PDF de capturas pesa unos megas; un logo, menos de uno. */
export const MAX_BYTES_IMAGEN = 25 * 1024 * 1024;
/** Cuántos archivos se pueden subir de una sola vez desde el panel. */
export const MAX_ARCHIVOS_POR_SUBIDA = 60;

/** La extensión de un archivo, en minúsculas y sin el punto; vacío si no es de los que se aceptan. */
export function extensionDeImagen(nombre: string): ExtensionImagen | "" {
  const ext = nombre.toLowerCase().split(".").pop() ?? "";
  return EXTENSIONES_IMAGEN.find((e) => e === ext) ?? "";
}

/** El nombre de una carpeta, limpio: letras, números, espacios y guiones. */
export function nombreDeCarpeta(texto: string): string {
  return texto
    .replace(/[\\/:*?"<>|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
}

export const esquemaImagenNueva = z.object({
  carpeta: z
    .string()
    .transform(nombreDeCarpeta)
    .pipe(z.string().min(2, "Ponle un nombre a la carpeta (el cliente o el trabajo).")),
  nombre: z.string().trim().min(1).max(160),
  extension: z.enum(EXTENSIONES_IMAGEN, { message: "Solo se aceptan PNG, JPG, WEBP y PDF." }),
});
export type ImagenNueva = z.infer<typeof esquemaImagenNueva>;

/** Una imagen que la Estación tiene en la Mac, lista para el video. */
export type ImagenDisponible = { nombre: string; carpeta: string };

const simplificar = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\.(png|jpe?g|webp|pdf)$/i, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/**
 * La imagen que pidió la IA por su nombre («05 Pro In Shop (horizontal).png»). Se busca sin
 * fijarse en mayúsculas, tildes, extensión ni signos; si no hay una igual, la que contenga el
 * nombre pedido (o al revés). `null` si ninguna se parece: ese plano no entra.
 */
export function buscarImagenPorNombre<T extends { nombre: string }>(
  pedido: string,
  disponibles: T[],
): T | null {
  const buscado = simplificar(pedido);
  if (!buscado) return null;
  const exacta = disponibles.find((i) => simplificar(i.nombre) === buscado);
  if (exacta) return exacta;
  const parecida = disponibles.find((i) => {
    const n = simplificar(i.nombre);
    return n.includes(buscado) || buscado.includes(n);
  });
  if (parecida) return parecida;
  // Última oportunidad: que compartan todas las palabras «de verdad» (sin números sueltos).
  const palabras = buscado.split(" ").filter((p) => p.length > 2 && !/^\d+$/.test(p));
  if (palabras.length === 0) return null;
  return (
    disponibles.find((i) => {
      const n = simplificar(i.nombre);
      return palabras.every((p) => n.includes(p));
    }) ?? null
  );
}
