// Lo que recibe la plantilla de video. Todo viene calculado por la Estación:
// la plantilla solo dibuja.
import { z } from "zod";

export const esquemaPalabra = z.object({
  text: z.string(),
  startMs: z.number(),
  endMs: z.number(),
  timestampMs: z.number().nullable(),
  confidence: z.number().nullable(),
});

// Foto o imagen generada. `enfoque`: dónde está la persona (fracciones 0-1),
// para recortar en vertical sin cortarle la cara (C-SHORTS-2).
export const esquemaFoto = z.object({
  ruta: z.string(),
  ancho: z.number(),
  alto: z.number(),
  enfoque: z.object({ x: z.number(), y: z.number() }).nullable().default(null),
});

// Un cambio de imagen dentro de una escena (C-RITMO-1): entra en `inicioMs`
// (tiempo del video largo) y dura hasta el siguiente plano o el fin de la escena.
export const esquemaPlanoVideo = z.object({
  inicioMs: z.number(),
  // foto: imagen con movimiento · clip: video de ambiente · dato: cifra o frase corta en grande ·
  // imagen: un archivo del cliente (logo o captura) sobre el fondo de neón.
  tipo: z.enum(["foto", "clip", "dato", "imagen"]),
  foto: esquemaFoto.nullable().default(null),
  clip: z.object({ ruta: z.string(), duracionSeg: z.number() }).nullable().default(null),
  // En «dato», lo que se lee en grande. En «foto», el nombre que se rotula (o vacío).
  texto: z.string().default(""),
  // Estilo ilustrado: la persona de la foto, redibujada y recortada (PNG sin fondo). Con figura,
  // el plano se dibuja como una ilustración sobre fondo de cómic, no como una foto a pantalla llena.
  figura: z.object({ ruta: z.string(), ancho: z.number(), alto: z.number() }).nullable().default(null),
  // La figura ya estaba en pantalla en el plano anterior: no vuelve a entrar, solo cambia el titular.
  sigue: z.boolean().default(false),
  // En «imagen»: un logo o figura sin fondo (flota) o una captura (va en una tarjeta).
  transparente: z.boolean().default(false),
});

// Estilo neón: una escena explicada con un diagrama. Cada elemento entra cuando la voz lo nombra.
export const esquemaDiagramaVideo = z.object({
  numero: z.number(), // qué diagrama es dentro del video (1, 2, 3…)
  secciones: z.array(z.string()).default([]), // las secciones de todo el video, para la barra de arriba
  seccion: z.number().default(0), // en cuál va esta escena
  titular: z.string().default(""),
  bajada: z.string().default(""),
  nodos: z
    .array(
      z.object({
        id: z.string(),
        icono: z.string(),
        etiqueta: z.string(),
        nota: z.string().default(""),
        entraMs: z.number(),
      }),
    )
    .default([]),
  flechas: z
    .array(z.object({ de: z.string(), a: z.string(), texto: z.string().default(""), entraMs: z.number() }))
    .default([]),
  formula: z.string().default(""),
  formulaMs: z.number().nullable().default(null),
});
export type DiagramaVideo = z.infer<typeof esquemaDiagramaVideo>;

export const esquemaEscenaVideo = z.object({
  parte: z.string(),
  inicioMs: z.number(),
  finMs: z.number(),
  textoEnPantalla: z.string().default(""),
  // "clip": clip de fondo con rótulo arriba. "frase": clip difuminado con la frase
  // grande al centro. "foto": fotografía real con movimiento lento y marco.
  // "titular": titular enorme con golpe. "recorte": recorte de periódico o tarjeta de red social.
  // "diagrama": explicación con elementos de neón que entran al nombrarlos (estilo neón).
  estilo: z.enum(["clip", "frase", "foto", "titular", "recorte", "diagrama"]).default("clip"),
  // Ruta relativa al publicDir (staticFile) del clip de fondo, o null si no hubo ninguno.
  clip: z.object({ ruta: z.string(), duracionSeg: z.number() }).nullable(),
  foto: esquemaFoto.nullable().default(null),
  // Varias imágenes en la misma escena (una por frase de la narración): se
  // muestran en orden, cada una con su movimiento, repartidas en el tiempo.
  fotos: z.array(esquemaFoto).default([]),
  recorte: z
    .object({
      tipo: z.enum(["periodico", "red", "titular"]),
      titular: z.string().default(""),
      fecha: z.string().default(""),
      cuerpo: z.string().default(""),
    })
    .nullable()
    .default(null),
  // Respiro musical: no hay voz en este tramo, la música sube y pasan las imágenes.
  interludio: z.boolean().default(false),
  // Foto (de la persona) difuminada como fondo, en vez de clip. Biografías.
  fondoFoto: z.string().nullable().default(null),
  // Los cambios de imagen de la escena, en orden. Vacío = la escena es una sola imagen.
  planos: z.array(esquemaPlanoVideo).default([]),
  diagrama: esquemaDiagramaVideo.nullable().default(null),
});

export const esquemaSfx = z.object({
  whoosh: z.array(z.string()).default([]),
  pop: z.string().nullable().default(null),
  riser: z.string().nullable().default(null),
  ding: z.string().nullable().default(null),
  boom: z.string().nullable().default(null),
  // Sonidos cortos y bajitos para cada cambio de imagen (chasquido, soplido): se van alternando.
  corte: z.array(z.string()).default([]),
});

export const esquemaPropsVideo = z.object({
  titulo: z.string(),
  audio: z.string(), // ruta relativa al publicDir
  duracionMs: z.number(),
  palabras: z.array(esquemaPalabra),
  escenas: z.array(esquemaEscenaVideo),
  producto: z.object({ nombre: z.string(), url: z.string() }).nullable(),
  vozDePrueba: z.boolean().default(false),
  // "tech": explicador de tecnología. "documental": biografías, más pausado y con serif.
  tema: z.enum(["tech", "documental"]).default("tech"),
  // El idioma de lo que se lee en pantalla que pone la plantilla («Paso 2 de 4» / «Step 2 of 4»).
  idioma: z.enum(["es", "en"]).default("es"),
  // El diseño del video (docs/ESTILOS.md). "clasico": fotos y clips a pantalla llena.
  // "ilustrado": las personas salen dibujadas sobre fondo de cómic. "neon": diagramas de neón.
  // "mixto": neón con personajes (diagramas, y las personas que se nombran, dibujadas sobre el neón).
  // (La lista se repite aquí porque la plantilla no puede importar código de fuera de su
  // carpeta; una prueba comprueba que sea la misma que ESTILOS_VIDEO.)
  // "cancion": Richard canta con su fondo real y arriba va un boceto a lápiz por verso (solo vertical).
  estilo: z.enum(["clasico", "ilustrado", "neon", "mixto", "cancion"]).default("clasico"),
  sfx: esquemaSfx.default({ whoosh: [], pop: null, riser: null, ding: null, boom: null, corte: [] }),
  // Música de fondo (ruta relativa al publicDir), ya normalizada de volumen. Se repite en bucle.
  // `nivel`: cuánto más alta o más baja va la música bajo la voz en ESTE video (1 = lo normal).
  musica: z
    .object({ ruta: z.string(), duracionSeg: z.number(), nivel: z.number().min(0.5).max(1.25).default(1) })
    .nullable()
    .default(null),
  // Cierre de los shorts: «ver video completo» con la miniatura del largo
  // (data URI PNG), el título y el canal. Solo lo usan los shorts.
  cierre: z
    .object({
      canalNombre: z.string(),
      canalUsuario: z.string(),
      miniatura: z.string().nullable(),
    })
    .nullable()
    .default(null),
  // Marca del canal (logo, nombre, @ y lema): con marca, el video sale con el
  // aspecto del canal (letra de código, colores del logo, logo fijo y cierre propio).
  marca: z
    .object({
      id: z.string(),
      logo: z.string(), // ruta relativa al publicDir
      nombre: z.string(),
      usuario: z.string(),
      lema: z.string().default(""),
      acento: z.string(),
      secundario: z.string(),
    })
    .nullable()
    .default(null),
  // Formato Presentador (docs/PRESENTADOR.md): la grabación de Richard encima de los gráficos.
  // `transparente`: se grabó con croma y ya no tiene fondo; si no, se muestra en una ventana.
  // `momentos`: cuándo sale grande («completo») y cuándo en la esquina, en tiempo del video largo.
  presentador: z
    .object({
      ruta: z.string(),
      ancho: z.number(),
      alto: z.number(),
      transparente: z.boolean().default(true),
      momentos: z
        .array(z.object({ inicioMs: z.number(), modo: z.enum(["completo", "esquina"]) }))
        .default([]),
    })
    .nullable()
    .default(null),
  // Short: trozo del video largo que se dibuja en 9:16, con su título al
  // arrancar y un cierre de «ver video completo». Todo lo demás es lo mismo.
  ventana: z
    .object({
      inicioMs: z.number(),
      finMs: z.number(),
      titulo: z.string(),
      indice: z.number(),
      total: z.number(),
    })
    .nullable()
    .default(null),
});

export type PropsVideo = z.infer<typeof esquemaPropsVideo>;

// Portada de impacto (la miniatura que se lleva el clic): la persona recortada
// de su foto, encima de un fondo de color, con una palabra o cifra enorme y un
// remate. Horizontal (1280×720) para el video largo; vertical (1080×1920) para
// cada Short. Dónde va la persona lo calcula quien la arma (compartido/portada.ts).
export const esquemaPortada = z.object({
  formato: z.enum(["horizontal", "vertical"]).default("horizontal"),
  // La persona, ya recortada (PNG con fondo transparente) y ya colocada, en puntos de la portada.
  sujeto: z
    .object({
      ruta: z.string(),
      izquierda: z.number(),
      arriba: z.number(),
      ancho: z.number(),
      alto: z.number(),
    })
    .nullable()
    .default(null),
  // Sin persona que recortar: una foto del video a pantalla completa, oscurecida detrás del texto.
  fondoFoto: z.string().nullable().default(null),
  // Un objeto recortado (un trofeo, un disco), si va tachado con la señal de prohibido, y cuánto de
  // su alto se muestra desde arriba (0.62 deja fuera la base de un trofeo con la placa de otro).
  objeto: z
    .object({
      ruta: z.string(),
      ancho: z.number(),
      alto: z.number(),
      tachado: z.boolean().default(false),
      mostrar: z.number().min(0.2).max(1).default(1),
    })
    .nullable()
    .default(null),
  etiqueta: z.string().default(""), // arriba, chico: quién es («PRINCE ROYCE»)
  cifra: z.string().default(""), // lo enorme: una cifra o una palabra («15», «VETADO»)
  linea: z.string().default(""), // lo que cuenta («NOMINACIONES»)
  // El golpe, en una caja de color. Lo que va entre asteriscos sale en el color de acento («*CERO* PREMIOS»).
  remate: z.string().default(""),
  // Comerciales: el logo del cliente (PNG sin fondo), grande, donde iría la persona.
  logo: z.object({ ruta: z.string(), ancho: z.number(), alto: z.number() }).nullable().default(null),
  // Hasta tres nombres que la gente reconoce (las marcas de las que habla el video: «ChatGPT»,
  // «Gemini»), en pastillas blancas debajo del titular.
  chips: z.array(z.string()).max(3).default([]),
  // El color de la luz de atrás de la persona y el color del fondo.
  fondo: z.tuple([z.string(), z.string()]).default(["#d00000", "#14000a"]),
  acento: z.string().default("#ffd60a"),
});
export type PropsPortada = z.infer<typeof esquemaPortada>;

/**
 * Una línea de la portada, palabra por palabra: la que viene entre virgulillas («~GRATIS~») va
 * TACHADA con una raya roja, y la que viene entre asteriscos («*CERO*»), en el color de acento.
 */
export function partesDeLinea(texto: string): { texto: string; marcada: boolean; tachada: boolean }[] {
  return texto
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => {
      const tachada = w.length > 2 && w.startsWith("~") && w.endsWith("~");
      const marcada = w.length > 2 && w.startsWith("*") && w.endsWith("*");
      return { texto: tachada || marcada ? w.slice(1, -1) : w, marcada, tachada };
    });
}

/** El remate, palabra por palabra: la que viene entre asteriscos («*CERO*») va en el color de acento. */
export function partesDelRemate(remate: string): { texto: string; marcada: boolean }[] {
  return remate
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => {
      const marcada = w.length > 2 && w.startsWith("*") && w.endsWith("*");
      return { texto: marcada ? w.slice(1, -1) : w, marcada };
    });
}

/** El tamaño de letra más grande con el que un texto cabe en un ancho (letra condensada, en mayúsculas). */
export function letraQueCabe(texto: string, ancho: number, maximo: number): number {
  const letras = Math.max(1, texto.replace(/[*~]/g, "").length);
  return Math.round(Math.min(maximo, ancho / (letras * 0.52)));
}

export const FPS = 30;
export const COLA_FINAL_MS = 1500;
// Con música, el video respira al final: la música sube unos segundos y se apaga.
export const COLA_CON_MUSICA_MS = 4000;

// Con marca, el video largo termina con el cierre del canal (logo y «suscríbete»).
export const COLA_CON_MARCA_MS = 5500;

export function colaFinalMs(conMusica: boolean, conMarca: boolean): number {
  return conMarca ? COLA_CON_MARCA_MS : conMusica ? COLA_CON_MUSICA_MS : COLA_FINAL_MS;
}

export function duracionEnFrames(duracionMs: number, conMusica = false, conMarca = false): number {
  return Math.ceil(((duracionMs + colaFinalMs(conMusica, conMarca)) / 1000) * FPS);
}

// Sin portada: el short arranca con imagen y voz en el segundo cero; el título
// pasa como una banda encima (C-GANCHO-1).
export const INTRO_SHORT_MS = 0;
export const CIERRE_SHORT_MS = 5000;

export function duracionShortEnFrames(ventana: { inicioMs: number; finMs: number }): number {
  return Math.ceil(((INTRO_SHORT_MS + (ventana.finMs - ventana.inicioMs) + CIERRE_SHORT_MS) / 1000) * FPS);
}

/** Frames que dura un video con o sin ventana (lo usan las composiciones). */
export function framesDe(props: {
  duracionMs: number;
  musica?: unknown;
  marca?: unknown;
  ventana?: { inicioMs: number; finMs: number } | null;
}): number {
  return props.ventana
    ? duracionShortEnFrames(props.ventana)
    : duracionEnFrames(props.duracionMs, Boolean(props.musica), Boolean(props.marca));
}
