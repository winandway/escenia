// Estilo neón: dónde va cada objeto de un diagrama. Está aparte (sin letras ni
// dibujos) para poder probarlo: nada puede caer encima del titular, de los
// subtítulos ni de los botones de la aplicación en un Short.

export type Sitio = { x: number; y: number; s: number; lado: "abajo" | "derecha" | "izquierda" };

/**
 * Dónde va cada objeto según cuántos son y la forma del video. En horizontal,
 * una fila en zigzag; en vertical, una columna (hasta tres) o dos columnas.
 * Todo queda entre el titular de arriba y los subtítulos de abajo.
 */
export function sitiosDeNodos(n: number, vertical: boolean): Sitio[] {
  if (n <= 0) return [];
  if (!vertical) {
    // Una fila en zigzag entre el titular y los subtítulos; cada objeto con su tarjeta debajo.
    const escala = [2.3, 1.9, 1.7, 1.45, 1.15, 0.95][Math.min(n, 6) - 1] ?? 0.95;
    if (n === 1) return [{ x: 660, y: 610, s: escala, lado: "derecha" }];
    const margen = n === 2 ? 620 : n === 3 ? 420 : n === 4 ? 270 : 230;
    return Array.from({ length: n }, (_, k) => ({
      x: margen + ((1920 - margen * 2) * k) / (n - 1),
      y: 515 + (k % 2 === 0 ? 0 : 56),
      s: escala,
      lado: "abajo" as const,
    }));
  }
  // Vertical: todo entre el titular (hasta 540) y los subtítulos (desde 1330), y sin pasar de
  // x = 930 en la mitad de abajo, donde van los botones de la aplicación. Dos columnas en
  // zigzag, cada objeto con su tarjeta debajo: así una tarjeta nunca le cae encima a otro objeto.
  if (n === 1) return [{ x: 520, y: 960, s: 2.6, lado: "abajo" }];
  if (n === 2)
    return [
      { x: 300, y: 740, s: 1.85, lado: "abajo" },
      { x: 715, y: 1060, s: 1.85, lado: "abajo" },
    ];
  if (n === 3)
    return [
      { x: 285, y: 705, s: 1.4, lado: "abajo" },
      { x: 735, y: 890, s: 1.4, lado: "abajo" },
      { x: 285, y: 1095, s: 1.4, lado: "abajo" },
    ];
  const filas = Math.ceil(n / 2);
  const ys = filas === 2 ? [690, 1050] : [650, 895, 1140];
  const s = filas === 2 ? 1.25 : 0.94;
  return Array.from({ length: n }, (_, k) => ({
    x: k % 2 === 0 ? 285 : 735,
    y: (ys[Math.floor(k / 2)] ?? 0) + (k % 2 === 0 ? 0 : 26),
    s,
    lado: "abajo" as const,
  }));
}
