// Publicidad en Short (docs/PUBLICIDAD.md): los pedidos de anuncios. Nacen en el panel, la Estación
// los toma uno a uno, pide el plan, arma el video y lo sube; aquí se ven y se descargan.
import type { EstadoPublicidad, PublicidadNueva } from "@compartido/publicidad";
import type { Voz } from "@compartido/guion";
import type { BaseDatos } from "./db";

export type FilaPublicidad = {
  id: number;
  nombre: string;
  narracion: string;
  idioma: "es" | "en";
  voz: Voz;
  carpetas: string; // JSON
  avatar: string;
  instrucciones: string;
  estado: EstadoPublicidad;
  paso: string;
  error: string;
  plan: string; // JSON
  video: string; // clave en el almacén
  duracion_seg: number;
  costo_usd: number;
  creado_en: string;
  actualizado_en: string;
};

export const carpetasDePublicidad = (fila: { carpetas: string }): string[] => {
  try {
    const lista = JSON.parse(fila.carpetas) as unknown;
    return Array.isArray(lista) ? lista.filter((c): c is string => typeof c === "string") : [];
  } catch {
    return [];
  }
};

export async function crearPublicidad(db: BaseDatos, d: PublicidadNueva): Promise<number> {
  const r = await db.ejecutar(
    "INSERT INTO publicidades (nombre, narracion, idioma, voz, carpetas, avatar, instrucciones) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [d.nombre, d.narracion, d.idioma, d.voz, JSON.stringify(d.carpetas), d.avatar, d.instrucciones],
  );
  if (!r.ultimoId) throw new Error("No se pudo anotar el anuncio en la base.");
  return r.ultimoId;
}

export const publicidadPorId = (db: BaseDatos, id: number) =>
  db.uno<FilaPublicidad>("SELECT * FROM publicidades WHERE id = ?", [id]);

export const publicidadesVisibles = (db: BaseDatos) =>
  db.todos<FilaPublicidad>("SELECT * FROM publicidades WHERE estado != 'quitada' ORDER BY id DESC LIMIT 60");

/** La Estación toma el anuncio más viejo que espera; uno colgado 40 minutos vuelve a la fila. */
export async function tomarSiguientePublicidad(db: BaseDatos): Promise<FilaPublicidad | null> {
  await db.ejecutar(
    `UPDATE publicidades SET estado = 'subida', paso = 'reintento tras corte', actualizado_en = datetime('now')
     WHERE estado = 'tomada' AND actualizado_en < datetime('now', '-40 minutes')`,
  );
  const fila = await db.uno<FilaPublicidad>(
    "SELECT * FROM publicidades WHERE estado = 'subida' ORDER BY id ASC LIMIT 1",
  );
  if (!fila) return null;
  const r = await db.ejecutar(
    `UPDATE publicidades SET estado = 'tomada', paso = 'bajando las imágenes a la Mac', error = '', actualizado_en = datetime('now')
     WHERE id = ? AND estado = 'subida'`,
    [fila.id],
  );
  return r.cambios ? { ...fila, estado: "tomada" } : null;
}

export const anotarAvancePublicidad = (db: BaseDatos, id: number, paso: string) =>
  db.ejecutar(
    "UPDATE publicidades SET paso = ?, actualizado_en = datetime('now') WHERE id = ? AND estado = 'tomada'",
    [paso.slice(0, 200), id],
  );

export const anotarErrorPublicidad = (db: BaseDatos, id: number, error: string) =>
  db.ejecutar(
    "UPDATE publicidades SET estado = 'error', error = ?, actualizado_en = datetime('now') WHERE id = ?",
    [error.slice(0, 2000), id],
  );

export const guardarPlanPublicidad = (db: BaseDatos, id: number, plan: unknown) =>
  db.ejecutar("UPDATE publicidades SET plan = ?, actualizado_en = datetime('now') WHERE id = ?", [
    JSON.stringify(plan),
    id,
  ]);

export const sumarCostoPublicidad = (db: BaseDatos, id: number, costo: number) =>
  db.ejecutar(
    "UPDATE publicidades SET costo_usd = costo_usd + ?, actualizado_en = datetime('now') WHERE id = ?",
    [costo, id],
  );

export const marcarPublicidadLista = (db: BaseDatos, id: number, video: string, duracionSeg: number) =>
  db.ejecutar(
    "UPDATE publicidades SET estado = 'lista', paso = 'listo', error = '', video = ?, duracion_seg = ?, actualizado_en = datetime('now') WHERE id = ?",
    [video, duracionSeg, id],
  );

/** «Armar otra vez»: vuelve a la fila con plan nuevo (el video anterior queda en el almacén). */
export const otraVezPublicidad = (db: BaseDatos, id: number) =>
  db.ejecutar(
    "UPDATE publicidades SET estado = 'subida', paso = '', error = '', plan = '', actualizado_en = datetime('now') WHERE id = ? AND estado IN ('lista','error')",
    [id],
  );

/** «Quitar»: sale de la lista; no se borra nada. */
export const quitarPublicidad = (db: BaseDatos, id: number) =>
  db.ejecutar("UPDATE publicidades SET estado = 'quitada', actualizado_en = datetime('now') WHERE id = ?", [
    id,
  ]);
