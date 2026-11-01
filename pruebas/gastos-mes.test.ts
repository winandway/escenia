// La pantalla de Gastos (docs/GASTOS.md): cada cobro del libro cae en su servicio y en su pieza, y el
// mes no mezcla gastos de otros meses.
import { describe, expect, it } from "vitest";
import { baseEnMemoria } from "./base-memoria";
import { mesValido, nombreDelServicio, piezaDelGasto, resumenDelMes } from "@/lib/gastos-mes";

describe("piezaDelGasto", () => {
  it("reconoce cada forma en que se anotan los gastos", () => {
    expect(piezaDelGasto("voz guion 13").clave).toBe("guion-13");
    expect(piezaDelGasto("imagen guion 4 escena 2").clave).toBe("guion-4");
    expect(piezaDelGasto("anuncio 1: voz (29 s)").clave).toBe("anuncio-1");
    expect(piezaDelGasto("director: encargo 7").clave).toBe("encargo-7");
    expect(piezaDelGasto("director, trabajo 1: voz de la locución").clave).toBe("director-video-1");
    expect(piezaDelGasto("transcripción grabación 1").clave).toBe("grabacion-1");
    expect(piezaDelGasto("plan de anuncio: Tienda").clave).toBe("planes-anuncio");
    expect(piezaDelGasto("guion: Cómo una tintorería controla").clave).toBe("guiones-ia");
    expect(piezaDelGasto("imagen escena 3").clave).toBe("escenas");
    expect(piezaDelGasto("algo nuevo").clave).toBe("otros");
  });

  it("junta fal y fal.ai en un solo servicio con nombre claro", () => {
    expect(nombreDelServicio("fal.ai")).toMatch(/^fal\.ai/);
    expect(nombreDelServicio("elevenlabs")).toMatch(/ElevenLabs/);
  });

  it("un mes mal escrito cae en el mes de hoy", () => {
    expect(mesValido("2026-10")).toBe("2026-10");
    expect(mesValido("2026-13")).toBe(new Date().toISOString().slice(0, 7));
    expect(mesValido("'; DROP")).toBe(new Date().toISOString().slice(0, 7));
  });
});

describe("resumenDelMes", () => {
  it("suma por servicio, por pieza y por día, solo del mes pedido", async () => {
    const db = baseEnMemoria();
    const filas: [string, string, string, number][] = [
      ["2026-10-05", "fal", "imagen guion 4 escena 1", 0.03],
      ["2026-10-05", "fal.ai", "imagen guion 4 escena 2", 0.03],
      ["2026-10-06", "elevenlabs", "voz guion 4", 0.05],
      ["2026-10-06", "fal.ai", "anuncio 1: presentadora", 0.5],
      ["2026-09-30", "fal.ai", "imagen guion 2 escena 1", 9],
    ];
    for (const f of filas)
      await db.ejecutar("INSERT INTO gastos (fecha, servicio, detalle, costo_usd) VALUES (?, ?, ?, ?)", f);
    const r = await resumenDelMes(db, "2026-10");
    expect(r.total).toBeCloseTo(0.61);
    expect(r.porServicio.map((s) => s.servicio)).toEqual(["fal", "elevenlabs"]);
    expect(r.porServicio[0]).toMatchObject({ veces: 3 });
    expect(r.porServicio[0]?.usd).toBeCloseTo(0.56);
    expect(r.porPieza[0]).toMatchObject({ clave: "anuncio-1" });
    const guion = r.porPieza.find((p) => p.clave === "guion-4");
    expect(guion?.usd).toBeCloseTo(0.11);
    expect(guion?.porServicio.fal).toBeCloseTo(0.06);
    expect(r.porDia.map((d) => d.fecha)).toEqual(["2026-10-05", "2026-10-06"]);
    expect(r.videos).toEqual({ guiones: 0, anuncios: 0, director: 0 });
  });
});
