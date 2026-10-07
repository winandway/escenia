// Portadas de impacto (las miniaturas que se llevan el clic): una por pieza,
// horizontal para el video largo y vertical para cada Short. Aquí vive lo que
// no depende de la Mac ni del panel: qué texto lleva, qué foto sirve, dónde va
// la cara y cuál miniatura le toca a cada pieza. Guía: docs/PORTADA.md.

export type FormatoPortada = "horizontal" | "vertical";
export const MEDIDAS_PORTADA = {
  horizontal: { ancho: 1280, alto: 720 },
  vertical: { ancho: 1080, alto: 1920 },
} as const;

/** Lo que se lee en la portada. `persona` es a quién se ve (tiene que salir en el video con su nombre). */
export type TextoPortada = { persona: string; grande: string; linea: string; remate: string };

const sinTildes = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

/**
 * Recorta por palabras enteras: una portada nunca termina en media palabra.
 * Los asteriscos que marcan la palabra fuerte no cuentan como letras.
 */
function recortarPalabras(texto: string, maximo: number): string {
  const limpio = texto
    .replace(/\s+/g, " ")
    .replace(/[.,;:!¡¿?…\s]+$/u, "")
    .trim();
  // Tampoco cuentan las virgulillas que marcan una palabra TACHADA («IA ~GRATIS~»).
  const letras = (s: string) => s.replace(/[*~]/g, "").length;
  // Si se pasa por poco (hasta un 20 %), va entera y la plantilla la hace apenas más chica: «SIN
  // SUERTE» (10 letras, tope 9) recortado quedaba en «SIN» (6 oct 2026, Short 3 de Shakira).
  if (letras(limpio) <= Math.round(maximo * 1.2)) return limpio;
  const palabras = limpio.split(" ");
  // La palabra marcada (la fuerte entre asteriscos o la tachada entre virgulillas) es el golpe
  // de la línea y NUNCA se recorta: el 5 oct 2026 «NOT JUST A ~TEMPLATE~» quedó en «NOT JUST A».
  // Se quitan las de relleno que vienen después de ella; si aun así no cabe, va entera y más chica.
  let ultimaMarcada = -1;
  palabras.forEach((w, k) => {
    // Una palabra marcada sola («*CERO*») o la que cierra una marca de varias («SOLTAR*»).
    if (/^[*~].+[*~]$/.test(w) || /[*~]$/.test(w)) ultimaMarcada = k;
  });
  while (palabras.length > 1 && letras(palabras.join(" ")) > maximo) {
    if (palabras.length - 1 <= ultimaMarcada) break;
    palabras.pop();
  }
  // Una línea recortada no termina en una palabrita de enlace («DÉCADAS DE» → «DÉCADAS»).
  while (
    palabras.length > 1 &&
    /^(DE|DEL|A|Y|E|O|U|EN|SIN|CON|POR|LA|EL|LOS|LAS|UN|UNA)$/i.test(palabras[palabras.length - 1] ?? "")
  )
    palabras.pop();
  return palabras.join(" ");
}

/**
 * La miniatura de una CANCIÓN lleva el nombre de la canción partido en dos, EN ORDEN de lectura:
 * lo que cabe en la línea grande (9 letras) arriba y el resto (16 letras) debajo, con la última
 * palabra resaltada: «DE CERO / A *REINA*». La IA lo ponía al revés («REINA / DE CERO A», 6 oct
 * 2026) y así no se entiende. Si el nombre no cabe partido así, se dejan los textos de la IA.
 */
export function tituloDeCancionEnDosLineas(titulo: string): { grande: string; linea: string } | null {
  const palabras = titulo.replace(/[«»"]/g, "").trim().toUpperCase().split(/\s+/).filter(Boolean);
  if (palabras.length < 2) return null;
  let corte = 0;
  while (corte < palabras.length - 1 && palabras.slice(0, corte + 1).join(" ").length <= 9) corte++;
  // La línea grande no termina en una palabrita de enlace («A», «DE», «Y»): esa va con lo que sigue.
  while (corte > 1 && (palabras[corte - 1] ?? "").length <= 2) corte--;
  const grande = palabras.slice(0, corte).join(" ");
  const resto = palabras.slice(corte);
  if (!grande || resto.length === 0 || resto.join(" ").length > 16) return null;
  const ultima = resto[resto.length - 1] ?? "";
  const linea = [...resto.slice(0, -1), `*${ultima}*`].join(" ");
  return { grande, linea };
}

/** Deja el texto listo para la portada: mayúsculas, sin puntos finales y del largo que se lee en chiquito. */
export function textoDePortada(t: Partial<TextoPortada>): TextoPortada {
  return {
    persona: (t.persona ?? "").replace(/\s+/g, " ").trim(),
    grande: recortarPalabras((t.grande ?? "").toUpperCase(), 9),
    linea: recortarPalabras((t.linea ?? "").toUpperCase(), 16),
    remate: recortarPalabras((t.remate ?? "").toUpperCase(), 20),
  };
}

/**
 * El nombre de la persona de un rótulo: «Prince Royce, 2010» → «Prince Royce».
 * Un rótulo de lugar o de fecha («Yankee Stadium · 2014») o de dos personas
 * («Romeo Santos y Prince Royce») no nombra a UNA persona: devuelve vacío.
 */
export function nombreDeRotulo(rotulo: string): string {
  const texto = rotulo.replace(/\s+/g, " ").trim();
  if (!texto || texto.includes("·") || / (y|e|and|&|con) /iu.test(texto)) return "";
  const nombre = (texto.split(",")[0] ?? "").trim();
  return /\d/.test(nombre) ? "" : nombre;
}

const esLaMisma = (a: string, b: string) => {
  const x = sinTildes(a);
  const y = sinTildes(b);
  return x.length > 1 && y.length > 1 && (x === y || x.includes(y) || y.includes(x));
};

export type FotoRotulada = { ruta: string; rotulo: string; escena: number };
export type Candidata = { ruta: string; nombre: string };

/**
 * Las fotos que pueden ir en la portada de una pieza, de mejor a peor: primero
 * la persona pedida (en las escenas de la pieza y después en el resto del
 * video) y después el protagonista del video. Nunca otra persona: la portada
 * no puede mostrar a alguien de quien el texto no habla.
 */
export function candidatasDePortada(
  fotos: FotoRotulada[],
  escenas: { inicio: number; fin: number },
  persona: string,
  protagonista: string,
): Candidata[] {
  const dentro = (f: FotoRotulada) => f.escena >= escenas.inicio && f.escena <= escenas.fin;
  const conNombre = fotos
    .map((f) => ({ ...f, nombre: nombreDeRotulo(f.rotulo) }))
    .filter((f) => f.nombre.length > 0);
  const de = (quien: string) => (quien ? conNombre.filter((f) => esLaMisma(f.nombre, quien)) : []);
  const orden = [
    ...de(persona).filter(dentro),
    ...de(persona).filter((f) => !dentro(f)),
    ...de(protagonista).filter(dentro),
    ...de(protagonista).filter((f) => !dentro(f)),
  ];
  const vistas = new Set<string>();
  return orden
    .filter((f) => (vistas.has(f.ruta) ? false : (vistas.add(f.ruta), true)))
    .map((f) => ({ ruta: f.ruta, nombre: f.nombre }));
}

export type Cara = { x: number; y: number; ancho: number; alto: number };
// `cobertura`: qué parte de la foto ocupa el recuadro del recorte. `lleno`: qué parte de ese
// recuadro es figura (el resto quedó transparente); cerca de 1 = no se quitó ningún fondo.
export type Recorte = { ancho: number; alto: number; cobertura: number; lleno?: number; caras: Cara[] };

/**
 * ¿Sirve este recorte para una portada? Tiene que ser UNA persona (una foto de
 * grupo no dice quién es), recortada de verdad (si el «sujeto» es casi la foto
 * entera —una carátula de disco, un retrato cerrado— queda un rectángulo pegado,
 * con sus letras y todo) y con la cara grande para no verse borrosa.
 */
export function recorteSirve(r: Recorte): boolean {
  const cara = r.caras[0];
  if (r.caras.length !== 1 || !cara) return false;
  if (r.cobertura < 0.06 || r.cobertura > 0.86) return false;
  return cara.alto * r.alto >= 90;
}

/**
 * Formato Presentador: la persona de la portada es Richard, sacado de su propia grabación (ya
 * sin fondo). De varios cuadros, se queda con el de gesto más abierto —una mano levantada, un
 * dedo señalando: la figura sale más ancha— entre los que tienen su cara bien a la vista, y que
 * no sea el mismo momento de otra portada del video (`usados`, en segundos).
 */
export function mejorCuadroDePresentador<T extends { seg: number; recorte: Recorte }>(
  candidatos: T[],
  usados: number[] = [],
): T | null {
  const validos = candidatos.filter((c) => {
    const cara = c.recorte.caras[0];
    return c.recorte.caras.length === 1 && cara !== undefined && cara.alto * c.recorte.alto >= 90;
  });
  const libres = validos.filter((c) => usados.every((u) => Math.abs(u - c.seg) >= 3));
  const gesto = (c: T) => c.recorte.ancho / c.recorte.alto;
  return [...(libres.length ? libres : validos)].sort((a, b) => gesto(b) - gesto(a))[0] ?? null;
}

/** Los instantes (en segundos) de donde se sacan los cuadros candidatos de un tramo del video. */
export function instantesDeMuestra(desdeMs: number, hastaMs: number, cuantos = 14): number[] {
  const desde = desdeMs / 1000 + 1;
  const hasta = Math.max(desde, hastaMs / 1000 - 1.5);
  if (hasta - desde < 0.5) return [Math.round(desde * 10) / 10];
  return Array.from(
    { length: cuantos },
    (_, k) => Math.round((desde + ((hasta - desde) * (k + 0.5)) / cuantos) * 10) / 10,
  );
}

/** Dónde queda la cara en cada formato (en puntos de la portada). Deja sitio arriba para el pelo o la gorra. */
export const CARA_EN_PORTADA = {
  horizontal: { alto: 200, centroX: 985, arriba: 108 },
  vertical: { alto: 380, centroX: 540, arriba: 1090 },
} as const;

/**
 * Dónde se pone la persona recortada: la cara siempre del mismo tamaño y en el
 * mismo sitio, y el cuerpo hasta el borde de abajo (nunca flotando). Si la foto
 * es solo un busto, se agranda hasta tocar el borde, con un tope para la cara.
 */
export function encuadre(
  formato: FormatoPortada,
  recorte: { ancho: number; alto: number },
  cara: Cara,
  acercar = 1,
): { izquierda: number; arriba: number; ancho: number; alto: number } {
  const lienzo = MEDIDAS_PORTADA[formato];
  const meta = CARA_EN_PORTADA[formato];
  let escala = (meta.alto * acercar) / (cara.alto * recorte.alto);
  let arriba = meta.arriba - escala * cara.y * recorte.alto;
  const flota = arriba + escala * recorte.alto < lienzo.alto;
  if (flota) {
    const hastaElBorde = (lienzo.alto - meta.arriba) / ((1 - cara.y) * recorte.alto);
    escala = Math.min(hastaElBorde, escala * 1.9);
  }
  const alto = Math.round(escala * recorte.alto);
  // Anclado abajo, a punto exacto: ni una raya de fondo entre la persona y el borde.
  if (flota) arriba = lienzo.alto - alto;
  const izquierda = meta.centroX - escala * (cara.x + cara.ancho / 2) * recorte.ancho;
  return {
    izquierda: Math.round(izquierda),
    arriba: Math.round(arriba),
    ancho: Math.round(escala * recorte.ancho),
    alto,
  };
}

/** La pieza de una miniatura guardada: «largo» o «short-2». Las de antes (sin pieza) son del largo. */
export function piezaDeMeta(meta: string): { clave: string; portada: boolean } {
  let datos: { pieza?: unknown; indice?: unknown; portada?: unknown } = {};
  try {
    datos = JSON.parse(meta || "{}") as typeof datos;
  } catch {
    datos = {};
  }
  const indice = Number(datos.indice);
  const clave =
    datos.pieza === "short" && Number.isInteger(indice) && indice > 0 ? `short-${indice}` : "largo";
  return { clave, portada: datos.portada === true };
}

/**
 * La miniatura de cada pieza de un guion. Las filas llegan de la más nueva a la
 * más vieja. Gana la portada de impacto más nueva de esa pieza; si no hay, la
 * miniatura automática. Un Short nunca le presta la suya al video largo.
 */
export function miniaturasPorPieza(
  filas: { tipo: string; clave: string; meta: string }[],
): Record<string, string> {
  const impacto: Record<string, string> = {};
  const automatica: Record<string, string> = {};
  for (const f of filas) {
    if (f.tipo !== "miniatura") continue;
    const p = piezaDeMeta(f.meta);
    const destino = p.portada ? impacto : automatica;
    // La más nueva de cada pieza gana (las filas llegan de la más vieja a la más nueva): una
    // miniatura rehecha reemplaza a la anterior en el panel (6 oct 2026: se seguía viendo la vieja).
    destino[p.clave] = f.clave;
  }
  return { ...automatica, ...impacto };
}

/**
 * Cada pieza de un mismo video sale con un color de fondo y una trama distintos (C-PORTADA-4):
 * Richard, 6 oct 2026: «si todas se ven iguales, la gente cree que esa ya la vio». El largo
 * lleva los colores del canal; cada Short, una variante.
 */
export const PALETAS_DE_PIEZA: { fondo: [string, string]; acento: string }[] = [
  { fondo: ["#1d4ed8", "#050a1e"], acento: "#ffd60a" },
  { fondo: ["#7c3aed", "#0b0415"], acento: "#fbbf24" },
  { fondo: ["#0f766e", "#02110f"], acento: "#fde047" },
  { fondo: ["#ea580c", "#1a0a02"], acento: "#fef08a" },
];
export function paletaDePieza<T extends { fondo: [string, string]; acento: string }>(
  base: T,
  indice: number,
): T {
  if (indice <= 0) return base;
  const v = PALETAS_DE_PIEZA[(indice - 1) % PALETAS_DE_PIEZA.length];
  return v ? { ...base, ...v } : base;
}
export const TRAMAS = ["puntos", "lineas", "rejilla"] as const;
export type Trama = (typeof TRAMAS)[number];
export const tramaDePieza = (indice: number): Trama =>
  TRAMAS[Math.max(0, indice) % TRAMAS.length] ?? "puntos";

/** Clave de una pieza del calendario o del panel: «largo» o «short-3». */
export const clavePieza = (pieza: "largo" | "short", indice: number) =>
  pieza === "short" ? `short-${indice}` : "largo";

/**
 * Comerciales: el logo del cliente para la portada. El último logo sin fondo que sale en la pieza
 * (el video cierra con la marca del cliente); si no hay, nada.
 */
export function logoDelCliente(
  props: {
    escenas: {
      planos: {
        tipo: string;
        transparente?: boolean;
        foto: { ruta: string; ancho: number; alto: number } | null;
      }[];
    }[];
  },
  inicio: number,
  fin: number,
): { ruta: string; ancho: number; alto: number } | null {
  const logos = props.escenas
    .slice(inicio, fin + 1)
    .flatMap((e) =>
      e.planos.filter((p) => p.tipo === "imagen" && p.transparente && p.foto).map((p) => p.foto),
    );
  const elegido = logos[logos.length - 1] ?? null;
  return elegido ? { ruta: elegido.ruta, ancho: elegido.ancho, alto: elegido.alto } : null;
}
