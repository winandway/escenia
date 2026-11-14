import { describe, expect, it } from "vitest";
import { desfaseQueCuadra } from "../estacion/src/publicidad-plan";

// C-RECORTE-1: un tramo de presentadora ya pagado se recorta del video de antes aunque cada parte de la
// voz se haya corrido un poco. Caso real: el Kipuu del 7 nov 2026, donde un tramo de Maggie de 8,2 s que
// cruzaba el hueco entre dos partes se volvió a pagar (16 ¢) porque ese hueco cambió un milisegundo.
const HZ = 44100;
const ms = (x: number) => Math.round((x * HZ) / 1000);

/** Una «frase» sintética: un tono con su propia forma, fuerte (por encima del umbral). */
function frase(largoMs: number, semilla: number): Int16Array {
  const n = ms(largoMs);
  const x = new Int16Array(n);
  for (let i = 0; i < n; i++)
    x[i] = Math.round(8000 * Math.sin((i * (semilla + 3)) / 17) + 3000 * Math.sin(i / (semilla + 5)));
  return x;
}

/** Junta silencio y frases: números = silencio en ms, arreglos = voz. */
function armar(...trozos: (number | Int16Array)[]): Int16Array {
  const partes = trozos.map((t) => (typeof t === "number" ? new Int16Array(ms(t)) : t));
  const total = partes.reduce((s, p) => s + p.length, 0);
  const out = new Int16Array(total);
  let i = 0;
  for (const p of partes) {
    out.set(p, i);
    i += p.length;
  }
  return out;
}

describe("C-RECORTE-1: recortar de lo ya pagado con un desfase por parte de la voz", () => {
  const parte1 = frase(4100, 1);
  const parte2 = frase(3900, 2);

  it("si nada cambió, cuadra en el mismo sitio", () => {
    const viejo = armar(120, parte1, 240, parte2, 80);
    expect(desfaseQueCuadra(viejo, viejo)).toBe(0);
  });

  it("si solo cambió el silencio de las puntas, cuadra con el corrimiento", () => {
    const viejo = armar(300, parte1, 240, parte2, 80);
    const nuevo = armar(100, parte1, 240, parte2, 20);
    expect(desfaseQueCuadra(viejo, nuevo)).toBe(ms(200));
  });

  it("caso Kipuu 7 nov: el hueco entre las dos partes cambió 1 ms y aun así se recorta (no se paga)", () => {
    const viejo = armar(150, parte1, 240, parte2, 80);
    const nuevo = armar(150, parte1, 241, parte2, 80);
    expect(desfaseQueCuadra(viejo, nuevo)).toBe(0);
  });

  it("y con un hueco de 30 ms de diferencia también (menos de un cuadro de video)", () => {
    const viejo = armar(150, parte1, 270, parte2, 80);
    const nuevo = armar(150, parte1, 240, parte2, 110);
    expect(desfaseQueCuadra(viejo, nuevo)).toBe(0);
  });

  it("si una parte dice otra cosa, NO cuadra (se paga)", () => {
    const viejo = armar(150, parte1, 240, parte2, 80);
    const nuevo = armar(150, parte1, 240, frase(3900, 7), 80);
    expect(desfaseQueCuadra(viejo, nuevo)).toBeNull();
  });

  it("si el hueco cambió más de un cuadro (120 ms), NO cuadra: la boca se iría de la voz", () => {
    const viejo = armar(150, parte1, 240, parte2, 200);
    const nuevo = armar(150, parte1, 360, parte2, 80);
    expect(desfaseQueCuadra(viejo, nuevo)).toBeNull();
  });

  it("si el pedazo nuevo es todo silencio, NO cuadra", () => {
    expect(desfaseQueCuadra(armar(150, parte1), armar(500))).toBeNull();
  });
});

describe("C-RECORTE-1: el caso real del Kipuu (la voz de después se corrió y el tramo sigue a la misma hora)", () => {
  const frase6 = frase(7800, 4);
  const siguiente = frase(2000, 5);

  it("el tramo nuevo termina con 130 ms de la frase siguiente que el viejo no tenía: se recorta igual", () => {
    // Antes: la frase del tramo y, 153 ms después de que acaba el tramo, la siguiente (fuera del pedazo).
    const viejo = armar(150, frase6, 200);
    // Ahora toda la voz llegó 153 ms antes: el pedazo (misma hora) trae el arranque de la siguiente.
    const nuevo = armar(0, frase6.subarray(ms(3)), 197, siguiente.subarray(0, ms(130)));
    // (el primer trozo del nuevo empezó 3 ms dentro de la frase: ese arranque cortado tampoco se exige)
    expect(desfaseQueCuadra(viejo, nuevo)).not.toBeNull();
  });

  it("pero si lo que asoma de la frase vecina pasa de 250 ms, se paga", () => {
    const viejo = armar(150, frase6, 200);
    const nuevo = armar(150, frase6, 200, siguiente.subarray(0, ms(600)));
    expect(desfaseQueCuadra(viejo, nuevo)).toBeNull();
  });

  it("y si el viejo hablaba donde el nuevo calla (una palabra que se quitó), se paga", () => {
    const viejo = armar(150, frase6, 300, frase(1500, 9), 400);
    const nuevo = armar(150, frase6, 2200);
    expect(desfaseQueCuadra(viejo, nuevo)).toBeNull();
  });
});
