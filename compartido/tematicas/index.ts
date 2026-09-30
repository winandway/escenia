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
    id: "novedades-ia",
    nombre: "Novedades de IA: lanzamientos y qué cambia",
    canal: "canal-ia",
    activa: true,
    tono: "directo y sin rodeos, de alguien que construye software con IA todos los días; claro para quien no programa, con opinión propia y sin exagerar",
    duracionObjetivo: { largo: 300, short: 50 },
    plantilla: "TechExplainer",
    ctaProductos: [],
    estructuras: [
      ["gancho", "contexto", "dato", "problema", "dato", "opinion", "cierre"],
      ["gancho", "dato", "contexto", "dato", "problema", "opinion", "cierre"],
      ["gancho", "problema", "contexto", "dato", "dato", "opinion", "cierre"],
    ],
    bibliotecaEtiquetas: ["sorpresa", "tension", "exito", "error"],
    densidadRecursos: "media",
    cortesComerciales: { cantidad: 0, duracionSeg: [0, 0] },
    reglas: [
      "Abre con el dato más sorprendente de la noticia en la primera frase, sin presentar el tema ni saludar.",
      "Toda cifra, fecha, nombre de producto y cita sale del contexto pegado. Un precio o un número que no esté ahí no se dice.",
      "Después de cada novedad, di en una frase qué cambia para una persona o un negocio que usa estas herramientas.",
      "Aquí no hay un personaje único: la primera escena es una «foto» real de quien protagoniza la noticia (la persona, el producto o el lugar; si no es una persona, con `visual.foto_de`: «lugar»). No uses «ia». El «periodico» aquí se ve como una ventana de noticias: úsalo para el hecho central, con su fecha real.",
      "Cada escena «dato» o «problema» arranca con una frase que se entienda sola, porque de ahí salen los Shorts.",
      "Para los clips «stock» busca imágenes de tecnología concretas («server room lights», «programmer typing code», «robot arm factory»), nunca gente genérica de oficina sonriendo.",
      "`musica`: siempre electrónica instrumental («minimal electronic, soft synths, tech, curious»).",
    ],
  },
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
    // Se puede producir y revisar; publicar en Caprichoso sigue cerrado (PUBLICACION_PERMITIDA).
    activa: true,
    tono: "narrativo, cálido, de mini documental musical, con datos concretos y sin adornos",
    duracionObjetivo: { largo: 480, short: 50 },
    plantilla: "MiniDocumental",
    ctaProductos: [],
    estructuras: [
      ["gancho", "contexto", "dato", "contexto", "dato", "opinion", "cierre"],
      ["gancho", "dato", "contexto", "dato", "opinion", "cierre"],
    ],
    bibliotecaEtiquetas: ["tension", "exito"],
    densidadRecursos: "baja",
    cortesComerciales: { cantidad: 0, duracionSeg: [0, 0] },
    reglas: [
      "Cero música del artista: no se cita ni se reproduce ninguna canción; se puede nombrar títulos como dato.",
      "Las fotos salen de Wikimedia Commons con licencia libre: en `visual.busqueda` pon el nombre del artista y, si ayuda, una época o lugar (ej.: «Celia Cruz 1990s», «Celia Cruz concert»).",
      "Cuenta la vida como una historia: infancia, el momento que lo cambió todo, la cima, la caída o la pérdida, el legado. Fechas y lugares solo si están en el contexto.",
    ],
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

/**
 * Dónde se puede PUBLICAR hoy. Producir y revisar un video se puede en cualquier
 * canal; publicar en Caprichoso TV queda cerrado hasta que Richard lo abra
 * (la sanción de YouTube por contenido no auténtico alcanza al canal entero).
 */
export const PUBLICACION_PERMITIDA: Record<Canal, boolean> = {
  "canal-ia": true,
  "caprichoso-tv": false,
};

export const NOMBRE_CANAL: Record<Canal, string> = {
  "canal-ia": "Full Código",
  "caprichoso-tv": "Caprichoso TV",
};
