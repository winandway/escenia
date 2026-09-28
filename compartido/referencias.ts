// Qué foto real de la persona usar como referencia para cada imagen generada:
// la de la época más cercana al año de la escena. Sin referencia cuando la
// escena es de la infancia (una foto adulta produciría una adulta).
export type Referencia = { ruta: string; anio: number | null; infancia?: boolean };

const ANIO = /\b(18[5-9]\d|19\d\d|20\d\d)(s)?\b/;
export const ES_INFANCIA =
  /\b(girl|boy|child|children|kid|baby|infant|toddler|newborn|schoolgirl|schoolboy|ni[ñn][ao]s?|beb[eé]s?)\b/i;

/** Primer año del texto («1957», «1950s» → 1955). */
export function anioDe(texto: string): number | null {
  const m = ANIO.exec(texto);
  if (!m?.[1]) return null;
  const anio = Number(m[1]);
  return m[2] ? anio + 5 : anio;
}

export function elegirReferencia(
  referencias: Referencia[],
  anio: number | null,
  prompt: string,
): Referencia | null {
  if (referencias.length === 0) return null;
  // Infancia: solo sirve una foto real de la persona de niño; una adulta daría una adulta.
  if (ES_INFANCIA.test(prompt)) return referencias.find((r) => r.infancia) ?? null;
  const conAnio = referencias.filter((r) => r.anio !== null && !r.infancia);
  if (anio !== null && conAnio.length > 0) {
    return conAnio.reduce((mejor, r) => {
      const d = Math.abs((r.anio ?? 0) - anio);
      const dMejor = Math.abs((mejor.anio ?? 0) - anio);
      return d < dMejor || (d === dMejor && (r.anio ?? 0) < (mejor.anio ?? 0)) ? r : mejor;
    });
  }
  return conAnio[0] ?? referencias[0] ?? null;
}
