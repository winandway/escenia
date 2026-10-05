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
  const letras = (s: string) => s.replace(/\*/g, "").length;
  if (letras(limpio) <= maximo) return limpio;
  const palabras = limpio.split(" ");
  while (palabras.length > 1 && letras(palabras.join(" ")) > maximo) palabras.pop();
  return palabras.join(" ");
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
    if (!(p.clave in destino)) destino[p.clave] = f.clave;
  }
  return { ...automatica, ...impacto };
}

/** Clave de una pieza del calendario o del panel: «largo» o «short-3». */
export const clavePieza = (pieza: "largo" | "short", indice: number) =>
  pieza === "short" ? `short-${indice}` : "largo";
