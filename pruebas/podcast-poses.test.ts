// El motor de poses de Mia (docs/PODCAST.md, «Mia y sus poses»): qué pose toca en cada estado y con cada cosa
// que dice, en qué orden mandan los gestos y que nunca cambie más de una vez cada 2,5 segundos.
import { describe, expect, it } from "vitest";
import {
  DESCANSO_MS,
  DURACION_GESTO,
  HABLA_ANTES_DE_DESCANSAR,
  LETRAS_POR_SEGUNDO,
  MIN_ENTRE_CAMBIOS,
  POSES,
  gestosDelTexto,
  memoriaInicial,
  siguientePose,
  type EstadoDelInvitado,
  type Gesto,
  type MemoriaDePoses,
  type PoseId,
} from "@compartido/podcast-poses";
import { gestosAlCambiarDeModo, gestosDeLaRespuesta } from "@/app/podcast/Estudio";

const TODAS = new Set<PoseId>(POSES);

/** Corre el motor cuadro a cuadro (cada 100 ms) siguiendo una lista de estados con su hora de inicio. */
function correr(
  tramos: [number, EstadoDelInvitado][],
  hasta: number,
  gestos: Gesto[] = [],
  tiene: ReadonlySet<PoseId> = TODAS,
) {
  let m: MemoriaDePoses = memoriaInicial(0);
  const vistas: [number, PoseId][] = [];
  for (let t = 0; t <= hasta; t += 100) {
    const estado = [...tramos].reverse().find(([desde]) => desde <= t)?.[1] ?? "reposo";
    m = siguientePose(m, estado, t, gestos, tiene);
    if (vistas[vistas.length - 1]?.[1] !== m.pose) vistas.push([t, m.pose]);
  }
  const poseEn = (t: number) => [...vistas].reverse().find(([desde]) => desde <= t)?.[1];
  return { vistas, poseEn };
}

describe("la pose de cada estado", () => {
  it("en espera y escuchando, manos juntas; pensando, la mano en la barbilla; hablando, las manos en la silla", () => {
    const { poseEn } = correr(
      [
        [0, "reposo"],
        [3000, "escuchando"],
        [6000, "pensando"],
        [9000, "hablando"],
      ],
      11_000,
    );
    expect(poseEn(1000)).toBe("tranquila");
    expect(poseEn(5000)).toBe("tranquila");
    expect(poseEn(7000)).toBe("pensando");
    expect(poseEn(10_000)).toBe("hablando");
  });

  it("al pensar alterna la barbilla y la tablet: un turno una, el siguiente la otra", () => {
    const { poseEn } = correr(
      [
        [0, "pensando"],
        [3000, "hablando"],
        [6000, "pensando"],
        [9000, "hablando"],
        [12_000, "pensando"],
      ],
      14_000,
    );
    expect(poseEn(1000)).toBe("pensando");
    expect(poseEn(7000)).toBe("notas");
    expect(poseEn(13_000)).toBe("pensando");
  });

  it("en una respuesta larga vuelve un rato a manos juntas cada 8 a 12 segundos, y sigue hablando", () => {
    const { vistas } = correr([[0, "hablando"]], 60_000);
    const descansos = vistas
      .filter(([, p]) => p === "tranquila")
      .map(([t]) => t)
      .filter((t) => t > 0);
    expect(descansos.length).toBeGreaterThanOrEqual(4);
    expect(descansos[0]).toBe(HABLA_ANTES_DE_DESCANSAR[0]);
    for (let i = 1; i < descansos.length; i++) {
      const entre = descansos[i]! - descansos[i - 1]! - DESCANSO_MS;
      expect(entre).toBeGreaterThanOrEqual(8000);
      expect(entre).toBeLessThanOrEqual(12_000);
    }
    // Cada descanso dura unos 3 segundos y vuelve a las manos en la silla.
    const tras = vistas.findIndex(([t]) => t === descansos[0]);
    expect(vistas[tras + 1]).toEqual([descansos[0]! + DESCANSO_MS, "hablando"]);
  });
});

describe("lo que dice manda sobre el estado", () => {
  it("la risa («jaja», «[laughs]», «[laughing]», «me río») pone la pose de risa unos segundos y vuelve", () => {
    for (const texto of ["¡Jajaja! Qué cosas.", "[laughs] Bueno…", "[laughing] Sí.", "Me río sola."]) {
      // Empezó a hablar en el segundo 0: la risa del segundo 3 ya no espera los 2,5 s entre cambios.
      const gestos = gestosDelTexto(texto, 3000);
      expect(gestos[0]?.pose, texto).toBe("riendo");
      const { poseEn } = correr([[0, "hablando"]], 9000, gestos);
      expect(poseEn(3500), texto).toBe("riendo");
      expect(poseEn(7000), texto).toBe("hablando");
    }
    expect(DURACION_GESTO.riendo).toBeGreaterThanOrEqual(2000);
    expect(DURACION_GESTO.riendo).toBeLessThanOrEqual(3000);
  });

  it("el entusiasmo aplaude, el comienzo de una explicación levanta el dedo y los datos sacan la tablet", () => {
    expect(gestosDelTexto("¡Qué buena pregunta, Richard!", 0)[0]?.pose).toBe("aplaudiendo");
    expect(gestosDelTexto("¡Me encanta!", 0)[0]?.pose).toBe("aplaudiendo");
    expect(gestosDelTexto("[excited] ¡Genial!", 0)[0]?.pose).toBe("aplaudiendo");
    expect(gestosDelTexto("Es increíble.", 0)[0]?.pose).toBe("aplaudiendo");
    expect(gestosDelTexto("Imagínate un mundo así.", 0)[0]?.pose).toBe("idea");
    expect(gestosDelTexto("¿Sabes qué? Te cuento algo.", 0)[0]?.pose).toBe("idea");
    expect(gestosDelTexto("[curious] Fíjate en esto.", 0)[0]?.pose).toBe("idea");
    expect(gestosDelTexto("Según la NASA, Marte tiene 2 lunas.", 0).map((g) => g.pose)).toContain("notas");
    expect(gestosDelTexto("Los científicos lo estudian.", 0)[0]?.pose).toBe("notas");
    expect(gestosDelTexto("Hola, ¿cómo estás?", 0)).toEqual([]);
  });

  it("cada gesto llega cuando se dice: más adelante en el texto, más tarde", () => {
    const relleno = "a".repeat(LETRAS_POR_SEGUNDO * 6);
    const [g] = gestosDelTexto(`${relleno} jajaja`, 1000);
    expect(g?.desde).toBeCloseTo(1000 + 6000 + 1000 / LETRAS_POR_SEGUNDO, -1);
    // Dos risas seguidas son una sola, más larga.
    expect(gestosDelTexto("jaja jaja", 0)).toHaveLength(1);
  });

  it("el orden manda: risa, aplauso, idea, datos y, al final, la pose del estado", () => {
    const gestos = (ps: Gesto["pose"][]) => ps.map((pose) => ({ pose, desde: 3000, hasta: 5600 }));
    const poseCon = (ps: Gesto["pose"][]) => correr([[0, "hablando"]], 4000, gestos(ps)).poseEn(3500);
    expect(poseCon(["notas", "idea", "aplaudiendo", "riendo"])).toBe("riendo");
    expect(poseCon(["notas", "idea", "aplaudiendo"])).toBe("aplaudiendo");
    expect(poseCon(["notas", "idea"])).toBe("idea");
    expect(poseCon(["notas"])).toBe("notas");
    expect(poseCon([])).toBe("hablando");
    // En espera (sin conversación) no hay gestos.
    expect(correr([[0, "reposo"]], 4000, gestos(["riendo", "aplaudiendo"])).poseEn(3500)).toBe("tranquila");
  });
});

describe("sin nervios", () => {
  it("nunca cambia de pose más de una vez cada 2,5 segundos, aunque el estado cambie más rápido", () => {
    const tramos: [number, EstadoDelInvitado][] = [];
    const estados: EstadoDelInvitado[] = ["escuchando", "pensando", "hablando"];
    for (let t = 0, i = 0; t < 30_000; t += 700, i++) tramos.push([t, estados[i % 3]!]);
    const { vistas } = correr(tramos, 30_000, gestosDelTexto("jaja ¡genial! imagínate 42", 4000));
    expect(vistas.length).toBeGreaterThan(4);
    for (let i = 2; i < vistas.length; i++)
      expect(vistas[i]![0] - vistas[i - 1]![0]).toBeGreaterThanOrEqual(MIN_ENTRE_CAMBIOS);
  });

  it("un avatar sin poses se queda siempre en la suya, y uno sin tablet piensa con la barbilla", () => {
    const solo = new Set<PoseId>(["tranquila"]);
    const { vistas } = correr([[0, "hablando"]], 20_000, gestosDelTexto("jajaja", 0), solo);
    expect(vistas).toEqual([[0, "tranquila"]]);
    const sinTablet = new Set<PoseId>(["tranquila", "pensando", "hablando"]);
    expect(
      correr(
        [
          [0, "pensando"],
          [3000, "hablando"],
          [6000, "pensando"],
        ],
        8000,
        [],
        sinTablet,
      ).poseEn(7000),
    ).toBe("pensando");
  });

  it("el estudio junta los gestos de cada respuesta y olvida los que ya pasaron", () => {
    const viejos: Gesto[] = [
      { pose: "riendo", desde: 0, hasta: 1000 },
      { pose: "idea", desde: 4000, hasta: 6000 },
    ];
    const nuevos = gestosDeLaRespuesta(viejos, "¡Me encanta!", 5000);
    expect(nuevos.map((g) => g.pose)).toEqual(["idea", "aplaudiendo"]);
  });
});

describe("los gestos no sobreviven a la respuesta (revisor, 7 nov 2026)", () => {
  it("si el invitado deja de hablar (terminó o lo interrumpieron), los gestos pendientes se tiran", () => {
    const pendientes = gestosDeLaRespuesta([], "¡Me encanta! Jajaja, imagínate", 0);
    expect(pendientes.length).toBeGreaterThan(0);
    expect(gestosAlCambiarDeModo(pendientes, true)).toEqual(pendientes);
    expect(gestosAlCambiarDeModo(pendientes, false)).toEqual([]);
  });
});
