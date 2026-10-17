// Publicidad en Short (docs/PUBLICIDAD.md): el anuncio vertical de un producto de un cliente, con sus
// fotos, su logo, una voz del banco y un avatar que habla. Aquí va lo que comparten el panel y la
// Estación: el pedido, el formato que se le exige a la IA para el plan y cómo se limpia.
import { z } from "zod";
import { IDS_IDIOMA } from "./comerciales";
import { contarPalabras } from "./grabaciones";
import { VOCES } from "./guion";

/** Unos 12 segundos: menos no alcanza para vender nada. */
export const MIN_PALABRAS_PUBLICIDAD = 30;
/** Unos 45 segundos (el tope de un anuncio en Short); más es otro anuncio. */
export const MAX_PALABRAS_PUBLICIDAD = 115;

export const esquemaPublicidadNueva = z.object({
  nombre: z.string().trim().min(3, "Ponle nombre al anuncio (el cliente y el producto).").max(120),
  narracion: z
    .string()
    .trim()
    .refine((t) => contarPalabras(t) >= MIN_PALABRAS_PUBLICIDAD, {
      message: "El texto es muy corto: con menos de treinta palabras no alcanza para vender el producto.",
    })
    .refine((t) => contarPalabras(t) <= MAX_PALABRAS_PUBLICIDAD, {
      message:
        "El texto pasa de unas 115 palabras (más de 45 segundos): acórtalo, un Short de venta es corto.",
    }),
  idioma: z.enum(IDS_IDIOMA),
  voz: z.enum(VOCES),
  carpetas: z.array(z.string().trim().min(1)).min(1, "Elige al menos una carpeta de imágenes.").max(6),
  /** La imagen de la persona que habla (su nombre en la biblioteca), o vacío: sin avatar. */
  avatar: z.string().trim().max(160).default(""),
  instrucciones: z.string().trim().max(2000).default(""),
});
export type PublicidadNueva = z.infer<typeof esquemaPublicidadNueva>;

/** La persona que habla (FlashTalk): 2 centavos por segundo de voz. */
export const COSTO_AVATAR_POR_SEGUNDO = 0.02;
/** Lo que se calcula ANTES de gastar (tope diario): el plan, la voz y la persona, con margen. */
export function costoEstimadoPublicidadUsd(narracion: string, conAvatar: boolean): number {
  const segundos = contarPalabras(narracion) / 2.4;
  const persona = conAvatar ? segundos * COSTO_AVATAR_POR_SEGUNDO : 0;
  return Math.round((0.05 + 0.06 + persona) * 100) / 100;
}

export const ESTADOS_PUBLICIDAD = ["subida", "tomada", "lista", "error", "quitada"] as const;
export type EstadoPublicidad = (typeof ESTADOS_PUBLICIDAD)[number];

// Lo que se le EXIGE a la IA: todo va siempre (C-GUION-3); lo que no aplica, vacío.
export const esquemaPlanPublicidadDeLaIA = z.object({
  momentos: z.array(
    z.object({
      frase: z.string(),
      imagen: z.string(),
      texto: z.string(),
      chips: z.array(z.object({ texto: z.string(), palabra: z.string() })),
    }),
  ),
  cierre: z.object({ frase: z.string(), lineas: z.array(z.string()) }),
});
export type PlanPublicidadDeLaIA = z.infer<typeof esquemaPlanPublicidadDeLaIA>;

/** El plan ya limpio: cada imagen por su nombre en la biblioteca. */
export type PlanDePublicidad = {
  momentos: {
    frase: string;
    imagen?: string;
    texto?: string;
    chips?: { texto: string; palabra: string }[];
  }[];
  cierre: { frase: string; lineas: string[] };
};

export const normalTexto = (t: string) =>
  t
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9ñ ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Dónde aparece la frase en el texto (en palabras), buscando desde `desde`; -1 si no está. */
function posicionDeFrase(palabras: string[], frase: string, desde: number): number {
  const buscadas = normalTexto(frase).split(" ").filter(Boolean);
  if (!buscadas.length) return -1;
  for (let i = desde; i + buscadas.length <= palabras.length; i++)
    if (buscadas.every((b, k) => palabras[i + k] === b)) return i;
  return -1;
}

/**
 * Limpia el plan de la IA: solo quedan los momentos cuya frase está LITERAL en el texto y en orden
 * (si no, entrarían en otro sitio o nunca); la imagen tiene que ser una de las que hay (si no, va sin
 * imagen); el texto grande va en mayúsculas y corto; las etiquetas, hasta seis y con su palabra en el
 * texto. El cierre tiene que estar en el texto; si no, entra con la última frase.
 */
export function planDesdeLaIA(
  ia: PlanPublicidadDeLaIA,
  narracion: string,
  imagenes: string[],
): PlanDePublicidad {
  const palabras = normalTexto(narracion).split(" ").filter(Boolean);
  const hay = new Set(imagenes);
  const momentos: PlanDePublicidad["momentos"] = [];
  let desde = 0;
  for (const m of ia.momentos) {
    const k = posicionDeFrase(palabras, m.frase, desde);
    if (k < 0) continue;
    desde = k + 1;
    const imagen = hay.has(m.imagen.trim()) ? m.imagen.trim() : undefined;
    const texto = m.texto.trim().toUpperCase().slice(0, 40) || undefined;
    const chips = m.chips
      .filter((c) => c.texto.trim() && posicionDeFrase(palabras, c.palabra, k) >= 0)
      .slice(0, 6)
      .map((c) => ({ texto: c.texto.trim().slice(0, 24), palabra: c.palabra.trim() }));
    momentos.push({ frase: m.frase.trim(), imagen, texto, chips: chips.length ? chips : undefined });
  }
  if (momentos.length < 3)
    throw new Error(
      "La IA no armó un plan que calce con el texto (menos de tres momentos). Vuelve a intentarlo.",
    );
  const cierreEnTexto = posicionDeFrase(palabras, ia.cierre.frase, desde) >= 0;
  const ultimaFrase = (narracion.split(/(?<=[.!?¡¿])\s+/).pop() ?? "").trim();
  return {
    momentos,
    cierre: {
      frase: cierreEnTexto ? ia.cierre.frase.trim() : ultimaFrase.split(/\s+/).slice(0, 4).join(" "),
      lineas: ia.cierre.lineas
        .map((l) => l.trim().slice(0, 32))
        .filter(Boolean)
        .slice(0, 4),
    },
  };
}
