// Biblioteca de sonidos del panel (C-SONIDOS-1): consultas y altas.
import { archivoDeSonido, TIPO_DE_CONTENIDO, type SonidoNuevo, type TipoSonido } from "@compartido/sonidos";
import type { BaseDatos } from "./db";

export type FilaSonido = {
  id: number;
  tipo: TipoSonido;
  nombre: string;
  genero: string;
  uso: string;
  origen: string;
  archivo: string;
  clave: string;
  bytes: number;
  activo: number;
  creado_en: string;
};

export const sonidosActivos = (db: BaseDatos) =>
  db.todos<FilaSonido>("SELECT * FROM sonidos WHERE activo = 1 ORDER BY tipo DESC, id DESC");

export const sonidoPorId = (db: BaseDatos, id: number) =>
  db.uno<FilaSonido>("SELECT * FROM sonidos WHERE id = ? AND activo = 1", [id]);

/** Guarda el archivo en el almacén y lo anota. Devuelve la fila ya con su nombre para la Estación. */
export async function guardarSonido(
  db: BaseDatos,
  bucket: { put(clave: string, datos: ArrayBuffer, opciones: object): Promise<unknown> },
  datos: SonidoNuevo,
  contenido: ArrayBuffer,
): Promise<{ id: number; archivo: string }> {
  const azar = crypto.getRandomValues(new Uint32Array(1))[0] ?? 0;
  const clave = `sonidos/${datos.tipo}/${Date.now()}-${azar.toString(36)}.${datos.extension}`;
  await bucket.put(clave, contenido, { httpMetadata: { contentType: TIPO_DE_CONTENIDO[datos.extension] } });
  const fila = await db.ejecutar(
    "INSERT INTO sonidos (tipo, nombre, genero, uso, origen, clave, bytes) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [datos.tipo, datos.nombre, datos.genero, datos.uso, datos.origen, clave, contenido.byteLength],
  );
  const id = fila.ultimoId;
  if (!id) throw new Error("No se pudo anotar el sonido en la base.");
  const archivo = archivoDeSonido({ id, ...datos });
  await db.ejecutar("UPDATE sonidos SET archivo = ? WHERE id = ?", [archivo, id]);
  return { id, archivo };
}

/** «Quitar»: deja de usarse en los videos nuevos. El archivo y su registro se conservan. */
export const quitarSonido = (db: BaseDatos, id: number) =>
  db.ejecutar("UPDATE sonidos SET activo = 0 WHERE id = ?", [id]);
