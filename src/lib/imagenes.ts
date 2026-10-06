// Biblioteca de imágenes (C-IMAGENES-1): consultas y altas. Lo que Richard quita no se borra.
import { TIPO_DE_CONTENIDO_IMAGEN, type ImagenNueva } from "@compartido/imagenes";
import type { BaseDatos } from "./db";

export type FilaImagen = {
  id: number;
  carpeta: string;
  nombre: string;
  clave: string;
  tipo: "imagen" | "pdf";
  bytes: number;
  activo: number;
  creado_en: string;
};

export const imagenesActivas = (db: BaseDatos, carpeta?: string) =>
  carpeta === undefined
    ? db.todos<FilaImagen>("SELECT * FROM imagenes WHERE activo = 1 ORDER BY carpeta, nombre, id")
    : db.todos<FilaImagen>("SELECT * FROM imagenes WHERE activo = 1 AND carpeta = ? ORDER BY nombre, id", [
        carpeta,
      ]);

export const imagenPorId = (db: BaseDatos, id: number) =>
  db.uno<FilaImagen>("SELECT * FROM imagenes WHERE id = ? AND activo = 1", [id]);

/** Las carpetas que hay, con cuántos archivos tiene cada una. */
export const carpetasDeImagenes = (db: BaseDatos) =>
  db.todos<{ carpeta: string; archivos: number; bytes: number }>(
    "SELECT carpeta, COUNT(id) AS archivos, SUM(bytes) AS bytes FROM imagenes WHERE activo = 1 GROUP BY carpeta ORDER BY MAX(id) DESC",
  );

/** Guarda el archivo en el almacén y lo anota. Si ya había uno con ese nombre en la carpeta, lo reemplaza. */
export async function guardarImagen(
  db: BaseDatos,
  bucket: { put(clave: string, datos: ArrayBuffer, opciones: object): Promise<unknown> },
  datos: ImagenNueva,
  contenido: ArrayBuffer,
): Promise<{ id: number }> {
  const azar = crypto.getRandomValues(new Uint32Array(1))[0] ?? 0;
  const clave = `imagenes/${Date.now()}-${azar.toString(36)}.${datos.extension}`;
  await bucket.put(clave, contenido, {
    httpMetadata: { contentType: TIPO_DE_CONTENIDO_IMAGEN[datos.extension] },
  });
  // El mismo nombre en la misma carpeta es el mismo archivo: el nuevo reemplaza al viejo (que se aparta).
  await db.ejecutar("UPDATE imagenes SET activo = 0 WHERE carpeta = ? AND nombre = ? AND activo = 1", [
    datos.carpeta,
    datos.nombre,
  ]);
  const fila = await db.ejecutar(
    "INSERT INTO imagenes (carpeta, nombre, clave, tipo, bytes) VALUES (?, ?, ?, ?, ?)",
    [datos.carpeta, datos.nombre, clave, datos.extension === "pdf" ? "pdf" : "imagen", contenido.byteLength],
  );
  if (!fila.ultimoId) throw new Error("No se pudo anotar la imagen en la base.");
  return { id: fila.ultimoId };
}

/** «Quitar»: deja de ofrecerse. El archivo y su registro se conservan. */
export const quitarImagen = (db: BaseDatos, id: number) =>
  db.ejecutar("UPDATE imagenes SET activo = 0 WHERE id = ?", [id]);

export const quitarCarpeta = (db: BaseDatos, carpeta: string) =>
  db.ejecutar("UPDATE imagenes SET activo = 0 WHERE carpeta = ?", [carpeta]);
