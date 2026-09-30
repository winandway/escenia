import { describe, expect, it, vi } from "vitest";
import { elegirProduccionSinEntregar } from "@compartido/entrega";
import { conReintentos, ErrorDelPanel, ESPERAS_MS, seReintenta } from "@compartido/reintentos";

const sinEsperar = async () => {};

describe("un corte de red no tumba la producción (C-ENTREGA-1)", () => {
  it("reintenta cuando falla la red o el panel dice que es pasajero", () => {
    expect(seReintenta(new TypeError("fetch failed"))).toBe(true);
    expect(seReintenta(Object.assign(new Error("algo"), { cause: new Error("ECONNRESET") }))).toBe(true);
    expect(seReintenta(new Error("The operation was aborted due to timeout"))).toBe(true);
    for (const codigo of [429, 500, 502, 503, 504])
      expect(seReintenta(new ErrorDelPanel("x", codigo))).toBe(true);
  });

  it("no reintenta lo que el panel rechazó: repetirlo daría lo mismo", () => {
    for (const codigo of [400, 401, 404, 409, 422])
      expect(seReintenta(new ErrorDelPanel("x", codigo))).toBe(false);
    expect(seReintenta(new Error("Las escenas tienen un formato inválido"))).toBe(false);
    expect(seReintenta("texto suelto")).toBe(false);
  });

  it("sube el trozo al tercer intento sin que el trabajo falle", async () => {
    const intentos: number[] = [];
    const esperas: number[] = [];
    const r = await conReintentos(
      async (n) => {
        intentos.push(n);
        if (n < 3) throw new TypeError("fetch failed");
        return "subido";
      },
      { dormir: sinEsperar, alReintentar: (_n, ms) => esperas.push(ms) },
    );
    expect(r).toBe("subido");
    expect(intentos).toEqual([1, 2, 3]);
    expect(esperas).toEqual([ESPERAS_MS[0], ESPERAS_MS[1]]);
  });

  it("se rinde después de todas las esperas y deja ver el error de verdad", async () => {
    const tarea = vi.fn(async () => {
      throw new TypeError("fetch failed");
    });
    await expect(conReintentos(tarea, { dormir: sinEsperar })).rejects.toThrow("fetch failed");
    expect(tarea).toHaveBeenCalledTimes(ESPERAS_MS.length + 1);
  });

  it("un rechazo del panel falla de una, sin esperar", async () => {
    const tarea = vi.fn(async () => {
      throw new ErrorDelPanel("El panel respondió 409", 409);
    });
    await expect(conReintentos(tarea, { dormir: sinEsperar })).rejects.toThrow("409");
    expect(tarea).toHaveBeenCalledTimes(1);
  });
});

describe("el reintento retoma la entrega en vez de producir otra vez (C-ENTREGA-1)", () => {
  const guardada = (p: Partial<Parameters<typeof elegirProduccionSinEntregar>[0][number]>) => ({
    numero: 21,
    huella: "guion-igual",
    entregado: false,
    completa: true,
    ...p,
  });

  it("elige la producción del mismo guion que se armó y no llegó al panel", () => {
    expect(elegirProduccionSinEntregar([guardada({})], "guion-igual")?.numero).toBe(21);
    expect(
      elegirProduccionSinEntregar([guardada({ numero: 19 }), guardada({ numero: 21 })], "guion-igual")
        ?.numero,
    ).toBe(21);
  });

  it("no retoma si el guion cambió, si ya se entregó o si faltan archivos", () => {
    expect(elegirProduccionSinEntregar([guardada({})], "guion-distinto")).toBeNull();
    expect(elegirProduccionSinEntregar([guardada({ entregado: true })], "guion-igual")).toBeNull();
    expect(elegirProduccionSinEntregar([guardada({ completa: false })], "guion-igual")).toBeNull();
    expect(elegirProduccionSinEntregar([], "guion-igual")).toBeNull();
  });
});
