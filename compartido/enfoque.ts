// Dónde está la persona en una foto, para recortarla al formato vertical sin
// cortarle la cara (C-SHORTS-2). Las caras las detecta la Mac (Vision); aquí
// solo se decide el punto de enfoque y cómo colocar la imagen en el marco.
export type Cara = { cx: number; cy: number; w: number; h: number }; // fracciones 0-1, origen arriba-izquierda
export type Enfoque = { x: number; y: number }; // fracciones 0-1

/** Línea del detector: «ruta<TAB>cx,cy,w,h;cx,cy,w,h». */
export function parsearCaras(linea: string): { ruta: string; caras: Cara[] } {
  const [ruta = "", lista = ""] = linea.split("\t");
  const caras = lista
    .split(";")
    .map((c) => c.split(",").map(Number))
    .filter((n) => n.length === 4 && n.every((x) => Number.isFinite(x)))
    .map(([cx, cy, w, h]) => ({ cx: cx ?? 0, cy: cy ?? 0, w: w ?? 0, h: h ?? 0 }));
  return { ruta, caras };
}

/**
 * Punto de enfoque: la cara más grande (la protagonista). Si hay una segunda
 * cara grande cerca (la pareja, el músico al lado), el punto medio de las dos,
 * para que salgan juntas. Sin caras: un poco arriba del centro.
 */
export function elegirEnfoque(caras: Cara[], alcance = 0.45): Enfoque | null {
  if (caras.length === 0) return null;
  const orden = [...caras].sort((a, b) => b.w * b.h - a.w * a.h);
  const mayor = orden[0];
  if (!mayor) return null;
  const segunda = orden[1];
  if (
    segunda &&
    segunda.w * segunda.h >= 0.35 * mayor.w * mayor.h &&
    Math.abs(segunda.cx - mayor.cx) <= alcance
  ) {
    return { x: (mayor.cx + segunda.cx) / 2, y: Math.min(mayor.cy, segunda.cy) };
  }
  return { x: mayor.cx, y: mayor.cy };
}
