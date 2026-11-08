import type { Voz } from "@compartido/guion";
// Comerciales (C-COMERCIAL-1): el video publicitario de un cliente. Nace en el panel, la
// Estación lo toma, pide el plan con las imágenes que tiene, y de ahí sale un guion aprobado
// (el texto es del cliente) y su trabajo. Mismo camino que una grabación.
import {
  cambiarImagenesDelPlan,
  esquemaPortadaElegida,
  leerPortada,
  mismaPortada,
  type CambioDeImagen,
  type ComercialNuevo,
  type ImagenDelPlan,
  type PortadaElegida,
  type PortadaGuardada,
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
  /** C-COMERCIAL-4: JSON con la miniatura elegida en el panel ('' = la automática). */
  portada: string;
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
  const json = JSON.stringify(esquemaGuion.parse(nuevo));
  // Mirar no escribe: si nada cambió, no se toca la base.
  if (json === JSON.stringify(p.guion)) return true;
  const r = await db.ejecutar(
    "UPDATE guiones SET contenido = ?, actualizado_en = datetime('now') WHERE id = ? AND estado = 'borrador'",
    [json, p.guionId],
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
  await db.ejecutar(
    "UPDATE guiones SET estado = 'aprobado', actualizado_en = datetime('now') WHERE id = ? AND estado = 'borrador'",
    [c.guion_id],
  );
  // El trabajo nace solo si no hay ninguno: si un corte dejó el guion aprobado sin trabajo, el
  // siguiente toque lo crea; si ya había, no se duplica (lo encontró el revisor el 8 nov 2026).
  await db.ejecutar(
    `INSERT INTO trabajos (guion_id, tipo) SELECT ?, 'producir'
     WHERE EXISTS (SELECT 1 FROM guiones WHERE id = ? AND estado = 'aprobado')
       AND NOT EXISTS (SELECT 1 FROM trabajos WHERE guion_id = ?)`,
    [c.guion_id, c.guion_id, c.guion_id],
  );
  return (await planDeComercial(db, id))?.trabajoId || null;
}

// ── C-COMERCIAL-4: la miniatura elegida desde el panel ───────────────────────────────────────

/** Las imágenes que salen en el video ya armado, en orden y sin repetir (las que se ofrecen). */
export function imagenesDelVideo(guion: Guion): string[] {
  const vistas = new Set<string>();
  for (const e of guion.escenas)
    for (const p of e.visual.planos ?? []) if (p.tipo === "imagen" && p.archivo) vistas.add(p.archivo);
  return [...vistas];
}

export type ComercialParaPortada = {
  comercial: FilaComercial;
  guionId: number;
  trabajoId: number;
  opciones: string[];
  portada: PortadaGuardada | null;
};

/** Lo que hace falta para elegir la miniatura: solo cuando el video ya está hecho. */
export async function comercialParaPortada(db: BaseDatos, id: number): Promise<ComercialParaPortada | null> {
  const c = await comercialPorId(db, id);
  if (!c?.guion_id) return null;
  const fila = await db.uno<{ contenido: string; trabajo_id: number | null }>(
    `SELECT g.contenido, (SELECT MAX(t.id) FROM trabajos t WHERE t.guion_id = g.id AND t.estado = 'hecho') AS trabajo_id
     FROM guiones g WHERE g.id = ?`,
    [c.guion_id],
  );
  if (!fila?.trabajo_id) return null;
  const guion = esquemaGuion.parse(JSON.parse(fila.contenido));
  return {
    comercial: c,
    guionId: c.guion_id,
    trabajoId: fila.trabajo_id,
    opciones: imagenesDelVideo(guion),
    portada: leerPortada(c.portada),
  };
}

export type RespuestaPortada = { ok: true; cambio: boolean } | { ok: false; error: string };

/**
 * Richard pide la miniatura con la imagen y los textos que eligió. La imagen tiene que ser una de
 * las que salen en el video. Pedir lo mismo que ya está hecho no escribe nada (mirar no escribe).
 */
export async function pedirPortada(db: BaseDatos, id: number, datos: unknown): Promise<RespuestaPortada> {
  const parseo = esquemaPortadaElegida.safeParse(datos);
  if (!parseo.success) return { ok: false, error: parseo.error.issues[0]?.message ?? "Revisa los datos." };
  const p = await comercialParaPortada(db, id);
  if (!p) return { ok: false, error: "Este comercial todavía no tiene su video terminado." };
  const elegida: PortadaElegida = parseo.data;
  if (!p.opciones.includes(elegida.archivo))
    return { ok: false, error: "Esa imagen no sale en el video: elige una de la lista." };
  if (mismaPortada(elegida, p.portada)) return { ok: true, cambio: false };
  const guardada: PortadaGuardada = { ...elegida, estado: "pedida", error: "" };
  await db.ejecutar("UPDATE comerciales SET portada = ? WHERE id = ?", [JSON.stringify(guardada), id]);
  return { ok: true, cambio: true };
}

export type PortadaParaLaMac = {
  comercial_id: number;
  guion_id: number;
  trabajo_id: number;
  carpetas: string[];
  archivo: string;
  titulo: string;
  frase: string;
};

/**
 * La Mac pide la siguiente miniatura por dibujar y queda tomada. Una tomada hace más de 20 minutos
 * (la Mac se apagó a mitad) vuelve a la fila. Sin miniaturas pedidas, la consulta no escribe nada.
 */
export async function tomarSiguientePortada(db: BaseDatos): Promise<PortadaParaLaMac | null> {
  const filas = await db.todos<FilaComercial>(
    `SELECT * FROM comerciales WHERE portada LIKE '%"estado":"pedida"%' OR portada LIKE '%"estado":"tomada"%' ORDER BY id ASC LIMIT 5`,
  );
  for (const c of filas) {
    const portada = leerPortada(c.portada);
    if (!portada) continue;
    const vencida =
      portada.estado === "tomada" &&
      (await db.uno<{ si: number }>(
        "SELECT 1 AS si FROM comerciales WHERE id = ? AND actualizado_en < datetime('now', '-20 minutes')",
        [c.id],
      ));
    if (portada.estado !== "pedida" && !vencida) continue;
    const p = await comercialParaPortada(db, c.id);
    if (!p) continue;
    const tomada = JSON.stringify({ ...portada, estado: "tomada", error: "" });
    const r = await db.ejecutar(
      "UPDATE comerciales SET portada = ?, actualizado_en = datetime('now') WHERE id = ? AND portada = ?",
      [tomada, c.id, c.portada],
    );
    if (r.cambios === 0) continue;
    return {
      comercial_id: c.id,
      guion_id: p.guionId,
      trabajo_id: p.trabajoId,
      carpetas: carpetasDe(c),
      archivo: portada.archivo,
      titulo: portada.titulo,
      frase: portada.frase,
    };
  }
  return null;
}

/** La Mac cuenta cómo le fue: hecha, o el error en palabras para mostrarlo en el panel. */
export async function terminarPortada(db: BaseDatos, id: number, error: string | null): Promise<boolean> {
  const c = await comercialPorId(db, id);
  const portada = leerPortada(c?.portada);
  if (!c || portada?.estado !== "tomada") return false;
  const nueva = { ...portada, estado: error ? "error" : "hecha", error: (error ?? "").slice(0, 500) };
  const r = await db.ejecutar("UPDATE comerciales SET portada = ? WHERE id = ? AND portada = ?", [
    JSON.stringify(nueva),
    id,
    c.portada,
  ]);
  return r.cambios > 0;
}
