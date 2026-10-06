// Temáticas = el ESTILO de cada tipo de video (tono, estructura, plantilla).
// Los TEMAS concretos (Sam Altman, un artista, una noticia) NO van aquí:
// entran como datos desde el panel o desde el radar.
// Añadir una temática = añadir un objeto a esta lista (y su plantilla en la Estación).

export type Canal = "canal-ia" | "caprichoso-tv";

// El diseño del video (docs/ESTILOS.md). "clasico": fotos y clips a pantalla llena, con rótulos.
// "ilustrado": las personas salen DIBUJADAS sobre un fondo de cómic (tecnología y noticias de IA).
// "neon": no hay fotos ni clips; todo se explica con diagramas de neón (cómo funciona algo).
// "mixto": neón CON personajes: diagramas de neón y, cuando se nombra a una persona, sale dibujada
// sobre el mismo fondo de neón (pedido por Richard el 5 oct 2026 para sus grabaciones).
// "cancion": Richard CANTA, con su fondo real, y encima de su cabeza un dibujo a lápiz por verso
// (pedido el 6 oct 2026 para Caprichoso TV: su canción «Voy recorriendo caminos»).
export const ESTILOS_VIDEO = ["clasico", "ilustrado", "neon", "mixto", "cancion"] as const;
export type EstiloVideo = (typeof ESTILOS_VIDEO)[number];

/**
 * El NOMBRE de cada formato, como lo pide Richard (docs/FORMATOS.md). A cualquiera de ellos
 * se le puede sumar el modo Presentador: él, grabado, encima de los gráficos.
 */
export const NOMBRE_FORMATO: Record<EstiloVideo, string> = {
  clasico: "Documental",
  ilustrado: "Cómic",
  neon: "Neón",
  mixto: "Neón con personajes",
  cancion: "Canción",
};

/** El formato Canción: él cantando, su fondo real, un boceto a lápiz por verso; sale solo en vertical. */
export const esCancion = (estilo: EstiloVideo): boolean => estilo === "cancion";

/** Los formatos sin fotos ni clips reales: todo lo que se ve es dibujado (diagramas, figuras). */
export const esDeNeon = (estilo: EstiloVideo): boolean => estilo === "neon" || estilo === "mixto";
/** Los formatos donde las personas con rótulo salen dibujadas. */
export const dibujaPersonas = (estilo: EstiloVideo): boolean => estilo === "ilustrado" || estilo === "mixto";

export type Tematica = {
  id: string;
  nombre: string;
  canal: Canal;
  activa: boolean;
  tono: string;
  duracionObjetivo: { largo: number; short: number };
  plantilla: "TechExplainer" | "MiniDocumental";
  /** El diseño de los videos de esta temática. Sin decirlo, el clásico. */
  estilo?: EstiloVideo;
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

// Estilo ilustrado: la persona sale dibujada y los datos le caen encima como titulares.
const REGLA_ILUSTRADO =
  "Este video sale con las personas DIBUJADAS: cada vez que nombres a una persona, pon su plano «foto» con `texto` = su nombre, y justo después 1 o 2 planos «dato» con lo que se dice de ella en 2 a 4 palabras («Un día antes», «No pasó la prueba»): caen como titulares encima del dibujo, con la persona todavía en pantalla. Que en cada escena salga al menos una persona.";

/** El diseño de los videos de una temática (clásico si no dice nada o si no existe). */
export function estiloDeTematica(id: string): EstiloVideo {
  return TEMATICAS.find((t) => t.id === id)?.estilo ?? "clasico";
}

export const TEMATICAS: Tematica[] = [
  {
    id: "novedades-ia",
    nombre: "Novedades de IA: lanzamientos y qué cambia",
    canal: "canal-ia",
    activa: true,
    tono: "directo y sin rodeos, de alguien que construye software con IA todos los días; claro para quien no programa, con opinión propia y sin exagerar",
    duracionObjetivo: { largo: 300, short: 50 },
    plantilla: "TechExplainer",
    estilo: "ilustrado",
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
      "`musica`: siempre un ritmo con bombo y bajo que empuje («driving kick and bass beat, dark pulse»); nada de melodías que distraigan.",
      REGLA_ILUSTRADO,
    ],
  },
  {
    id: "explicador",
    nombre: "Así funciona: explicado con diagramas de neón",
    canal: "canal-ia",
    activa: true,
    tono: "de profesor claro y directo: explica cómo funciona algo paso a paso, con palabras de todos los días y sin jerga",
    duracionObjetivo: { largo: 150, short: 45 },
    plantilla: "TechExplainer",
    estilo: "neon",
    ctaProductos: PRODUCTOS_SOFTWARE,
    estructuras: [
      ["gancho", "contexto", "demo", "demo", "dato", "opinion", "cierre"],
      ["gancho", "problema", "demo", "demo", "demo", "opinion", "cierre"],
    ],
    bibliotecaEtiquetas: ["sorpresa", "exito"],
    densidadRecursos: "baja",
    cortesComerciales: { cantidad: 0, duracionSeg: [0, 0] },
    reglas: [
      "Este video NO lleva fotos, clips ni imágenes generadas: TODAS las escenas con narración son `visual.tipo`: «diagrama», también la primera (esta temática no abre con una persona). No uses «stock», «foto», «ia», «periodico», «red» ni `visual.planos`.",
      "La única escena que no es diagrama es la de opinión: va como «texto», con `visual.texto_en_pantalla`: «Mi opinión».",
      "Explica UN proceso de punta a punta, en el orden en que pasa de verdad: quién empieza, qué hace cada uno, qué cambia y qué queda al final. Cada escena es una etapa (su `diagrama.seccion`), con 2 a 5 objetos.",
      "Solo se explica lo que está en el contexto pegado: los pasos, los nombres de las pantallas y las reglas del sistema salen de ahí. Si un paso no está, no se inventa.",
      "La última escena («cierre») es el remate: un `visual.titular` de hasta 3 palabras que resuma el beneficio («TODO CUADRA SOLO»), la frase de apoyo en `visual.cuerpo`, y un solo objeto («grafica», «listo» o «dinero»).",
      "`musica`: un ritmo con bombo y bajo, constante y sin melodía («driving kick and bass beat, dark pulse»).",
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
    estilo: "ilustrado",
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
    estilo: "ilustrado",
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
      REGLA_ILUSTRADO,
    ],
  },
  {
    // Historias de música contadas en Cómic (las personas dibujadas) para Caprichoso TV. La
    // primera: Shakira, trece noches en Madrid (elegida por Richard el 6 oct 2026).
    id: "historias-musica",
    nombre: "Historia de música (Cómic: las personas dibujadas)",
    canal: "caprichoso-tv",
    activa: true,
    tono: "de contador de historias, directo, con asombro de verdad por los números y con un mensaje para el artista que empieza; sin adornos ni palabras de fan",
    duracionObjetivo: { largo: 270, short: 50 },
    plantilla: "TechExplainer",
    estilo: "ilustrado",
    ctaProductos: [],
    estructuras: [
      [
        "gancho",
        "contexto",
        "dato",
        "contexto",
        "problema",
        "dato",
        "contexto",
        "problema",
        "opinion",
        "cierre",
      ],
      ["gancho", "dato", "contexto", "dato", "problema", "opinion", "cierre"],
    ],
    bibliotecaEtiquetas: ["sorpresa", "tension", "exito"],
    densidadRecursos: "media",
    cortesComerciales: { cantidad: 0, duracionSeg: [0, 0] },
    reglas: [
      "Abre con el dato más grande de la historia en la primera frase, sin saludar ni presentar el tema.",
      "Toda cifra, fecha, nombre y lugar sale del contexto pegado; lo que no esté ahí no se dice. Las cuentas propias (trece por cincuenta mil) se dicen como cuentas («saca la cuenta»).",
      "Cada persona que se nombra va con su plano «foto» y su nombre en `texto` (sale dibujada); los lugares con `foto_de`: «lugar». Las cifras saltan en planos «dato».",
      "Cero música del artista: no se cita ni se reproduce ninguna canción; se pueden nombrar títulos como dato.",
      "Cierra con un mensaje para el artista que empieza, una pregunta para los comentarios y la invitación a suscribirse.",
      "`musica`: un ritmo del género de la historia, instrumental, sin melodía que compita con la voz.",
      REGLA_ILUSTRADO,
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
  // Formato Presentador: los guiones que nacen de una grabación de Richard (docs/PRESENTADOR.md).
  // No se eligen en «Nuevo video»: se crean solos al subir la grabación. El diseño de atrás
  // (Neón, Cómic o Documental) lo elige él en cada grabación, por eso aquí no va `estilo`.
  {
    id: "presentador",
    nombre: "Presentador (grabación propia)",
    canal: "canal-ia",
    activa: false,
    tono: "el de Richard hablando en cámara",
    duracionObjetivo: { largo: 300, short: 45 },
    plantilla: "TechExplainer",
    ctaProductos: [],
    estructuras: [["gancho", "contexto", "dato", "cierre"]],
    bibliotecaEtiquetas: [],
    densidadRecursos: "media",
    cortesComerciales: { cantidad: 0, duracionSeg: [0, 0] },
    reglas: ["La narración es lo que Richard dijo en la grabación: no se reescribe."],
  },
  // Comerciales: videos publicitarios con el material de un cliente (docs/COMERCIALES.md). No se
  // eligen en «Nuevo video»: nacen en el menú Comerciales. Sin marca de canal ni Shorts.
  {
    id: "comercial",
    nombre: "Comercial (video publicitario de un cliente)",
    canal: "canal-ia",
    activa: false,
    tono: "publicitario, claro y directo, en el idioma del texto del cliente",
    duracionObjetivo: { largo: 70, short: 0 },
    plantilla: "TechExplainer",
    ctaProductos: [],
    estructuras: [["gancho", "contexto", "dato", "cierre"]],
    bibliotecaEtiquetas: [],
    densidadRecursos: "alta",
    cortesComerciales: { cantidad: 0, duracionSeg: [0, 0] },
    reglas: ["La narración es el texto del cliente: no se reescribe. Solo salen sus imágenes."],
  },
  {
    id: "presentador-tv",
    nombre: "Presentador (grabación propia)",
    canal: "caprichoso-tv",
    activa: false,
    tono: "el de Richard hablando en cámara",
    duracionObjetivo: { largo: 300, short: 45 },
    plantilla: "MiniDocumental",
    ctaProductos: [],
    estructuras: [["gancho", "contexto", "dato", "cierre"]],
    bibliotecaEtiquetas: [],
    densidadRecursos: "media",
    cortesComerciales: { cantidad: 0, duracionSeg: [0, 0] },
    reglas: ["La narración es lo que Richard dijo en la grabación: no se reescribe."],
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
