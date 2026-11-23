/**
 * Marcas que un cliente NO quiere ver nombradas ni dibujadas en su material (C-MARCA-1).
 *
 * Divoox (regla de Richard del 22 nov 2026, por Gerencia): prohibido nombrar o mostrar la marca de motos Bera
 * ni sus modelos. Es la marca de los dueños de la competencia y no se le hace publicidad. En guiones, pedidos de
 * imagen y capturas va una moto genérica sin marca o «Motos Divoox».
 *
 * Este es el ÚNICO archivo del código que puede escribir esos nombres: la prueba `pruebas/marcas-vetadas.test.ts`
 * revisa el resto del motor y se pone en rojo si aparecen en otro lado.
 */

const sinAcentos = (t: string) => t.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

/** Nombres vetados, como palabra entera (sin mayúsculas ni acentos). Los modelos van también sueltos. */
export const MARCAS_VETADAS_DIVOOX = [
  "bera",
  "beramotos",
  "bera motos",
  "motos bera",
  "sbr",
  "sbr150",
  "br200",
  "br 200",
  "brf",
  "galgo",
] as const;

/** Devuelve los nombres vetados para Divoox que aparecen en el texto (vacío si no hay ninguno). */
export function marcasVetadasEn(texto: string): string[] {
  const limpio = ` ${sinAcentos(texto).replace(/[^a-z0-9]+/g, " ")} `;
  return MARCAS_VETADAS_DIVOOX.filter((n) => limpio.includes(` ${n} `));
}

/** Lanza un error si el texto nombra una marca vetada; si no, lo devuelve tal cual. */
export function asegurarSinMarcasVetadas(texto: string): string {
  const malas = marcasVetadasEn(texto);
  if (malas.length > 0) {
    throw new Error(
      `Nombra una marca vetada para Divoox (${malas.join(", ")}). Usa una moto genérica sin marca o «Motos Divoox».`,
    );
  }
  return texto;
}
