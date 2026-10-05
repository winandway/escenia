// Formato Presentador (docs/PRESENTADOR.md, candado C-PRESENTADOR-1): Richard se
// graba hablando y el video se arma alrededor de su voz y su imagen.
import { describe, expect, it } from "vitest";
import {
  asegurarModeloTranscripcion,
  costoTranscripcionUsd,
  MODELO_TRANSCRIPCION,
} from "@compartido/modelos";
import {
  APERTURA_MS,
  momentosDelPresentador,
  palabrasDeTranscripcion,
  tramosDeGrabacion,
} from "@compartido/presentador";
import { NOMBRE_FORMATO } from "@compartido/tematicas";
import { colorSiEsCroma, recorteDeFigura } from "../estacion/src/croma";
import { esquemaPropsVideo } from "../estacion/src/remotion/props";

const dicho = (texto: string, cadaMs = 400) =>
  texto.split(/\s+/).map((text, k) => ({ text, startMs: 1000 + k * cadaMs, endMs: 1000 + k * cadaMs + 300 }));

describe("presentador: de la transcripción a las palabras del video", () => {
  it("solo cuentan las palabras: ni los espacios ni los ruidos; cada una con su tiempo en milésimas", () => {
    const p = palabrasDeTranscripcion([
      { text: "Hola", type: "word", start: 0.5, end: 0.8, logprob: -0.1 },
      { text: " ", type: "spacing", start: 0.8, end: 0.82 },
      { text: "(risas)", type: "audio_event", start: 0.9, end: 1.4 },
      { text: "amigos.", type: "word", start: 1.5, end: 2.0 },
      { text: "rota", type: "word" },
    ]);
    expect(p.map((x) => x.text)).toEqual(["Hola", " amigos."]);
    expect(p[0]).toMatchObject({ startMs: 500, endMs: 800, timestampMs: 500 });
    expect(p[1]?.startMs).toBe(1500);
  });

  it("la transcripción cuesta centavos y solo corre el modelo permitido", () => {
    expect(costoTranscripcionUsd(MODELO_TRANSCRIPCION, 600)).toBeLessThan(0.05);
    expect(() => asegurarModeloTranscripcion("otro-modelo-caro")).toThrow("bloqueado");
  });
});

describe("presentador: dónde empieza cada escena dentro de la grabación", () => {
  const palabras = dicho(
    "Cada vez que vendes algo pasan cuatro cosas Y de dónde sale ese producto Del depósito Al final del día todo cuadra",
  );

  it("cada escena empieza donde él dice sus primeras palabras, y la última llega al final", () => {
    const t = tramosDeGrabacion(
      [
        "Cada vez que vendes algo, pasan cuatro cosas.",
        "¿Y de dónde sale ese producto? Del depósito.",
        "Al final del día, todo cuadra.",
      ],
      palabras,
      12_000,
    );
    expect(t.map((x) => x.inicioMs)).toEqual([0, 1000 + 8 * 400 - 150, 1000 + 16 * 400 - 150]);
    expect(t[0]?.finMs).toBe(t[1]?.inicioMs);
    expect(t[2]?.finMs).toBe(12_000);
  });

  it("una escena cuyo arranque no aparece no se pierde: se reparte entre sus vecinas, en orden", () => {
    const t = tramosDeGrabacion(
      [
        "Cada vez que vendes algo",
        "Esto nunca lo dijo así",
        "Tampoco esto otro",
        "Al final del día todo cuadra",
      ],
      palabras,
      12_000,
    );
    expect(t).toHaveLength(4);
    for (let k = 1; k < t.length; k++) expect(t[k]?.inicioMs ?? 0).toBeGreaterThan(t[k - 1]?.inicioMs ?? 0);
    expect(t[3]?.inicioMs).toBe(1000 + 16 * 400 - 150);
    expect(t.every((x) => x.finMs > x.inicioMs)).toBe(true);
  });
});

describe("presentador: cuándo sale en grande y cuándo en la esquina", () => {
  it("abre en grande, se va a la esquina, vuelve un momento al empezar cada tema y se queda en grande en la opinión", () => {
    const m = momentosDelPresentador([
      { parte: "gancho", inicioMs: 0, finMs: 12_000 },
      { parte: "demo", inicioMs: 12_000, finMs: 30_000 },
      { parte: "dato", inicioMs: 30_000, finMs: 34_000 },
      { parte: "opinion", inicioMs: 34_000, finMs: 44_000 },
      { parte: "cierre", inicioMs: 44_000, finMs: 56_000 },
    ]);
    expect(m[0]).toEqual({ inicioMs: 0, modo: "completo" });
    expect(m[1]).toEqual({ inicioMs: APERTURA_MS, modo: "esquina" });
    expect(m).toContainEqual({ inicioMs: 12_000, modo: "completo" });
    expect(m).toContainEqual({ inicioMs: 34_000, modo: "completo" });
    // Nunca dos seguidos iguales ni fuera de orden: cada momento es un cambio de verdad.
    for (let k = 1; k < m.length; k++) {
      expect(m[k]?.modo).not.toBe(m[k - 1]?.modo);
      expect(m[k]?.inicioMs ?? 0).toBeGreaterThan(m[k - 1]?.inicioMs ?? 0);
    }
    // La escena corta (4 s) no lo trae a pantalla completa: no da tiempo a nada.
    expect(m.some((x) => x.inicioMs === 30_000)).toBe(false);
  });
});

describe("presentador: el fondo de la grabación", () => {
  it("reconoce un croma verde o azul parejo; un fondo negro o una sala no son croma", () => {
    expect(
      colorSiEsCroma([
        [32, 170, 60],
        [30, 168, 58],
        [34, 172, 61],
        [31, 169, 60],
      ]),
    ).toBe("0x20aa3c");
    expect(
      colorSiEsCroma([
        [20, 60, 200],
        [22, 62, 205],
      ]),
    ).toMatch(/^0x/);
    expect(
      colorSiEsCroma([
        [12, 12, 14],
        [10, 11, 12],
      ]),
    ).toBeNull();
    expect(
      colorSiEsCroma([
        [200, 190, 180],
        [32, 170, 60],
      ]),
    ).toBeNull();
    expect(colorSiEsCroma([])).toBeNull();
  });

  it("el recorte abarca a la persona en TODA la grabación, cabeza incluida, y llega hasta abajo", () => {
    // Recuadros medidos en un video de 480 de ancho (el original es de 1920 × 1080).
    const r = recorteDeFigura(
      [
        [170, 312, 51, 268],
        [150, 300, 60, 268],
        [190, 330, 48, 268],
      ],
      480,
      { ancho: 1920, alto: 1080 },
    );
    if (!r) throw new Error("tenía que haber recorte");
    // Caso real del 5 oct 2026: con `cropdetect` la cabeza quedaba fuera (el recorte empezaba en el cuello).
    expect(r.y).toBeLessThanOrEqual(48 * 4);
    expect(r.x).toBeLessThanOrEqual(150 * 4);
    expect(r.x + r.ancho).toBeGreaterThanOrEqual(330 * 4);
    expect(r.y + r.alto).toBe(1080);
    expect(r.ancho % 2).toBe(0);
    expect(recorteDeFigura([], 480, { ancho: 1920, alto: 1080 })).toBeNull();
  });
});

describe("presentador: en el video y en los nombres", () => {
  it("un video sin presentador se arma como siempre, y cada formato tiene su nombre", () => {
    const p = esquemaPropsVideo.parse({
      titulo: "Sin presentador",
      audio: "voz.mp3",
      duracionMs: 1000,
      palabras: [],
      escenas: [],
      producto: null,
    });
    expect(p.presentador).toBeNull();
    expect(NOMBRE_FORMATO).toEqual({
      clasico: "Documental",
      ilustrado: "Cómic",
      neon: "Neón",
      mixto: "Neón con personajes",
    });
  });
});
