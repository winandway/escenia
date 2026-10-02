import { describe, expect, it } from "vitest";
import { cortesDePausas, PAUSA_MAXIMA_SEG, tiempoTrasCortes, trozosQueQuedan } from "@compartido/pausas";

describe("pausas parejas en la voz (C-VOZ-6)", () => {
  // Una pieza de 20 s con un arranque en silencio, una pausa normal, dos largas y un final en silencio.
  const silencios = [
    { inicioSeg: 0, finSeg: 0.5 },
    { inicioSeg: 4, finSeg: 4.35 },
    { inicioSeg: 8, finSeg: 9.2 },
    { inicioSeg: 14, finSeg: 14.8 },
    { inicioSeg: 19.4, finSeg: 20 },
  ];
  const cortes = cortesDePausas(silencios, 20);

  it("una pausa de respiración normal no se toca", () => {
    expect(cortes.some((c) => c.desdeSeg >= 4 && c.hastaSeg <= 4.35)).toBe(false);
  });

  it("las pausas largas quedan todas del mismo largo", () => {
    const largas = cortes.filter((c) => c.desdeSeg > 1 && c.hastaSeg < 19);
    expect(largas).toHaveLength(2);
    expect(1.2 - (largas[0]!.hastaSeg - largas[0]!.desdeSeg)).toBeCloseTo(PAUSA_MAXIMA_SEG, 5);
    expect(0.8 - (largas[1]!.hastaSeg - largas[1]!.desdeSeg)).toBeCloseTo(PAUSA_MAXIMA_SEG, 5);
  });

  it("el silencio del arranque y el del final casi desaparecen", () => {
    expect(cortes[0]).toEqual({ desdeSeg: 0, hastaSeg: 0.44 });
    expect(cortes[cortes.length - 1]!.hastaSeg).toBe(20);
    expect(cortes[cortes.length - 1]!.desdeSeg).toBeCloseTo(19.52, 5);
  });

  it("las palabras se corren lo mismo que el audio", () => {
    // Una palabra dicha en el segundo 10 queda antes: se quitó el arranque y casi toda la primera pausa larga.
    const quitadoAntes = 0.44 + (1.2 - PAUSA_MAXIMA_SEG);
    expect(tiempoTrasCortes(10, cortes)).toBeCloseTo(10 - quitadoAntes, 5);
    // Lo dicho antes del primer corte largo solo se corre por el arranque.
    expect(tiempoTrasCortes(3, cortes)).toBeCloseTo(3 - 0.44, 5);
    // Un instante dentro de un corte cae en su borde: nunca hacia atrás.
    expect(tiempoTrasCortes(8.6, cortes)).toBeCloseTo(tiempoTrasCortes(cortes[1]!.desdeSeg, cortes), 5);
    expect(tiempoTrasCortes(0.2, cortes)).toBe(0);
  });

  it("los trozos que quedan suman la duración nueva", () => {
    const trozos = trozosQueQuedan(cortes, 20);
    const queda = trozos.reduce((s, t) => s + (t.hastaSeg - t.desdeSeg), 0);
    const quitado = cortes.reduce((s, c) => s + (c.hastaSeg - c.desdeSeg), 0);
    expect(queda).toBeCloseTo(20 - quitado, 5);
    expect(tiempoTrasCortes(20, cortes)).toBeCloseTo(queda, 5);
    expect(trozos[0]!.desdeSeg).toBeCloseTo(0.44, 5);
  });

  it("sin silencios largos no se corta nada", () => {
    expect(cortesDePausas([{ inicioSeg: 2, finSeg: 2.3 }], 10)).toEqual([]);
    expect(trozosQueQuedan([], 10)).toEqual([{ desdeSeg: 0, hastaSeg: 10 }]);
  });
});
