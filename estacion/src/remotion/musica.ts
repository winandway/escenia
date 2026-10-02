// Volumen de la música de fondo a lo largo del video. Regla fija (C-MUSICA-1):
// mientras hay voz, la música va MUY por debajo (VOLUMEN_BAJO); solo sube en
// los interludios y en la cola final, con rampas suaves, y se apaga al cierre.
export const VOLUMEN_BAJO = 0.12; // ≈ -18 dB: se siente, no compite con la voz
export const VOLUMEN_ALTO = 0.8; // interludios y cola final: la música pasa al frente
// Un video puede pedir la música «un poquito» más alta o más baja bajo la voz
// (`nivel`), pero nunca por encima de este tope: pasado de aquí compite con la voz.
export const TOPE_BAJO_LA_VOZ = 0.15;
export const NIVEL_MINIMO = 0.5;
export const NIVEL_MAXIMO = 1.25;

/** El volumen bajo la voz para un nivel pedido (1 = el de siempre), sin pasar nunca del tope. */
export function volumenBajoLaVoz(nivel = 1): number {
  const n = Math.min(NIVEL_MAXIMO, Math.max(NIVEL_MINIMO, Number.isFinite(nivel) ? nivel : 1));
  return Math.min(TOPE_BAJO_LA_VOZ, Math.round(VOLUMEN_BAJO * n * 1000) / 1000);
}
export const RAMPA_MS = 800;
export const ENTRADA_MS = 1000;
export const APAGADO_MS = 1500;

export type TramoInterludio = { inicioMs: number; finMs: number };

const entre = (a: number, b: number, t: number) => a + (b - a) * Math.min(1, Math.max(0, t));

export function volumenMusica(
  ms: number,
  interludios: TramoInterludio[],
  finVozMs: number,
  finVideoMs: number,
  nivel = 1,
): number {
  if (ms < 0 || ms >= finVideoMs) return 0;
  const bajo = volumenBajoLaVoz(nivel);
  let v = bajo;
  for (const t of interludios) {
    if (ms < t.inicioMs - RAMPA_MS || ms > t.finMs + RAMPA_MS) continue;
    if (ms < t.inicioMs)
      v = Math.max(v, entre(bajo, VOLUMEN_ALTO, (ms - (t.inicioMs - RAMPA_MS)) / RAMPA_MS));
    else if (ms > t.finMs) v = Math.max(v, entre(VOLUMEN_ALTO, bajo, (ms - t.finMs) / RAMPA_MS));
    else v = VOLUMEN_ALTO;
  }
  // Cola final: la voz ya terminó, la música sube y luego se apaga.
  if (ms > finVozMs) v = Math.max(v, entre(bajo, VOLUMEN_ALTO, (ms - finVozMs) / RAMPA_MS));
  if (ms > finVideoMs - APAGADO_MS) v *= (finVideoMs - ms) / APAGADO_MS;
  if (ms < ENTRADA_MS) v *= ms / ENTRADA_MS;
  return Math.round(Math.min(1, Math.max(0, v)) * 1000) / 1000;
}
