// Grabaciones (formato Presentador, C-GRABACIONES-1): Richard sube un video suyo
// hablando; la Estación lo baja, lo transcribe y pide el plan. Con el plan nace su
// guion —ya aprobado: lo que se dice lo dijo él, en cámara— y su trabajo, y de ahí
// en adelante es la producción de siempre.
import type { Guion } from "@compartido/guion";
import { extensionDeVideo, type GrabacionNueva } from "@compartido/grabaciones";
import type { Canal, EstiloVideo } from "@compartido/tematicas";
import type { BaseDatos } from "./db";

export type FilaGrabacion = {
  id: number;
  tema: string;
  formato: EstiloVideo;
  canal: Canal;
  archivo: string;
  clave: string;
  bytes: number;
  estado: "subiendo" | "subida" | "tomada" | "planeada" | "error" | "quitada";
  paso: string;
  error: string;
  guion_id: number | null;
  creado_en: string;
  actualizado_en: string;
};

/** La temática de los guiones que nacen de una grabación: una por canal (no se ofrecen en «Nuevo video»). */
export const TEMATICA_DE_GRABACION: Record<Canal, string> = {
  "canal-ia": "presentador",
  "caprichoso-tv": "presentador-tv",
};

/** Lo que queda escrito donde iría la opinión: no se inventa una, se dice de dónde sale el guion. */
export const NOTA_DE_GRABACION =
  "Video grabado por Richard: lo que se dice en este guion lo dijo él mismo, en cámara. La IA solo decidió qué va detrás.";

/** Dónde se guarda en el almacén. La dirección no depende de lo que escriba nadie. */
export function claveDeGrabacion(archivo: string): string {
  const azar = crypto.getRandomValues(new Uint32Array(1))[0] ?? 0;
  return `grabaciones/${Date.now()}-${azar.toString(36)}.${extensionDeVideo(archivo) ?? "mp4"}`;
}

export async function crearGrabacion(db: BaseDatos, d: GrabacionNueva, clave: string): Promise<number> {
  const fila = await db.ejecutar(
    "INSERT INTO grabaciones (tema, formato, canal, archivo, clave, bytes) VALUES (?, ?, ?, ?, ?, ?)",
    [d.tema, d.formato, d.canal, d.archivo, clave, d.bytes],
  );
  if (!fila.ultimoId) throw new Error("No se pudo anotar la grabación en la base.");
  return fila.ultimoId;
}

export const grabacionPorId = (db: BaseDatos, id: number) =>
  db.uno<FilaGrabacion>("SELECT * FROM grabaciones WHERE id = ?", [id]);

/** La subida terminó: desde aquí la Estación ya puede tomarla. */
export async function marcarSubida(db: BaseDatos, id: number, bytes: number): Promise<boolean> {
  const r = await db.ejecutar(
    `UPDATE grabaciones SET estado = 'subida', bytes = ?, paso = '', error = '', actualizado_en = datetime('now')
     WHERE id = ? AND estado = 'subiendo'`,
    [bytes, id],
  );
  return r.cambios > 0;
}

export type GrabacionConVideo = FilaGrabacion & {
  trabajo_estado: string | null;
  trabajo_paso: string | null;
  trabajo_progreso: number | null;
  trabajo_error: string | null;
};

/** Lo que ve Richard en su lista: todo menos lo que quitó, con cómo va el video de cada una. */
export const grabacionesVisibles = (db: BaseDatos) =>
  db.todos<GrabacionConVideo>(
    `SELECT g.*, t.estado AS trabajo_estado, t.paso AS trabajo_paso, t.progreso AS trabajo_progreso, t.error AS trabajo_error
     FROM grabaciones g
     LEFT JOIN trabajos t ON t.id = (SELECT MAX(x.id) FROM trabajos x WHERE x.guion_id = g.guion_id)
     WHERE g.estado != 'quitada' ORDER BY g.id DESC LIMIT 60`,
  );

/**
 * La Estación toma la grabación más vieja que esté esperando (una a la vez).
 * Una «tomada» que lleva 40 minutos sin dar señales se considera perdida y vuelve a la fila.
 */
export async function tomarSiguiente(db: BaseDatos): Promise<FilaGrabacion | null> {
  await db.ejecutar(
    `UPDATE grabaciones SET estado = 'subida', paso = 'reintento tras corte', actualizado_en = datetime('now')
     WHERE estado = 'tomada' AND actualizado_en < datetime('now', '-40 minutes')`,
  );
  const fila = await db.uno<FilaGrabacion>(
    "SELECT * FROM grabaciones WHERE estado = 'subida' ORDER BY id ASC LIMIT 1",
  );
  if (!fila) return null;
  const tomada = await db.ejecutar(
    `UPDATE grabaciones SET estado = 'tomada', paso = 'bajando la grabación a la Mac', error = '', actualizado_en = datetime('now')
     WHERE id = ? AND estado = 'subida'`,
    [fila.id],
  );
  return tomada.cambios > 0 ? { ...fila, estado: "tomada" } : null;
}

export const anotarAvance = (db: BaseDatos, id: number, paso: string) =>
  db.ejecutar(
    "UPDATE grabaciones SET paso = ?, actualizado_en = datetime('now') WHERE id = ? AND estado = 'tomada'",
    [paso.slice(0, 200), id],
  );

export const anotarError = (db: BaseDatos, id: number, error: string) =>
  db.ejecutar(
    "UPDATE grabaciones SET estado = 'error', error = ?, actualizado_en = datetime('now') WHERE id = ? AND estado IN ('tomada','subida')",
    [error.slice(0, 1000), id],
  );

/**
 * Con el plan ya armado: se guarda como guion APROBADO (son las palabras de Richard) y se
 * manda a producir. Devuelve el guion y el trabajo. Una grabación da UN guion: si el pedido
 * llega dos veces (un reintento), el segundo no crea nada.
 */
export async function registrarPlan(
  db: BaseDatos,
  grabacion: FilaGrabacion,
  guion: Guion,
  datos: { modelo: string; costoUsd: number },
): Promise<{ guionId: number; trabajoId: number }> {
  // Primero se reclama la grabación: solo un pedido puede pasarla de «tomada» a «planeada».
  const reclamo = await db.ejecutar(
    "UPDATE grabaciones SET estado = 'planeada', actualizado_en = datetime('now') WHERE id = ? AND estado = 'tomada' AND guion_id IS NULL",
    [grabacion.id],
  );
  if (reclamo.cambios === 0) {
    const ya = await planDeGrabacion(db, grabacion.id);
    if (ya) return ya;
    throw new Error("Esa grabación ya no está en preparación.");
  }
  try {
    const tematica = TEMATICA_DE_GRABACION[grabacion.canal];
    const tema = await db.ejecutar(
      "INSERT INTO temas (tematica_id, titulo, contexto, fuente, estado) VALUES (?, ?, ?, 'grabacion', 'elegido')",
      [tematica, grabacion.tema || guion.titulo, `Grabación propia: ${grabacion.archivo}`],
    );
    if (!tema.ultimoId) throw new Error("No se pudo guardar el tema de la grabación.");
    const g = await db.ejecutar(
      `INSERT INTO guiones (tema_id, tematica_id, titulo, contenido, estructura, opinion_richard, estado, modelo, costo_usd)
       VALUES (?, ?, ?, ?, ?, ?, 'aprobado', ?, ?)`,
      [
        tema.ultimoId,
        tematica,
        guion.titulo,
        JSON.stringify(guion),
        guion.escenas.map((e) => e.parte).join(">"),
        NOTA_DE_GRABACION,
        datos.modelo,
        datos.costoUsd,
      ],
    );
    if (!g.ultimoId) throw new Error("No se pudo guardar el guion de la grabación.");
    const t = await db.ejecutar("INSERT INTO trabajos (guion_id, tipo) VALUES (?, 'producir')", [g.ultimoId]);
    if (!t.ultimoId) throw new Error("No se pudo mandar a producir el video de la grabación.");
    await db.ejecutar(
      "UPDATE grabaciones SET guion_id = ?, paso = '', error = '', actualizado_en = datetime('now') WHERE id = ?",
      [g.ultimoId, grabacion.id],
    );
    return { guionId: g.ultimoId, trabajoId: t.ultimoId };
  } catch (e) {
    // No quedó guion: la grabación vuelve a «tomada» para que el error se vea y se pueda reintentar.
    await db.ejecutar(
      "UPDATE grabaciones SET estado = 'tomada', actualizado_en = datetime('now') WHERE id = ? AND guion_id IS NULL",
      [grabacion.id],
    );
    throw e;
  }
}

/** El guion y el trabajo que ya salieron de una grabación, si los tiene. */
export async function planDeGrabacion(
  db: BaseDatos,
  id: number,
): Promise<{ guionId: number; trabajoId: number } | null> {
  const fila = await db.uno<{ guion_id: number | null; trabajo_id: number | null }>(
    `SELECT g.guion_id AS guion_id, (SELECT MAX(t.id) FROM trabajos t WHERE t.guion_id = g.guion_id) AS trabajo_id
     FROM grabaciones g WHERE g.id = ?`,
    [id],
  );
  return fila?.guion_id && fila.trabajo_id ? { guionId: fila.guion_id, trabajoId: fila.trabajo_id } : null;
}

/** La grabación de la que salió un guion (para que la Estación sepa que lleva a Richard en cámara). */
export const grabacionDeGuion = (db: BaseDatos, guionId: number) =>
  db.uno<FilaGrabacion>("SELECT * FROM grabaciones WHERE guion_id = ? ORDER BY id DESC LIMIT 1", [guionId]);

/**
 * «Probar con otro formato»: la misma grabación (no se sube otra vez) vuelve a la fila con otro
 * diseño detrás. Así se comparan Neón, Cómic y Documental con el mismo video.
 */
export async function otraVersion(db: BaseDatos, id: number, formato: EstiloVideo): Promise<number | null> {
  const original = await grabacionPorId(db, id);
  if (!original || ["subiendo", "quitada"].includes(original.estado)) return null;
  const fila = await db.ejecutar(
    "INSERT INTO grabaciones (tema, formato, canal, archivo, clave, bytes, estado) VALUES (?, ?, ?, ?, ?, ?, 'subida')",
    [original.tema, formato, original.canal, original.archivo, original.clave, original.bytes],
  );
  return fila.ultimoId;
}

/** Una que falló vuelve a la fila. */
export const reintentarGrabacion = (db: BaseDatos, id: number) =>
  db.ejecutar(
    "UPDATE grabaciones SET estado = 'subida', paso = '', error = '', actualizado_en = datetime('now') WHERE id = ? AND estado = 'error'",
    [id],
  );

/** «Quitar»: sale de la lista. El archivo, su guion y sus videos se conservan. */
export const quitarGrabacion = (db: BaseDatos, id: number) =>
  db.ejecutar(
    "UPDATE grabaciones SET estado = 'quitada', actualizado_en = datetime('now') WHERE id = ? AND estado != 'tomada'",
    [id],
  );

/**
 * Para el canario: grabaciones que llevan más de tres horas esperando o a medio preparar.
 * Con la Mac encendida eso no debería pasar nunca: es un atasco que nadie está viendo.
 */
export async function grabacionesAtascadas(db: BaseDatos): Promise<number> {
  const fila = await db.uno<{ n: number }>(
    `SELECT COUNT(id) AS n FROM grabaciones
     WHERE estado IN ('subida','tomada') AND actualizado_en < datetime('now', '-3 hours')`,
  );
  return fila?.n ?? 0;
}
