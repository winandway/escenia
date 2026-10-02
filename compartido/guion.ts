// Forma del guion que sale de la IA y que viaja entre el panel y la Estación.
// Es la única fuente de verdad: si cambia aquí, cambia para los dos lados.
import { z } from "zod";

// interludio = respiro musical: sin voz, la música sube y pasan imágenes (5 a 8 s).
export const PARTES = [
  "gancho",
  "problema",
  "contexto",
  "demo",
  "dato",
  "opinion",
  "cierre",
  "cta",
  "interludio",
] as const;
// stock: clip de fondo · foto: foto real con licencia · ia: imagen generada con IA ·
// texto: frase grande · titulo: portada · titular: titular enorme con golpe ·
// periodico: recorte de periódico · red: tarjeta de red social · pantalla: grabación web
export const TIPOS_VISUAL = [
  "stock",
  "foto",
  "ia",
  "texto",
  "titulo",
  "titular",
  "periodico",
  "red",
  "pantalla",
] as const;

// Quién narra el video: la voz clonada de Richard o la voz femenina de la Estación.
export const VOCES = ["richard", "femenina"] as const;
export type Voz = (typeof VOCES)[number];
export const ETIQUETA_VOZ: Record<Voz, string> = { richard: "Mi voz", femenina: "Voz femenina" };

// Un PLANO es un cambio de imagen DENTRO de una escena, pegado a la frase que
// se está diciendo: la voz nombra a alguien y sale su foto; dice una cifra y la
// cifra salta en grande. Sin planos, una escena de 30 segundos es una sola
// imagen quieta, y la gente se va (C-RITMO-1).
export const TIPOS_PLANO = ["foto", "stock", "dato"] as const;
export const PLANOS_POR_ESCENA = 16;
export const esquemaPlano = z.object({
  // De 2 a 6 palabras LITERALES de la narración: el plano entra cuando la voz las dice.
  frase: z.string().trim().min(2).max(90),
  // foto: foto real (persona o lugar) · stock: clip de ambiente · dato: cifra o frase corta en grande.
  tipo: z.enum(TIPOS_PLANO),
  // Qué buscar (foto: nombre real + época o situación; stock: 2 a 5 palabras en inglés).
  busqueda: z.string().trim().max(80).optional(),
  foto_de: z.enum(["persona", "lugar"]).optional(),
  // En «dato», lo que se lee en grande («15 nominaciones»). En «foto», el nombre que se rotula («Shakira»).
  texto: z.string().trim().max(60).optional(),
});
export type Plano = z.infer<typeof esquemaPlano>;

export const esquemaVisual = z.object({
  tipo: z.enum(TIPOS_VISUAL),
  // Palabras para buscar el clip en Pexels (stock) o la foto en Wikimedia Commons (foto).
  busqueda: z.string().trim().max(80).optional(),
  // Dirección a grabar en pantalla (solo si tipo = pantalla).
  url: z.string().trim().max(300).optional(),
  // Descripción EN INGLÉS de la imagen a generar (solo si tipo = ia).
  prompt_imagen: z.string().trim().max(400).optional(),
  // Varias imágenes en la misma escena, una por frase o idea de la narración
  // (tipo = ia): se muestran en orden, repartidas en el tiempo de la escena.
  cuadros: z
    .array(z.object({ prompt_imagen: z.string().trim().min(10).max(400) }))
    .max(6)
    .optional(),
  // Recortes y titulares (tipos titular, periodico, red).
  titular: z.string().trim().max(90).optional(),
  fecha: z.string().trim().max(40).optional(),
  cuerpo: z.string().trim().max(300).optional(),
  // Frase corta que aparece grande en pantalla.
  texto_en_pantalla: z.string().trim().max(90).optional(),
  // Solo en tipo = foto: «lugar» cuando la foto es de un sitio, un objeto o un
  // evento (un estadio, un trofeo, una ciudad) y no de una persona. Así no se
  // exige una cara y no se cuela alguien que no es de la historia.
  foto_de: z.enum(["persona", "lugar"]).optional(),
  // Cambios de imagen dentro de la escena, en el orden en que se dicen (C-RITMO-1).
  planos: z.array(esquemaPlano).max(PLANOS_POR_ESCENA).optional(),
});

export const DURACION_INTERLUDIO = { minimo: 3, maximo: 15, porDefecto: 6 } as const;

export const esquemaEscena = z
  .object({
    parte: z.enum(PARTES),
    // Vacía SOLO en un interludio (respiro musical sin voz).
    narracion: z.string().trim().max(1500),
    visual: esquemaVisual,
    // Emoción del momento; en la Fase 2 elige memes y efectos de la biblioteca.
    momento: z.string().trim().max(30).optional(),
    // Segundos que dura un interludio (no lleva voz, así que no se puede deducir).
    duracion_seg: z.number().min(DURACION_INTERLUDIO.minimo).max(DURACION_INTERLUDIO.maximo).optional(),
  })
  .superRefine((e, ctx) => {
    if (e.parte !== "interludio" && e.narracion.length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["narracion"],
        message: "La narración no puede quedar vacía (solo un interludio va sin voz).",
      });
    }
  });

// Lo que escribe la IA (es el formato que se le exige a Claude).
export const esquemaGuionGenerado = z.object({
  titulo: z.string().trim().min(5).max(100),
  gancho: z.string().trim().min(5).max(300),
  escenas: z.array(esquemaEscena).min(3).max(30),
  // Afirmaciones que Richard tiene que comprobar antes de aprobar
  // (lo que es dato de fuente, separado de lo que opina la IA).
  hechos_a_verificar: z.array(z.string().trim().max(300)).max(20).default([]),
  descripcion_youtube: z.string().trim().max(4500).default(""),
  etiquetas: z.array(z.string().trim().max(40)).max(20).default([]),
  // Estilo de la música instrumental de fondo, EN INGLÉS (género, época,
  // instrumentos, ánimo). La Estación elige con esto la pista del catálogo local.
  musica: z.string().trim().max(160).default(""),
});

// Textos para YouTube: los escribe la IA al terminar el video (título del
// largo, uno por short, descripción y 30 palabras clave). Richard los copia.
export const ETIQUETAS_MAXIMAS = 30;
export const esquemaPublicacionGenerada = z.object({
  titulo: z.string().trim().min(10).max(100),
  descripcion: z.string().trim().min(40).max(4500),
  etiquetas: z.array(z.string().trim().min(2).max(60)).min(10).max(ETIQUETAS_MAXIMAS),
  shorts: z
    .array(z.object({ indice: z.number().int().min(1), titulo: z.string().trim().min(8).max(100) }))
    .max(8),
});
/** Cuántas de las palabras clave van en inglés (público latino de Estados Unidos). */
export const ETIQUETAS_EN_INGLES = 8;

/**
 * Lo que se le pide a la IA: las palabras clave en dos listas, español e
 * inglés, con holgura. Si manda de más no se rechaza el trabajo: `unirEtiquetas`
 * deja exactamente las que caben (C-PUBLICACION-2).
 */
export const esquemaPublicacionDeLaIA = z.object({
  titulo: z.string().trim().min(10).max(100),
  descripcion: z.string().trim().min(40).max(4500),
  etiquetas: z.array(z.string().trim().min(2).max(60)).min(10).max(60),
  etiquetas_ingles: z.array(z.string().trim().min(2).max(60)).max(30).default([]),
  shorts: z
    .array(z.object({ indice: z.number().int().min(1), titulo: z.string().trim().min(8).max(100) }))
    .max(8),
});

/** Une las dos listas sin repetir y sin pasar del máximo: primero el español, al final el inglés. */
export function unirEtiquetas(espanol: string[], ingles: string[]): string[] {
  const vistas = new Set<string>();
  const unicas = (lista: string[]) =>
    lista
      .map((e) => e.trim())
      .filter((e) => {
        const clave = e.toLowerCase();
        if (e.length < 2 || vistas.has(clave)) return false;
        vistas.add(clave);
        return true;
      });
  const en = unicas(ingles).slice(0, ETIQUETAS_EN_INGLES);
  const es = unicas(espanol).slice(0, ETIQUETAS_MAXIMAS - en.length);
  return [...es, ...en];
}

export const esquemaShortPublicado = z.object({
  indice: z.number().int().min(1),
  titulo_original: z.string().default(""),
  escena_inicio: z.number().int().min(0),
  escena_fin: z.number().int().min(0),
  duracion_seg: z.number().min(0).default(0),
});
export const esquemaPublicacion = esquemaPublicacionGenerada.extend({
  generado_en: z.string().default(""),
  shorts_producidos: z.array(esquemaShortPublicado).default([]),
});
export type Publicacion = z.infer<typeof esquemaPublicacion>;
export type ShortPublicado = z.infer<typeof esquemaShortPublicado>;

/** Etiquetas en una sola línea, como las pide YouTube (tope de 500 letras). */
export function etiquetasParaYouTube(etiquetas: string[], maximo = 500): string {
  const salida: string[] = [];
  for (const e of etiquetas.map((x) => x.trim()).filter(Boolean)) {
    const candidato = [...salida, e].join(", ");
    if (candidato.length > maximo) break;
    salida.push(e);
  }
  return salida.join(", ");
}

// Lo que se guarda y viaja a la Estación: lo generado más lo que elige Richard.
export const esquemaGuion = esquemaGuionGenerado.extend({
  voz: z.enum(VOCES).default("richard"),
  publicacion: esquemaPublicacion.nullable().default(null),
});

export type GuionGenerado = z.infer<typeof esquemaGuionGenerado>;
export type Guion = z.infer<typeof esquemaGuion>;
export type Escena = z.infer<typeof esquemaEscena>;

/** Mínimo de letras de la opinión de Richard para poder aprobar. */
export const OPINION_MINIMA = 40;

/**
 * Pone la opinión de Richard como escena propia, narrada con su voz.
 * Si el guion ya traía una escena de opinión, la reemplaza; si no, la mete
 * justo antes del cierre o del llamado a la acción.
 */
export function insertarOpinion(escenas: Escena[], opinion: string): Escena[] {
  const texto = opinion.trim();
  const escenaOpinion: Escena = {
    parte: "opinion",
    narracion: texto,
    visual: { tipo: "texto", texto_en_pantalla: "Mi opinión" },
  };
  const sinOpinion = escenas.filter((e) => e.parte !== "opinion");
  const indiceFinal = sinOpinion.findIndex((e) => e.parte === "cierre" || e.parte === "cta");
  if (indiceFinal === -1) return [...sinOpinion, escenaOpinion];
  return [...sinOpinion.slice(0, indiceFinal), escenaOpinion, ...sinOpinion.slice(indiceFinal)];
}

// Marcadores que la IA a veces deja en vez de un rótulo real («URL o rótulo»,
// «texto en pantalla»). En pantalla no sale nada de esto: se limpia (C-GUION-1).
const MARCADORES = new Set([
  "url",
  "rotulo",
  "texto",
  "texto en pantalla",
  "titulo",
  "titular",
  "placeholder",
  "label",
  "caption",
  "sin texto",
  "sin rotulo",
  "ninguno",
  "n/a",
]);

/** Deja vacío un rótulo que sea un marcador («URL o rótulo») y no un texto de verdad. */
export function limpiarRotulo(texto: string | undefined): string {
  const t = (texto ?? "").trim();
  const plano = t
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[.…]+$/u, "")
    .trim();
  const partes = plano.split(/\s+o\s+/u);
  return plano.length > 0 && partes.every((x) => MARCADORES.has(x)) ? "" : t;
}

/** Texto completo que se narra, escena por escena. */
export function textoNarrado(escenas: Escena[]): string {
  return escenas.map((e) => e.narracion.trim()).join("\n\n");
}

/** Estimación de duración: ~150 palabras por minuto en español narrado. */
export function duracionEstimadaSeg(escenas: Escena[]): number {
  const palabras = textoNarrado(escenas).split(/\s+/).filter(Boolean).length;
  const interludios = escenas
    .filter((e) => e.parte === "interludio")
    .reduce((s, e) => s + (e.duracion_seg ?? DURACION_INTERLUDIO.porDefecto), 0);
  return Math.round((palabras / 150) * 60 + interludios);
}
