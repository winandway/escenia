// La lógica pura de los videos de monigotes (docs/MONIGOTES.md): el plan, los tiempos, los costos y
// el encuadre. Sin Remotion ni nada de la Mac: la prueban las pruebas de la raíz y la usa
// `monigotes.ts` (los pasos). Si este archivo importara Remotion, el panel dejaría de publicarse
// (C-CI-1: el build de la nube revisa los tipos de las pruebas y ahí no está Remotion).
import { z } from "zod";

export const HUECO_CANCION_SEG = 5;
/** El color de cada canal en la plantilla: rojo para Caprichoso TV, el verde del logo para Full Código. */
export const COLOR_CAPRICHOSO = "#ff2a2a";
export const COLOR_FULL_CODIGO = "#10f08c";

export const esquemaPlanMonigotes = z
  .object({
    titulo: z.tuple([z.string(), z.string()]),
    marca: z.string(),
    acento: z
      .string()
      .regex(/^#[0-9a-f]{6}$/i)
      .default(COLOR_CAPRICHOSO),
    /**
     * «poses» (lo de siempre desde el 13 oct 2026): dibujos con varias poses y movimiento gratis (≈0,75 $).
     * «kling»: clips animados de pago (≈5 $); solo si Richard lo pide para un video en concreto.
     */
    animacion: z.enum(["kling", "poses"]).default("poses"),
    partes: z
      .array(
        z.object({
          texto: z.string().min(1),
          dibujo: z.string().min(1),
          brillo: z.string().default("red"),
          /** Solo con «kling»: cómo se mueve el clip. */
          movimiento: z.string().default(""),
          dibujoExistente: z.string().optional(),
          /** Solo con «poses»: cada cambio de postura del mismo dibujo, en orden (una imagen cada ~3 s). */
          poses: z.array(z.string().min(1)).default([]),
          cancion: z.object({ titulo: z.string(), artista: z.string() }).optional(),
        }),
      )
      .min(1),
  })
  .superRefine((plan, ctx) => {
    if (plan.animacion !== "kling") return;
    plan.partes.forEach((p, i) => {
      if (!p.movimiento.trim())
        ctx.addIssue({
          code: "custom",
          path: ["partes", i, "movimiento"],
          message: "Con Kling cada parte dice cómo se mueve.",
        });
    });
  });
export type PlanMonigotes = z.infer<typeof esquemaPlanMonigotes>;

/** Precio de cada dibujo (Seedream, base o pose). */
export const COSTO_DIBUJO_USD = 0.03;
/** Lo más que una imagen se queda quieta en pantalla (formato Escenia, regla 1). */
export const POSE_MAXIMA_MS = 5000;

/** Si el plan paga clips animados (Kling) o se arma gratis con poses. */
export function necesitaAnimacionDePago(plan: PlanMonigotes): boolean {
  return plan.animacion === "kling";
}

/** Lo que cuestan los dibujos del plan: la base de cada parte más sus poses. */
export function costoDibujosUsd(plan: PlanMonigotes): number {
  const imagenes = plan.partes.reduce((s, p) => s + 1 + (plan.animacion === "poses" ? p.poses.length : 0), 0);
  return Math.round(imagenes * COSTO_DIBUJO_USD * 100) / 100;
}

/** La escena repartida entre sus imágenes en partes iguales (la suma da justo lo que dura). */
export function repartoDePoses(duracionMs: number, imagenes: number): number[] {
  const n = Math.max(1, imagenes);
  const base = Math.floor(duracionMs / n);
  const sobra = duracionMs - base * n;
  return Array.from({ length: n }, (_, i) => base + (i < sobra ? 1 : 0));
}

/** Si con esas imágenes ninguna se queda más de 5 s en pantalla. */
export function posesCortas(duracionMs: number, imagenes: number): boolean {
  return Math.max(...repartoDePoses(duracionMs, imagenes)) <= POSE_MAXIMA_MS;
}

/**
 * La franja de la pantalla que no tapa ningún texto: debajo del título (470 px) y encima de los
 * subtítulos (1370 px), en fracción del alto de 1920.
 */
export const FRANJA_LIBRE = { arriba: 470 / 1920, abajo: 1370 / 1920 } as const;

export type Caja = { arriba: number; abajo: number; izquierda: number; derecha: number };

/**
 * Cuánto subir y acercar un dibujo para que su contenido quede en la franja libre (13 oct 2026: en el
 * gancho el muñeco quedó en la mitad de abajo, con los subtítulos encima y media pantalla negra arriba).
 * `caja` es dónde está el dibujo dentro de la imagen (fracciones). El acercamiento es como mucho ×1,35 y
 * nunca saca el dibujo por los lados; la subida nunca lo mete debajo del título.
 */
export function encuadreDeDibujo(caja: Caja): { subir: number; zoom: number } {
  const alto = Math.max(0.01, caja.abajo - caja.arriba);
  const ancho = Math.max(0.01, caja.derecha - caja.izquierda);
  const zoom = Math.max(1, Math.min(1.35, 0.62 / alto, 0.98 / ancho));
  const centroLibre = (FRANJA_LIBRE.arriba + FRANJA_LIBRE.abajo) / 2;
  const centro = (caja.arriba + caja.abajo) / 2;
  let subir = 0.5 + (centro - 0.5) * zoom - centroLibre;
  const arribaNueva = 0.5 + (caja.arriba - 0.5) * zoom - subir;
  if (arribaNueva < FRANJA_LIBRE.arriba) subir -= FRANJA_LIBRE.arriba - arribaNueva;
  return { subir, zoom };
}

/** Las piezas de voz: cada parte, y después de cada canción un silencio del largo del hueco. */
export function piezasDeVoz(plan: PlanMonigotes): { texto: string; silencioSeg?: number }[] {
  return plan.partes.flatMap((p) =>
    p.cancion ? [{ texto: p.texto }, { texto: "", silencioSeg: HUECO_CANCION_SEG }] : [{ texto: p.texto }],
  );
}

/**
 * Cuánto dura la escena de cada parte: su voz más el hueco de la canción que la sigue. Los tramos
 * vienen de la voz (uno por pieza, en orden: parte, [hueco], parte, …).
 */
export function escenasDePartes(
  plan: PlanMonigotes,
  tramos: { inicioMs: number; finMs: number }[],
  duracionTotalMs: number,
): { inicioMs: number; finMs: number; hueco: { inicioMs: number; finMs: number } | null }[] {
  const escenas: { inicioMs: number; finMs: number; hueco: { inicioMs: number; finMs: number } | null }[] =
    [];
  let t = 0;
  for (const parte of plan.partes) {
    const voz = tramos[t++];
    if (!voz) throw new Error("Faltan tramos de voz para el plan.");
    let fin = voz.finMs;
    let hueco: { inicioMs: number; finMs: number } | null = null;
    if (parte.cancion) {
      const h = tramos[t++];
      if (!h) throw new Error("Falta el hueco de una canción en los tramos de voz.");
      hueco = { inicioMs: h.inicioMs, finMs: h.finMs };
      fin = h.finMs;
    }
    escenas.push({ inicioMs: voz.inicioMs, finMs: fin, hueco });
  }
  // La primera arranca en 0 y cada una llega hasta donde empieza la siguiente (sin negro entre medio).
  return escenas.map((e, i) => ({
    ...e,
    inicioMs: i === 0 ? 0 : e.inicioMs,
    finMs: i === escenas.length - 1 ? duracionTotalMs : (escenas[i + 1]?.inicioMs ?? e.finMs),
  }));
}

/**
 * Los clips de una escena: de 5 o 10 s, encadenados (el siguiente arranca desde el último cuadro).
 * Si al final sobra poco, el último clip se estira hasta un 15 % (va un poco más lento) en vez de pagar
 * otro clip para un segundo y medio.
 */
export const ESTIRAMIENTO_MAXIMO = 1.15;
export function clipsDeEscena(duracionMs: number): (5 | 10)[] {
  let resto = duracionMs / 1000;
  const clips: (5 | 10)[] = [];
  while (resto > 0.25 && clips.length < 3) {
    const c: 5 | 10 = resto <= 5 * ESTIRAMIENTO_MAXIMO ? 5 : 10;
    clips.push(c);
    resto -= c * (resto <= c * ESTIRAMIENTO_MAXIMO ? ESTIRAMIENTO_MAXIMO : 1);
  }
  return clips.length ? clips : [5];
}

/**
 * Subtítulos en bloques de hasta 3 palabras (o 1,4 s), en mayúsculas, con la palabra más larga
 * resaltada en la caja roja (como el reel de referencia: «SE PONE NERVIOSA CUANDO»).
 */
export function bloquesDeSubtitulos(
  palabras: { text: string; startMs: number; endMs: number }[],
): { inicioMs: number; finMs: number; palabras: string[]; resaltada: number }[] {
  const bloques: { inicioMs: number; finMs: number; palabras: string[]; resaltada: number }[] = [];
  let actual: { text: string; startMs: number; endMs: number }[] = [];
  const cerrar = () => {
    if (!actual.length) return;
    const textos = actual.map((p) =>
      p.text
        .trim()
        .toUpperCase()
        .replace(/[.,;:!?¡¿«»"]/g, ""),
    );
    let resaltada = 0;
    textos.forEach((t, i) => {
      if (t.length > (textos[resaltada] ?? "").length) resaltada = i;
    });
    bloques.push({
      inicioMs: actual[0]?.startMs ?? 0,
      finMs: actual[actual.length - 1]?.endMs ?? 0,
      palabras: textos,
      resaltada,
    });
    actual = [];
  };
  for (const p of palabras) {
    if (!p.text.trim()) continue;
    const inicio = actual[0]?.startMs ?? p.startMs;
    if (actual.length >= 3 || p.endMs - inicio > 1400) cerrar();
    actual.push(p);
    if (/[.,;:!?]$/.test(p.text.trim())) cerrar();
  }
  cerrar();
  // Cada bloque se queda en pantalla hasta que empieza el siguiente (sin parpadeos), máximo 0,6 s más.
  return bloques.map((b, i) => ({
    ...b,
    finMs: Math.min(bloques[i + 1]?.inicioMs ?? b.finMs + 400, b.finMs + 600),
  }));
}
