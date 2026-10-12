import { describe, expect, it } from "vitest";
import {
  bloquesDeSubtitulos,
  clipsDeEscena,
  escenasDePartes,
  piezasDeVoz,
  type PlanMonigotes,
} from "../estacion/src/monigotes";

const plan: PlanMonigotes = {
  titulo: ["A", "B"],
  marca: "CAPRICHOSO TV",
  partes: [
    { texto: "gancho", dibujo: "d", brillo: "red", movimiento: "m" },
    { texto: "uno", dibujo: "d", brillo: "red", movimiento: "m", cancion: { titulo: "X", artista: "Y" } },
    { texto: "cierre", dibujo: "d", brillo: "red", movimiento: "m" },
  ],
};

describe("monigotes: el hueco de cada canción, las escenas, los clips y los subtítulos", () => {
  it("después de cada parte con canción va un silencio de 5 s para pegar la canción", () => {
    expect(piezasDeVoz(plan)).toEqual([
      { texto: "gancho" },
      { texto: "uno" },
      { texto: "", silencioSeg: 5 },
      { texto: "cierre" },
    ]);
  });
  it("la escena con canción incluye su hueco y las escenas van pegadas, sin negro entre medio", () => {
    const tramos = [
      { inicioMs: 0, finMs: 8000 },
      { inicioMs: 8000, finMs: 20000 },
      { inicioMs: 20000, finMs: 25000 },
      { inicioMs: 25000, finMs: 31000 },
    ];
    const e = escenasDePartes(plan, tramos, 31000);
    expect(e[1]).toEqual({ inicioMs: 8000, finMs: 25000, hueco: { inicioMs: 20000, finMs: 25000 } });
    expect(e[0]?.finMs).toBe(e[1]?.inicioMs);
    expect(e[2]?.finMs).toBe(31000);
  });
  it("clips de 5 o 10 s que cubren la escena (hasta 3)", () => {
    expect(clipsDeEscena(4800)).toEqual([5]);
    expect(clipsDeEscena(8100)).toEqual([10]);
    // 15,2 s: 10 + 5 y el último va apenas más lento (sale más barato que 10 + 10).
    expect(clipsDeEscena(15200)).toEqual([10, 5]);
    expect(clipsDeEscena(19000)).toEqual([10, 10]);
    expect(clipsDeEscena(14900)).toEqual([10, 5]);
  });
  it("subtítulos de hasta 3 palabras en mayúsculas, con la más larga resaltada", () => {
    const b = bloquesDeSubtitulos([
      { text: "Si", startMs: 0, endMs: 150 },
      { text: " te", startMs: 200, endMs: 260 },
      { text: " acaban", startMs: 290, endMs: 560 },
      { text: " de", startMs: 600, endMs: 700 },
      { text: " terminar,", startMs: 720, endMs: 1100 },
    ]);
    expect(b[0]?.palabras).toEqual(["SI", "TE", "ACABAN"]);
    expect(b[0]?.resaltada).toBe(2);
    expect(b[1]?.palabras).toEqual(["DE", "TERMINAR"]);
  });
});
