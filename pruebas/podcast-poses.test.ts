// El motor de poses de Mia (docs/PODCAST.md, «Cómo se mueve Mia»; candado C-PODCAST-4). Richard lo probó en vivo
// el 7 nov 2026 y Mia «va como un meme, como un GIF»: cambiaba cada pocos segundos y sacaba gestos de palabras
// sueltas. Ahora es calma por defecto: escuchando no se mueve, piensa solo si tarda, habla con las manos en la
// silla, ninguna pose dura menos de 6 s y los gestos los decide la IA (uno por respuesta, 25 s entre uno y otro).
import { describe, expect, it } from "vitest";
import {
  DURACION_GESTO,
  ENTRE_GESTOS_MS,
  GESTOS,
  PENSAR_TRAS_MS,
  POSE_MINIMA_MS,
  POSES,
  RESPUESTA_LARGA_MS,
  esGesto,
  leerPedidoDeGesto,
  memoriaInicial,
  piensa,
  siguientePose,
  type EntradasDelMotor,
  type EstadoDelInvitado,
  type MemoriaDePoses,
  type PedidoDeGesto,
  type PoseId,
} from "@compartido/podcast-poses";
import { gestoDeRisa, msDeLaRespuesta } from "@/app/podcast/Estudio";

const TODAS = new Set<PoseId>(POSES);
const PASO = 50;

type Guion = {
  /** Los estados con su hora de inicio (ms). */
  tramos: [number, EstadoDelInvitado][];
  /** Los gestos que pide la IA (o la risa de respaldo). */
  gestos?: PedidoDeGesto[];
  /** El texto de cada respuesta: cuándo llega y cuánto se calcula que dura. */
  respuestas?: { hora: number; ms: number }[];
};

/** Corre el motor cuadro a cuadro (cada 50 ms) y devuelve cada pose que se vio, con su hora. */
function correr(g: Guion, hasta: number, tiene: ReadonlySet<PoseId> = TODAS) {
  let m: MemoriaDePoses = memoriaInicial(0);
  const vistas: [number, PoseId][] = [];
  const caras: [number, boolean][] = [];
  for (let t = 0; t <= hasta; t += PASO) {
    const estado = [...g.tramos].reverse().find(([desde]) => desde <= t)?.[1] ?? "reposo";
    const entradas: EntradasDelMotor = {
      gestos: (g.gestos ?? []).filter((p) => p.hora <= t),
      respuestas: (g.respuestas ?? []).filter((r) => r.hora <= t),
    };
    m = siguientePose(m, estado, t, entradas, tiene);
    if (vistas[vistas.length - 1]?.[1] !== m.pose) vistas.push([t, m.pose]);
    const p = piensa(m, t);
    if (caras[caras.length - 1]?.[1] !== p) caras.push([t, p]);
  }
  const poseEn = (t: number) => [...vistas].reverse().find(([desde]) => desde <= t)?.[1];
  const cambiosEntre = (a: number, b: number) => vistas.filter(([t]) => t > a && t < b);
  /**
   * Cuánto duró cada pose que se vio. La primera no cuenta (ya estaba antes de empezar: el estudio abre en manos
   * juntas) ni la última (la corta el final de la prueba).
   */
  const duraciones = vistas
    .map(([t, pose], i) => ({ pose, ms: (vistas[i + 1]?.[0] ?? Number.NaN) - t }))
    .slice(1, -1);
  return { vistas, poseEn, cambiosEntre, duraciones, caras, memoria: m };
}

describe("calma: mientras Richard habla, Mia no se mueve", () => {
  it("escuchando no cambia nunca de pose, aunque lleguen pedidos de gesto o una risa", () => {
    // Mia contesta 10 s y Richard habla 30 s; en medio llegan gestos (que no deben salir).
    const { poseEn, cambiosEntre } = correr(
      {
        tramos: [
          [0, "hablando"],
          [10_000, "escuchando"],
        ],
        respuestas: [{ hora: 0, ms: 10_000 }],
        gestos: [
          { pose: "riendo", hora: 12_000 },
          { pose: "aplaudiendo", hora: 20_000 },
          { pose: "idea", hora: 30_000 },
        ],
      },
      40_000,
    );
    // Al terminar de hablar vuelve a las manos juntas UNA vez, y ahí se queda todo el rato.
    expect(poseEn(10_000)).toBe("tranquila");
    expect(cambiosEntre(10_000, 40_000)).toEqual([]);
  });

  it("una respuesta corta (el saludo) no la saca de las manos juntas: no hay cambio que hacer al escuchar", () => {
    const { vistas } = correr(
      {
        tramos: [
          [0, "conectando"],
          [1000, "hablando"],
          [4500, "escuchando"],
        ],
        respuestas: [{ hora: 900, ms: msDeLaRespuesta("Hola, Richard. Gracias por invitarme. Soy Mia IA.") }],
      },
      20_000,
    );
    expect(vistas).toEqual([[0, "tranquila"]]);
  });

  it("al hablar pasa a las manos en la silla y se queda ahí toda la respuesta", () => {
    const { poseEn, cambiosEntre } = correr(
      { tramos: [[0, "hablando"]], respuestas: [{ hora: 0, ms: 20_000 }] },
      20_000,
    );
    expect(poseEn(100)).toBe("hablando");
    expect(cambiosEntre(100, 20_000)).toEqual([]);
  });

  it("si el texto no llega, igual pasa a las manos en la silla al rato de hablar", () => {
    const { vistas } = correr({ tramos: [[0, "hablando"]] }, 20_000);
    expect(vistas.map(([, p]) => p)).toEqual(["tranquila", "hablando"]);
    expect(vistas[1]![0]).toBeLessThanOrEqual(2500);
  });

  it("solo una respuesta de más de 25 s descansa, una sola vez, con las manos juntas", () => {
    const larga = correr({ tramos: [[0, "hablando"]], respuestas: [{ hora: 0, ms: 60_000 }] }, 60_000);
    expect(larga.vistas.map(([, p]) => p)).toEqual(["hablando", "tranquila", "hablando"]);
    expect(larga.vistas[1]![0]).toBe(RESPUESTA_LARGA_MS);
    expect(larga.vistas[2]![0]).toBe(RESPUESTA_LARGA_MS + POSE_MINIMA_MS);
    const normal = correr({ tramos: [[0, "hablando"]], respuestas: [{ hora: 0, ms: 24_000 }] }, 24_000);
    expect(normal.vistas.map(([, p]) => p)).toEqual(["hablando"]);
  });
});

describe("pensando", () => {
  it("solo aparece si tarda más de 1,2 s en contestar", () => {
    const rapida = correr(
      {
        tramos: [
          [0, "escuchando"],
          [8000, "pensando"],
          [8000 + PENSAR_TRAS_MS - 100, "hablando"],
        ],
        respuestas: [{ hora: 8500, ms: 15_000 }],
      },
      20_000,
    );
    expect(rapida.vistas.map(([, p]) => p)).not.toContain("pensando");
    expect(rapida.caras.filter(([, p]) => p)).toEqual([]);

    const lenta = correr(
      {
        tramos: [
          [0, "escuchando"],
          [8000, "pensando"],
          [11_000, "hablando"],
        ],
        respuestas: [{ hora: 10_800, ms: 15_000 }],
      },
      25_000,
    );
    expect(lenta.vistas).toContainEqual([8000 + PENSAR_TRAS_MS, "pensando"]);
    // La cara también: mira hacia arriba recién a los 1,2 s.
    expect(lenta.caras).toContainEqual([8000 + PENSAR_TRAS_MS, true]);
    expect(lenta.poseEn(8000 + PENSAR_TRAS_MS - 100)).toBe("tranquila");
  });

  it("se sostiene hasta que empieza a hablar (y nunca menos de 6 s)", () => {
    const { vistas, poseEn } = correr(
      {
        tramos: [
          [0, "escuchando"],
          [8000, "pensando"],
          [12_000, "hablando"],
        ],
        respuestas: [{ hora: 11_900, ms: 15_000 }],
      },
      25_000,
    );
    expect(poseEn(11_900)).toBe("pensando");
    const desde = vistas.find(([, p]) => p === "pensando")![0];
    const despues = vistas.find(([t]) => t > desde)!;
    expect(despues).toEqual([desde + POSE_MINIMA_MS, "hablando"]);
  });

  it("si la IA ya pidió un gesto antes de los 1,2 s, no se pone a pensar: ya sabe qué decir", () => {
    const { vistas } = correr(
      {
        tramos: [
          [0, "escuchando"],
          [8000, "pensando"],
          [10_000, "hablando"],
        ],
        gestos: [{ pose: "aplaudiendo", hora: 8800 }],
        respuestas: [{ hora: 8800, ms: 15_000 }],
      },
      20_000,
    );
    expect(vistas.map(([, p]) => p)).toEqual(["tranquila", "aplaudiendo", "hablando"]);
    expect(vistas[1]![0]).toBe(10_000);
  });
});

describe("nada de nervios: ninguna pose dura menos de 6 s, salvo un gesto", () => {
  it("aunque el estado salte cada medio segundo durante dos minutos", () => {
    const estados: EstadoDelInvitado[] = ["escuchando", "pensando", "hablando", "escuchando", "hablando"];
    const tramos: [number, EstadoDelInvitado][] = [];
    for (let t = 0, i = 0; t < 120_000; t += 500 + (i % 7) * 300, i++) tramos.push([t, estados[i % 5]!]);
    const gestos = GESTOS.flatMap((pose, i) => [
      { pose, hora: 3000 + i * 9000 },
      { pose, hora: 60_000 + i * 7000 },
    ]);
    const respuestas = Array.from({ length: 40 }, (_, i) => ({ hora: i * 3000, ms: 8000 + (i % 5) * 4000 }));
    const { duraciones } = correr({ tramos, gestos, respuestas }, 120_000);
    expect(duraciones.length).toBeGreaterThan(3);
    for (const d of duraciones) {
      if (esGesto(d.pose)) expect(d.ms, d.pose).toBeLessThanOrEqual(4000);
      else expect(d.ms, d.pose).toBeGreaterThanOrEqual(POSE_MINIMA_MS);
    }
  });

  it("cada gesto dura de 3 a 4 segundos y vuelve a las manos en la silla", () => {
    for (const pose of GESTOS) {
      expect(DURACION_GESTO[pose]).toBeGreaterThanOrEqual(3000);
      expect(DURACION_GESTO[pose]).toBeLessThanOrEqual(4000);
      const { vistas } = correr(
        {
          tramos: [
            [0, "escuchando"],
            [8000, "hablando"],
          ],
          gestos: [{ pose, hora: 7800 }],
          respuestas: [{ hora: 7800, ms: 20_000 }],
        },
        20_000,
      );
      expect(vistas).toEqual([
        [0, "tranquila"],
        [8000, pose],
        [8000 + DURACION_GESTO[pose], "hablando"],
      ]);
    }
  });
});

describe("los gestos los decide la IA, con mesura", () => {
  it("como mucho un gesto por respuesta", () => {
    const { vistas } = correr(
      {
        tramos: [
          [0, "escuchando"],
          [8000, "hablando"],
        ],
        gestos: [
          { pose: "idea", hora: 7900 },
          { pose: "notas", hora: 15_000 },
          { pose: "riendo", hora: 40_000 },
        ],
        respuestas: [{ hora: 7900, ms: 45_000 }],
      },
      50_000,
    );
    const gestos = vistas.filter(([, p]) => esGesto(p));
    expect(gestos).toEqual([[8000, "idea"]]);
  });

  it("entre un gesto y otro pasan por lo menos 25 s, aunque sean respuestas distintas", () => {
    const tramos: [number, EstadoDelInvitado][] = [
      [0, "hablando"],
      [10_000, "escuchando"],
      [17_000, "hablando"],
      [27_000, "escuchando"],
      [33_000, "hablando"],
    ];
    const { vistas } = correr(
      {
        tramos,
        gestos: [
          { pose: "aplaudiendo", hora: 0 },
          { pose: "riendo", hora: 17_000 },
          { pose: "idea", hora: 33_000 },
        ],
        respuestas: [
          { hora: 0, ms: 10_000 },
          { hora: 17_000, ms: 10_000 },
          { hora: 33_000, ms: 10_000 },
        ],
      },
      45_000,
    );
    const gestos = vistas.filter(([, p]) => esGesto(p));
    expect(gestos.map(([, p]) => p)).toEqual(["aplaudiendo", "idea"]);
    expect(gestos[1]![0] - gestos[0]![0]).toBeGreaterThanOrEqual(ENTRE_GESTOS_MS);
  });

  it("un gesto que llega cuando ya terminó de hablar (o la interrumpieron) no sale", () => {
    const { vistas } = correr(
      {
        tramos: [
          [0, "hablando"],
          [9000, "escuchando"],
        ],
        gestos: [{ pose: "riendo", hora: 9500 }],
        respuestas: [{ hora: 0, ms: 9000 }],
      },
      30_000,
    );
    expect(vistas.some(([, p]) => esGesto(p))).toBe(false);
  });

  it("la herramienta solo acepta las cuatro poses de gesto", () => {
    expect([...GESTOS]).toEqual(["riendo", "aplaudiendo", "idea", "notas"]);
    for (const pose of GESTOS) expect(leerPedidoDeGesto({ pose })).toBe(pose);
    for (const malo of [
      { pose: "tranquila" },
      { pose: "hablando" },
      { pose: "pensando" },
      { pose: "RIENDO" },
      { pose: "riendo " },
      { pose: 3 },
      { otra: "riendo" },
      "riendo",
      null,
      undefined,
      [],
    ])
      expect(leerPedidoDeGesto(malo), JSON.stringify(malo)).toBeNull();
  });

  it("de respaldo solo queda la etiqueta de risa («[laughs]» o «[riendo]»): las palabras sueltas ya no disparan nada", () => {
    expect(gestoDeRisa("[laughs] Bueno, sí.")).toBe("riendo");
    expect(gestoDeRisa("Ay [Laughs] qué cosas.")).toBe("riendo");
    // En la prueba real del 7 nov 2026 la IA escribió «[riendo]» en vez de llamar a la herramienta: es la misma
    // etiqueta de risa, en español. Las demás etiquetas de gesto no disparan nada.
    expect(gestoDeRisa("[riendo] ¡Ja, ja, ja! Como IA, no.")).toBe("riendo");
    expect(gestoDeRisa("[aplaudiendo] ¡Esa es una excelente pregunta!")).toBeNull();
    expect(gestoDeRisa("[curiosa] Fíjate.")).toBeNull();
    for (const texto of [
      "¡Jajaja! Qué cosas.",
      "¡Qué buena pregunta, Richard!",
      "¡Me encanta! Es increíble.",
      "Imagínate esto. Te cuento.",
      "Según la NASA, Marte tiene 2 lunas.",
      "[excited] ¡Genial!",
    ])
      expect(gestoDeRisa(texto), texto).toBeNull();
  });

  it("un avatar sin esas poses no hace gestos y se queda en la suya", () => {
    const solo = new Set<PoseId>(["tranquila"]);
    const { vistas } = correr(
      {
        tramos: [[0, "hablando"]],
        gestos: [{ pose: "riendo", hora: 0 }],
        respuestas: [{ hora: 0, ms: 9000 }],
      },
      20_000,
      solo,
    );
    expect(vistas).toEqual([[0, "tranquila"]]);
  });
});

describe("una conversación normal de 60 segundos", () => {
  it("tiene entre 3 y 6 cambios de pose en total", () => {
    // Saluda, Richard pregunta, Mia piensa y contesta con un gesto, Richard pregunta otra vez, Mia contesta
    // rápido y Richard vuelve a hablar.
    const guion: Guion = {
      tramos: [
        [0, "conectando"],
        [1000, "hablando"],
        [4500, "escuchando"],
        [12_000, "pensando"],
        [14_000, "hablando"],
        [34_000, "escuchando"],
        [42_000, "pensando"],
        [42_800, "hablando"],
        [55_000, "escuchando"],
      ],
      gestos: [{ pose: "idea", hora: 13_600 }],
      respuestas: [
        { hora: 900, ms: 3300 },
        { hora: 13_600, ms: 20_000 },
        { hora: 42_700, ms: 12_000 },
      ],
    };
    const { vistas, duraciones } = correr(guion, 60_000);
    const cambios = vistas.length - 1;
    expect(cambios).toBeGreaterThanOrEqual(3);
    expect(cambios).toBeLessThanOrEqual(6);
    for (const d of duraciones) if (!esGesto(d.pose)) expect(d.ms).toBeGreaterThanOrEqual(POSE_MINIMA_MS);
    // Hizo el gesto que pidió la IA.
    expect(vistas.some(([, p]) => p === "idea")).toBe(true);
  });
});
