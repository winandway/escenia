// Un guion puede tener varias entregas (se volvió a producir, o se corrigieron
// fotos). En el panel se muestra la ÚLTIMA: el video largo más nuevo y los
// Shorts que subieron después de él. Las anteriores quedan plegadas, para que
// nadie descargue una versión vieja por error.
export type VideoGuardado = { id: number; formato: "16x9" | "9x16" };

export function separarEntregas<T extends VideoGuardado>(videos: T[]): { vigentes: T[]; anteriores: T[] } {
  const orden = [...videos].sort((a, b) => a.id - b.id);
  const ultimoLargo = [...orden].reverse().find((v) => v.formato === "16x9");
  if (!ultimoLargo) return { vigentes: orden, anteriores: [] };
  const vigentes = orden.filter((v) => v.id >= ultimoLargo.id);
  const anteriores = orden.filter((v) => v.id < ultimoLargo.id).reverse();
  return { vigentes, anteriores };
}
