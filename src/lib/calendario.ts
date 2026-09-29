// El calendario de publicaciones del lado de la base. Toda escritura pasa por
// `agendar`, que revisa los choques antes de guardar (C-CALENDARIO-1).
import { z } from "zod";
import {
  CANALES_CALENDARIO,
  conPunto,
  cuando,
  ESTADOS_CALENDARIO,
  fechaValida,
  hoyEn,
  leerHoras,
  minutosDe,
  normalizarHora,
  PIEZAS,
  piezasPorAgendar,
  PLATAFORMAS,
  proximoHueco,
  REGLAS_POR_DEFECTO,
  revisarEnlace,
  revisarHueco,
  sumarDias,
  ZONAS,
  type EntradaCalendario,
  type GuionProducido,
  type Momento,
  type Pedido,
  type PiezaPendiente,
  type Plataforma,
  type ReglasCalendario,
} from "@compartido/calendario";
import { esquemaPublicacion } from "@compartido/guion";
import { buscarTematica } from "@compartido/tematicas";
import { ajuste, guardarAjuste } from "./consultas";
import type { BaseDatos } from "./db";

const COLUMNAS = "id, guion_id, pieza, indice, titulo, canal, plataforma, fecha, hora, estado, nota, enlace";

export async function reglasCalendario(db: BaseDatos): Promise<ReglasCalendario> {
  const [shorts, largos, separacion, zona] = await Promise.all([
    ajuste(db, "calendario_horas_short"),
    ajuste(db, "calendario_horas_largo"),
    ajuste(db, "calendario_separacion_min"),
    ajuste(db, "calendario_zona"),
  ]);
  const horasShort = leerHoras(shorts);
  const horasLargo = leerHoras(largos);
  const minutos = Number(separacion);
  return {
    horasShort: horasShort.length ? horasShort : REGLAS_POR_DEFECTO.horasShort,
    horasLargo: horasLargo.length ? horasLargo : REGLAS_POR_DEFECTO.horasLargo,
    separacionMin:
      separacion !== "" && Number.isFinite(minutos) && minutos >= 0
        ? minutos
        : REGLAS_POR_DEFECTO.separacionMin,
    zona: ZONAS.some((z) => z.id === zona) ? zona : REGLAS_POR_DEFECTO.zona,
  };
}

export const esquemaReglas = z.object({
  horas_short: z
    .string()
    .trim()
    .max(200)
    .refine(
      (t) => leerHoras(t).length > 0,
      "Escribe al menos una hora para los Shorts (por ejemplo 12:00, 7 pm).",
    )
    .refine(
      (t) => leerHoras(t).length === t.split(/[,;\n]+/).filter((x) => x.trim()).length,
      "Hay una hora de Shorts que no se entiende. Usa 12:00 o 7 pm.",
    ),
  horas_largo: z
    .string()
    .trim()
    .max(200)
    .refine((t) => leerHoras(t).length > 0, "Escribe al menos una hora para los videos largos.")
    .refine(
      (t) => leerHoras(t).length === t.split(/[,;\n]+/).filter((x) => x.trim()).length,
      "Hay una hora de videos largos que no se entiende. Usa 16:00 o 4 pm.",
    ),
  separacion_horas: z.coerce
    .number()
    .min(0, "La separación no puede ser negativa.")
    .max(24, "La separación máxima es 24 horas."),
  zona: z.string().refine((z0) => ZONAS.some((z1) => z1.id === z0), "Elige una zona horaria de la lista."),
});

export async function guardarReglas(
  db: BaseDatos,
  crudo: unknown,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parseo = esquemaReglas.safeParse(crudo);
  if (!parseo.success) return { ok: false, error: parseo.error.issues[0]?.message ?? "Revisa las reglas." };
  const d = parseo.data;
  await guardarAjuste(db, "calendario_horas_short", leerHoras(d.horas_short).join(", "));
  await guardarAjuste(db, "calendario_horas_largo", leerHoras(d.horas_largo).join(", "));
  await guardarAjuste(db, "calendario_separacion_min", String(Math.round(d.separacion_horas * 60)));
  await guardarAjuste(db, "calendario_zona", d.zona);
  return { ok: true };
}

/** Entradas entre dos fechas (incluidas), sin las descartadas. */
export const entradasEntre = (db: BaseDatos, desde: string, hasta: string) =>
  db.todos<EntradaCalendario>(
    `SELECT ${COLUMNAS} FROM calendario
     WHERE estado != 'descartado' AND fecha >= ? AND fecha <= ? ORDER BY fecha, hora, id`,
    [desde, hasta],
  );

export const entradaPorId = (db: BaseDatos, id: number) =>
  db.uno<EntradaCalendario>(`SELECT ${COLUMNAS} FROM calendario WHERE id = ?`, [id]);

export const entradasDeGuion = (db: BaseDatos, guionId: number) =>
  db.todos<EntradaCalendario>(
    `SELECT ${COLUMNAS} FROM calendario WHERE guion_id = ? AND estado != 'descartado' ORDER BY pieza, indice`,
    [guionId],
  );

export const descartadas = (db: BaseDatos) =>
  db.todos<EntradaCalendario>(
    `SELECT ${COLUMNAS} FROM calendario WHERE estado = 'descartado' ORDER BY id DESC LIMIT 100`,
  );

const vacioANulo = (v: unknown) => (v === "" || v === undefined || v === null ? null : v);

export const esquemaAgendar = z.object({
  guion_id: z.preprocess(vacioANulo, z.coerce.number().int().positive().nullable()),
  pieza: z.enum(PIEZAS, { message: "Elige si es un video largo o un Short." }),
  indice: z.coerce.number().int().min(0).max(50).default(0),
  titulo: z
    .string()
    .trim()
    .min(3, "Escribe el título del video.")
    .max(150, "El título es muy largo (máximo 150 letras)."),
  canal: z.enum(CANALES_CALENDARIO, { message: "Elige el canal." }),
  plataforma: z.enum(PLATAFORMAS, { message: "Elige la plataforma." }).default("youtube"),
  fecha: z.string().refine(fechaValida, "Elige el día."),
  hora: z
    .string()
    .transform((h) => normalizarHora(h))
    .refine((h): h is string => h !== null, "Elige la hora (por ejemplo 12:00 o 7 pm)."),
  estado: z.enum(ESTADOS_CALENDARIO).default("agendado"),
  nota: z.string().trim().max(300).default(""),
  enlace: z.string().trim().max(300).default(""),
});

export type ResultadoAgendar =
  { ok: true; id: number; fecha: string; hora: string } | { ok: false; error: string };

async function entradasDelCanal(db: BaseDatos, pedido: Pedido, desde: string, hasta: string) {
  return db.todos<EntradaCalendario>(
    `SELECT ${COLUMNAS} FROM calendario
     WHERE canal = ? AND plataforma = ? AND estado != 'descartado' AND fecha >= ? AND fecha <= ?
     ORDER BY fecha, hora, id`,
    [pedido.canal, pedido.plataforma, desde, hasta],
  );
}

/** Guarda una publicación en el calendario, o dice por qué no se puede y cuál es el próximo hueco libre. */
export async function agendar(
  db: BaseDatos,
  crudo: unknown,
  ahora: Date,
  idAMover?: number,
): Promise<ResultadoAgendar> {
  const parseo = esquemaAgendar.safeParse(crudo);
  if (!parseo.success) return { ok: false, error: parseo.error.issues[0]?.message ?? "Revisa los datos." };
  const d = parseo.data;
  const enlace = revisarEnlace(d.enlace, d.plataforma, d.pieza);
  if (!enlace.ok) return { ok: false, error: enlace.error };
  const reglas = await reglasCalendario(db);
  const hoy = hoyEn(reglas.zona, ahora);
  const yaSalio = d.estado === "publicado";
  if (!yaSalio && d.fecha < hoy.fecha)
    return { ok: false, error: "Ese día ya pasó. Elige hoy o un día que venga." };
  if (!yaSalio && d.fecha === hoy.fecha && minutosDe(d.hora) <= minutosDe(hoy.hora))
    return { ok: false, error: "Esa hora ya pasó. Elige una hora más tarde o el día siguiente." };

  // La misma pieza de un guion no se duplica: si ya estaba, se mueve.
  const previa =
    idAMover !== undefined
      ? await entradaPorId(db, idAMover)
      : d.guion_id
        ? await db.uno<EntradaCalendario>(
            `SELECT ${COLUMNAS} FROM calendario WHERE guion_id = ? AND pieza = ? AND indice = ? AND plataforma = ?`,
            [d.guion_id, d.pieza, d.indice, d.plataforma],
          )
        : null;
  if (idAMover !== undefined && !previa)
    return { ok: false, error: "Esa publicación ya no está en el calendario." };

  const pedido: Pedido = {
    id: previa?.id,
    guion_id: d.guion_id,
    canal: d.canal,
    plataforma: d.plataforma,
    pieza: d.pieza,
  };
  const cerca = await entradasDelCanal(db, pedido, sumarDias(d.fecha, -1), sumarDias(d.fecha, 1));
  const delGuion = d.guion_id ? await entradasDeGuion(db, d.guion_id) : [];
  const vistas = [...cerca, ...delGuion.filter((e) => !cerca.some((c) => c.id === e.id))];
  const choque = revisarHueco(vistas, { ...pedido, fecha: d.fecha, hora: d.hora }, reglas);
  if (choque) {
    const todas = await entradasDelCanal(db, pedido, hoy.fecha, sumarDias(hoy.fecha, 125));
    const libre = proximoHueco(
      [...todas, ...delGuion.filter((e) => !todas.some((c) => c.id === e.id))],
      pedido,
      reglas,
      hoy,
    );
    return {
      ok: false,
      error: `${choque.mensaje}${libre ? ` ${conPunto(`El próximo hueco libre es ${cuando(libre.fecha, libre.hora)}`)}` : ""}`,
    };
  }

  try {
    if (previa) {
      await db.ejecutar(
        `UPDATE calendario SET titulo = ?, canal = ?, fecha = ?, hora = ?, estado = ?, nota = ?, enlace = ?, actualizado_en = datetime('now') WHERE id = ?`,
        [d.titulo, d.canal, d.fecha, d.hora, d.estado, d.nota, enlace.enlace || previa.enlace, previa.id],
      );
      return { ok: true, id: previa.id, fecha: d.fecha, hora: d.hora };
    }
    const r = await db.ejecutar(
      `INSERT INTO calendario (guion_id, pieza, indice, titulo, canal, plataforma, fecha, hora, estado, nota, enlace)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        d.guion_id,
        d.pieza,
        d.indice,
        d.titulo,
        d.canal,
        d.plataforma,
        d.fecha,
        d.hora,
        d.estado,
        d.nota,
        enlace.enlace,
      ],
    );
    return { ok: true, id: r.ultimoId ?? 0, fecha: d.fecha, hora: d.hora };
  } catch (e) {
    // El índice único de la base es la última barrera (dos guardados a la vez).
    if (/UNIQUE|constraint/i.test(e instanceof Error ? e.message : String(e)))
      return { ok: false, error: "Ese hueco se acaba de ocupar. Elige otra hora." };
    throw e;
  }
}

/** Cambia el día o la hora de una publicación que ya está en el calendario. */
export async function mover(
  db: BaseDatos,
  id: number,
  fecha: string,
  hora: string,
  ahora: Date,
): Promise<ResultadoAgendar> {
  const previa = await entradaPorId(db, id);
  if (!previa || previa.estado === "descartado")
    return { ok: false, error: "Esa publicación ya no está en el calendario." };
  const estado = previa.estado === "publicado" ? "publicado" : previa.estado;
  return agendar(db, { ...previa, guion_id: previa.guion_id ?? "", fecha, hora, estado }, ahora, id);
}

export async function cambiarEstado(
  db: BaseDatos,
  id: number,
  estado: "agendado" | "programado" | "publicado",
) {
  await db.ejecutar(
    `UPDATE calendario SET estado = ?, actualizado_en = datetime('now') WHERE id = ? AND estado != 'descartado'`,
    [estado, id],
  );
}

/** Saca una publicación del calendario. La pieza de un guion vuelve a «Por agendar». */
export async function quitar(db: BaseDatos, id: number) {
  await db.ejecutar("DELETE FROM calendario WHERE id = ?", [id]);
}

const esquemaPieza = z.object({
  guion_id: z.coerce.number().int().positive(),
  pieza: z.enum(PIEZAS),
  indice: z.coerce.number().int().min(0).max(50).default(0),
  titulo: z.string().trim().min(1).max(150),
  canal: z.enum(CANALES_CALENDARIO),
  plataforma: z.enum(PLATAFORMAS).default("youtube"),
});

/** «Quitar de la lista»: la pieza ya salió antes o no se va a publicar. Se puede deshacer. */
export async function descartar(db: BaseDatos, crudo: unknown): Promise<{ ok: boolean }> {
  const parseo = esquemaPieza.safeParse(crudo);
  if (!parseo.success) return { ok: false };
  const d = parseo.data;
  await db.ejecutar(
    `INSERT INTO calendario (guion_id, pieza, indice, titulo, canal, plataforma, estado)
     VALUES (?, ?, ?, ?, ?, ?, 'descartado')
     ON CONFLICT(guion_id, pieza, indice, plataforma) WHERE guion_id IS NOT NULL
     DO UPDATE SET estado = 'descartado', fecha = '', hora = '', actualizado_en = datetime('now')`,
    [d.guion_id, d.pieza, d.indice, d.titulo, d.canal, d.plataforma],
  );
  return { ok: true };
}

/** Lo producido y aprobado, con sus títulos de YouTube, listo para repartir. */
export async function guionesProducidos(db: BaseDatos): Promise<GuionProducido[]> {
  const filas = await db.todos<{
    id: number;
    tematica_id: string;
    titulo: string;
    contenido: string;
    largos: number;
  }>(
    `SELECT g.id, g.tematica_id, g.titulo, g.contenido,
            (SELECT COUNT(*) FROM videos v WHERE v.guion_id = g.id AND v.formato = '16x9') AS largos
     FROM guiones g
     WHERE g.estado = 'aprobado' AND EXISTS (SELECT 1 FROM videos v WHERE v.guion_id = g.id)
     ORDER BY g.id LIMIT 200`,
  );
  return filas.map((f) => {
    let publicacion: GuionProducido["publicacion"] = null;
    try {
      const p = esquemaPublicacion.safeParse(
        (JSON.parse(f.contenido) as { publicacion?: unknown }).publicacion,
      );
      if (p.success)
        publicacion = {
          titulo: p.data.titulo,
          shorts: p.data.shorts.map((s) => ({ indice: s.indice, titulo: s.titulo })),
        };
    } catch {
      publicacion = null;
    }
    return {
      id: f.id,
      canal: buscarTematica(f.tematica_id)?.canal ?? "canal-ia",
      titulo: f.titulo,
      tieneLargo: f.largos > 0,
      publicacion,
    };
  });
}

export async function pendientes(db: BaseDatos, plataforma: Plataforma): Promise<PiezaPendiente[]> {
  const [guiones, entradas] = await Promise.all([
    guionesProducidos(db),
    db.todos<Pick<EntradaCalendario, "guion_id" | "pieza" | "indice" | "plataforma">>(
      "SELECT guion_id, pieza, indice, plataforma FROM calendario WHERE guion_id IS NOT NULL",
    ),
  ]);
  return piezasPorAgendar(guiones, entradas, plataforma);
}

/** Agenda una pieza en el primer hueco libre (un solo toque). */
export async function agendarEnProximoHueco(
  db: BaseDatos,
  pieza: PiezaPendiente & { plataforma: Plataforma },
  ahora: Date,
): Promise<ResultadoAgendar> {
  const reglas = await reglasCalendario(db);
  const hoy = hoyEn(reglas.zona, ahora);
  const pedido: Pedido = {
    canal: pieza.canal,
    plataforma: pieza.plataforma,
    pieza: pieza.pieza,
    guion_id: pieza.guion_id,
  };
  const [todas, delGuion] = await Promise.all([
    entradasDelCanal(db, pedido, sumarDias(hoy.fecha, -1), sumarDias(hoy.fecha, 125)),
    entradasDeGuion(db, pieza.guion_id),
  ]);
  const vistas = [...todas, ...delGuion.filter((e) => !todas.some((c) => c.id === e.id))];
  const largo = vistas.find(
    (e) =>
      e.guion_id === pieza.guion_id &&
      e.pieza === "largo" &&
      e.plataforma === pieza.plataforma &&
      e.hora !== "",
  );
  const desde: Momento =
    pieza.pieza === "short" && largo && largo.fecha >= hoy.fecha
      ? { fecha: largo.fecha, hora: largo.hora }
      : hoy;
  const hueco = proximoHueco(vistas, pedido, reglas, hoy, desde);
  if (!hueco)
    return {
      ok: false,
      error: "No hay huecos libres en los próximos cuatro meses. Agrega más horas en las reglas.",
    };
  return agendar(db, { ...pieza, ...hueco }, ahora);
}

/**
 * Guarda el enlace del video ya subido (o lo borra si llega vacío). Con enlace,
 * lo que estaba solo «agendado» pasa a «programado»: si hay enlace, ya está subido.
 */
export async function guardarEnlace(
  db: BaseDatos,
  id: number,
  crudo: string,
): Promise<{ ok: true; enlace: string; estado: EntradaCalendario["estado"] } | { ok: false; error: string }> {
  const previa = await entradaPorId(db, id);
  if (!previa || previa.estado === "descartado")
    return { ok: false, error: "Esa publicación ya no está en el calendario." };
  const r = revisarEnlace(crudo, previa.plataforma, previa.pieza);
  if (!r.ok) return r;
  const estado = r.enlace && previa.estado === "agendado" ? "programado" : previa.estado;
  await db.ejecutar(
    `UPDATE calendario SET enlace = ?, estado = ?, actualizado_en = datetime('now') WHERE id = ?`,
    [r.enlace, estado, id],
  );
  return { ok: true, enlace: r.enlace, estado };
}

/** La miniatura que Escenia armó para cada guion (la más nueva), como ruta del panel. */
export async function miniaturasDeGuiones(db: BaseDatos, ids: number[]): Promise<Map<number, string>> {
  const unicos = [...new Set(ids)].filter((n) => Number.isInteger(n) && n > 0).slice(0, 90);
  const mapa = new Map<number, string>();
  if (unicos.length === 0) return mapa;
  const filas = await db.todos<{ guion_id: number; clave: string }>(
    `SELECT guion_id, clave FROM archivos
     WHERE tipo = 'miniatura' AND guion_id IN (${unicos.map(() => "?").join(", ")}) ORDER BY id DESC`,
    unicos,
  );
  for (const f of filas) if (!mapa.has(f.guion_id)) mapa.set(f.guion_id, `/datos/archivos/${f.clave}`);
  return mapa;
}
