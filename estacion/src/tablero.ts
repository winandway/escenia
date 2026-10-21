// El «tablero de cuadritos» dibujado: muchas fotos que dicen ser transparentes traen el fondo de
// cuadros grises pintado. Vision lo quita casi todo, pero en un hueco angosto (entre el brazo y la
// cintura) deja un pedazo. Aquí se reconoce el tablero en el borde de la foto y se borra lo que quedó
// de él dentro de la figura: solo manchas que siguen el dibujo del tablero (nunca el pelo ni la ropa).
// Lógica pura, sin sharp: la prueban las pruebas de la raíz (C-CI-1).

export type Tablero = { celda: number; faseX: number; faseY: number; claro: number; oscuro: number };

const luma = (rgb: Uint8Array, i: number) =>
  ((rgb[i] ?? 0) * 299 + (rgb[i + 1] ?? 0) * 587 + (rgb[i + 2] ?? 0) * 114) / 1000;
const neutro = (rgb: Uint8Array, i: number) =>
  Math.abs((rgb[i] ?? 0) - (rgb[i + 1] ?? 0)) < 12 && Math.abs((rgb[i + 1] ?? 0) - (rgb[i + 2] ?? 0)) < 12;

/** Los cambios bruscos de claro a oscuro a lo largo de una fila (o columna) de puntos. */
function cambios(valores: number[]): number[] {
  const salida: number[] = [];
  for (let k = 1; k < valores.length; k++)
    if (Math.abs((valores[k] ?? 0) - (valores[k - 1] ?? 0)) > 60) salida.push(k);
  return salida;
}

/** El paso entre cambios (descartando los dobles de un punto) y dónde empieza la primera celda. */
function pasoYFase(posiciones: number[]): { paso: number; fase: number } | null {
  const limpios = posiciones.filter((p, k) => k === 0 || p - (posiciones[k - 1] ?? 0) > 3);
  if (limpios.length < 6) return null;
  const pasos = limpios
    .slice(1)
    .map((p, k) => p - (limpios[k] ?? 0))
    .sort((a, b) => a - b);
  const mediana = pasos[Math.floor(pasos.length / 2)] ?? 0;
  if (mediana < 6) return null;
  // Paso exacto: de la primera a la última, contando las celdas de cada tramo (un tramo doble es una
  // celda tapada). Redondear el total de una vez se come o suma una celda y el dibujo se corre.
  const primero = limpios[0] ?? 0;
  const ultimo = limpios[limpios.length - 1] ?? 0;
  const celdas = limpios
    .slice(1)
    .reduce((t, p, k) => t + Math.max(1, Math.round((p - (limpios[k] ?? 0)) / mediana)), 0);
  const paso = (ultimo - primero) / Math.max(1, celdas);
  return { paso, fase: primero % paso };
}

/** Reconoce el tablero mirando la fila de arriba y la columna de la izquierda; null si no hay. */
export function detectarTablero(rgb: Uint8Array, ancho: number, alto: number): Tablero | null {
  const y0 = Math.min(4, alto - 1);
  const x0 = Math.min(4, ancho - 1);
  const fila = Array.from({ length: ancho }, (_, x) => luma(rgb, (y0 * ancho + x) * 3));
  const columna = Array.from({ length: alto }, (_, y) => luma(rgb, (y * ancho + x0) * 3));
  const h = pasoYFase(cambios(fila));
  const v = pasoYFase(cambios(columna));
  if (!h || !v || Math.abs(h.paso - v.paso) > 1.5) return null;
  const celda = (h.paso + v.paso) / 2;
  // Los dos tonos: el centro de dos celdas vecinas de la fila de arriba.
  const centro = (k: number) => Math.round(h.fase + celda * (k + 0.5));
  const a = luma(rgb, (Math.round(v.fase + celda / 2) * ancho + centro(1)) * 3);
  const b = luma(rgb, (Math.round(v.fase + celda / 2) * ancho + centro(2)) * 3);
  if (Math.abs(a - b) < 60) return null;
  // ¿Qué paridad es la clara? La celda (1, 0) tiene el tono `a`.
  const claroEnPar = a > b ? (1 + 0) % 2 === 0 : (2 + 0) % 2 === 0;
  return {
    celda,
    faseX: claroEnPar ? h.fase : h.fase - celda,
    faseY: v.fase,
    claro: Math.max(a, b),
    oscuro: Math.min(a, b),
  };
}

/** Marca los puntos a menos de `radio` de algún punto marcado (cuadrado alrededor). */
function engordar(m: Uint8Array, ancho: number, alto: number, radio: number): Uint8Array {
  const h = new Uint8Array(m.length);
  for (let y = 0; y < alto; y++)
    for (let x = 0; x < ancho; x++) {
      if (!m[y * ancho + x]) continue;
      for (let dx = -radio; dx <= radio; dx++) {
        const xx = x + dx;
        if (xx >= 0 && xx < ancho) h[y * ancho + xx] = 1;
      }
    }
  const v = new Uint8Array(m.length);
  for (let y = 0; y < alto; y++)
    for (let x = 0; x < ancho; x++) {
      if (!h[y * ancho + x]) continue;
      for (let dy = -radio; dy <= radio; dy++) {
        const yy = y + dy;
        if (yy >= 0 && yy < alto) v[yy * ancho + x] = 1;
      }
    }
  return v;
}

/**
 * Los puntos de la figura que son tablero (máscara, 1 = borrar). Primero, las manchas que siguen el
 * dibujo de cuadros (cada punto claro cae en una celda clara y cada oscuro en una oscura) y tienen de
 * los dos tonos. Después, por contagio, las manchas de un solo tono pegadas a lo ya borrado que también
 * siguen el dibujo (la compresión de la foto parte un pedazo de tablero en varias manchas). Al final, el
 * borde gris borroso alrededor. El pelo y la ropa no siguen el dibujo de cuadros: no se tocan.
 */
export function restosDeTablero(
  rgb: Uint8Array,
  alfa: Uint8Array,
  ancho: number,
  alto: number,
  t: Tablero,
): Uint8Array {
  const n = ancho * alto;
  const tol = 22;
  // 0: no es candidato; 1: claro donde toca claro; 2: oscuro donde toca oscuro; 3: tono de tablero fuera de su celda.
  const tipo = new Uint8Array(n);
  for (let y = 0; y < alto; y++)
    for (let x = 0; x < ancho; x++) {
      const p = y * ancho + x;
      if ((alfa[p] ?? 0) < 20 || !neutro(rgb, p * 3)) continue;
      const v = luma(rgb, p * 3);
      const esClaro = Math.abs(v - t.claro) < tol;
      const esOscuro = Math.abs(v - t.oscuro) < tol;
      if (!esClaro && !esOscuro) continue;
      const celdaClara =
        (Math.floor((x - t.faseX) / t.celda) + Math.floor((y - t.faseY) / t.celda)) % 2 === 0;
      tipo[p] = esClaro === celdaClara ? (esClaro ? 1 : 2) : 3;
    }
  // Las manchas, con lo que tiene cada una.
  type Mancha = { puntos: number[]; claros: number; oscuros: number; fuera: number; borrada: boolean };
  const manchas: Mancha[] = [];
  const visto = new Uint8Array(n);
  const pila: number[] = [];
  for (let inicio = 0; inicio < n; inicio++) {
    if (!tipo[inicio] || visto[inicio]) continue;
    const m: Mancha = { puntos: [], claros: 0, oscuros: 0, fuera: 0, borrada: false };
    pila.push(inicio);
    visto[inicio] = 1;
    while (pila.length) {
      const p = pila.pop() ?? 0;
      m.puntos.push(p);
      const k = tipo[p];
      if (k === 1) m.claros++;
      else if (k === 2) m.oscuros++;
      else m.fuera++;
      const x = p % ancho;
      for (const q of [p - 1, p + 1, p - ancho, p + ancho]) {
        if (q < 0 || q >= n || visto[q] || !tipo[q]) continue;
        if ((q === p - 1 && x === 0) || (q === p + 1 && x === ancho - 1)) continue;
        visto[q] = 1;
        pila.push(q);
      }
    }
    manchas.push(m);
  }
  const sigueElDibujo = (m: Mancha) => (m.claros + m.oscuros) / m.puntos.length >= 0.85;
  const borrar = new Uint8Array(n);
  for (const m of manchas)
    if (m.puntos.length >= 30 && m.claros >= 10 && m.oscuros >= 10 && sigueElDibujo(m)) {
      m.borrada = true;
      for (const p of m.puntos) borrar[p] = 1;
    }
  // Contagio: lo de un solo tono pegado a lo borrado.
  for (let vuelta = 0; vuelta < 6; vuelta++) {
    const cerca = engordar(borrar, ancho, alto, 3);
    let hubo = false;
    for (const m of manchas) {
      if (m.borrada || m.puntos.length < 8 || !sigueElDibujo(m)) continue;
      if (!m.puntos.some((p) => cerca[p])) continue;
      m.borrada = true;
      hubo = true;
      for (const p of m.puntos) borrar[p] = 1;
    }
    if (!hubo) break;
  }
  // El borde borroso: grises entre los dos tonos, pegados a lo borrado.
  const borde = engordar(borrar, ancho, alto, 2);
  for (let p = 0; p < n; p++) {
    if (borrar[p] || !borde[p] || (alfa[p] ?? 0) < 20 || !neutro(rgb, p * 3)) continue;
    const v = luma(rgb, p * 3);
    if (v > t.oscuro - tol && v < t.claro + tol) borrar[p] = 1;
  }
  return borrar;
}
