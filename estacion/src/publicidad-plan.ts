// Publicidad en Short (prototipo, 17 oct 2026): un anuncio vertical de 30 a 40 segundos para vender un
// producto de un cliente, con sus fotos, su logo, una voz y un avatar que habla en la esquina. Aquí va
// la lógica pura (el plan, los tiempos y el costo), sin nada de la Mac: la prueban las pruebas de la
// raíz (C-CI-1). Los pasos están en `publicidad.ts` y la plantilla en `remotion/Publicidad.tsx`.
import { z } from "zod";

/** Lo más largo que puede salir un anuncio: un Short de venta no pasa de 45 segundos. */
export const SEGUNDOS_MAXIMOS = 45;
/** El avatar que habla (FlashTalk): 2 centavos por segundo de voz. */
export const COSTO_AVATAR_POR_SEGUNDO = 0.02;

export const esquemaPlanPublicidad = z.object({
  /** El nombre de la tienda, como sale escrito. */
  marca: z.string().min(2),
  /** El color de la marca (cajas de los textos y de la palabra que se dice). */
  acento: z
    .string()
    .regex(/^#[0-9a-f]{6}$/i)
    .default("#ff2a2a"),
  /** Rutas relativas a la carpeta del cliente. */
  logo: z.string().min(1),
  avatar: z.string().optional(),
  musica: z.string().optional(),
  voz: z.enum(["femenina", "richard"]).default("femenina"),
  idioma: z.enum(["es", "en"]).default("es"),
  /** Lo que dice la voz, entero. */
  texto: z.string().min(20),
  /** Cada cambio de imagen o de texto entra cuando la voz dice su `frase` (palabras literales). */
  momentos: z
    .array(
      z.object({
        frase: z.string().min(2),
        imagen: z.string().optional(),
        texto: z.string().max(40).optional(),
        /** Etiquetas que entran una a una, cada una cuando se dice su palabra. */
        chips: z
          .array(z.object({ texto: z.string().max(24), palabra: z.string().min(2) }))
          .max(6)
          .optional(),
      }),
    )
    .min(3),
  /** La tarjeta final con el logo: entra cuando se dice `frase`. */
  cierre: z.object({ frase: z.string().min(2), lineas: z.array(z.string().max(32)).max(4) }),
});
export type PlanPublicidad = z.infer<typeof esquemaPlanPublicidad>;

const normal = (t: string) =>
  t
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9ñ ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

type Palabra = { text: string; startMs: number; endMs: number };

/**
 * Dónde empieza cada frase en la voz, en orden: la búsqueda de una sigue donde terminó la anterior.
 * Devuelve null para la que no aparece (así se ve en el registro, en vez de entrar en otro sitio).
 */
export function tiemposDeFrases(frases: string[], palabras: Palabra[]): (number | null)[] {
  const tokens = palabras.map((p) => normal(p.text));
  let desde = 0;
  return frases.map((frase) => {
    const buscadas = normal(frase).split(" ").filter(Boolean);
    if (!buscadas.length) return null;
    for (let i = desde; i + buscadas.length <= tokens.length; i++) {
      if (buscadas.every((b, k) => tokens[i + k] === b)) {
        desde = i + 1;
        return palabras[i]?.startMs ?? null;
      }
    }
    return null;
  });
}

/** Lo que cuesta un anuncio: la voz (la cobra ElevenLabs) y el avatar por segundo, si lleva. */
export function costoPublicidadUsd(segundos: number, conAvatar: boolean, costoVozUsd: number): number {
  const avatar = conAvatar ? segundos * COSTO_AVATAR_POR_SEGUNDO : 0;
  return Math.round((avatar + costoVozUsd) * 1000) / 1000;
}
