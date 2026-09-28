// Plan de Shorts (9:16) a partir del video largo: trozos contiguos de escenas,
// cortados donde empieza algo fuerte, de 45 s a 3 min, con su propio título.
export type EscenaParaShort = {
  inicioMs: number;
  finMs: number;
  parte: string;
  narracion: string;
  textoEnPantalla?: string;
  titular?: string;
};

export type Short = {
  inicioMs: number;
  finMs: number;
  titulo: string;
  indice: number;
  total: number;
  /** Índices (en la lista de escenas dada) de la primera y la última escena del short. */
  escenaInicio: number;
  escenaFin: number;
};

export const SHORT_MIN_MS = 45_000;
export const SHORT_MAX_MS = 180_000;
// Partes con las que conviene ARRANCAR un short (enganchan).
const ARRANQUE_FUERTE = new Set(["gancho", "problema", "dato", "titular", "periodico", "cta", "cierre"]);

/** Cuántos shorts: videos largos, de 3 a 5; cortos, 1 o 2. */
export function cuantosShorts(totalMs: number): number {
  if (totalMs < 90_000) return 1;
  if (totalMs < 180_000) return 2;
  return Math.min(5, Math.max(3, Math.round(totalMs / 100_000)));
}

function largo(grupo: EscenaParaShort[]): number {
  const primera = grupo[0];
  const ultima = grupo[grupo.length - 1];
  return primera && ultima ? ultima.finMs - primera.inicioMs : 0;
}

function recortar(s: string, max = 64): string {
  const limpio = s
    .replace(/\s+/g, " ")
    .replace(/[.,;:\s]+$/u, "")
    .trim();
  if (limpio.length <= max) return limpio;
  return `${limpio.slice(0, max - 1).replace(/\s+\S*$/u, "")}…`;
}

/** Título del short: el titular o rótulo de su primera escena; si no, su primera frase. */
export function tituloDeShort(grupo: EscenaParaShort[]): string {
  const e = grupo.find((x) => x.parte !== "interludio") ?? grupo[0];
  if (!e) return "";
  const rotulo = (e.titular || e.textoEnPantalla || "").trim();
  if (rotulo.length >= 8) return recortar(rotulo);
  const frase = e.narracion.split(/(?<=[.!?…])\s+/u)[0] ?? "";
  return recortar(frase);
}

export function planificarShorts(escenas: EscenaParaShort[]): Short[] {
  if (escenas.length === 0) return [];
  const total = escenas[escenas.length - 1]?.finMs ?? 0;
  const n = cuantosShorts(total);
  const objetivo = total / n;
  const grupos: EscenaParaShort[][] = [];
  let actual: EscenaParaShort[] = [];
  for (let i = 0; i < escenas.length; i++) {
    const e = escenas[i];
    const siguiente = escenas[i + 1];
    if (!e) continue;
    actual.push(e);
    if (!siguiente) break;
    if (grupos.length >= n - 1) continue; // el último grupo se queda con el resto
    if (siguiente.parte === "interludio" || siguiente.parte === "opinion") continue; // nunca arrancan un short
    const l = largo(actual);
    const seguiria = l + (siguiente.finMs - siguiente.inicioMs);
    const corte =
      (l >= objetivo * 0.7 && ARRANQUE_FUERTE.has(siguiente.parte)) ||
      l >= objetivo * 1.25 ||
      seguiria > SHORT_MAX_MS;
    if (corte && l >= SHORT_MIN_MS) {
      grupos.push(actual);
      actual = [];
    }
  }
  if (actual.length) grupos.push(actual);
  // Un último trozo muy corto se pega al anterior.
  while (grupos.length > 1 && largo(grupos[grupos.length - 1] ?? []) < SHORT_MIN_MS) {
    const ultimo = grupos.pop() ?? [];
    grupos[grupos.length - 1]?.push(...ultimo);
  }
  let cursor = 0;
  return grupos.map((g, k) => {
    const escenaInicio = cursor;
    cursor += g.length;
    return {
      inicioMs: g[0]?.inicioMs ?? 0,
      finMs: g[g.length - 1]?.finMs ?? 0,
      titulo: tituloDeShort(g),
      indice: k + 1,
      total: grupos.length,
      escenaInicio,
      escenaFin: cursor - 1,
    };
  });
}
