// Colocación de una foto en el marco vertical (C-SHORTS-2). Vive aquí y no en
// compartido/ porque el empaquetador de Remotion (webpack) no resuelve el
// alias @compartido: la plantilla solo importa archivos de esta carpeta.
export type Enfoque = { x: number; y: number }; // fracciones 0-1

/**
 * `object-position` (en %) para que, al llenar el marco con la imagen (cover),
 * el punto de enfoque quede visible y lo más centrado posible.
 */
export function posicionObjeto(
  imagen: { ancho: number; alto: number },
  marco: { ancho: number; alto: number },
  enfoque: Enfoque | null,
): { x: number; y: number } {
  const escala = Math.max(marco.ancho / imagen.ancho, marco.alto / imagen.alto);
  const visibleX = Math.min(1, marco.ancho / (imagen.ancho * escala));
  const visibleY = Math.min(1, marco.alto / (imagen.alto * escala));
  const f = enfoque ?? { x: 0.5, y: 0.42 };
  const eje = (visible: number, centro: number) => {
    if (visible >= 0.999) return 50;
    const pos = (centro - visible / 2) / (1 - visible);
    return Math.round(Math.min(1, Math.max(0, pos)) * 1000) / 10;
  };
  return { x: eje(visibleX, f.x), y: eje(visibleY, f.y) };
}
