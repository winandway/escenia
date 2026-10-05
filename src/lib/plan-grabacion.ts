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
  neon: "FORMATO NEÓN: TODAS las escenas son `visual.tipo`: «diagrama» (no uses «stock», «foto», «ia» ni `planos`). Cada escena es una etapa de lo que él explica, con 2 a 5 objetos que se encienden cuando él los nombra. Si en un tramo no explica un proceso (un saludo, una opinión, una despedida), usa un diagrama de UN solo objeto con un `visual.titular` de hasta 3 palabras que resuma lo que dice, y la frase de apoyo en `visual.cuerpo`.",
  ilustrado:
    "FORMATO CÓMIC: las escenas son «stock» con `visual.planos`. Cada vez que él nombra a una persona, va su plano «foto» con `texto` = el nombre (sale dibujada), y enseguida 1 o 2 planos «dato» con lo que dice de ella en 2 a 4 palabras. Cuando dice una cifra o una frase que pesa, plano «dato». Para lo demás, planos «stock» con búsquedas concretas en inglés. Un cambio de imagen cada 3 o 4 segundos.",
  clasico:
    "FORMATO DOCUMENTAL: las escenas son «stock» o «foto» con `visual.planos`. Cada vez que él nombra a una persona, un lugar, un disco o un evento, va su plano «foto» (si es una persona, con `texto` = el nombre; si no, `foto_de`: «lugar»). Cifras y frases que pesan, plano «dato». Para lo demás, planos «stock». Un cambio de imagen cada 3 o 4 segundos, sin repetir ninguna `busqueda`.",
};

/** Lo que se le pide a la IA para una grabación (las reglas generales del guion van en el sistema). */
export function mensajeDePlan(e: EntradaPlan): string {
  const palabras = e.transcripcion.split(/\s+/).filter(Boolean).length;
  return [
    "ESTE NO ES UN GUION NUEVO: es el PLAN VISUAL de un video que YA ESTÁ GRABADO. El presentador (el dueño del canal) se grabó hablando a cámara; va a salir en pantalla, y detrás de él van los gráficos que tú decidas.",
    `FORMATO: ${NOMBRE_FORMATO[e.formato]}.`,
    e.titulo.trim() ? `DE QUÉ VA (dicho por él): ${e.titulo.trim()}` : "",
    `TRANSCRIPCIÓN (lo que dijo, ${palabras} palabras, con los errores propios de transcribir una voz):\n"""\n${e.transcripcion.trim().slice(0, 30000)}\n"""`,
    "REGLAS DEL PLAN (mandan sobre cualquier otra regla que las contradiga):",
    "- `narracion` NO se escribe: se COPIA. Reparte la transcripción en escenas, en orden, copiando su texto LITERAL: sin corregir, sin resumir, sin quitar muletillas y sin agregar nada. Cada palabra de la transcripción queda en exactamente una escena, y la primera escena empieza con su primera palabra.",
    "- Corta una escena donde él cambia de idea: cada escena tiene entre 25 y 70 palabras (10 a 28 segundos). Mínimo 3 escenas.",
    "- `parte`: «gancho» la primera; después «contexto», «demo», «dato» o «problema» según lo que diga; «cierre» la última. NO uses «opinion» (todo el video es él opinando), ni «interludio», ni «cta».",
    "- Cada `frase` (de un plano o de un objeto) son 2 a 5 palabras LITERALES y seguidas de la narración de ESA escena: es el instante en que entra la imagen. Tómala tal como está transcrita, aunque esté mal dicha.",
    `- ${REGLAS_POR_FORMATO[e.formato]}`,
    "- Solo se dibuja o se rotula lo que él nombra de verdad. No agregues datos, cifras ni nombres que no estén en la transcripción.",
    "- `titulo`: un título para YouTube de lo que cuenta, máximo 70 letras. `gancho`: su primera frase. `hechos_a_verificar`: vacío (lo dijo él). `descripcion_youtube` y `etiquetas`: vacíos (se escriben al terminar el video). `musica`: un ritmo con bombo y bajo, constante, que no compita con su voz («driving kick and bass beat, dark pulse»).",
  ]
    .filter(Boolean)
    .join("\n\n");
}

/** En un plan no hay opinión aparte ni respiros: si la IA los puso, se dejan como escenas normales. */
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
      })),
  };
}
