// El motor de poses del invitado (docs/PODCAST.md, «Cómo se mueve Mia»; candado C-PODCAST-4): animación por
// código, como antes de la IA. Un avatar con poses (Mia) tiene varias imágenes y el estudio pasa de una a otra
// con un fundido que se lee como «se acomoda».
//
// Richard lo probó en vivo el 7 nov 2026: la versión de las palabras clave «va como un meme, como un GIF», sin
// quedarse quieta mientras él hablaba. Desde entonces manda la CALMA, como una persona sentada en un podcast:
//
// - Escuchando (y en espera): manos juntas, todo el rato, sin cambios.
// - Pensando: SOLO si tarda más de 1,2 s en contestar, y se sostiene hasta que empieza a hablar. Si la IA ya
//   pidió un gesto, no se pone a pensar: ya sabe qué va a decir.
// - Hablando: las manos en la silla toda la respuesta. Una respuesta corta (menos de 6 s, como el saludo) no la
//   saca de las manos juntas. Solo si la respuesta pasa de 25 s descansa UNA vez con las manos juntas.
// - Ninguna pose dura menos de 6 s, salvo un gesto.
// - Los gestos (riendo, aplaudiendo, idea, notas) los pide la IA con la herramienta `gesto` (o, de respaldo, la
//   etiqueta «[laughs]» de la voz): uno por respuesta como mucho, de 3 a 4 s, solo mientras habla, y con 25 s
//   por lo menos entre uno y otro. Un gesto que llega antes de que hable espera a que empiece; si deja de hablar
//   (terminó o la interrumpieron) antes de que salga, se tira.
//
// Reglas simples y deterministas (las mismas entradas dan la misma pose). Sin DOM: corre igual en el navegador
// y en las pruebas.

export const POSES = ["tranquila", "hablando", "pensando", "notas", "riendo", "aplaudiendo", "idea"] as const;
export type PoseId = (typeof POSES)[number];

export type EstadoDelInvitado = "reposo" | "conectando" | "escuchando" | "pensando" | "hablando";

/** Los gestos que puede pedir la IA (el enum de la herramienta `gesto`). */
export const GESTOS = ["riendo", "aplaudiendo", "idea", "notas"] as const;
export type PoseDeGesto = (typeof GESTOS)[number];
export const esGesto = (pose: string): pose is PoseDeGesto => (GESTOS as readonly string[]).includes(pose);

/** Un gesto pedido (por la IA o por la risa de respaldo) y la hora en que llegó. */
export type PedidoDeGesto = { pose: PoseDeGesto; hora: number };
/** El texto de una respuesta: cuándo llegó y cuánto se calcula que dura dicha en voz alta. */
export type TextoDeRespuesta = { hora: number; ms: number };
/** Lo que el estudio le cuenta al motor. Son listas que solo crecen: el motor recuerda hasta dónde leyó. */
export type EntradasDelMotor = {
  gestos: readonly PedidoDeGesto[];
  respuestas: readonly TextoDeRespuesta[];
};
export const SIN_ENTRADAS: EntradasDelMotor = { gestos: [], respuestas: [] };

/** Ninguna pose dura menos que esto (salvo un gesto). */
export const POSE_MINIMA_MS = 6000;
/** Pensando solo aparece si tarda más que esto en contestar. */
export const PENSAR_TRAS_MS = 1200;
/** Cuánto dura cada gesto. */
export const DURACION_GESTO: Record<PoseDeGesto, number> = {
  riendo: 3200,
  aplaudiendo: 3400,
  idea: 3600,
  notas: 4000,
};
/** Si deja de hablar en medio de un gesto, el gesto se corta, pero nunca antes de esto (que no parpadee). */
export const GESTO_MINIMO_MS = 1500;
/** Entre un gesto y el siguiente pasan por lo menos esto. */
export const ENTRE_GESTOS_MS = 25_000;
/** Un gesto que no pudo salir en este tiempo (no habló, o la pose de antes no cumplió los 6 s) se tira. */
export const GESTO_CADUCA_MS = 8000;
/** Una respuesta más corta que esto no la saca de las manos juntas. */
export const RESPUESTA_CORTA_MS = POSE_MINIMA_MS;
/** Si el texto de la respuesta no llegó, pasa a las manos en la silla después de hablar esto. */
export const SIN_TEXTO_MS = 2000;
/** Una respuesta que pasa de esto descansa una vez con las manos juntas… */
export const RESPUESTA_LARGA_MS = 25_000;
/** …durante esto. */
export const DESCANSO_MS = POSE_MINIMA_MS;
/** El texto de una respuesta vale para la que empieza hasta este tiempo después de llegar. */
const TEXTO_VALE_MS = 6000;

/** Lee lo que manda la herramienta `gesto` de la IA: solo una de las cuatro poses de gesto, escrita tal cual. */
export function leerPedidoDeGesto(parametros: unknown): PoseDeGesto | null {
  if (!parametros || typeof parametros !== "object" || Array.isArray(parametros)) return null;
  const pose = (parametros as { pose?: unknown }).pose;
  return typeof pose === "string" && esGesto(pose) ? pose : null;
}

export type MemoriaDePoses = {
  /** La pose que se ve. */
  pose: PoseId;
  /** Cuándo cambió de pose por última vez. */
  cambio: number;
  estado: EstadoDelInvitado;
  /** Desde cuándo está en este estado. */
  desde: number;
  /** El gesto que se está viendo termina a esta hora (null: no hay gesto en curso). */
  gestoHasta: number | null;
  /** Cuándo empezó el último gesto. */
  ultimoGesto: number;
  /** Ya hubo un gesto en esta respuesta. */
  gestoEnRespuesta: boolean;
  /** Un gesto pedido que espera su momento. */
  pendiente: PedidoDeGesto | null;
  /** Cuánto se calcula que dura la respuesta de ahora (null: no llegó el texto). */
  respuestaMs: number | null;
  /** El último texto que llegó, para la respuesta que está por empezar. */
  ultimoTexto: TextoDeRespuesta | null;
  /** Hasta dónde leyó las listas de entradas. */
  leidos: { gestos: number; respuestas: number };
};

export const memoriaInicial = (ahora = 0): MemoriaDePoses => ({
  pose: "tranquila",
  // Las manos juntas ya estaban: no cuentan los 6 s desde que se abrió el estudio.
  cambio: Number.NEGATIVE_INFINITY,
  estado: "reposo",
  desde: ahora,
  gestoHasta: null,
  ultimoGesto: Number.NEGATIVE_INFINITY,
  gestoEnRespuesta: false,
  pendiente: null,
  respuestaMs: null,
  ultimoTexto: null,
  leidos: { gestos: 0, respuestas: 0 },
});

/** ¿La cara está pensando (mira hacia arriba con los tres puntos)? Igual que la pose: solo si tarda. */
export function piensa(m: MemoriaDePoses, ahora: number): boolean {
  if (m.estado !== "pensando") return false;
  return m.pose === "pensando" || (ahora - m.desde >= PENSAR_TRAS_MS && m.pendiente === null);
}

/** La pose que le toca por su estado (sin gestos). */
function poseDelEstado(m: MemoriaDePoses, ahora: number): PoseId {
  const t = Math.max(0, ahora - m.desde);
  switch (m.estado) {
    case "pensando":
      // Si ya está pensando, se sostiene hasta que hable; si no, solo después de 1,2 s y sin un gesto en camino.
      return m.pose === "pensando" || piensa(m, ahora) ? "pensando" : "tranquila";
    case "hablando": {
      if (m.respuestaMs === null) return t < SIN_TEXTO_MS ? "tranquila" : "hablando";
      if (m.respuestaMs < RESPUESTA_CORTA_MS) return "tranquila";
      if (t >= RESPUESTA_LARGA_MS && t < RESPUESTA_LARGA_MS + DESCANSO_MS) return "tranquila";
      return "hablando";
    }
    default:
      return "tranquila";
  }
}

/** Si el avatar no tiene esa pose, la más parecida que sí tenga. */
function poseQueTiene(pose: PoseId, tiene: ReadonlySet<PoseId>): PoseId {
  if (tiene.has(pose)) return pose;
  return "tranquila";
}

/**
 * Un paso del motor: la memoria al día con el estado de ahora, lo que llegó del estudio (gestos y textos) y,
 * si toca y se puede, la pose nueva.
 */
export function siguientePose(
  anterior: MemoriaDePoses,
  estado: EstadoDelInvitado,
  ahora: number,
  entradas: EntradasDelMotor,
  tiene: ReadonlySet<PoseId>,
): MemoriaDePoses {
  const m: MemoriaDePoses = { ...anterior, leidos: { ...anterior.leidos } };
  // Conectando ya cuenta: el texto del saludo puede llegar antes de que suene.
  const enConversacion = estado !== "reposo";

  // 1. El estado.
  if (estado !== m.estado) {
    // Dejó de hablar (terminó o la interrumpieron): lo que estaba por salir de esa respuesta ya no sale.
    if (m.estado === "hablando") {
      m.pendiente = null;
      m.respuestaMs = null;
    }
    if (estado === "hablando") {
      m.gestoEnRespuesta = false;
      const texto = m.ultimoTexto;
      m.respuestaMs = texto && ahora - texto.hora <= TEXTO_VALE_MS ? texto.ms : null;
      m.ultimoTexto = null;
    }
    if (!enConversacion) {
      m.pendiente = null;
      m.ultimoTexto = null;
    }
    m.estado = estado;
    m.desde = ahora;
  }

  // 2. Lo que llegó del estudio desde el último paso (si las listas empezaron de nuevo, una conversación nueva,
  // se leen desde el principio).
  if (entradas.respuestas.length < m.leidos.respuestas) m.leidos.respuestas = 0;
  if (entradas.gestos.length < m.leidos.gestos) m.leidos.gestos = 0;
  for (const r of entradas.respuestas.slice(m.leidos.respuestas)) {
    if (!enConversacion) continue;
    // Si ya está hablando, es el texto de ESTA respuesta (llegó un poco tarde); si no, el de la que viene.
    if (estado === "hablando" && m.respuestaMs === null && ahora - m.desde <= TEXTO_VALE_MS)
      m.respuestaMs = r.ms;
    else if (estado !== "hablando") m.ultimoTexto = r;
  }
  m.leidos.respuestas = entradas.respuestas.length;
  for (const g of entradas.gestos.slice(m.leidos.gestos)) {
    if (!enConversacion || m.pendiente) continue;
    // Uno por respuesta: si ya hizo su gesto, los demás de esta respuesta no cuentan.
    if (estado === "hablando" && m.gestoEnRespuesta) continue;
    m.pendiente = g;
  }
  m.leidos.gestos = entradas.gestos.length;
  if (m.pendiente && ahora - m.pendiente.hora > GESTO_CADUCA_MS) m.pendiente = null;

  // 3. Un gesto en curso sigue hasta su hora (o se corta si dejó de hablar, sin parpadear).
  if (m.gestoHasta !== null) {
    const cortado = estado !== "hablando" && ahora - m.cambio >= GESTO_MINIMO_MS;
    if (ahora < m.gestoHasta && !cortado) return m;
    m.gestoHasta = null;
  }
  const tras = esGesto(m.pose);
  const cumplio = tras || ahora - m.cambio >= POSE_MINIMA_MS;

  // 4. ¿Empieza un gesto? Solo hablando, uno por respuesta, 25 s después del anterior y si la pose de ahora ya
  // cumplió sus 6 s (si no, espera; si caduca, se tira).
  if (m.pendiente && estado === "hablando") {
    const p = m.pendiente;
    if (m.gestoEnRespuesta || ahora - m.ultimoGesto < ENTRE_GESTOS_MS || !tiene.has(p.pose))
      m.pendiente = null;
    else if (cumplio) {
      return {
        ...m,
        pose: p.pose,
        cambio: ahora,
        gestoHasta: ahora + DURACION_GESTO[p.pose],
        ultimoGesto: ahora,
        gestoEnRespuesta: true,
        pendiente: null,
      };
    }
  }

  // 5. La pose de su estado, si la de ahora ya cumplió sus 6 s (al terminar un gesto vuelve enseguida).
  const quiere = poseQueTiene(poseDelEstado(m, ahora), tiene);
  if (quiere !== m.pose && cumplio) {
    m.pose = quiere;
    m.cambio = ahora;
  }
  return m;
}
