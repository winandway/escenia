// Comerciales (C-COMERCIAL-1): un video publicitario hecho con el material que manda
// un cliente (sus logos, sus capturas, su texto). Lo narra nuestra voz neuronal y
// lleva el formato Neón con personajes, sin marca de canal ni Shorts: el video es
// del cliente. Aquí va lo que comparten el panel y la Estación.
import { z } from "zod";
import { VOCES, type Guion } from "./guion";
import { contarPalabras } from "./grabaciones";

export const IDIOMAS = [
  { id: "es", nombre: "Español" },
  { id: "en", nombre: "Inglés" },
] as const;
export type Idioma = (typeof IDIOMAS)[number]["id"];
export const IDS_IDIOMA = IDIOMAS.map((i) => i.id) as ["es", "en"];

/** Lo mínimo que tiene que decir el texto para que salga un video (unos 15 segundos). */
export const MIN_PALABRAS_COMERCIAL = 30;
/** Unos 75 segundos (lo más largo que admite un video de Fiverr); más es otro video. */
export const MAX_PALABRAS_COMERCIAL = 260;

export const esquemaComercialNuevo = z.object({
  nombre: z.string().trim().min(3, "Ponle nombre al video (el cliente y de qué es).").max(120),
  narracion: z
    .string()
    .trim()
    .refine((t) => contarPalabras(t) >= MIN_PALABRAS_COMERCIAL, {
      message: "El texto es muy corto: con menos de treinta palabras no hay de qué armar un video.",
    })
    .refine((t) => contarPalabras(t) <= MAX_PALABRAS_COMERCIAL, {
      message: "El texto pasa de unas 260 palabras (más de un minuto y medio): pártelo en dos videos.",
    }),
  idioma: z.enum(IDS_IDIOMA),
  voz: z.enum(VOCES),
  instrucciones: z.string().trim().max(2000),
  carpetas: z.array(z.string().trim().min(1)).min(1, "Elige al menos una carpeta de imágenes.").max(6),
  // C-COMERCIAL-3: ver y corregir el plan (qué imagen va en cada frase) antes de gastar en la voz.
  // El formulario del panel la manda marcada; desde la Mac, si no se dice, se arma de una.
  revisar: z.boolean().default(false),
});
export type ComercialNuevo = z.infer<typeof esquemaComercialNuevo>;

/** El estado se cuenta con las mismas palabras que una grabación: la Estación lo atiende igual. */
export const ESTADOS_COMERCIAL = ["subida", "tomada", "planeada", "error", "quitada"] as const;

/** Una imagen que la Mac tiene lista para el comercial (lo que mandó con el plan). */
export type ImagenDelPlan = { nombre: string; transparente: boolean; ancho: number; alto: number };

/** Un cambio de imagen en el plan: escena y plano (desde 0) y el archivo nuevo. */
export type CambioDeImagen = { escena: number; plano: number; archivo: string };

/**
 * Aplica los cambios que Richard hizo al plan (C-COMERCIAL-3). Solo toca planos «imagen»; un archivo
 * vacío quita ese plano; un archivo que no está en la lista de la Mac no entra (el plan queda como estaba
 * en ese plano). La narración no se toca nunca: es el texto del cliente.
 */
export function cambiarImagenesDelPlan(guion: Guion, cambios: CambioDeImagen[], nombres: string[]): Guion {
  const validos = new Set(nombres);
  const quitar = new Set<string>();
  const poner = new Map<string, string>();
  for (const c of cambios) {
    const clave = `${c.escena}:${c.plano}`;
    const archivo = c.archivo.trim();
    if (archivo === "") quitar.add(clave);
    else if (validos.has(archivo)) poner.set(clave, archivo);
  }
  return {
    ...guion,
    escenas: guion.escenas.map((e, i) => {
      const planos = e.visual.planos;
      if (!planos?.length) return e;
      return {
        ...e,
        visual: {
          ...e.visual,
          planos: planos.flatMap((p, k) => {
            const clave = `${i}:${k}`;
            if (p.tipo !== "imagen") return [p];
            if (quitar.has(clave)) return [];
            const nuevo = poner.get(clave);
            return [nuevo ? { ...p, archivo: nuevo } : p];
          }),
        },
      };
    }),
  };
}

// ── La miniatura elegida desde el panel (C-COMERCIAL-4, 8 nov 2026) ──────────────────────────
// Richard elige en el panel cuál de las imágenes del cliente va en la miniatura y escribe el
// título y la frase. Se guarda en la columna `portada` (JSON) del comercial; la Mac la toma,
// vuelve a dibujar la miniatura con la misma plantilla (sin gastar nada) y la sube.

export const MAX_TITULO_PORTADA = 40;
export const MAX_FRASE_PORTADA = 80;
export const ESTADOS_PORTADA = ["pedida", "tomada", "hecha", "error"] as const;

export const esquemaPortadaElegida = z.object({
  archivo: z.string().trim().min(1, "Elige la imagen que va en la miniatura.").max(160),
  titulo: z
    .string()
    .trim()
    .min(1, "Escribe el texto grande de la miniatura.")
    .max(MAX_TITULO_PORTADA, `El texto grande pasa de ${MAX_TITULO_PORTADA} letras: se vería apretado.`),
  frase: z.string().trim().max(MAX_FRASE_PORTADA, `La frase pasa de ${MAX_FRASE_PORTADA} letras: acórtala.`),
});
export type PortadaElegida = z.infer<typeof esquemaPortadaElegida>;

export const esquemaPortadaGuardada = esquemaPortadaElegida.extend({
  estado: z.enum(ESTADOS_PORTADA),
  error: z.string().max(500).default(""),
});
export type PortadaGuardada = z.infer<typeof esquemaPortadaGuardada>;

/** La miniatura guardada de un comercial; vacía o rota = no hay ninguna pedida. */
export function leerPortada(json: string | null | undefined): PortadaGuardada | null {
  if (!json) return null;
  try {
    const r = esquemaPortadaGuardada.safeParse(JSON.parse(json));
    return r.success ? r.data : null;
  } catch {
    return null;
  }
}

/** ¿Lo pedido es lo mismo que ya está hecho? Entonces no se vuelve a dibujar ni se escribe nada. */
export const mismaPortada = (a: PortadaElegida, b: PortadaGuardada | null) =>
  b !== null &&
  b.estado !== "error" &&
  a.archivo === b.archivo &&
  a.titulo.trim() === b.titulo &&
  a.frase.trim() === b.frase;
