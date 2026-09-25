// Candado de variedad: avisa si un guion nuevo se parece demasiado a uno reciente.
// YouTube desmonetiza lo que «da impresión de producción masiva»; esto lo detecta
// antes de que Richard lo apruebe.

const VACIAS = new Set(
  "el la los las un una unos unas de del al a y o que en con por para es son se su sus lo le les como más mas pero ya no sí si muy este esta esto ese esa eso hay tu tus mi mis te me nos".split(
    " ",
  ),
);

export function palabrasClave(texto: string): Set<string> {
  return new Set(
    texto
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .split(/[^a-z0-9ñ]+/)
      .filter((p) => p.length > 2 && !VACIAS.has(p)),
  );
}

export function parecido(a: string, b: string): number {
  const x = palabrasClave(a);
  const y = palabrasClave(b);
  if (x.size === 0 || y.size === 0) return 0;
  let comunes = 0;
  x.forEach((p) => {
    if (y.has(p)) comunes++;
  });
  return comunes / (x.size + y.size - comunes);
}

export const UMBRAL_PARECIDO = 0.45;

export type Reciente = { id: number; titulo: string; gancho: string; estructura: string };

/** Devuelve el aviso en palabras normales, o "" si no se parece a nada. */
export function avisoDeParecido(
  nuevo: { titulo: string; gancho: string; estructura: string },
  recientes: Reciente[],
): string {
  for (const r of recientes) {
    const p = Math.max(parecido(nuevo.titulo, r.titulo), parecido(nuevo.gancho, r.gancho));
    if (p >= UMBRAL_PARECIDO) {
      return `Se parece mucho al guion #${r.id} («${r.titulo}»). Cambia el enfoque o el gancho antes de aprobar.`;
    }
  }
  const mismaEstructura = recientes.slice(0, 3).filter((r) => r.estructura === nuevo.estructura).length;
  if (recientes.length >= 3 && mismaEstructura === 3) {
    return "Los últimos 3 videos tienen exactamente la misma estructura. Conviene variar el orden de las partes.";
  }
  return "";
}
