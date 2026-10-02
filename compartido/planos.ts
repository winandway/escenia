// Ritmo visual (C-RITMO-1): cuándo entra cada plano y dónde hay que rellenar
// para que ninguna imagen se quede quieta más de unos segundos. Todo es
// cálculo puro: la Estación trae las imágenes y la plantilla las dibuja.

export type PalabraConTiempo = { text: string; startMs: number; endMs: number };

/** Lo más que una imagen puede quedarse sin cambiar. Pasado esto, se rellena. */
export const QUIETO_MAXIMO_MS = 5000;
/** Cada cuánto entra un plano de relleno. */
export const RELLENO_CADA_MS = 3800;
/** Dos planos no entran más pegados que esto (un parpadeo no se alcanza a ver). */
export const SEPARACION_MINIMA_MS = 1300;
/** El plano entra un pelo antes de la palabra, como corta un editor. */
export const ANTICIPO_MS = 120;
/** Un plano que entraría a menos de esto del final de la escena no vale la pena. */
const COLA_MINIMA_MS = 900;

/** Palabra sin acentos, sin signos y en minúsculas, para comparar lo escrito con lo dicho. */
export function claveDePalabra(palabra: string): string {
  return palabra
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9ñ]/g, "");
}

const clavesDe = (texto: string) => texto.split(/\s+/).map(claveDePalabra).filter(Boolean);

/** Índice de la palabra donde empieza `frase` (buscando desde `desde`), o null si no se dice. */
export function buscarFrase(palabras: PalabraConTiempo[], frase: string, desde = 0): number | null {
  const buscadas = clavesDe(frase);
  if (buscadas.length === 0) return null;
  const dichas = palabras.map((p) => claveDePalabra(p.text));
  for (let i = Math.max(0, desde); i + buscadas.length <= dichas.length; i++) {
    let k = 0;
    let j = i;
    // Las palabras vacías (un signo suelto) no cuentan ni rompen la frase.
    while (k < buscadas.length && j < dichas.length) {
      if (dichas[j] === "") j++;
      else if (dichas[j] === buscadas[k]) {
        j++;
        k++;
      } else break;
    }
    if (k === buscadas.length && dichas[i] !== "") return i;
  }
  return null;
}

/**
 * Cuándo entra cada plano de una escena. El que encuentra su frase entra justo
 * antes de esa palabra; el que no, se reparte entre sus vecinos. Devuelve un
 * tiempo por plano (en el mismo orden), o null si ese plano no cabe.
 */
export function tiemposDePlanos(
  frases: string[],
  palabras: PalabraConTiempo[],
  inicioMs: number,
  finMs: number,
): { tiempos: (number | null)[]; sinFrase: number } {
  const crudos: (number | null)[] = [];
  let desde = 0;
  let sinFrase = 0;
  for (const frase of frases) {
    const i = buscarFrase(palabras, frase, desde);
    const palabra = i === null ? undefined : palabras[i];
    if (i === null || !palabra) {
      crudos.push(null);
      sinFrase++;
      continue;
    }
    crudos.push(Math.max(inicioMs, palabra.startMs - ANTICIPO_MS));
    desde = i + 1;
  }
  // Los que no encontraron su frase se reparten entre el anterior y el siguiente conocidos.
  for (let i = 0; i < crudos.length; i++) {
    if (crudos[i] !== null) continue;
    let j = i;
    while (j < crudos.length && crudos[j] === null) j++;
    const antes = i === 0 ? inicioMs : (crudos[i - 1] ?? inicioMs);
    const despues = j < crudos.length ? (crudos[j] ?? finMs) : finMs;
    const paso = (despues - antes) / (j - i + 1);
    for (let k = i; k < j; k++) crudos[k] = Math.round(antes + paso * (k - i + 1));
    i = j - 1;
  }
  // En orden, sin amontonarse y sin entrar cuando la escena ya se acaba.
  let previo = -Infinity;
  const tiempos = crudos.map((t) => {
    if (t === null) return null;
    const ajustado = Math.max(t, previo + SEPARACION_MINIMA_MS);
    if (ajustado > finMs - COLA_MINIMA_MS) return null;
    previo = ajustado;
    return ajustado;
  });
  return { tiempos, sinFrase };
}

/**
 * Dónde meter planos de relleno para que nada se quede quieto: recibe los
 * cambios de imagen que ya hay en la escena (su arranque cuenta como uno) y
 * devuelve los tiempos que faltan.
 */
export function rellenarHuecos(
  cambios: number[],
  inicioMs: number,
  finMs: number,
  opciones: { quietoMaximoMs?: number; cadaMs?: number } = {},
): number[] {
  const quieto = opciones.quietoMaximoMs ?? QUIETO_MAXIMO_MS;
  const cada = opciones.cadaMs ?? RELLENO_CADA_MS;
  const marcas = [...new Set([inicioMs, ...cambios.filter((t) => t > inicioMs && t < finMs)])].sort(
    (a, b) => a - b,
  );
  const nuevos: number[] = [];
  for (let i = 0; i < marcas.length; i++) {
    const desde = marcas[i] ?? inicioMs;
    const hasta = marcas[i + 1] ?? finMs;
    const hueco = hasta - desde;
    if (hueco <= quieto) continue;
    // Se parte el hueco en tramos parejos de más o menos `cada`.
    const tramos = Math.max(2, Math.round(hueco / cada));
    for (let k = 1; k < tramos; k++) {
      const t = Math.round(desde + (hueco * k) / tramos);
      if (t < finMs - COLA_MINIMA_MS) nuevos.push(t);
    }
  }
  return nuevos;
}

export type TramoQuieto = { escena: number; desdeMs: number; hastaMs: number };

/** Los tramos donde la imagen no cambia en más de `limiteMs`: el candado del ritmo visual. */
export function tramosQuietos(
  escenas: { inicioMs: number; finMs: number; cambios: number[] }[],
  limiteMs = QUIETO_MAXIMO_MS + 1500,
): TramoQuieto[] {
  const quietos: TramoQuieto[] = [];
  escenas.forEach((e, i) => {
    const marcas = [e.inicioMs, ...e.cambios.filter((t) => t > e.inicioMs && t < e.finMs), e.finMs].sort(
      (a, b) => a - b,
    );
    for (let k = 0; k + 1 < marcas.length; k++) {
      const desdeMs = marcas[k] ?? e.inicioMs;
      const hastaMs = marcas[k + 1] ?? e.finMs;
      if (hastaMs - desdeMs > limiteMs) quietos.push({ escena: i, desdeMs, hastaMs });
    }
  });
  return quietos;
}
