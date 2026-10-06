// Comerciales (C-COMERCIAL-1): un video publicitario hecho con el material que manda
// un cliente (sus logos, sus capturas, su texto). Lo narra nuestra voz neuronal y
// lleva el formato Neón con personajes, sin marca de canal ni Shorts: el video es
// del cliente. Aquí va lo que comparten el panel y la Estación.
import { z } from "zod";
import { VOCES } from "./guion";
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
});
export type ComercialNuevo = z.infer<typeof esquemaComercialNuevo>;

/** El estado se cuenta con las mismas palabras que una grabación: la Estación lo atiende igual. */
export const ESTADOS_COMERCIAL = ["subida", "tomada", "planeada", "error", "quitada"] as const;
