// Formato Presentador (docs/PRESENTADOR.md): el PLAN de una grabación. Richard ya
// habló y la Estación ya transcribió lo que dijo. Aquí se le pide a la IA que
// reparta esa transcripción en escenas y decida qué va detrás de él en cada una
// (diagramas, personas dibujadas o fotos), con la frase que hace entrar cada cosa.
// La IA NO escribe lo que él dice: lo copia.
import type { GuionGenerado } from "@compartido/guion";
import { NOMBRE_FORMATO, type EstiloVideo } from "@compartido/tematicas";

export type EntradaPlan = {
  /** Lo que dijo, tal cual salió de la transcripción. */
  transcripcion: string;
  formato: EstiloVideo;
  /** De qué va el video, si Richard lo dijo (ayuda a titular; puede ir vacío). */
  titulo: string;
};

const REGLAS_POR_FORMATO: Record<EstiloVideo, string> = {
  neon: "FORMATO NEÓN: TODAS las escenas son `visual.tipo`: «diagrama» (no uses «stock», «foto», «ia» ni `planos`). Cada escena es una etapa de lo que él explica, con 2 a 5 objetos que se encienden cuando él los nombra, y SIEMPRE lleva su `visual.titular`: el título de esa etapa en 3 a 7 palabras, con dos puntos si se puede («El depósito: de dónde sale»). Si en un tramo no explica un proceso (un saludo, una opinión, una despedida), usa un diagrama de UN solo objeto con un `visual.titular` de hasta 3 palabras que resuma lo que dice, y la frase de apoyo en `visual.cuerpo`.",
  ilustrado:
    "FORMATO CÓMIC: las escenas son «stock» con `visual.planos`. Cada vez que él nombra a una persona, va su plano «foto» con `texto` = el nombre (sale dibujada), y enseguida 1 o 2 planos «dato» con lo que dice de ella en 2 a 4 palabras. Cuando dice una cifra o una frase que pesa, plano «dato». Para lo demás, planos «stock» con búsquedas concretas en inglés. Un cambio de imagen cada 3 o 4 segundos.",
  mixto:
    "FORMATO NEÓN CON PERSONAJES: cada escena es UNA de dos cosas, según lo que él diga en ese tramo. (A) Si en ese tramo NOMBRA A UNA PERSONA (con su nombre: «Sam Altman», «Elon Musk»), la escena es `visual.tipo`: «stock» con `visual.planos`: el plano «foto» de esa persona con `texto` = su nombre (sale DIBUJADA sobre el fondo de neón) justo en la frase donde la nombra, y enseguida 1 o 2 planos «dato» con lo que dice de ella en 2 a 4 palabras («Lo frenó a tiempo»); en estas escenas NO uses planos «stock» ni fotos de lugares, y pon en `visual.titular` de qué va el tramo en hasta 5 palabras. Una empresa o un producto (OpenAI, Google, ChatGPT) NO es una persona. (B) Si en ese tramo no nombra a ninguna persona, la escena es `visual.tipo`: «diagrama», con 2 a 5 objetos que se encienden cuando él los nombra y SIEMPRE su `visual.titular` (3 a 7 palabras, con dos puntos si se puede); para un saludo, una opinión o una despedida, un diagrama de UN solo objeto con un `visual.titular` de hasta 3 palabras y la frase de apoyo en `visual.cuerpo`. Si puedes, corta las escenas para que las personas queden en escenas propias.",
  cancion:
    'FORMATO CANCIÓN: él NO habla, CANTA; la transcripción es la LETRA de su canción (trae los errores propios de transcribir un canto: cópiala igual). TODAS las escenas son `visual.tipo`: «ia» con `prompt_imagen` EN INGLÉS: la imagen LITERAL de lo que dice ese verso, como una viñeta sencilla con figuras de palitos («a road seen through a car windshield, stretching to the horizon with no end, open fields on both sides»; «two stick figures hugging inside a small car»; «a big mansion and a sports car, each crossed out, and a small heart»). Describe SOLO la escena (quién, qué, dónde) en una o dos frases: el estilo de dibujo a lápiz se agrega después, NO lo escribas. Cada figura tiene exactamente dos brazos y dos manos: si nombras las manos, di dónde va cada una («one hand on his chest, the other hand open», y agrega «exactly two hands»); el 6 oct 2026 un boceto salió con tres manos. Nada de texto, letras ni logos dentro de la imagen. Si un verso se repite (el coro), su imagen es DISTINTA cada vez (otro ángulo, otro gesto). Si la canción habla de ÉL en primera persona, el muñequito que lo representa (el que canta) lleva en VARIAS escenas (no en todas, más o menos una de cada dos) «a baseball cap with a small United States flag on the front»; cuando lo lleve, escríbelo en el prompt. Si la canción cuenta la historia de OTRA persona (ella, un amigo), NADIE lleva esa gorra: ni el novio, ni la peluquera, nadie. Si la letra nombra un negocio o un lugar con nombre propio («Estética Pilar»), dibújalo con su letrero escrito tal cual: «a small shop with a sign that reads "Estética Pilar"» (es el único texto permitido en un boceto); si dice dónde queda, pon su bandera o su símbolo («a small Spanish flag with three horizontal stripes»). Irse, dejar ir, volar, decir adiós: la persona se va de verdad, con una maleta, en un avión, un helicóptero, un bus o un carro alejándose por la carretera; NUNCA alas, ángeles, fantasmas ni nada que parezca que se murió. En la ÚLTIMA escena el dibujo va en la mitad IZQUIERDA del papel y la mitad DERECHA queda vacía (escríbelo en el prompt: «drawing only on the left half, the right half of the paper left blank»): ahí va el aviso de suscribirse. No uses `planos`, ni «stock», «foto», «diagrama», «texto» ni «titulo». `visual.texto_en_pantalla`: vacío (la letra ya sale como subtítulo).',
  clasico:
    "FORMATO DOCUMENTAL: las escenas son «stock» o «foto» con `visual.planos`. Cada vez que él nombra a una persona, un lugar, un disco o un evento, va su plano «foto» (si es una persona, con `texto` = el nombre; si no, `foto_de`: «lugar»). Cifras y frases que pesan, plano «dato». Para lo demás, planos «stock». Un cambio de imagen cada 3 o 4 segundos, sin repetir ninguna `busqueda`.",
};

/** Lo que se le pide a la IA para una grabación (las reglas generales del guion van en el sistema). */
export function mensajeDePlan(e: EntradaPlan): string {
  const palabras = e.transcripcion.split(/\s+/).filter(Boolean).length;
  const cancion = e.formato === "cancion";
  return [
    cancion
      ? "ESTE NO ES UN GUION NUEVO: es el PLAN VISUAL de un video que YA ESTÁ GRABADO. El dueño del canal se grabó CANTANDO su canción a cámara, con su fondo real; va a salir en pantalla entero y, encima de su cabeza, va un dibujo a lápiz por cada verso, que tú decides."
      : "ESTE NO ES UN GUION NUEVO: es el PLAN VISUAL de un video que YA ESTÁ GRABADO. El presentador (el dueño del canal) se grabó hablando a cámara; va a salir en pantalla, y detrás de él van los gráficos que tú decidas.",
    `FORMATO: ${NOMBRE_FORMATO[e.formato]}.`,
    e.titulo.trim() ? `${cancion ? "LA CANCIÓN" : "DE QUÉ VA (dicho por él)"}: ${e.titulo.trim()}` : "",
    `TRANSCRIPCIÓN (lo que dijo, ${palabras} palabras, con los errores propios de transcribir una voz):\n"""\n${e.transcripcion.trim().slice(0, 30000)}\n"""`,
    "REGLAS DEL PLAN (mandan sobre cualquier otra regla que las contradiga):",
    "- `narracion` NO se escribe: se COPIA. Reparte la transcripción en escenas, en orden, copiando su texto LITERAL: sin corregir, sin resumir, sin quitar muletillas y sin agregar nada. Cada palabra de la transcripción queda en exactamente una escena, y la primera escena empieza con su primera palabra.",
    cancion
      ? "- Corta una escena por verso o por frase de la letra: cada escena tiene entre 6 y 18 palabras (4 a 12 segundos). Un coro largo se parte en dos o tres escenas. Mínimo 3 escenas."
      : "- Corta una escena donde él cambia de idea: cada escena tiene entre 25 y 70 palabras (10 a 28 segundos). Mínimo 3 escenas: si la grabación es corta y no alcanza para eso, haz exactamente 3 escenas aunque queden de menos palabras.",
    "- `parte`: «gancho» la primera; después «contexto», «demo», «dato» o «problema» según lo que diga; «cierre» la última. NO uses «opinion» (todo el video es él opinando), ni «interludio», ni «cta».",
    "- Cada `frase` (de un plano o de un objeto) son 2 a 5 palabras LITERALES y seguidas de la narración de ESA escena: es el instante en que entra la imagen. Tómala tal como está transcrita, aunque esté mal dicha.",
    `- ${REGLAS_POR_FORMATO[e.formato]}`,
    "- Solo se dibuja o se rotula lo que él nombra de verdad. No agregues datos, cifras ni nombres que no estén en la transcripción.",
    "- La opinión ya la dijo él, en cámara: NO escribas «[opinión del editor]» ni ningún texto entre corchetes en ningún campo. Si en un tramo opina, el texto en pantalla resume lo que dijo con sus palabras.",
    cancion
      ? "- `titulo`: el nombre de la canción tal como lo dio él (si no lo dio, su primer verso), máximo 70 letras. `gancho`: el primer verso. `hechos_a_verificar`: vacío. `descripcion_youtube` y `etiquetas`: vacíos (se escriben al terminar el video). `musica`: «none» (la música es la suya, en vivo)."
      : "- `titulo`: un título para YouTube de lo que cuenta, máximo 70 letras. `gancho`: su primera frase. `hechos_a_verificar`: vacío (lo dijo él). `descripcion_youtube` y `etiquetas`: vacíos (se escriben al terminar el video). `musica`: un ritmo con bombo y bajo, constante, que no compita con su voz («driving kick and bass beat, dark pulse»).",
  ]
    .filter(Boolean)
    .join("\n\n");
}

/** Lo que la IA deja «para que lo llene el editor»: en un plan no hay nada que llenar. */
const RELLENO = /\[[^\]]*\]/g;
const sinRelleno = (texto: string | undefined) =>
  texto === undefined
    ? undefined
    : texto
        .replace(RELLENO, "")
        .replace(/\s{2,}/g, " ")
        .trim();

/**
 * En un plan no hay opinión aparte ni respiros: si la IA los puso, se dejan como escenas normales.
 * Y ningún texto en pantalla lleva un relleno entre corchetes («[opinión del editor]»): salió así
 * en la primera prueba en vivo del formato mixto, escrito debajo del titular.
 */
export function planSinInventos(guion: GuionGenerado): GuionGenerado {
  return {
    ...guion,
    hechos_a_verificar: [],
    escenas: guion.escenas
      .filter((e) => e.narracion.trim().length > 0)
      .map((e) => ({
        ...e,
        parte: e.parte === "opinion" || e.parte === "interludio" || e.parte === "cta" ? "contexto" : e.parte,
        duracion_seg: undefined,
        visual: {
          ...e.visual,
          // Un diagrama no se queda sin título: si era puro relleno, va el nombre de su sección.
          titular: sinRelleno(e.visual.titular) || e.visual.diagrama?.seccion || undefined,
          cuerpo: sinRelleno(e.visual.cuerpo),
          texto_en_pantalla: sinRelleno(e.visual.texto_en_pantalla),
          planos: e.visual.planos?.map((pl) => ({ ...pl, texto: sinRelleno(pl.texto) })),
          diagrama: e.visual.diagrama
            ? {
                ...e.visual.diagrama,
                formula: sinRelleno(e.visual.diagrama.formula) ?? "",
                nodos: e.visual.diagrama.nodos.map((n) => ({
                  ...n,
                  nota: sinRelleno(n.nota) ?? "",
                })),
              }
            : undefined,
        },
      })),
  };
}
