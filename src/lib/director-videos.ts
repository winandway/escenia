// El Director con el video del cliente (docs/DIRECTOR.md, C-DIRECTOR-3): los videos que se suben en el
// chat y los trabajos que arma la Mac (la prueba en vivo y la locución). La Mac «mira» cada video: le
// saca la duración y unas hojas con un cuadro cada pocos segundos y su hora, para que la IA vea qué
// pasa y cuándo. Nada de esto gasta: lo que cuesta solo sale de una propuesta aprobada con el botón.
import type { EstadoTrabajoDirector, EstadoVideoDirector } from "@compartido/director";
import type { BaseDatos } from "./db";

export type FilaVideoDirector = {
  id: number;
  encargo_id: number;
  nombre: string;
  clave: string;
  bytes: number;
  estado: EstadoVideoDirector;
  duracion_seg: number;
  con_sonido: number;
  vertical: number;
  hojas: number;
  segundos_por_cuadro: number;
  error: string;
  creado_en: string;
  actualizado_en: string;
};

export type FilaTrabajoDirector = {
  id: number;
  propuesta_id: number;
  encargo_id: number;
  tipo: "demostracion" | "locucion";
  datos: string; // JSON: lo aprobado
  estado: EstadoTrabajoDirector;
  paso: string;
  error: string;
  video: string;
  duracion_seg: number;
  costo_usd: number;
  creado_en: string;
  actualizado_en: string;
};

const TIPOS_DE_VIDEO = {
  mp4: "video/mp4",
  m4v: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
  mkv: "video/x-matroska",
} as const;
export type ExtensionVideoDirector = keyof typeof TIPOS_DE_VIDEO;

export function extensionDeVideoDirector(nombre: string): ExtensionVideoDirector | "" {
  const ext = nombre.toLowerCase().split(".").pop() ?? "";
  return ext in TIPOS_DE_VIDEO ? (ext as ExtensionVideoDirector) : "";
}
export const tipoDeVideo = (ext: ExtensionVideoDirector) => TIPOS_DE_VIDEO[ext];

/** Dónde vive cada cosa en el almacén (la dirección sale siempre de aquí, nunca del navegador). */
export function claveDeVideoDelEncargo(encargoId: number, ext: ExtensionVideoDirector): string {
  const azar = (crypto.getRandomValues(new Uint32Array(1))[0] ?? 0).toString(36);
  return `director/encargos/${encargoId}/${Date.now()}-${azar}.${ext}`;
}
export const claveDeHoja = (videoId: number, n: number) => `director/videos/${videoId}/hoja-${n}.jpg`;
export const claveDeResultado = (trabajoId: number) =>
  `director/trabajos/${trabajoId}/video-${Date.now()}.mp4`;
/** Lo que el panel puede servir al navegador de todo esto: los videos que armó la Mac. */
export const RUTA_RESULTADO = /^director\/trabajos\/\d+\/video-\d+\.mp4$/;

// ——— Los videos del chat ———

export async function crearVideoDelEncargo(
  db: BaseDatos,
  d: { encargoId: number; nombre: string; bytes: number; clave: string },
): Promise<number> {
  const r = await db.ejecutar(
    "INSERT INTO director_videos (encargo_id, nombre, clave, bytes) VALUES (?, ?, ?, ?)",
    [d.encargoId, d.nombre.slice(0, 200), d.clave, d.bytes],
  );
  if (!r.ultimoId) throw new Error("No se pudo anotar el video en la base.");
  return r.ultimoId;
}

export const videoDelDirector = (db: BaseDatos, id: number) =>
  db.uno<FilaVideoDirector>("SELECT * FROM director_videos WHERE id = ?", [id]);

export const videosDelEncargo = (db: BaseDatos, encargoId: number) =>
  db.todos<FilaVideoDirector>(
    "SELECT * FROM director_videos WHERE encargo_id = ? AND estado != 'subiendo' ORDER BY id",
    [encargoId],
  );

/** Subió completo: desde aquí la Mac ya lo puede mirar. */
export const marcarVideoSubido = (db: BaseDatos, id: number, bytes: number) =>
  db.ejecutar(
    "UPDATE director_videos SET estado = 'subido', bytes = ?, actualizado_en = datetime('now') WHERE id = ? AND estado = 'subiendo'",
    [bytes, id],
  );

/** La Mac toma el video más viejo por mirar; uno que se quedó «mirando» 10 minutos vuelve a la fila. */
export async function tomarVideoPorMirar(db: BaseDatos): Promise<FilaVideoDirector | null> {
  await db.ejecutar(
    `UPDATE director_videos SET estado = 'subido', actualizado_en = datetime('now')
     WHERE estado = 'mirando' AND actualizado_en < datetime('now', '-10 minutes')`,
  );
  const fila = await db.uno<FilaVideoDirector>(
    "SELECT * FROM director_videos WHERE estado = 'subido' ORDER BY id ASC LIMIT 1",
  );
  if (!fila) return null;
  const r = await db.ejecutar(
    "UPDATE director_videos SET estado = 'mirando', error = '', actualizado_en = datetime('now') WHERE id = ? AND estado = 'subido'",
    [fila.id],
  );
  return r.cambios ? { ...fila, estado: "mirando" } : null;
}

export const marcarVideoListo = (
  db: BaseDatos,
  id: number,
  d: { duracionSeg: number; conSonido: boolean; vertical: boolean; hojas: number; segundosPorCuadro: number },
) =>
  db.ejecutar(
    `UPDATE director_videos SET estado = 'listo', duracion_seg = ?, con_sonido = ?, vertical = ?, hojas = ?,
       segundos_por_cuadro = ?, error = '', actualizado_en = datetime('now') WHERE id = ?`,
    [d.duracionSeg, d.conSonido ? 1 : 0, d.vertical ? 1 : 0, d.hojas, d.segundosPorCuadro, id],
  );

export const marcarVideoConError = (db: BaseDatos, id: number, error: string) =>
  db.ejecutar(
    "UPDATE director_videos SET estado = 'error', error = ?, actualizado_en = datetime('now') WHERE id = ?",
    [error.slice(0, 1000), id],
  );

// ——— Los trabajos de la Mac ———

export const trabajoDelDirector = (db: BaseDatos, id: number) =>
  db.uno<FilaTrabajoDirector>("SELECT * FROM director_trabajos WHERE id = ?", [id]);

export const trabajoDePropuesta = (db: BaseDatos, propuestaId: number) =>
  db.uno<FilaTrabajoDirector>("SELECT * FROM director_trabajos WHERE propuesta_id = ?", [propuestaId]);

/** La Mac toma el trabajo más viejo; uno colgado una hora (se apagó la Mac) vuelve a la fila. */
export async function tomarSiguienteTrabajo(db: BaseDatos): Promise<FilaTrabajoDirector | null> {
  await db.ejecutar(
    `UPDATE director_trabajos SET estado = 'subida', paso = 'reintento tras corte', actualizado_en = datetime('now')
     WHERE estado = 'tomada' AND actualizado_en < datetime('now', '-60 minutes')`,
  );
  const fila = await db.uno<FilaTrabajoDirector>(
    "SELECT * FROM director_trabajos WHERE estado = 'subida' ORDER BY id ASC LIMIT 1",
  );
  if (!fila) return null;
  const r = await db.ejecutar(
    `UPDATE director_trabajos SET estado = 'tomada', paso = 'bajando el video a la Mac', error = '', actualizado_en = datetime('now')
     WHERE id = ? AND estado = 'subida'`,
    [fila.id],
  );
  return r.cambios ? { ...fila, estado: "tomada" } : null;
}

export const anotarAvanceTrabajo = (db: BaseDatos, id: number, paso: string) =>
  db.ejecutar(
    "UPDATE director_trabajos SET paso = ?, actualizado_en = datetime('now') WHERE id = ? AND estado = 'tomada'",
    [paso.slice(0, 200), id],
  );

export const anotarErrorTrabajo = (db: BaseDatos, id: number, error: string) =>
  db.ejecutar(
    "UPDATE director_trabajos SET estado = 'error', error = ?, actualizado_en = datetime('now') WHERE id = ?",
    [error.slice(0, 2000), id],
  );

export const sumarCostoTrabajo = (db: BaseDatos, id: number, costo: number) =>
  db.ejecutar(
    "UPDATE director_trabajos SET costo_usd = costo_usd + ?, actualizado_en = datetime('now') WHERE id = ?",
    [costo, id],
  );

export const marcarTrabajoListo = (db: BaseDatos, id: number, video: string, duracionSeg: number) =>
  db.ejecutar(
    `UPDATE director_trabajos SET estado = 'lista', paso = 'listo', error = '', video = ?, duracion_seg = ?,
       actualizado_en = datetime('now') WHERE id = ?`,
    [video, duracionSeg, id],
  );

/** «Intentar otra vez»: el mismo trabajo vuelve a la fila (lo ya pagado en la Mac no se vuelve a pagar). */
export const otraVezTrabajo = (db: BaseDatos, id: number) =>
  db.ejecutar(
    "UPDATE director_trabajos SET estado = 'subida', paso = '', error = '', actualizado_en = datetime('now') WHERE id = ? AND estado IN ('lista','error')",
    [id],
  );
