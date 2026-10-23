// Locución sobre un video ya editado (Richard, 23 oct 2026, el video de quince años de Naylibeth: «ya
// está editado, no hay que editar el video, solo hay que grabarle la voz… que respete las comas… si hay
// que hacer alguna pausa, pues se hace la pausa»). Aquí va la parte pura: el plan y dónde entra cada
// párrafo en el video. La prueban las pruebas de la raíz (C-CI-1); los pasos están en `locucion.ts`.
import { z } from "zod";
import { VOCES } from "@compartido/guion";

export const esquemaPlanLocucion = z.object({
  /** El video ya editado (ruta absoluta o relativa a la carpeta del plan). No se toca su imagen. */
  video: z.string().min(1),
  voz: z.enum(VOCES).default("richard"),
  /** Multilingual v2: el modelo con el que se entrenó el clon de Richard (con v3 su voz pierde parecido). */
  modelo: z.string().default("eleven_multilingual_v2"),
  /** Cómo lee: menos estabilidad y más estilo = más emoción; `velocidad` 1 es su ritmo natural. */
  ajustes: z
    .object({
      estabilidad: z.number().min(0).max(1).default(0.38),
      parecido: z.number().min(0).max(1).default(0.85),
      estilo: z.number().min(0).max(1).default(0.35),
      velocidad: z.number().min(0.7).max(1.2).default(1),
    })
    .default({ estabilidad: 0.38, parecido: 0.85, estilo: 0.35, velocidad: 1 }),
  /**
   * La música de fondo (se repite si es corta) y su volumen cuando la voz calla; con voz baja sola. Con
   * 0,09 el piano queda unos 8 dB por debajo de la voz en las pausas: «bien suavecito» (23 oct 2026).
   */
  musica: z.string().optional(),
  musica_volumen: z.number().min(0).max(1).default(0.09),
  /** Cuándo empieza a hablar y cuánto aire queda al final del video. */
  inicio_ms: z.number().min(0).default(1000),
  margen_final_ms: z.number().min(0).default(1500),
  /** El silencio entre un párrafo y el siguiente: se reparte lo que sobra, entre estos dos topes. */
  pausa_min_ms: z.number().min(0).default(500),
  pausa_max_ms: z.number().min(0).default(2500),
  /**
   * Si la voz, leída con calma, no cabe en el video, el video se estira parejo (cada foto dura un poco
   * más) en vez de acelerar la voz. `pausa_ideal_ms` es la pausa entre párrafos con la que se calcula, y
   * `estirar_max` lo más que se estira (1,35 = un 35 % más largo).
   */
  estirar_video: z.boolean().default(true),
  pausa_ideal_ms: z.number().min(0).default(1300),
  estirar_max: z.number().min(1).max(2).default(1.35),
  /** Cada párrafo es una pieza de voz; `desde_ms`: no empieza antes de ese momento del video. */
  partes: z.array(z.object({ texto: z.string().min(1), desde_ms: z.number().min(0).optional() })).min(1),
  /** El nombre del video con voz (en la carpeta del plan). */
  salida: z.string().min(1),
});
export type PlanLocucion = z.infer<typeof esquemaPlanLocucion>;

/**
 * Dónde empieza cada párrafo. Los párrafos con `desdeMs` (y el primero, en `inicioMs`) fijan tramos; en
 * cada tramo el tiempo que sobra se reparte parejo entre sus pausas, sin bajar de `pausaMinMs` ni pasar
 * de `pausaMaxMs` (lo que no cabe en la pausa más larga queda al final del tramo). Si un párrafo fijo no
 * alcanza a entrar a su hora porque el anterior todavía habla, entra apenas termine. `sobraMs` es lo
 * que queda entre el último párrafo y el margen final: negativo si la voz no cabe en el video.
 */
export function acomodarPartes(
  partes: { duracionMs: number; desdeMs?: number }[],
  o: { largoMs: number; inicioMs: number; margenFinalMs: number; pausaMinMs: number; pausaMaxMs: number },
): { inicios: number[]; sobraMs: number } {
  const n = partes.length;
  const limite = o.largoMs - o.margenFinalMs;
  const fijos = partes.map((p, i) => (i === 0 ? i : p.desdeMs !== undefined ? i : -1)).filter((i) => i >= 0);
  const inicios = new Array<number>(n).fill(0);
  let finPrevio = -Infinity;
  for (const [k, a] of fijos.entries()) {
    const b = fijos[k + 1] ?? n;
    const deseado = a === 0 ? (partes[0]?.desdeMs ?? o.inicioMs) : (partes[a]?.desdeMs ?? 0);
    const inicio = Math.max(deseado, finPrevio + o.pausaMinMs);
    const hasta = b < n ? (partes[b]?.desdeMs ?? limite) : limite;
    const habla = partes.slice(a, b).reduce((s, p) => s + p.duracionMs, 0);
    // Las pausas de adentro del tramo, más la que va antes del próximo párrafo fijo.
    const pausas = b - a - 1 + (b < n ? 1 : 0);
    const pareja = pausas > 0 ? (hasta - inicio - habla) / pausas : 0;
    const pausa = Math.min(o.pausaMaxMs, Math.max(o.pausaMinMs, pareja));
    let t = inicio;
    for (let i = a; i < b; i++) {
      inicios[i] = Math.round(t);
      t += (partes[i]?.duracionMs ?? 0) + pausa;
    }
    finPrevio = (inicios[b - 1] ?? 0) + (partes[b - 1]?.duracionMs ?? 0);
  }
  const ultimo = n - 1;
  return {
    inicios,
    sobraMs: Math.round(limite - ((inicios[ultimo] ?? 0) + (partes[ultimo]?.duracionMs ?? 0))),
  };
}

/**
 * Cuánto hay que estirar el video para que la voz quepa con calma: el inicio, toda la voz, una pausa
 * ideal entre párrafo y párrafo y el margen final; y además, que cada párrafo con hora fija (en el video
 * original) alcance a entrar a su hora con todo lo anterior dicho con esas pausas. 1 si ya cabe; nunca
 * más que `maximo` (si no alcanza, `acomodarPartes` lo dirá con su `sobraMs` negativo).
 */
export function factorDeEstiramiento(
  partes: { duracionMs: number; desdeMs?: number }[],
  o: { largoMs: number; inicioMs: number; margenFinalMs: number; pausaIdealMs: number; maximo: number },
): number {
  const habla = partes.reduce((s, p) => s + p.duracionMs, 0);
  const necesita = o.inicioMs + habla + Math.max(0, partes.length - 1) * o.pausaIdealMs + o.margenFinalMs;
  let factor = necesita / Math.max(1, o.largoMs);
  let antes = o.inicioMs;
  for (const [j, p] of partes.entries()) {
    if (j > 0 && p.desdeMs !== undefined && p.desdeMs > 0) factor = Math.max(factor, antes / p.desdeMs);
    antes += p.duracionMs + o.pausaIdealMs;
  }
  return Math.round(Math.min(o.maximo, Math.max(1, factor)) * 1000) / 1000;
}
