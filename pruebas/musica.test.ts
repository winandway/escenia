import { describe, expect, it } from "vitest";
import { elegirPista, palabrasClave } from "@compartido/musica";
import { VOLUMEN_ALTO, VOLUMEN_BAJO, volumenMusica } from "../estacion/src/remotion/musica";

const catalogo = [
  "salsa-1950s-cuban-brass-congas-upbeat.mp3",
  "tango-1940s-bandoneon-dramatic.mp3",
  "neutral-documentary-piano-soft-reflective.mp3",
  "electronic-minimal-soft-synths-curious-tech.mp3",
  "LEEME.md",
];

describe("elegir la pista de fondo", () => {
  it("unifica sinónimos y quita relleno", () => {
    expect(palabrasClave("1950s Cuban salsa, trumpets and congas, festive, instrumental")).toEqual([
      "1950s",
      "cuban",
      "salsa",
      "brass",
      "congas",
      "upbeat",
    ]);
  });

  it("gana la pista que comparte más palabras con el estilo del guion", () => {
    expect(elegirPista("1950s Cuban salsa, trumpets and congas, festive", catalogo)?.archivo).toBe(
      "salsa-1950s-cuban-brass-congas-upbeat.mp3",
    );
    expect(elegirPista("minimal electronic, soft synths, curious", catalogo)?.archivo).toBe(
      "electronic-minimal-soft-synths-curious-tech.mp3",
    );
  });

  it("sin coincidencias usa la pista neutral; sin catálogo, no hay música", () => {
    expect(elegirPista("baroque harpsichord", catalogo)?.archivo).toBe(
      "neutral-documentary-piano-soft-reflective.mp3",
    );
    expect(elegirPista("baroque harpsichord", ["tango-1940s-bandoneon-dramatic.mp3"])).toBeNull();
    expect(elegirPista("salsa", [])).toBeNull();
    expect(elegirPista("salsa", ["LEEME.md"])).toBeNull();
  });
});

describe("la música tiene que ser del mundo del video (C-MUSICA-2)", () => {
  const soloLatino = [
    "salsa-1950s-cuban-brass-congas-upbeat.mp3",
    "bolero-1950s-guitar-trio-romantic-melancholic.mp3",
    "son-cubano-1940s-tres-guitar-warm.mp3",
  ];

  it("un video de tecnología no se queda con una salsa solo por compartir el ánimo", () => {
    expect(elegirPista("upbeat electronic, energetic synths, festive", soloLatino)).toBeNull();
    expect(elegirPista("soft minimal electronic, warm, romantic", soloLatino)).toBeNull();
  });

  it("con una pista electrónica en el catálogo, esa es la que gana", () => {
    const conTech = [...soloLatino, "electronic-tech-synth-minimal-curious-pulse.mp3"];
    expect(elegirPista("minimal electronic, soft synths, tech, curious", conTech)?.archivo).toBe(
      "electronic-tech-synth-minimal-curious-pulse.mp3",
    );
    expect(elegirPista("upbeat futuristic digital beat", conTech)?.archivo).toBe(
      "electronic-tech-synth-minimal-curious-pulse.mp3",
    );
  });

  it("el ánimo sigue desempatando entre pistas del mismo género", () => {
    const salsas = ["salsa-1950s-cuban-brass-soft.mp3", "salsa-1950s-cuban-brass-upbeat.mp3"];
    expect(elegirPista("1950s Cuban salsa, festive", salsas)?.archivo).toBe(
      "salsa-1950s-cuban-brass-upbeat.mp3",
    );
  });

  it("una bachata sin pista propia todavía puede caer en otra pista de guitarra", () => {
    expect(elegirPista("Dominican bachata, romantic guitar, bongos", soloLatino)?.archivo).toMatch(/guitar/);
  });
});

describe("volumen de la música (C-MUSICA-1)", () => {
  const interludios = [{ inicioMs: 60_000, finMs: 66_000 }];
  const finVoz = 120_000;
  const finVideo = 124_000;

  it("mientras hay voz, la música nunca pasa del volumen bajo", () => {
    expect(VOLUMEN_BAJO).toBeLessThanOrEqual(0.15);
    for (let ms = 1_000; ms < finVoz; ms += 250) {
      const enInterludio = ms >= 60_000 - 800 && ms <= 66_000 + 800;
      if (!enInterludio)
        expect(volumenMusica(ms, interludios, finVoz, finVideo)).toBeLessThanOrEqual(VOLUMEN_BAJO);
    }
  });

  it("en el interludio sube al volumen alto, con rampas, y vuelve a bajar", () => {
    expect(volumenMusica(63_000, interludios, finVoz, finVideo)).toBe(VOLUMEN_ALTO);
    const subiendo = volumenMusica(59_600, interludios, finVoz, finVideo);
    expect(subiendo).toBeGreaterThan(VOLUMEN_BAJO);
    expect(subiendo).toBeLessThan(VOLUMEN_ALTO);
    expect(volumenMusica(70_000, interludios, finVoz, finVideo)).toBe(VOLUMEN_BAJO);
  });

  it("al final sube cuando la voz termina y se apaga del todo al cierre", () => {
    expect(volumenMusica(121_500, interludios, finVoz, finVideo)).toBeGreaterThan(VOLUMEN_BAJO);
    expect(volumenMusica(123_990, interludios, finVoz, finVideo)).toBeLessThan(0.01);
    expect(volumenMusica(124_000, interludios, finVoz, finVideo)).toBe(0);
    expect(volumenMusica(0, interludios, finVoz, finVideo)).toBe(0);
  });
});
