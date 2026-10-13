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
  acento: "#ff2a2a",
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
    // Si sobra poco, se estira el último en vez de pagar otro clip.
    expect(clipsDeEscena(5400)).toEqual([5]);
    expect(clipsDeEscena(21400)).toEqual([10, 10]);
    expect(clipsDeEscena(25000)).toEqual([10, 10, 5]);
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

describe("monigotes: cada línea del título cabe en una sola línea", () => {
  it("la letra se achica con el texto largo y nunca baja de 56 ni pasa de 96", async () => {
    const { tamanoDeLinea } = await import("../estacion/src/remotion/Monigotes");
    const t = tamanoDeLinea("TRES CANCIONES PROHIBIDAS");
    expect(t).toBeLessThan(92);
    expect(t * 0.46 * "TRES CANCIONES PROHIBIDAS".length).toBeLessThanOrEqual(960);
    expect(tamanoDeLinea("HOLA")).toBe(96);
    expect(tamanoDeLinea("X".repeat(80))).toBe(56);
  });
});

describe("monigotes: todo el texto queda donde YouTube no lo tapa (C-MONIGOTES-1)", () => {
  it("subtítulos, marca y recuadro de la canción quedan por encima del 85 % del alto y dentro de los lados", async () => {
    const { ZONA } = await import("../estacion/src/remotion/Monigotes");
    // Subtítulo (una línea de ~100 px) y marca (~110 px) tienen que terminar antes del límite.
    expect(ZONA.subtitulos + 100).toBeLessThan(ZONA.limiteAbajo);
    expect(ZONA.marca + 110).toBeLessThan(ZONA.limiteAbajo);
    expect(ZONA.limiteAbajo).toBeLessThanOrEqual(1920 * 0.85);
    // El recuadro de la canción: 16:9, PEQUEÑO, en la esquina de arriba a la izquierda, debajo del título
    // y por encima de donde están los personajes (el muñeco sigue siendo el protagonista).
    const r = ZONA.recuadro;
    expect(Math.abs(r.ancho / r.alto - 16 / 9)).toBeLessThan(0.01);
    expect(r.ancho).toBeLessThanOrEqual(1080 * 0.4);
    expect(r.x).toBeLessThanOrEqual(60);
    expect(r.y).toBeGreaterThan(ZONA.titulo + 200);
    expect(r.y + r.alto).toBeLessThanOrEqual(1920 * 0.4);
    // El nombre de la canción va donde van los subtítulos (zona segura).
    expect(ZONA.tarjetaCancion + 150).toBeLessThan(ZONA.limiteAbajo);
  });
});

describe("monigotes: el dibujo deja libre el sitio del título y del recuadro de la canción", () => {
  it("el pedido de dibujo exige la esquina de arriba a la izquierda vacía y sin texto", async () => {
    const { promptDeMonigote } = await import("../estacion/src/monigote");
    const p = promptDeMonigote("a man on a bench", "blue");
    expect(p).toContain("upper-left corner completely empty");
    expect(p).toContain("No text");
    expect(p).toContain("soft blue glow");
  });
});

describe("monigotes: el nombre de la canción cabe en una línea y las caras no van abajo", () => {
  it("la tarjeta se achica con nombres largos y el dibujo pide las caras en la franja del medio", async () => {
    const { tamanoDeTarjeta } = await import("../estacion/src/remotion/Monigotes");
    const largo = "ASÍ SE LE CANTA AL DESPECHO";
    expect(tamanoDeTarjeta(largo) * 0.47 * (largo.length + 2)).toBeLessThanOrEqual(820);
    expect(tamanoDeTarjeta("LA CORAZONADA")).toBe(84);
    const { promptDeMonigote } = await import("../estacion/src/monigote");
    expect(promptDeMonigote("x", "red")).toContain("never in the lower third");
  });
});

describe("monigotes: cada canal con su color (Full Código en verde, Caprichoso TV en rojo)", () => {
  it("sin color en el plan sale rojo; con color, ese; y el texto sobre la caja se lee", async () => {
    const { esquemaPlanMonigotes } = await import("../estacion/src/monigotes");
    const { textoSobre, ROJO } = await import("../estacion/src/remotion/Monigotes");
    const base = { titulo: ["A", "B"], marca: "M", partes: [{ texto: "t", dibujo: "d", movimiento: "m" }] };
    expect(esquemaPlanMonigotes.parse(base).acento).toBe(ROJO);
    expect(esquemaPlanMonigotes.parse({ ...base, acento: "#10f08c" }).acento).toBe("#10f08c");
    expect(() => esquemaPlanMonigotes.parse({ ...base, acento: "verde" })).toThrow();
    // Sobre el verde claro va letra negra; sobre el rojo, blanca.
    expect(textoSobre("#10f08c")).toBe("#000");
    expect(textoSobre(ROJO)).toBe("#fff");
  });
});
