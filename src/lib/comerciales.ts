import type { Voz } from "@compartido/guion";
// Comerciales (C-COMERCIAL-1): el video publicitario de un cliente. Nace en el panel, la
// Estación lo toma, pide el plan con las imágenes que tiene, y de ahí sale un guion aprobado
// (el texto es del cliente) y su trabajo. Mismo camino que una grabación.
import {
  cambiarImagenesDelPlan,
  type CambioDeImagen,
  type ComercialNuevo,
  type ImagenDelPlan,
} from "@compartido/comerciales";
import { esquemaGuion } from "@compartido/guion";
import type { Guion } from "@compartido/guion";
import type { EstiloVideo } from "@compartido/tematicas";
import type { BaseDatos } from "./db";

export type FilaComercial = {
  id: number;
  nombre: string;
  narracion: string;
  idioma: "es" | "en";
  voz: Voz;
  instrucciones: string;
  carpetas: string; // JSON
  formato: EstiloVideo;
  estado: "subida" | "tomada" | "planeada" | "error" | "quitada";
  paso: string;
  error: string;
  guion_id: number | null;
  creado_en: string;
  actualizado_en: string;
  /** C-COMERCIAL-3: 1 = el plan espera a que Richard lo vea antes de armar. */
  revisar: number;
  /** JSON: las imágenes que mandó la Mac con el plan. */
  imagenes: string;
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

export const imagenesDe = (fila: { imagenes?: string }): ImagenDelPlan[] => {
  try {
    const lista = JSON.parse(fila.imagenes ?? "[]") as unknown;
    return Array.isArray(lista)
      ? lista.filter(
          (i): i is ImagenDelPlan =>
            typeof i === "object" && i !== null && typeof (i as { nombre?: unknown }).nombre === "string",
        )
      : [];
  } catch {
    return [];
  }
};

export async function crearComercial(db: BaseDatos, d: ComercialNuevo): Promise<number> {
  const fila = await db.ejecutar(
    "INSERT INTO comerciales (nombre, narracion, idioma, voz, instrucciones, carpetas, formato, revisar) VALUES (?, ?, ?, ?, ?, ?, 'mixto', ?)",
    [d.nombre, d.narracion, d.idioma, d.voz, d.instrucciones, JSON.stringify(d.carpetas), d.revisar ? 1 : 0],
  );
  if (!fila.ultimoId) throw new Error("No se pudo anotar el comercial en la base.");
  return fila.ultimoId;
}

export const comercialPorId = (db: BaseDatos, id: number) =>
  db.uno<FilaComercial>("SELECT * FROM comerciales WHERE id = ?", [id]);

export type ComercialConVideo = FilaComercial & {
  guion_estado: string | null;
  trabajo_estado: string | null;
  trabajo_paso: string | null;
  trabajo_progreso: number | null;
  trabajo_error: string | null;
};

/** C-COMERCIAL-3: el plan está listo y espera a Richard (guion en borrador, sin trabajo todavía). */
export const esperaRevision = (c: { estado: string; guion_estado: string | null }) =>
  c.estado === "planeada" && c.guion_estado === "borrador";

export const comercialesVisibles = (db: BaseDatos) =>
  db.todos<ComercialConVideo>(
    `SELECT c.*, g.estado AS guion_estado, t.estado AS trabajo_estado, t.paso AS trabajo_paso, t.progreso AS trabajo_progreso, t.error AS trabajo_error
     FROM comerciales c
     LEFT JOIN guiones g ON g.id = c.guion_id
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
  // Con «revisar», el guion nace sin trabajo: el trabajo llega cuando Richard toca «Armar el video».
  return fila?.guion_id ? { guionId: fila.guion_id, trabajoId: fila.trabajo_id ?? 0 } : null;
}

/**
 * Con el plan: un guion APROBADO (el texto es del cliente) y un trabajo. Un comercial da UN guion.
 * Con «revisar» (C-COMERCIAL-3) el guion queda en borrador y SIN trabajo: nada se gasta hasta que
 * Richard ve el plan y toca «Armar el video» (`armarComercial`). trabajoId = 0 en ese caso.
 */
export async function registrarPlanComercial(
  db: BaseDatos,
  comercial: FilaComercial,
  guion: Guion,
  datos: { modelo: string; costoUsd: number },
  imagenes: ImagenDelPlan[] = [],
): Promise<{ guionId: number; trabajoId: number }> {
  const revisar = Number(comercial.revisar) === 1;
  const reclamo = await db.ejecutar(
    "UPDATE comerciales SET estado = 'planeada', imagenes = ?, actualizado_en = datetime('now') WHERE id = ? AND estado = 'tomada' AND guion_id IS NULL",
    [JSON.stringify(imagenes.slice(0, 120)), comercial.id],
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
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        tema.ultimoId,
        TEMATICA_COMERCIAL,
        comercial.nombre,
        JSON.stringify({ ...guion, titulo: comercial.nombre, voz: comercial.voz }),
        guion.escenas.map((e) => e.parte).join(">"),
        NOTA_COMERCIAL,
        revisar ? "borrador" : "aprobado",
        datos.modelo,
        datos.costoUsd,
      ],
    );
    if (!g.ultimoId) throw new Error("No se pudo guardar el guion del comercial.");
    if (revisar) {
      await db.ejecutar(
        "UPDATE comerciales SET guion_id = ?, paso = '', error = '', actualizado_en = datetime('now') WHERE id = ?",
        [g.ultimoId, comercial.id],
      );
      return { guionId: g.ultimoId, trabajoId: 0 };
    }
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
    "INSERT INTO comerciales (nombre, narracion, idioma, voz, instrucciones, carpetas, formato, revisar) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [
      c.nombre,
      c.narracion,
      c.idioma,
      c.voz,
      c.instrucciones,
      c.carpetas,
      c.formato,
      Number(c.revisar) === 1 ? 1 : 0,
    ],
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

/** El plan de un comercial que espera revisión: su guion (borrador) y las imágenes que hay. */
export async function planEnRevision(
  db: BaseDatos,
  id: number,
): Promise<{ comercial: FilaComercial; guion: Guion; guionId: number; editable: boolean } | null> {
  const c = await comercialPorId(db, id);
  if (!c?.guion_id) return null;
  const g = await db.uno<{ contenido: string; estado: string }>(
    "SELECT contenido, estado FROM guiones WHERE id = ?",
    [c.guion_id],
  );
  if (!g) return null;
  return {
    comercial: c,
    guion: esquemaGuion.parse(JSON.parse(g.contenido)),
    guionId: c.guion_id,
    editable: g.estado === "borrador" && c.estado === "planeada",
  };
}

/** Guarda los cambios de imágenes del plan (solo mientras está en borrador). Devuelve si guardó. */
export async function guardarCambiosDelPlan(
  db: BaseDatos,
  id: number,
  cambios: CambioDeImagen[],
): Promise<boolean> {
  const p = await planEnRevision(db, id);
  if (!p?.editable) return false;
  const nuevo = cambiarImagenesDelPlan(
    p.guion,
    cambios,
    imagenesDe(p.comercial).map((i) => i.nombre),
  );
  const r = await db.ejecutar(
    "UPDATE guiones SET contenido = ?, actualizado_en = datetime('now') WHERE id = ? AND estado = 'borrador'",
    [JSON.stringify(esquemaGuion.parse(nuevo)), p.guionId],
  );
  return r.cambios > 0;
}

/**
 * «Armar el video» (C-COMERCIAL-3): el plan revisado pasa a aprobado y nace su trabajo. Una sola vez:
 * si ya estaba aprobado, devuelve el trabajo que hay. Recién aquí se gasta (voz y armado).
 */
export async function armarComercial(db: BaseDatos, id: number): Promise<number | null> {
  const c = await comercialPorId(db, id);
  if (!c?.guion_id || c.estado !== "planeada") return null;
  const aprobado = await db.ejecutar(
    "UPDATE guiones SET estado = 'aprobado', actualizado_en = datetime('now') WHERE id = ? AND estado = 'borrador'",
    [c.guion_id],
  );
  if (aprobado.cambios === 0) return (await planDeComercial(db, id))?.trabajoId || null;
  const t = await db.ejecutar("INSERT INTO trabajos (guion_id, tipo) VALUES (?, 'producir')", [c.guion_id]);
  return t.ultimoId ?? null;
}
