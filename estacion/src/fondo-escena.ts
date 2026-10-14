// Qué va detrás de cada escena y qué clip se elige del banco de videos (C-FONDO-2, 14 oct 2026).
// El primer cuadro de casi todos los videos era la misma calle con carros, borrosa: el clip de
// reserva «city night timelapse» detrás de la foto de la primera escena, y el banco de clips siempre
// devolvía el mismo porque solo recordaba lo usado dentro del mismo proceso. Sin nada de la Mac: lo
// prueban las pruebas de la raíz (C-CI-1).

export type FondoDeEscena =
  { tipo: "foto"; ruta: string } | { tipo: "persona" } | { tipo: "clip" } | { tipo: "ninguno" };

/**
 * La escena que tiene su propia foto la lleva también de fondo, difuminada, en cualquier estilo
 * (antes solo en las biografías; en lo demás iba un clip de reserva ajeno). Sin foto: en las
 * biografías, la persona del video (titulares, recortes, interludios); en lo demás, un clip; en neón
 * y canción, nada.
 */
export function fondoDeEscena(d: {
  sinFondo: boolean;
  propia: string | null;
  documental: boolean;
  pideFondoDePersona: boolean;
}): FondoDeEscena {
  if (d.sinFondo) return { tipo: "ninguno" };
  if (d.propia) return { tipo: "foto", ruta: d.propia };
  if (d.documental && d.pideFondoDePersona) return { tipo: "persona" };
  return { tipo: "clip" };
}

type VideoDelBanco = { id: number; width: number; height: number; duration: number };

/**
 * El clip que se toma de una búsqueda: con la orientación pedida, de 5 s o más, que no se haya usado
 * en este video ni en los videos recientes. Si no queda ninguno así, se afloja en ese orden (mejor un
 * clip de otro video que uno de 3 segundos; mejor repetir que quedarse sin imagen).
 */
export function elegirVideo<T extends VideoDelBanco>(
  videos: T[],
  vertical: boolean,
  enEsteVideo: Set<number>,
  recientes: Set<number>,
): T | null {
  const conOrientacion = videos.filter((v) => (vertical ? v.height > v.width : v.width >= v.height));
  const niveles: ((v: T) => boolean)[] = [
    (v) => v.duration >= 5 && !enEsteVideo.has(v.id) && !recientes.has(v.id),
    (v) => v.duration >= 5 && !enEsteVideo.has(v.id),
    (v) => !enEsteVideo.has(v.id),
    () => true,
  ];
  for (const sirve of niveles) {
    const v = conOrientacion.find(sirve);
    if (v) return v;
  }
  return null;
}

/** Cuántos días se recuerda un clip usado, para no repetirlo en el video siguiente. */
export const DIAS_RECIENTES = 60;

/** Los ids usados en los últimos días, de lo guardado en disco ({ id: fecha ISO }). */
export function idsRecientes(guardado: Record<string, string>, ahora: Date = new Date()): Set<number> {
  const limite = ahora.getTime() - DIAS_RECIENTES * 86_400_000;
  return new Set(
    Object.entries(guardado)
      .filter(([, fecha]) => Date.parse(fecha) >= limite)
      .map(([id]) => Number(id)),
  );
}
