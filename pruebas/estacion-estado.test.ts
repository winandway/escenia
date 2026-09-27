import { describe, expect, it } from "vitest";
import { estacionViva, tocarLatido } from "@/lib/estacion-estado";
import { latidoEstacion } from "@/lib/consultas";
import { baseEnMemoria } from "./base-memoria";

describe("latido de la Estación (C-LATIDO-1)", () => {
  it("sin señal está apagada; al tocar el latido queda viva", async () => {
    const db = baseEnMemoria();
    expect(estacionViva(await latidoEstacion(db))).toBe(false);
    await tocarLatido(db, "0.1.0");
    const latido = await latidoEstacion(db);
    expect(estacionViva(latido)).toBe(true);
    expect(latido?.version).toBe("0.1.0");
  });

  it("un aviso de avance (sin versión) refresca la hora y conserva la versión", async () => {
    const db = baseEnMemoria();
    await tocarLatido(db, "0.1.0");
    db.cruda.exec("UPDATE estacion_latido SET visto_en = datetime('now', '-10 minutes')");
    expect(estacionViva(await latidoEstacion(db))).toBe(false);
    await tocarLatido(db);
    const latido = await latidoEstacion(db);
    expect(estacionViva(latido)).toBe(true);
    expect(latido?.version).toBe("0.1.0");
  });

  it("una señal de hace más de 2 minutos ya no cuenta", () => {
    const hace3min = new Date(Date.now() - 3 * 60_000).toISOString().slice(0, 19).replace("T", " ");
    expect(estacionViva({ visto_en: hace3min })).toBe(false);
  });
});
