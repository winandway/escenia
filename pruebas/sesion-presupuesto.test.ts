import { beforeEach, describe, expect, it } from "vitest";
import { baseEnMemoria } from "./base-memoria";
import {
  anotarIntentoFallido,
  cerrarSesion,
  crearSesion,
  demasiadosIntentos,
  limpiarIntentos,
  MAX_INTENTOS,
  sesionValida,
} from "@/lib/sesion";
import { anotarGasto, autorizarGasto, gastadoHoy, PresupuestoAgotado, topeDiario } from "@/lib/presupuesto";

let db: ReturnType<typeof baseEnMemoria>;
beforeEach(() => {
  db = baseEnMemoria();
});

describe("sesiones", () => {
  it("crea, valida y cierra de verdad en el servidor", async () => {
    const { token } = await crearSesion(db);
    expect(await sesionValida(db, token)).toBe(true);
    // En la base solo está la huella, no el token.
    const fila = await db.uno<{ id: string }>("SELECT id FROM sesiones");
    expect(fila?.id).not.toBe(token);
    await cerrarSesion(db, token);
    expect(await sesionValida(db, token)).toBe(false);
  });

  it("rechaza tokens vacíos, inventados o vencidos", async () => {
    expect(await sesionValida(db, undefined)).toBe(false);
    expect(await sesionValida(db, "inventado")).toBe(false);
    const { token } = await crearSesion(db);
    await db.ejecutar("UPDATE sesiones SET expira_en = datetime('now', '-1 day')");
    expect(await sesionValida(db, token)).toBe(false);
  });

  it("bloquea la IP después de los intentos permitidos y la libera al entrar bien", async () => {
    for (let i = 0; i < MAX_INTENTOS; i++) {
      expect(await demasiadosIntentos(db, "1.1.1.1")).toBe(false);
      await anotarIntentoFallido(db, "1.1.1.1");
    }
    expect(await demasiadosIntentos(db, "1.1.1.1")).toBe(true);
    expect(await demasiadosIntentos(db, "2.2.2.2")).toBe(false);
    await limpiarIntentos(db, "1.1.1.1");
    expect(await demasiadosIntentos(db, "1.1.1.1")).toBe(false);
  });
});

describe("candado de gasto", () => {
  it("arranca en $3 y suma lo gastado hoy", async () => {
    expect(await topeDiario(db)).toBe(3);
    await anotarGasto(db, "claude", "guion", 1.25);
    await anotarGasto(db, "elevenlabs", "voz", 0.5);
    expect(await gastadoHoy(db)).toBeCloseTo(1.75);
  });

  it("para en seco cuando el gasto estimado pasa el tope", async () => {
    await anotarGasto(db, "claude", "guion", 2.95);
    await expect(autorizarGasto(db, 0.04)).resolves.toBeUndefined();
    await expect(autorizarGasto(db, 0.1)).rejects.toBeInstanceOf(PresupuestoAgotado);
  });

  it("sin tope válido, el tope es cero (mejor no gastar)", async () => {
    await db.ejecutar("UPDATE ajustes SET valor = 'abc' WHERE clave = 'presupuesto_diario_usd'");
    expect(await topeDiario(db)).toBe(0);
    await expect(autorizarGasto(db, 0.01)).rejects.toBeInstanceOf(PresupuestoAgotado);
  });

  it("no acepta costos negativos ni inválidos", async () => {
    await expect(anotarGasto(db, "x", "y", -1)).rejects.toThrow();
    await expect(anotarGasto(db, "x", "y", Number.NaN)).rejects.toThrow();
  });
});
