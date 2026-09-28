import { describe, expect, it } from "vitest";
import {
  cuantosShorts,
  planificarShorts,
  SHORT_MAX_MS,
  SHORT_MIN_MS,
  tituloDeShort,
} from "@compartido/shorts";

const escena = (parte: string, seg: number, narracion = "Una frase de prueba. Otra frase.", extra = {}) => ({
  parte,
  narracion,
  ...extra,
  duracion: seg,
});

function conTiempos(lista: ReturnType<typeof escena>[]) {
  let t = 0;
  return lista.map((e) => {
    const inicioMs = t;
    t += e.duracion * 1000;
    return { ...e, inicioMs, finMs: t };
  });
}

describe("plan de shorts", () => {
  it("cuántos según el largo", () => {
    expect(cuantosShorts(60_000)).toBe(1);
    expect(cuantosShorts(150_000)).toBe(2);
    expect(cuantosShorts(412_000)).toBe(4);
    expect(cuantosShorts(900_000)).toBe(5);
  });

  it("un video de 7 minutos da 4 shorts contiguos, sin partir escenas, de 45 s a 3 min", () => {
    const escenas = conTiempos([
      escena("gancho", 14),
      escena("contexto", 40),
      escena("contexto", 30),
      escena("dato", 35),
      escena("contexto", 25),
      escena("dato", 33),
      escena("contexto", 30),
      escena("interludio", 7, ""),
      escena("dato", 40),
      escena("contexto", 45),
      escena("interludio", 7, ""),
      escena("dato", 40),
      escena("contexto", 30),
      escena("opinion", 12),
      escena("cierre", 34),
    ]);
    const plan = planificarShorts(escenas);
    expect(plan.length).toBe(4);
    expect(plan[0]?.inicioMs).toBe(0);
    expect(plan[plan.length - 1]?.finMs).toBe(escenas[escenas.length - 1]?.finMs);
    for (let k = 1; k < plan.length; k++) expect(plan[k]?.inicioMs).toBe(plan[k - 1]?.finMs);
    for (const s of plan) {
      expect(s.finMs - s.inicioMs).toBeGreaterThanOrEqual(SHORT_MIN_MS);
      expect(s.finMs - s.inicioMs).toBeLessThanOrEqual(SHORT_MAX_MS);
      const arranca = escenas.find((e) => e.inicioMs === s.inicioMs);
      expect(["interludio", "opinion"]).not.toContain(arranca?.parte);
      expect(s.total).toBe(4);
      expect(escenas[s.escenaInicio]?.inicioMs).toBe(s.inicioMs);
      expect(escenas[s.escenaFin]?.finMs).toBe(s.finMs);
    }
  });

  it("el título sale del titular o del rótulo, y si no, de la primera frase", () => {
    expect(
      tituloDeShort([{ inicioMs: 0, finMs: 1, parte: "dato", narracion: "x", titular: "Entra a la Sonora" }]),
    ).toBe("Entra a la Sonora");
    expect(
      tituloDeShort([
        {
          inicioMs: 0,
          finMs: 1,
          parte: "contexto",
          narracion: "En 1950 pasó algo que cambió todo. Luego más.",
        },
      ]),
    ).toBe("En 1950 pasó algo que cambió todo");
  });
});
