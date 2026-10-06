import { describe, expect, it } from "vitest";
import { devolverTrabajosPerdidos, estacionViva, tocarLatido } from "@/lib/estacion-estado";
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

describe("trabajos que la Estación tomó y abandonó (C-ESTACION-2)", () => {
  const sembrar = (db: ReturnType<typeof baseEnMemoria>) => {
    db.cruda.exec(`
      INSERT INTO temas (id, tematica_id, titulo, estado) VALUES (1, 'presentador-tv', 'Prueba', 'elegido');
      INSERT INTO guiones (id, tema_id, tematica_id, titulo, contenido, estructura, estado) VALUES (1, 1, 'presentador-tv', 'Prueba', '{}', 'gancho', 'aprobado');
      INSERT INTO trabajos (id, guion_id, tipo, estado, paso, tomado_en) VALUES
        (1, 1, 'producir', 'tomado', 'tomado', datetime('now', '-5 minutes')),
        (2, 1, 'producir', 'tomado', 'armando el video', datetime('now', '-5 minutes')),
        (3, 1, 'producir', 'tomado', 'armando el video', datetime('now', '-3 hours')),
        (4, 1, 'producir', 'tomado', 'tomado', datetime('now', '-1 minutes'));
    `);
  };
  it("vuelve a la fila el que se quedó en «tomado» sin dar un paso en 3 minutos, y el de más de 2 horas; los demás siguen", async () => {
    const db = baseEnMemoria();
    sembrar(db);
    expect(await devolverTrabajosPerdidos(db)).toBe(2);
    const estados = await db.todos<{ id: number; estado: string; paso: string }>(
      "SELECT id, estado, paso FROM trabajos ORDER BY id",
    );
    expect(estados.map((t) => `${t.id}:${t.estado}`)).toEqual([
      "1:pendiente",
      "2:tomado",
      "3:pendiente",
      "4:tomado",
    ]);
    expect(estados[0]?.paso).toBe("reintento tras corte");
  });
});
