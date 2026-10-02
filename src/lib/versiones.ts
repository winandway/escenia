// Versión nueva de un guion ya aprobado: un guion aprobado no se toca (ya se
// produjo con ese texto), pero se puede copiar a un borrador para cambiarlo y
// producirlo otra vez. La copia conserva la opinión de Richard.
import { esquemaGuion } from "@compartido/guion";
import { guionPorId } from "./consultas";
import type { BaseDatos } from "./db";

export type ResultadoVersion = { ok: true; guionId: number } | { ok: false; error: string };

export async function crearVersionNueva(db: BaseDatos, guionId: number): Promise<ResultadoVersion> {
  const original = await guionPorId(db, guionId);
  if (!original) return { ok: false, error: "Ese guion no existe." };
  if (original.estado === "borrador")
    return { ok: false, error: "Este guion todavía es un borrador: se edita directamente." };
  const contenido = esquemaGuion.parse(JSON.parse(original.contenido));
  // Los textos de YouTube son de la versión anterior: la nueva escribe los suyos al producirse.
  const copia = { ...contenido, publicacion: null };
  const ultima = await db.uno<{ version: number }>(
    "SELECT MAX(version) AS version FROM guiones WHERE tema_id = ?",
    [original.tema_id],
  );
  const fila = await db.ejecutar(
    `INSERT INTO guiones (tema_id, tematica_id, producto_id, version, titulo, contenido, estructura, opinion_richard, notas_richard, modelo, costo_usd, aviso_parecido)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, '')`,
    [
      original.tema_id,
      original.tematica_id,
      original.producto_id,
      (ultima?.version ?? original.version) + 1,
      copia.titulo,
      JSON.stringify(copia),
      original.estructura,
      original.opinion_richard,
      `Versión nueva del guion ${original.id}.`,
      original.modelo,
    ],
  );
  if (!fila.ultimoId) return { ok: false, error: "No se pudo crear la versión nueva." };
  return { ok: true, guionId: fila.ultimoId };
}
