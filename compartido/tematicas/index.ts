// Temáticas = el ESTILO de cada tipo de video (tono, estructura, plantilla).
// Los TEMAS concretos (Sam Altman, un artista, una noticia) NO van aquí:
// entran como datos desde el panel o desde el radar.
// Añadir una temática = añadir un objeto a esta lista (y su plantilla en la Estación).

export type Canal = "canal-ia" | "caprichoso-tv";

export type Tematica = {
  id: string;
  nombre: string;
  canal: Canal;
  activa: boolean;
  tono: string;
  duracionObjetivo: { largo: number; short: number };
  plantilla: "TechExplainer" | "MiniDocumental";
  ctaProductos: string[];
  // Estructuras posibles; el motor rota entre ellas para que no todos los
  // videos salgan iguales (candado contra el «contenido no auténtico»).
  estructuras: string[][];
  bibliotecaEtiquetas: string[];
  densidadRecursos: "baja" | "media" | "alta";
  cortesComerciales: { cantidad: number; duracionSeg: [number, number] };
  reglas: string[];
};

const PRODUCTOS_SOFTWARE = ["blisor", "beellon", "qrbott", "tintora", "yadominios"];

export const TEMATICAS: Tematica[] = [
  {
    id: "ia-apps",
    nombre: "IA y apps: construí esto con IA",
    canal: "canal-ia",
    activa: true,
    tono: "cercano, técnico pero claro, con opinión propia y sin exagerar",
    duracionObjetivo: { largo: 180, short: 45 },
    plantilla: "TechExplainer",
    ctaProductos: ["blisor", "beellon", "qrbott"],
    estructuras: [
      ["gancho", "problema", "demo", "opinion", "cta"],
      ["gancho", "contexto", "dato", "demo", "opinion", "cierre", "cta"],
      ["gancho", "demo", "problema", "opinion", "cta"],
    ],
    bibliotecaEtiquetas: ["sorpresa", "error", "exito", "risa", "tension"],
    densidadRecursos: "media",
    cortesComerciales: { cantidad: 1, duracionSeg: [10, 20] },
    reglas: [
      "Explica una herramienta o novedad real con un ejemplo concreto que se pueda ver en pantalla.",
      "No prometas resultados ni cifras que no estén en el contexto dado.",
    ],
  },
  {
    id: "demo-producto",
    nombre: "Caso real de un producto Windoce",
    canal: "canal-ia",
    activa: true,
    tono: "práctico, de negocio a negocio, mostrando un problema real y cómo se resuelve",
    duracionObjetivo: { largo: 150, short: 40 },
    plantilla: "TechExplainer",
    ctaProductos: PRODUCTOS_SOFTWARE,
    estructuras: [
      ["gancho", "problema", "demo", "dato", "opinion", "cta"],
      ["gancho", "contexto", "problema", "demo", "opinion", "cta"],
    ],
    bibliotecaEtiquetas: ["exito", "error", "sorpresa"],
    densidadRecursos: "baja",
    cortesComerciales: { cantidad: 0, duracionSeg: [0, 0] },
    reglas: [
      "El video entero es sobre un problema de negocio; el producto aparece como la solución, sin tono de anuncio.",
      "Usa solo funciones del producto que aparecen en su descripción.",
    ],
  },
  {
    id: "noticias-losupe",
    nombre: "Noticia de Losupe en video",
    canal: "canal-ia",
    activa: true,
    tono: "informativo, directo, con una lectura propia de qué significa la noticia",
    duracionObjetivo: { largo: 120, short: 40 },
    plantilla: "TechExplainer",
    ctaProductos: ["beellon", "blisor", "yadominios"],
    estructuras: [
      ["gancho", "contexto", "dato", "opinion", "cierre", "cta"],
      ["gancho", "dato", "contexto", "opinion", "cta"],
    ],
    bibliotecaEtiquetas: ["sorpresa", "tension"],
    densidadRecursos: "baja",
    cortesComerciales: { cantidad: 1, duracionSeg: [10, 15] },
    reglas: [
      "Todo dato sale del texto de la nota que se pegó como contexto. Si no está ahí, no se dice.",
      "Cita la fuente en la descripción.",
    ],
  },
  {
    id: "biografias",
    nombre: "Biografía de artista (mini documental)",
    canal: "caprichoso-tv",
    // Fase 2: primero el piloto en el canal de IA, y reglas anti Content ID.
    activa: false,
    tono: "narrativo, cálido, de mini documental musical",
    duracionObjetivo: { largo: 480, short: 50 },
    plantilla: "MiniDocumental",
    ctaProductos: [],
    estructuras: [["gancho", "contexto", "dato", "cierre"]],
    bibliotecaEtiquetas: ["tension", "exito"],
    densidadRecursos: "baja",
    cortesComerciales: { cantidad: 0, duracionSeg: [0, 0] },
    reglas: ["Cero música del artista.", "Solo fotos con licencia o de dominio público."],
  },
  {
    id: "entrevistas-archivo",
    nombre: "Entrevista de archivo + qué fue del artista",
    canal: "caprichoso-tv",
    activa: false,
    tono: "nostálgico, cercano, con respeto por el artista",
    duracionObjetivo: { largo: 360, short: 45 },
    plantilla: "MiniDocumental",
    ctaProductos: [],
    estructuras: [["gancho", "contexto", "dato", "cierre"]],
    bibliotecaEtiquetas: ["risa", "sorpresa"],
    densidadRecursos: "baja",
    cortesComerciales: { cantidad: 0, duracionSeg: [0, 0] },
    reglas: ["Solo material propio de Caprichoso TV."],
  },
];

export function buscarTematica(id: string): Tematica | undefined {
  return TEMATICAS.find((t) => t.id === id);
}

export const NOMBRE_CANAL: Record<Canal, string> = {
  "canal-ia": "Canal de IA",
  "caprichoso-tv": "Caprichoso TV",
};
