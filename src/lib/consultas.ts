// Consultas del panel, en un solo lugar.
import type { BaseDatos } from "./db";

export type FilaGuion = {
  id: number;
  tema_id: number;
  tematica_id: string;
  producto_id: string | null;
  version: number;
  titulo: string;
  contenido: string;
  estructura: string;
  opinion_richard: string;
  notas_richard: string;
  estado: "borrador" | "aprobado" | "rechazado";
  modelo: string;
  costo_usd: number;
  aviso_parecido: string;
  creado_en: string;
  actualizado_en: string;
};

export type FilaTrabajo = {
  id: number;
  guion_id: number;
  tipo: string;
  estado: "pendiente" | "tomado" | "hecho" | "error" | "cancelado";
  paso: string;
  progreso: number;
  intentos: number;
  error: string;
  tomado_en: string | null;
  creado_en: string;
  actualizado_en: string;
};

export type FilaProducto = {
  id: string;
  nombre: string;
  url: string;
  descripcion_corta: string;
  activo: number;
};

export type FilaRender = {
  id: number;
  guion_id: number;
  formato: "16x9" | "9x16";
  ruta_local: string;
  bytes: number;
  duracion_seg: number;
  voz_de_prueba: number;
  creado_en: string;
};

export type FilaArchivo = {
  id: number;
  guion_id: number;
  tipo: string;
  clave: string;
  meta: string;
  creado_en: string;
};

export const listarGuiones = (db: BaseDatos) =>
  db.todos<FilaGuion & { trabajo_estado: string | null; trabajo_paso: string | null }>(
    `SELECT g.*, t.estado AS trabajo_estado, t.paso AS trabajo_paso
     FROM guiones g
     LEFT JOIN trabajos t ON t.id = (SELECT id FROM trabajos WHERE guion_id = g.id ORDER BY id DESC LIMIT 1)
     ORDER BY g.id DESC LIMIT 100`,
  );

export const guionPorId = (db: BaseDatos, id: number) =>
  db.uno<FilaGuion>("SELECT * FROM guiones WHERE id = ?", [id]);

export const productosActivos = (db: BaseDatos) =>
  db.todos<FilaProducto>("SELECT * FROM productos WHERE activo = 1 ORDER BY nombre");

export const productoPorId = (db: BaseDatos, id: string) =>
  db.uno<FilaProducto>("SELECT * FROM productos WHERE id = ? AND activo = 1", [id]);

export const guionesRecientes = (db: BaseDatos, tematicaId: string, excluirId = 0) =>
  db.todos<{ id: number; titulo: string; contenido: string; estructura: string }>(
    `SELECT id, titulo, contenido, estructura FROM guiones
     WHERE tematica_id = ? AND estado != 'rechazado' AND id != ? ORDER BY id DESC LIMIT 10`,
    [tematicaId, excluirId],
  );

export const trabajosDeGuion = (db: BaseDatos, guionId: number) =>
  db.todos<FilaTrabajo>("SELECT * FROM trabajos WHERE guion_id = ? ORDER BY id DESC", [guionId]);

export const rendersDeGuion = (db: BaseDatos, guionId: number) =>
  db.todos<FilaRender>("SELECT * FROM renders WHERE guion_id = ? ORDER BY id DESC", [guionId]);

export const archivosDeGuion = (db: BaseDatos, guionId: number) =>
  db.todos<FilaArchivo>("SELECT * FROM archivos WHERE guion_id = ? ORDER BY id DESC", [guionId]);

export const listarTrabajos = (db: BaseDatos) =>
  db.todos<FilaTrabajo & { titulo: string }>(
    `SELECT t.*, g.titulo FROM trabajos t JOIN guiones g ON g.id = t.guion_id ORDER BY t.id DESC LIMIT 50`,
  );

export const ajuste = async (db: BaseDatos, clave: string, porDefecto = ""): Promise<string> => {
  const f = await db.uno<{ valor: string }>("SELECT valor FROM ajustes WHERE clave = ?", [clave]);
  return f?.valor ?? porDefecto;
};

export const guardarAjuste = (db: BaseDatos, clave: string, valor: string) =>
  db.ejecutar(
    "INSERT INTO ajustes (clave, valor) VALUES (?, ?) ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor",
    [clave, valor],
  );

export const latidoEstacion = (db: BaseDatos) =>
  db.uno<{ visto_en: string; version: string }>("SELECT visto_en, version FROM estacion_latido WHERE id = 1");
