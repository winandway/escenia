import { beforeEach, describe, expect, it } from "vitest";
import { baseEnMemoria } from "./base-memoria";
import { esquemaGuion } from "@compartido/guion";
import { crearVersionNueva } from "@/lib/versiones";

const contenido = {
  titulo: "Prince Royce: 15 nominaciones y cero premios",
  gancho: "Quince nominaciones. Cero premios.",
  escenas: [
    {
      parte: "gancho",
      narracion: "Quince nominaciones.",
      visual: { tipo: "foto", busqueda: "Prince Royce 2026" },
    },
    { parte: "dato", narracion: "Cero premios.", visual: { tipo: "titular", titular: "0 PREMIOS" } },
    {
      parte: "opinion",
      narracion: "La molestia es válida.",
      visual: { tipo: "texto", texto_en_pantalla: "Mi opinión" },
    },
  ],
  hechos_a_verificar: [],
  descripcion_youtube: "",
  etiquetas: [],
  musica: "bachata guitar",
  voz: "richard",
  publicacion: {
    titulo: "Prince Royce y los Latin Grammy",
    descripcion: "Una descripción de más de cuarenta letras para que valga.",
    etiquetas: ["a1", "b2", "c3", "d4", "e5", "f6", "g7", "h8", "i9", "j10"],
    shorts: [],
    generado_en: "",
    shorts_producidos: [],
  },
};

describe("versión nueva de un guion aprobado", () => {
  let db: ReturnType<typeof baseEnMemoria>;
  let guionId = 0;
  beforeEach(async () => {
    db = baseEnMemoria();
    const tema = await db.ejecutar(
      "INSERT INTO temas (tematica_id, titulo, contexto, url_fuente, estado) VALUES ('biografias', 'Prince Royce', '', '', 'elegido')",
    );
    const g = await db.ejecutar(
      `INSERT INTO guiones (tema_id, tematica_id, titulo, contenido, estructura, opinion_richard, modelo, estado)
       VALUES (?, 'biografias', ?, ?, 'gancho>dato>opinion', 'La molestia de Prince Royce es completamente válida.', 'claude', 'aprobado')`,
      [tema.ultimoId, contenido.titulo, JSON.stringify(contenido)],
    );
    guionId = g.ultimoId ?? 0;
  });

  it("copia el guion a un borrador, con la opinión de Richard y sin los textos de YouTube viejos", async () => {
    const r = await crearVersionNueva(db, guionId);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const fila = await db.uno<{
      estado: string;
      version: number;
      contenido: string;
      opinion_richard: string;
    }>("SELECT estado, version, contenido, opinion_richard FROM guiones WHERE id = ?", [r.guionId]);
    expect(fila?.estado).toBe("borrador");
    expect(fila?.version).toBe(2);
    expect(fila?.opinion_richard).toContain("completamente válida");
    const copia = esquemaGuion.parse(JSON.parse(fila?.contenido ?? "{}"));
    expect(copia.escenas).toHaveLength(3);
    expect(copia.publicacion).toBeNull();
    // El original no se toca.
    const original = await db.uno<{ estado: string }>("SELECT estado FROM guiones WHERE id = ?", [guionId]);
    expect(original?.estado).toBe("aprobado");
  });

  it("cada versión nueva lleva el número siguiente", async () => {
    await crearVersionNueva(db, guionId);
    const r = await crearVersionNueva(db, guionId);
    if (!r.ok) throw new Error(r.error);
    const fila = await db.uno<{ version: number }>("SELECT version FROM guiones WHERE id = ?", [r.guionId]);
    expect(fila?.version).toBe(3);
  });

  it("un borrador no necesita versión nueva y un guion que no existe tampoco", async () => {
    const r = await crearVersionNueva(db, guionId);
    if (!r.ok) throw new Error(r.error);
    expect((await crearVersionNueva(db, r.guionId)).ok).toBe(false);
    expect((await crearVersionNueva(db, 9999)).ok).toBe(false);
  });
});
