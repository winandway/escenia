// Producir y entregar son dos pasos distintos (C-ENTREGA-1). Si el video ya se
// armó y lo que falló fue subirlo al panel, el reintento retoma la entrega:
// no vuelve a gastar en voz e imágenes ni media hora de máquina.

export type ProduccionGuardada = {
  /** Número del trabajo que la produjo (la carpeta «t21» es el 21). */
  numero: number;
  /** Huella del guion con el que se produjo: si el guion cambió, no sirve. */
  huella: string;
  entregado: boolean;
  /** Todos sus archivos siguen en la Mac. */
  completa: boolean;
};

/** La producción más nueva de ESE guion que se armó completa y no llegó al panel. */
export function elegirProduccionSinEntregar<T extends ProduccionGuardada>(
  guardadas: T[],
  huella: string,
): T | null {
  const sirven = guardadas.filter((p) => p.huella === huella && !p.entregado && p.completa);
  return sirven.sort((a, b) => b.numero - a.numero)[0] ?? null;
}
