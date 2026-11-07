// El motor de poses del invitado (docs/PODCAST.md, «Mia y sus poses»): animación por código, como antes de la
// IA. Un avatar con poses (Mia) tiene varias imágenes y el estudio pasa de una a otra con un fundido, según lo
// que está haciendo y lo que dice. Reglas simples y deterministas (las mismas entradas dan la misma pose):
//
// - En espera o escuchando: manos juntas («tranquila»).
// - Pensando: la mano en la barbilla; la tablet («notas») es su segunda pose, alternada (un turno una, el
//   siguiente la otra, y cada 5 segundos si piensa mucho).
// - Hablando: las manos en los brazos de la silla. En una respuesta larga vuelve un rato (3 s) a manos juntas
//   cada 8 a 12 segundos.
// - Lo que dice manda sobre el estado, en este orden: la risa, el aplauso (entusiasmo), la idea (empieza una
//   explicación) y las notas (habla de datos). Cada gesto dura unos segundos y vuelve.
// - Nunca cambia de pose más de una vez cada 2,5 segundos: que no parezca nerviosa.
//
// Sin DOM: corre igual en el navegador y en las pruebas.

export const POSES = ["tranquila", "hablando", "pensando", "notas", "riendo", "aplaudiendo", "idea"] as const;
export type PoseId = (typeof POSES)[number];

export type EstadoDelInvitado = "reposo" | "conectando" | "escuchando" | "pensando" | "hablando";

/** Los gestos que salen de lo que dice, de mayor a menor prioridad. */
export const GESTOS = ["riendo", "aplaudiendo", "idea", "notas"] as const;
export type PoseDeGesto = (typeof GESTOS)[number];
export type Gesto = { pose: PoseDeGesto; desde: number; hasta: number };

/** Nunca dos cambios de pose más seguidos que esto (milisegundos). */
export const MIN_ENTRE_CAMBIOS = 2500;
/** El fundido entre dos poses (milisegundos). */
export const FUNDIDO_MS = 300;
/** Cuánto dura cada gesto (milisegundos). */
export const DURACION_GESTO: Record<PoseDeGesto, number> = {
  riendo: 2600,
  aplaudiendo: 2600,
  idea: 2600,
  notas: 4000,
};
/** Hablando: cuánto habla con las manos en la silla antes de cada descanso (se repite en este orden). */
export const HABLA_ANTES_DE_DESCANSAR = [10_000, 8_000, 12_000, 9_000, 11_000] as const;
/** Cuánto dura el descanso con las manos juntas en medio de una respuesta larga. */
export const DESCANSO_MS = 3000;
/** Pensando mucho rato: cada cuánto alterna la barbilla y la tablet. */
export const PENSAR_ALTERNA_MS = 5000;
/** Para saber cuándo llega a una palabra: unas 15 letras por segundo al hablar. */
export const LETRAS_POR_SEGUNDO = 15;

/**
 * Qué dispara cada gesto en el texto de la respuesta (con sus etiquetas de emoción de la voz v3, que el SDK
 * deja en el texto). Las palabras van en español, que es como habla el invitado.
 */
export const DISPARADORES: Record<PoseDeGesto, RegExp> = {
  riendo: /\b(?:ja){2,}\b|\bje(?:je)+\b|\[(?:laughs?|laughing|chuckles?|giggles?)\]|\bme r[ií]o\b/giu,
  aplaudiendo: /qu[eé] buena pregunta|me encanta|\bgenial\b|incre[ií]ble|\[(?:excited|happy)\]/giu,
  idea: /imag[ií]nate|sabes qu[eé]|te cuento|f[ií]jate|\[curious\]/giu,
  notas:
    /\d|\bseg[uú]n\b|los cient[ií]ficos|\bestudios?\b|\b(?:mercurio|venus|marte|j[uú]piter|saturno|urano|neptuno|plut[oó]n)\b/giu,
};

/**
 * Los gestos de una respuesta: cada disparador, a la hora en que se dice (por dónde va en el texto). Dos del
 * mismo gesto que se pisan se juntan en uno.
 */
export function gestosDelTexto(texto: string, ahora: number): Gesto[] {
  const gestos: Gesto[] = [];
  for (const pose of GESTOS) {
    let ultimo: Gesto | null = null;
    for (const m of texto.matchAll(DISPARADORES[pose])) {
      const desde = ahora + ((m.index ?? 0) / LETRAS_POR_SEGUNDO) * 1000;
      if (ultimo && desde <= ultimo.hasta) {
        ultimo.hasta = desde + DURACION_GESTO[pose];
        continue;
      }
      ultimo = { pose, desde, hasta: desde + DURACION_GESTO[pose] };
      gestos.push(ultimo);
    }
  }
  return gestos.sort((a, b) => a.desde - b.desde);
}

export type MemoriaDePoses = {
  /** La pose que se ve. */
  pose: PoseId;
  /** Cuándo cambió de pose por última vez. */
  cambio: number;
  estado: EstadoDelInvitado;
  /** Desde cuándo está en este estado. */
  desde: number;
  /** Cuántas veces se puso a pensar (para alternar la barbilla y la tablet). */
  turnosPensando: number;
};

export const memoriaInicial = (ahora = 0): MemoriaDePoses => ({
  pose: "tranquila",
  cambio: Number.NEGATIVE_INFINITY,
  estado: "reposo",
  desde: ahora,
  turnosPensando: 0,
});

/** La pose que le toca por su estado (sin gestos). */
export function poseDelEstado(m: MemoriaDePoses, ahora: number): PoseId {
  const t = Math.max(0, ahora - m.desde);
  if (m.estado === "pensando") {
    const vuelta = m.turnosPensando - 1 + Math.floor(t / PENSAR_ALTERNA_MS);
    return vuelta % 2 === 0 ? "pensando" : "notas";
  }
  if (m.estado !== "hablando") return "tranquila";
  let acumulado = 0;
  for (let i = 0; ; i++) {
    acumulado += HABLA_ANTES_DE_DESCANSAR[i % HABLA_ANTES_DE_DESCANSAR.length]!;
    if (t < acumulado) return "hablando";
    acumulado += DESCANSO_MS;
    if (t < acumulado) return "tranquila";
  }
}

/** La pose que querría ahora: el gesto más importante que esté corriendo o, si no hay, la de su estado. */
export function poseDeseada(m: MemoriaDePoses, ahora: number, gestos: readonly Gesto[]): PoseId {
  if (m.estado !== "reposo" && m.estado !== "conectando")
    for (const pose of GESTOS)
      if (gestos.some((g) => g.pose === pose && g.desde <= ahora && ahora < g.hasta)) return pose;
  return poseDelEstado(m, ahora);
}

/** Si el avatar no tiene esa pose, la más parecida que sí tenga. */
function poseQueTiene(pose: PoseId, estado: EstadoDelInvitado, tiene: ReadonlySet<PoseId>): PoseId {
  if (tiene.has(pose)) return pose;
  if (pose === "notas" && tiene.has("pensando")) return "pensando";
  if (estado === "hablando" && tiene.has("hablando")) return "hablando";
  return "tranquila";
}

/** Un paso del motor: la memoria al día con el estado de ahora y, si toca y se puede, la pose nueva. */
export function siguientePose(
  m: MemoriaDePoses,
  estado: EstadoDelInvitado,
  ahora: number,
  gestos: readonly Gesto[],
  tiene: ReadonlySet<PoseId>,
): MemoriaDePoses {
  let memoria = m;
  if (estado !== m.estado)
    memoria = {
      ...m,
      estado,
      desde: ahora,
      turnosPensando: m.turnosPensando + (estado === "pensando" ? 1 : 0),
    };
  const quiere = poseQueTiene(poseDeseada(memoria, ahora, gestos), estado, tiene);
  if (quiere !== memoria.pose && ahora - memoria.cambio >= MIN_ENTRE_CAMBIOS)
    memoria = { ...memoria, pose: quiere, cambio: ahora };
  return memoria;
}
