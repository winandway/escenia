import { describe, expect, it } from "vitest";
import { separarEntregas } from "@compartido/videos";

const v = (id: number, formato: "16x9" | "9x16") => ({ id, formato });

describe("el panel muestra la última entrega de cada guion", () => {
  it("deja a la vista el largo más nuevo y sus Shorts; lo anterior queda aparte", () => {
    const videos = [v(1, "16x9"), v(2, "9x16"), v(3, "9x16"), v(4, "16x9"), v(5, "9x16"), v(6, "9x16")];
    const { vigentes, anteriores } = separarEntregas([...videos].reverse());
    expect(vigentes.map((x) => x.id)).toEqual([4, 5, 6]);
    expect(anteriores.map((x) => x.id)).toEqual([3, 2, 1]);
  });

  it("con una sola entrega no esconde nada", () => {
    const { vigentes, anteriores } = separarEntregas([v(7, "16x9"), v(8, "9x16")]);
    expect(vigentes.map((x) => x.id)).toEqual([7, 8]);
    expect(anteriores).toEqual([]);
    expect(separarEntregas([])).toEqual({ vigentes: [], anteriores: [] });
  });
});
