// Formato Presentador (docs/PRESENTADOR.md, candado C-PRESENTADOR-1): Richard se
// graba hablando y el video se arma alrededor de su voz y su imagen.
import { describe, expect, it } from "vitest";
import {
  asegurarModeloTranscripcion,
  costoTranscripcionUsd,
  MODELO_TRANSCRIPCION,
} from "@compartido/modelos";
import {
  AIRE_ANTES_MS,
  AIRE_DESPUES_MS,
  APERTURA_MS,
  corregirNombres,
  corteDeGrabacion,
  momentosDelPresentador,
  NOMBRES_PROPIOS,
  palabrasDesde,
  palabrasDeTranscripcion,
  tramosDeGrabacion,
} from "@compartido/presentador";
import { NOMBRE_FORMATO } from "@compartido/tematicas";
import { cromaDeCuadro, juntarCromas, umbralesDeCroma, zonaEnPuntos } from "@compartido/croma";
import { recorteDeFigura } from "../estacion/src/croma";
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

describe("presentador: los nombres propios de Richard (C-NOMBRES-1)", () => {
  it("el producto que vende sale bien escrito, aunque la transcripción lo escriba como suena", () => {
    // Caso real del 5 oct 2026: dijo «Beellon.com» y el video salió con «Billon.com» en los
    // subtítulos, en el diagrama y en la barra de secciones.
    expect(corregirNombres("mira Billon.com, nuestra plataforma. Todo lo hacemos en Billon, así que")).toBe(
      "mira Beellon.com, nuestra plataforma. Todo lo hacemos en Beellon, así que",
    );
    expect(corregirNombres("Bilón y beellon y Beellon")).toBe("Beellon y beellon y Beellon");
    // Una cifra no es su producto: en minúscula se queda como está.
    expect(corregirNombres("ganó un billón de dólares, mil billones")).toBe(
      "ganó un billón de dólares, mil billones",
    );
    // Lo demás no se toca.
    expect(corregirNombres("ChatGPT de OpenAI y Gemini de Google")).toBe(
      "ChatGPT de OpenAI y Gemini de Google",
    );
    // Cada nombre correcto se reconoce a sí mismo y ninguna variante es una palabra corriente.
    for (const n of NOMBRES_PROPIOS) {
      expect(corregirNombres(n.correcto)).toBe(n.correcto);
      for (const v of n.variantes) expect(v).toBe(v.toLowerCase());
    }
  });

  it("los subtítulos y el texto del plan salen con el nombre corregido", () => {
    const palabras = palabrasDeTranscripcion([
      { text: "mira", start: 1, end: 1.2, type: "word" },
      { text: "Billon.com,", start: 1.3, end: 2, type: "word" },
    ]);
    expect(palabras.map((p) => p.text)).toEqual(["mira", " Beellon.com,"]);
  });
});

describe("presentador: el fondo de la grabación", () => {
  /** Un cuadro de prueba de 90 × 160: se pinta punto por punto con la función que se le pase. */
  const cuadro = (pintar: (x: number, y: number) => [number, number, number]) => {
    const [ancho, alto] = [90, 160];
    const rgb = new Uint8Array(ancho * alto * 3);
    for (let y = 0; y < alto; y++) for (let x = 0; x < ancho; x++) rgb.set(pintar(x, y), (y * ancho + x) * 3);
    return { rgb, ancho, alto };
  };
  const TELA: [number, number, number] = [83, 179, 103];
  const ARRUGA: [number, number, number] = [60, 140, 78];
  const TECHO: [number, number, number] = [228, 226, 220];
  const PANEL: [number, number, number] = [150, 150, 152];
  const CHAQUETA: [number, number, number] = [22, 22, 26];
  const PIEL: [number, number, number] = [196, 150, 124];
  /** La grabación real de Richard: techo en el tercio de arriba, un panel gris a la izquierda y él en el centro. */
  const comoLaDeRichard = (x: number, y: number): [number, number, number] => {
    if (y < 48) return TECHO;
    if (x < 10) return PANEL;
    if (y >= 54 && y < 76 && x >= 36 && x < 56) return PIEL; // la cabeza
    if (y >= 76 && x >= 16 && x < 78) return CHAQUETA; // el cuerpo, hasta abajo
    return (x + y) % 7 === 0 ? ARRUGA : TELA;
  };

  it("encuentra la tela verde aunque no llene el cuadro, y dice qué zona cubre", () => {
    // Caso real del 5 oct 2026: antes se miraban las dos esquinas de arriba (aquí, techo blanco)
    // y la primera grabación de Richard salió «sin croma», en una ventana.
    const c = cuadro(comoLaDeRichard);
    const uno = cromaDeCuadro(c.rgb, c.ancho, c.alto);
    if (!uno) throw new Error("tenía que encontrar la tela");
    expect(uno.zona.y0).toBeCloseTo(48 / 160, 2);
    expect(uno.zona.x0).toBeCloseTo(10 / 90, 2);
    expect(uno.zona.x1).toBe(1);
    // El color es el de la tela (no el de sus arrugas ni un promedio con la chaqueta).
    expect(uno.color).toEqual(TELA);

    const croma = juntarCromas([uno, uno, uno, uno, uno]);
    if (!croma) throw new Error("tenía que haber croma");
    expect(croma.color).toBe("0x53b367");
    // La zona deja afuera el techo y el panel, con un margen hacia adentro; por la derecha y por
    // abajo la tela llega al borde y no se recorta nada.
    const z = zonaEnPuntos(croma.zona, { ancho: 720, alto: 1280 });
    expect(z.y).toBeGreaterThanOrEqual(384);
    expect(z.y).toBeLessThan(384 + 40);
    expect(z.x).toBeGreaterThanOrEqual(80);
    expect(z.x).toBeLessThan(80 + 24);
    expect(z.x + z.ancho).toBe(720);
    expect(z.y + z.alto).toBe(1280);
    expect([z.x % 2, z.y % 2, z.ancho % 2, z.alto % 2]).toEqual([0, 0, 0, 0]);
  });

  it("una tela que llena el cuadro no se recorta; un fondo negro, una sala o una planta no son croma", () => {
    const lleno = cuadro((x, y) => (y >= 40 && x >= 30 && x < 60 ? CHAQUETA : [30, 170, 60]));
    const c = cromaDeCuadro(lleno.rgb, lleno.ancho, lleno.alto);
    expect(c?.zona).toEqual({ x0: 0, x1: 1, y0: 0 });
    expect(juntarCromas([c, c, c])?.zona).toEqual({ x0: 0, x1: 1, y0: 0 });
    const azul = cuadro(() => [20, 60, 200]);
    expect(juntarCromas([cromaDeCuadro(azul.rgb, azul.ancho, azul.alto)])?.color).toBe("0x143cc8");

    const negro = cuadro(() => [12, 12, 14]);
    expect(cromaDeCuadro(negro.rgb, negro.ancho, negro.alto)).toBeNull();
    const sala = cuadro((x, y) => ((x * 7 + y * 3) % 5 === 0 ? [200, 190, 180] : [120, 100, 90]));
    expect(cromaDeCuadro(sala.rgb, sala.ancho, sala.alto)).toBeNull();
    // Una planta en una esquina es verde, pero no es una tela: ocupa muy poco.
    const planta = cuadro((x, y) => (x < 20 && y > 120 ? [40, 150, 50] : [200, 200, 200]));
    expect(cromaDeCuadro(planta.rgb, planta.ancho, planta.alto)).toBeNull();
    // Si solo un cuadro de cinco parece croma, no lo es.
    expect(juntarCromas([c, null, null, null, null])).toBeNull();
    expect(juntarCromas([])).toBeNull();
  });

  it("el verde se borra por cuánto verde le sobra a cada punto: lo negro, lo gris, lo blanco y la piel se quedan", () => {
    // Caso real del 5 oct 2026: con el `chromakey` de ffmpeg y esta misma tela, la chaqueta negra
    // y la camiseta desaparecían (para ese filtro, un gris queda «cerca» de un verde apagado).
    const u = umbralesDeCroma("0x53b367");
    expect(u.verde).toBe(true);
    const exceso = ([r, g, b]: [number, number, number]) => g - Math.max(r, b);
    // La tela y sus arrugas se van enteras.
    expect(exceso(TELA)).toBeGreaterThanOrEqual(u.alto);
    expect(exceso(ARRUGA)).toBeGreaterThanOrEqual(u.alto);
    // La persona se queda entera: nada de lo suyo llega siquiera al umbral de abajo.
    for (const color of [CHAQUETA, PIEL, TECHO, PANEL, [180, 205, 235] as [number, number, number]])
      expect(exceso(color)).toBeLessThan(u.bajo);
    expect(u.alto).toBeGreaterThan(u.bajo);
    // Con una tela azul se mira el azul.
    expect(umbralesDeCroma("0x143cc8").verde).toBe(false);
  });

  it("se usa solo el trozo en el que habla: sin el principio ni el final en los que se acerca a la cámara", () => {
    // Su primera grabación: 109 s; empieza a hablar a los 2,96 s y termina a los 105,2 s.
    const palabras = [
      { text: "La", startMs: 2960, endMs: 3100, timestampMs: 2960, confidence: null },
      { text: "inteligencia", startMs: 3120, endMs: 3800, timestampMs: 3120, confidence: null },
      { text: "chao.", startMs: 104_800, endMs: 105_220, timestampMs: 104_800, confidence: null },
    ];
    const corte = corteDeGrabacion(palabras, 109_192);
    expect(corte).toEqual({ desdeMs: 2960 - AIRE_ANTES_MS, hastaMs: 105_220 + AIRE_DESPUES_MS });
    const corridas = palabrasDesde(palabras, corte.desdeMs);
    expect(corridas[0]).toMatchObject({ text: "La", startMs: AIRE_ANTES_MS, timestampMs: AIRE_ANTES_MS });
    expect(corridas[2]?.endMs).toBe(105_220 - corte.desdeMs);
    // Si habla desde el primer instante, no se corta nada por delante; y nunca se sale de la grabación.
    expect(corteDeGrabacion([{ startMs: 100, endMs: 9_900 }], 10_000)).toEqual({
      desdeMs: 0,
      hastaMs: 10_000,
    });
    expect(corteDeGrabacion([], 5_000)).toEqual({ desdeMs: 0, hastaMs: 5_000 });
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
