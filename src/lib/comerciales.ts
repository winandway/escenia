// Comerciales (C-COMERCIAL-1): el video publicitario de un cliente. Nace en el panel, la
// Estación lo toma, pide el plan con las imágenes que tiene, y de ahí sale un guion aprobado
// (el texto es del cliente) y su trabajo. Mismo camino que una grabación.
import type { ComercialNuevo } from "@compartido/comerciales";
import type { Guion } from "@compartido/guion";
import type { EstiloVideo } from "@compartido/tematicas";
import type { BaseDatos } from "./db";

export type FilaComercial = {
  id: number;
  nombre: string;
  narracion: string;
  idioma: "es" | "en";
  voz: "richard" | "femenina";
  instrucciones: string;
  carpetas: string; // JSON
  formato: EstiloVideo;
  estado: "subida" | "tomada" | "planeada" | "error" | "quitada";
  paso: string;
  error: string;
  guion_id: number | null;
  creado_en: string;
  actualizado_en: string;
};

export const TEMATICA_COMERCIAL = "comercial";
export const NOTA_COMERCIAL =
  "Comercial de un cliente: el texto es el que mandó el cliente y las imágenes son las suyas. La IA solo decidió qué va en pantalla en cada frase.";

export const carpetasDe = (fila: { carpetas: string }): string[] => {
  try {
    const lista = JSON.parse(fila.carpetas) as unknown;
    return Array.isArray(lista) ? lista.filter((c): c is string => typeof c === "string") : [];
  } catch {
    return [];
  }
};

export async function crearComercial(db: BaseDatos, d: ComercialNuevo): Promise<number> {
  const fila = await db.ejecutar(
    "INSERT INTO comerciales (nombre, narracion, idioma, voz, instrucciones, carpetas, formato) VALUES (?, ?, ?, ?, ?, ?, 'mixto')",
    [d.nombre, d.narracion, d.idioma, d.voz, d.instrucciones, JSON.stringify(d.carpetas)],
  );
  if (!fila.ultimoId) throw new Error("No se pudo anotar el comercial en la base.");
  return fila.ultimoId;
}

export const comercialPorId = (db: BaseDatos, id: number) =>
  db.uno<FilaComercial>("SELECT * FROM comerciales WHERE id = ?", [id]);

export type ComercialConVideo = FilaComercial & {
  trabajo_estado: string | null;
  trabajo_paso: string | null;
  trabajo_progreso: number | null;
  trabajo_error: string | null;
};

export const comercialesVisibles = (db: BaseDatos) =>
  db.todos<ComercialConVideo>(
    `SELECT c.*, t.estado AS trabajo_estado, t.paso AS trabajo_paso, t.progreso AS trabajo_progreso, t.error AS trabajo_error
     FROM comerciales c
     LEFT JOIN trabajos t ON t.id = (SELECT MAX(x.id) FROM trabajos x WHERE x.guion_id = c.guion_id)
     WHERE c.estado != 'quitada' ORDER BY c.id DESC LIMIT 60`,
  );

/** La Estación toma el comercial más viejo que espera; uno colgado 40 minutos vuelve a la fila. */
export async function tomarSiguienteComercial(db: BaseDatos): Promise<FilaComercial | null> {
  await db.ejecutar(
    `UPDATE comerciales SET estado = 'subida', paso = 'reintento tras corte', actualizado_en = datetime('now')
     WHERE estado = 'tomada' AND actualizado_en < datetime('now', '-40 minutes')`,
  );
  const fila = await db.uno<FilaComercial>(
    "SELECT * FROM comerciales WHERE estado = 'subida' ORDER BY id ASC LIMIT 1",
  );
  if (!fila) return null;
  const tomada = await db.ejecutar(
    `UPDATE comerciales SET estado = 'tomada', paso = 'bajando las imágenes a la Mac', error = '', actualizado_en = datetime('now')
     WHERE id = ? AND estado = 'subida'`,
    [fila.id],
  );
  return tomada.cambios > 0 ? { ...fila, estado: "tomada" } : null;
}

export const anotarAvanceComercial = (db: BaseDatos, id: number, paso: string) =>
  db.ejecutar(
    "UPDATE comerciales SET paso = ?, actualizado_en = datetime('now') WHERE id = ? AND estado = 'tomada'",
    [paso.slice(0, 200), id],
  );

export const anotarErrorComercial = (db: BaseDatos, id: number, error: string) =>
  db.ejecutar(
    "UPDATE comerciales SET estado = 'error', error = ?, actualizado_en = datetime('now') WHERE id = ? AND estado IN ('tomada','subida')",
    [error.slice(0, 1000), id],
  );

export async function planDeComercial(
  db: BaseDatos,
  id: number,
): Promise<{ guionId: number; trabajoId: number } | null> {
  const fila = await db.uno<{ guion_id: number | null; trabajo_id: number | null }>(
    `SELECT c.guion_id AS guion_id, (SELECT MAX(t.id) FROM trabajos t WHERE t.guion_id = c.guion_id) AS trabajo_id
     FROM comerciales c WHERE c.id = ?`,
    [id],
  );
  return fila?.guion_id && fila.trabajo_id ? { guionId: fila.guion_id, trabajoId: fila.trabajo_id } : null;
}

/** Con el plan: un guion APROBADO (el texto es del cliente) y un trabajo. Un comercial da UN guion. */
export async function registrarPlanComercial(
  db: BaseDatos,
  comercial: FilaComercial,
  guion: Guion,
  datos: { modelo: string; costoUsd: number },
): Promise<{ guionId: number; trabajoId: number }> {
  const reclamo = await db.ejecutar(
    "UPDATE comerciales SET estado = 'planeada', actualizado_en = datetime('now') WHERE id = ? AND estado = 'tomada' AND guion_id IS NULL",
    [comercial.id],
  );
  if (reclamo.cambios === 0) {
    const ya = await planDeComercial(db, comercial.id);
    if (ya) return ya;
    throw new Error("Ese comercial ya no está en preparación.");
  }
  try {
    const tema = await db.ejecutar(
      "INSERT INTO temas (tematica_id, titulo, contexto, fuente, estado) VALUES (?, ?, ?, 'comercial', 'elegido')",
      [TEMATICA_COMERCIAL, comercial.nombre, `Comercial: ${comercial.nombre}`],
    );
    if (!tema.ultimoId) throw new Error("No se pudo guardar el tema del comercial.");
    const g = await db.ejecutar(
      `INSERT INTO guiones (tema_id, tematica_id, titulo, contenido, estructura, opinion_richard, estado, modelo, costo_usd)
       VALUES (?, ?, ?, ?, ?, ?, 'aprobado', ?, ?)`,
      [
        tema.ultimoId,
        TEMATICA_COMERCIAL,
        comercial.nombre,
        JSON.stringify({ ...guion, titulo: comercial.nombre, voz: comercial.voz }),
        guion.escenas.map((e) => e.parte).join(">"),
        NOTA_COMERCIAL,
        datos.modelo,
        datos.costoUsd,
      ],
    );
    if (!g.ultimoId) throw new Error("No se pudo guardar el guion del comercial.");
    const t = await db.ejecutar("INSERT INTO trabajos (guion_id, tipo) VALUES (?, 'producir')", [g.ultimoId]);
    if (!t.ultimoId) throw new Error("No se pudo mandar a producir el comercial.");
    await db.ejecutar(
      "UPDATE comerciales SET guion_id = ?, paso = '', error = '', actualizado_en = datetime('now') WHERE id = ?",
      [g.ultimoId, comercial.id],
    );
    return { guionId: g.ultimoId, trabajoId: t.ultimoId };
  } catch (e) {
    await db.ejecutar(
      "UPDATE comerciales SET estado = 'tomada', actualizado_en = datetime('now') WHERE id = ? AND guion_id IS NULL",
      [comercial.id],
    );
    throw e;
  }
}

/** El comercial del que salió un guion (para que la Estación sepa que va sin marca y con qué imágenes). */
export const comercialDeGuion = (db: BaseDatos, guionId: number) =>
  db.uno<FilaComercial>("SELECT * FROM comerciales WHERE guion_id = ? ORDER BY id DESC LIMIT 1", [guionId]);

/** «Armar otra vez»: el mismo pedido vuelve a la fila (plan nuevo, video nuevo). */
export async function otraVersionComercial(db: BaseDatos, id: number): Promise<number | null> {
  const c = await comercialPorId(db, id);
  if (!c || c.estado === "quitada") return null;
  const fila = await db.ejecutar(
    "INSERT INTO comerciales (nombre, narracion, idioma, voz, instrucciones, carpetas, formato) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [c.nombre, c.narracion, c.idioma, c.voz, c.instrucciones, c.carpetas, c.formato],
  );
  return fila.ultimoId;
}

export const reintentarComercial = (db: BaseDatos, id: number) =>
  db.ejecutar(
    "UPDATE comerciales SET estado = 'subida', paso = '', error = '', actualizado_en = datetime('now') WHERE id = ? AND estado = 'error'",
    [id],
  );

export const quitarComercial = (db: BaseDatos, id: number) =>
  db.ejecutar(
    "UPDATE comerciales SET estado = 'quitada', actualizado_en = datetime('now') WHERE id = ? AND estado != 'tomada'",
    [id],
  );

export async function comercialesAtascados(db: BaseDatos): Promise<number> {
  const fila = await db.uno<{ n: number }>(
    `SELECT COUNT(id) AS n FROM comerciales WHERE estado IN ('subida','tomada') AND actualizado_en < datetime('now', '-3 hours')`,
  );
  return fila?.n ?? 0;
}
