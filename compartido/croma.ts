// Dónde está el fondo de croma en una grabación (C-CROMA-1). La tela verde casi nunca
// llena el cuadro: arriba se ve el techo, a un lado una pared o una lámpara. Aquí se
// decide, mirando los puntos de unos cuadros, de qué color es la tela y qué zona del
// cuadro cubre, para borrar ese color y recortar todo lo que queda fuera de ella.

/** Un punto es de croma si es un verde (o un azul) vivo: mucho más de ese color que de los otros dos. */
const esVerde = (r: number, g: number, b: number) => g > 70 && g > r * 1.35 && g > b * 1.35;
const esAzul = (r: number, g: number, b: number) => b > 70 && b > r * 1.35 && b > g * 1.2;

/** La tela tiene que ocupar al menos esta parte del cuadro para contarla como croma. */
export const COBERTURA_MINIMA = 0.12;
/** Una fila cuenta como «de tela» si al menos esta parte de sus puntos es de croma. */
const FILA_DE_TELA = 0.35;
/** Una columna cuenta si al menos esta parte de la franja de arriba de la tela es de croma. */
const COLUMNA_DE_TELA = 0.5;

export type CromaDeCuadro = {
  /** El color de la tela en ese cuadro (la mediana de sus puntos). */
  color: [number, number, number];
  /** La zona que cubre la tela, en fracciones del cuadro (0 a 1). Por abajo llega siempre al borde. */
  zona: { x0: number; x1: number; y0: number };
  /** Qué parte del cuadro es de croma. */
  cobertura: number;
};

const mediana = (valores: number[]): number => {
  if (valores.length === 0) return 0;
  const orden = [...valores].sort((a, b) => a - b);
  return orden[Math.floor(orden.length / 2)] ?? 0;
};

/**
 * Mira un cuadro (puntos RGB seguidos, de arriba abajo) y dice si tiene una tela de croma,
 * de qué color y qué zona cubre. `null` si no hay (fondo negro, una sala, una pared).
 */
export function cromaDeCuadro(rgb: Uint8Array, ancho: number, alto: number): CromaDeCuadro | null {
  if (ancho < 4 || alto < 4 || rgb.length < ancho * alto * 3) return null;
  const punto = (x: number, y: number): [number, number, number] => {
    const i = (y * ancho + x) * 3;
    return [rgb[i] ?? 0, rgb[i + 1] ?? 0, rgb[i + 2] ?? 0];
  };
  let verdes = 0;
  let azules = 0;
  for (let y = 0; y < alto; y++)
    for (let x = 0; x < ancho; x++) {
      const [r, g, b] = punto(x, y);
      if (esVerde(r, g, b)) verdes++;
      else if (esAzul(r, g, b)) azules++;
    }
  const prueba = verdes >= azules ? esVerde : esAzul;
  const cobertura = Math.max(verdes, azules) / (ancho * alto);
  if (cobertura < COBERTURA_MINIMA) return null;
  const deCroma = (x: number, y: number) => prueba(...punto(x, y));

  // De arriba abajo: la primera fila que es casi toda tela. De ahí para abajo, la tela sigue
  // hasta el borde (la persona la tapa, pero está detrás).
  let y0 = -1;
  for (let y = 0; y < alto && y0 < 0; y++) {
    let n = 0;
    for (let x = 0; x < ancho; x++) if (deCroma(x, y)) n++;
    if (n / ancho >= FILA_DE_TELA) y0 = y;
  }
  if (y0 < 0) return null;
  // De lado a lado: se mira la franja de arriba de la tela (a la altura de la cabeza, donde la
  // persona es angosta). Los bordes son la primera y la última columna que son tela.
  const franja = Math.max(2, Math.round((alto - y0) * 0.25));
  const columnas: number[] = [];
  for (let x = 0; x < ancho; x++) {
    let n = 0;
    for (let y = y0; y < Math.min(alto, y0 + franja); y++) if (deCroma(x, y)) n++;
    if (n / Math.min(franja, alto - y0) >= COLUMNA_DE_TELA) columnas.push(x);
  }
  const primera = columnas[0];
  const ultima = columnas[columnas.length - 1];
  if (primera === undefined || ultima === undefined || ultima - primera < ancho * 0.3) return null;

  const rojos: number[] = [];
  const verdesDe: number[] = [];
  const azulesDe: number[] = [];
  for (let y = y0; y < alto; y++)
    for (let x = primera; x <= ultima; x++) {
      const [r, g, b] = punto(x, y);
      if (!prueba(r, g, b)) continue;
      rojos.push(r);
      verdesDe.push(g);
      azulesDe.push(b);
    }
  return {
    color: [mediana(rojos), mediana(verdesDe), mediana(azulesDe)],
    zona: { x0: primera / ancho, x1: (ultima + 1) / ancho, y0: y0 / alto },
    cobertura,
  };
}

export type Croma = {
  /** El color que se borra, como lo pide ffmpeg («0x35c24a»). */
  color: string;
  /** La zona de la grabación que se conserva (lo de afuera no es tela: se recorta), en fracciones. */
  zona: { x0: number; x1: number; y0: number };
};

/** Un margen hacia adentro, para no dejar el filo de la tela (arrugas, el borde de un panel). */
const MARGEN = 0.015;

/**
 * De varios cuadros de la grabación, el croma de toda ella: el color (la mediana) y la zona
 * que es tela en TODOS los cuadros. `null` si la mayoría de los cuadros no tiene croma.
 */
export function juntarCromas(cuadros: (CromaDeCuadro | null)[]): Croma | null {
  const buenos = cuadros.filter((c): c is CromaDeCuadro => c !== null);
  if (buenos.length === 0 || buenos.length < cuadros.length * 0.6) return null;
  const canal = (k: 0 | 1 | 2) => Math.round(mediana(buenos.map((c) => c.color[k])));
  const x0 = Math.max(...buenos.map((c) => c.zona.x0));
  const x1 = Math.min(...buenos.map((c) => c.zona.x1));
  const y0 = Math.max(...buenos.map((c) => c.zona.y0));
  // Donde la tela llega al borde del cuadro no hay filo que esconder.
  const zona = {
    x0: x0 <= 0.005 ? 0 : Math.min(1, x0 + MARGEN),
    x1: x1 >= 0.995 ? 1 : Math.max(0, x1 - MARGEN),
    y0: y0 <= 0.005 ? 0 : Math.min(1, y0 + MARGEN),
  };
  if (zona.x1 - zona.x0 < 0.3 || 1 - zona.y0 < 0.3) return null;
  return {
    color: `0x${[canal(0), canal(1), canal(2)].map((n) => n.toString(16).padStart(2, "0")).join("")}`,
    zona,
  };
}

/** La zona, en puntos de la grabación (medidas pares, como las quiere el video). */
export function zonaEnPuntos(
  zona: Croma["zona"],
  origen: { ancho: number; alto: number },
): { x: number; y: number; ancho: number; alto: number } {
  const par = (n: number) => Math.max(2, Math.floor(n / 2) * 2);
  const x = Math.min(origen.ancho - 2, Math.floor((zona.x0 * origen.ancho) / 2) * 2);
  const y = Math.min(origen.alto - 2, Math.floor((zona.y0 * origen.alto) / 2) * 2);
  return {
    x,
    y,
    ancho: par(Math.min(origen.ancho - x, zona.x1 * origen.ancho - x)),
    alto: par(origen.alto - y),
  };
}

/**
 * Cómo se borra la tela: por CUÁNTO VERDE (o azul) tiene cada punto de más sobre sus otros dos
 * colores. Un punto con ese exceso por encima de `alto` desaparece; por debajo de `bajo` se
 * queda entero; en el medio queda a medias (el borde del pelo, de la ropa).
 *
 * No se usa el `chromakey` de ffmpeg: mide el parecido de tono sin mirar la luz, y con una tela
 * de verde apagado (la de Richard, con luz de ventana) lo negro, lo gris y lo blanco le quedan
 * «cerca»: en la primera prueba real borró la chaqueta negra y la camiseta, y dejó la cara y las
 * manos flotando (C-CROMA-1). El exceso de verde no falla así: lo negro, lo gris, lo blanco y la
 * piel no tienen ninguno.
 */
export function umbralesDeCroma(color: string): { verde: boolean; bajo: number; alto: number } {
  const r = parseInt(color.slice(2, 4), 16);
  const g = parseInt(color.slice(4, 6), 16);
  const b = parseInt(color.slice(6, 8), 16);
  const verde = g >= b;
  // El exceso de la propia tela: sus arrugas y sombras tienen bastante menos, y también se van.
  const exceso = Math.max(20, verde ? g - Math.max(r, b) : b - Math.max(r, g));
  const bajo = Math.max(6, Math.round(exceso * 0.13));
  return { verde, bajo, alto: Math.max(bajo + 12, Math.round(exceso * 0.4)) };
}
