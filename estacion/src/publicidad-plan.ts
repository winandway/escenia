// Publicidad en Short (prototipo, 17 oct 2026): un anuncio vertical de 30 a 40 segundos para vender un
// producto de un cliente, con sus fotos, su logo, una voz y un avatar que habla en la esquina. Aquí va
// la lógica pura (el plan, los tiempos y el costo), sin nada de la Mac: la prueban las pruebas de la
// raíz (C-CI-1). Los pasos están en `publicidad.ts` y la plantilla en `remotion/Publicidad.tsx`.
import { z } from "zod";
import { VOCES } from "@compartido/guion";

/** Lo más largo que puede salir un anuncio: un Short de venta no pasa de 45 segundos. */
export const SEGUNDOS_MAXIMOS = 45;
import { COSTO_AVATAR_POR_SEGUNDO } from "@compartido/publicidad";

/** El avatar que habla (FlashTalk): 2 centavos por segundo de voz (el valor vive en compartido). */
export { COSTO_AVATAR_POR_SEGUNDO };

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
  /** La venezolana por defecto: con la femenina de catálogo «suena a extranjera» (Richard, 17 oct 2026). */
  voz: z.enum(VOCES).default("venezolana"),
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

// ——— Un anuncio pedido desde el panel (menú «Publicidad») ———

type ImagenDeLaBiblioteca = { nombre: string; ruta: string; transparente: boolean };

/**
 * El logo del anuncio: la imagen que se llama «logo» (en cualquier carpeta elegida); si no hay, la
 * primera sin fondo que no sea la persona que habla. Null si no hay ninguna que sirva.
 */
export function elegirLogo(imagenes: ImagenDeLaBiblioteca[], avatar: string): ImagenDeLaBiblioteca | null {
  const candidatas = imagenes.filter((i) => i.nombre !== avatar);
  return (
    candidatas.find((i) => normal(i.nombre).includes("logo")) ??
    candidatas.find((i) => i.transparente) ??
    null
  );
}

/**
 * El color de la marca sacado del logo: entre los puntos visibles y con color (ni grises, ni casi
 * negros, ni casi blancos) gana el tono que más se repite. Null si el logo es gris o no tiene color.
 * Recibe los puntos en RGBA, uno detrás de otro.
 */
export function acentoDeLogo(rgba: Uint8Array): string | null {
  const grupos = new Map<number, { n: number; r: number; g: number; b: number }>();
  for (let i = 0; i + 3 < rgba.length; i += 4) {
    const r = rgba[i] ?? 0;
    const g = rgba[i + 1] ?? 0;
    const b = rgba[i + 2] ?? 0;
    const a = rgba[i + 3] ?? 0;
    if (a < 200) continue;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const saturacion = max === 0 ? 0 : (max - min) / max;
    if (saturacion < 0.45 || max < 70) continue;
    const d = max - min;
    let tono = 0;
    if (max === r) tono = ((g - b) / d + 6) % 6;
    else if (max === g) tono = (b - r) / d + 2;
    else tono = (r - g) / d + 4;
    const grupo = Math.floor(tono * 2); // 12 grupos de 30°
    const actual = grupos.get(grupo) ?? { n: 0, r: 0, g: 0, b: 0 };
    grupos.set(grupo, { n: actual.n + 1, r: actual.r + r, g: actual.g + g, b: actual.b + b });
  }
  const total = [...grupos.values()].reduce((s, x) => s + x.n, 0);
  const mejor = [...grupos.values()].sort((a, b) => b.n - a.n)[0];
  // Un par de puntos de color en un logo gris no lo vuelven de ese color.
  if (!mejor || total < 20) return null;
  const hex = (v: number) =>
    Math.round(v / mejor.n)
      .toString(16)
      .padStart(2, "0");
  return `#${hex(mejor.r)}${hex(mejor.g)}${hex(mejor.b)}`;
}

/**
 * El plan que arma la Mac a partir del que hizo la IA en el panel: cada imagen, de su nombre en la
 * biblioteca a su archivo en la Mac (la que no está en la Mac va sin imagen, nunca otra).
 */
export function planParaArmar(d: {
  marca: string;
  texto: string;
  voz: (typeof VOCES)[number];
  idioma: "es" | "en";
  plan: {
    momentos: {
      frase: string;
      imagen?: string;
      texto?: string;
      chips?: { texto: string; palabra: string }[];
    }[];
    cierre: { frase: string; lineas: string[] };
  };
  rutas: Map<string, string>;
  logo: string;
  avatar?: string;
  musica?: string;
  acento?: string | null;
}): PlanPublicidad {
  return esquemaPlanPublicidad.parse({
    marca: d.marca.slice(0, 60),
    acento: d.acento ?? undefined,
    logo: d.logo,
    avatar: d.avatar,
    musica: d.musica,
    voz: d.voz,
    idioma: d.idioma,
    texto: d.texto,
    momentos: d.plan.momentos.map((m) => ({
      frase: m.frase,
      imagen: m.imagen ? d.rutas.get(m.imagen) : undefined,
      texto: m.texto,
      chips: m.chips,
    })),
    cierre: d.plan.cierre,
  });
}
