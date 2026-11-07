// El Podcast IA del lado del panel (docs/PODCAST.md, C-PODCAST-1): las fichas, el tope de minutos del día
// y la URL firmada de ElevenLabs para cada conversación. La clave de ElevenLabs no sale nunca de aquí: el
// navegador recibe solo la URL firmada, que sirve para UNA conversación.
import type { BaseDatos } from "./db";
import { ajuste, guardarAjuste } from "./consultas";
import { anotarGasto, autorizarGasto } from "./presupuesto";
import {
  AJUSTE_TOPE_MINUTOS,
  MAX_SEGUNDOS_CONVERSACION,
  TOPE_MINUTOS_POR_DEFECTO,
  cabeOtraConversacion,
  construirPrompt,
  esVozInvitado,
  fichaLista,
  idDeVozInvitado,
  primerMensaje,
  type FichaPodcast,
} from "@compartido/podcast";
import { costoAgenteUsd } from "@compartido/modelos";

export const AJUSTE_AGENTE_ID = "podcast_agente_id";
export const AJUSTE_CLAVE = "podcast_elevenlabs_clave";
export const AJUSTE_VOCES = "podcast_voces";
export const AJUSTE_ERROR = "podcast_error";
export const FALTA_CONECTAR = "Falta conectar la voz del invitado.";

type FilaFicha = Omit<FichaPodcast, "ejemplo" | "permiso" | "voz"> & {
  voz: string;
  ejemplo: number;
  permiso: number;
  archivada: number;
};

const aFicha = (f: FilaFicha): FichaPodcast => ({
  id: f.id,
  nombre: f.nombre,
  etiqueta: f.etiqueta,
  tema: f.tema,
  personalidad: f.personalidad,
  voz: esVozInvitado(f.voz) ? f.voz : "neutra",
  historia: f.historia,
  primer_mensaje: f.primer_mensaje,
  ejemplo: f.ejemplo === 1,
  permiso: f.permiso === 1,
});

const COLUMNAS =
  "id, nombre, etiqueta, tema, personalidad, voz, historia, primer_mensaje, ejemplo, permiso, archivada";

export async function fichasActivas(db: BaseDatos): Promise<FichaPodcast[]> {
  const filas = await db.todos<FilaFicha>(
    `SELECT ${COLUMNAS} FROM podcast_fichas WHERE archivada = 0 ORDER BY ejemplo ASC, actualizado_en DESC, id DESC`,
  );
  return filas.map(aFicha);
}

export async function fichaPorId(db: BaseDatos, id: number): Promise<FichaPodcast | null> {
  if (!Number.isInteger(id) || id < 1) return null;
  const f = await db.uno<FilaFicha>(`SELECT ${COLUMNAS} FROM podcast_fichas WHERE id = ? AND archivada = 0`, [
    id,
  ]);
  return f ? aFicha(f) : null;
}

export type DatosFicha = Omit<FichaPodcast, "id" | "ejemplo">;

export async function guardarFicha(db: BaseDatos, id: number | null, d: DatosFicha): Promise<number> {
  const valores = [
    d.nombre,
    d.etiqueta,
    d.tema,
    d.personalidad,
    d.voz,
    d.historia,
    d.primer_mensaje,
    d.permiso ? 1 : 0,
  ];
  if (id) {
    const r = await db.ejecutar(
      `UPDATE podcast_fichas SET nombre = ?, etiqueta = ?, tema = ?, personalidad = ?, voz = ?, historia = ?,
         primer_mensaje = ?, permiso = ?, actualizado_en = datetime('now') WHERE id = ? AND archivada = 0`,
      [...valores, id],
    );
    if (r.cambios === 0) throw new Error("Esa ficha no existe o está archivada.");
    return id;
  }
  const r = await db.ejecutar(
    `INSERT INTO podcast_fichas (nombre, etiqueta, tema, personalidad, voz, historia, primer_mensaje, permiso)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    valores,
  );
  if (!r.ultimoId) throw new Error("No se pudo guardar la ficha.");
  return r.ultimoId;
}

/** Archivar, nunca borrar: la ficha sale de las listas y del estudio, pero la historia queda guardada. */
export async function archivarFicha(db: BaseDatos, id: number): Promise<void> {
  await db.ejecutar(
    "UPDATE podcast_fichas SET archivada = 1, actualizado_en = datetime('now') WHERE id = ?",
    [id],
  );
}

export async function topeMinutos(db: BaseDatos): Promise<number> {
  const n = Number(await ajuste(db, AJUSTE_TOPE_MINUTOS, String(TOPE_MINUTOS_POR_DEFECTO)));
  // Sin un número válido el tope es CERO: mejor no abrir conversaciones que abrirlas sin límite.
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

/**
 * El «hoy» del tope es el día de Richard (hora del este de EE. UU. y de Colombia, UTC−5), no el de UTC:
 * con date('now') el día se reiniciaba a las 7 de la noche.
 */
export const HOY_SQL = "date('now', '-5 hours')";

/** Segundos usados hoy: las cerradas por lo que duraron y las abiertas por lo más que pueden durar. */
export async function segundosUsadosHoy(db: BaseDatos): Promise<number> {
  const f = await db.uno<{ total: number | null }>(
    `SELECT SUM(COALESCE(segundos, ?)) AS total FROM podcast_conversaciones WHERE fecha = ${HOY_SQL}`,
    [MAX_SEGUNDOS_CONVERSACION],
  );
  return f?.total ?? 0;
}

export class TopeDelPodcast extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = "TopeDelPodcast";
  }
}

/**
 * Cierra una conversación que sigue abierta: cuenta lo que pasó desde que empezó, sin pasar de 10 minutos,
 * y anota su costo en el libro de gastos. Si ya estaba cerrada no hace nada (un doble cierre no cobra dos veces).
 */
export async function cerrarConversacion(
  db: BaseDatos,
  id: number,
  opciones: { completa?: boolean } = {},
): Promise<{ segundos: number } | null> {
  const fila = await db.uno<{ ficha_id: number; transcurridos: number }>(
    `SELECT ficha_id, CAST(strftime('%s','now') - strftime('%s', inicio) AS INTEGER) AS transcurridos
       FROM podcast_conversaciones WHERE id = ? AND fin IS NULL`,
    [id],
  );
  if (!fila) return null;
  const segundos = opciones.completa
    ? MAX_SEGUNDOS_CONVERSACION
    : Math.min(MAX_SEGUNDOS_CONVERSACION, Math.max(0, fila.transcurridos));
  const r = await db.ejecutar(
    "UPDATE podcast_conversaciones SET fin = datetime('now'), segundos = ? WHERE id = ? AND fin IS NULL",
    [segundos, id],
  );
  if (r.cambios === 0) return null;
  await anotarGasto(
    db,
    "elevenlabs",
    `podcast: conversación ${id} (ficha ${fila.ficha_id}, ${Math.ceil(segundos / 60)} min)`,
    costoAgenteUsd(segundos),
  );
  return { segundos };
}

/**
 * Abre una conversación nueva si cabe en el tope del día y en el tope de gasto. Las que quedaron abiertas
 * (una pestaña cerrada de golpe) se cierran antes contando los 10 minutos completos: así nunca se cuenta
 * de menos.
 */
export async function abrirConversacion(db: BaseDatos, fichaId: number): Promise<number> {
  const abiertas = await db.todos<{ id: number }>("SELECT id FROM podcast_conversaciones WHERE fin IS NULL");
  for (const a of abiertas) await cerrarConversacion(db, a.id, { completa: true });
  const motivo = cabeOtraConversacion(await segundosUsadosHoy(db), await topeMinutos(db));
  if (motivo) throw new TopeDelPodcast(motivo);
  await autorizarGasto(db, costoAgenteUsd(MAX_SEGUNDOS_CONVERSACION));
  const r = await db.ejecutar(`INSERT INTO podcast_conversaciones (ficha_id, fecha) VALUES (?, ${HOY_SQL})`, [
    fichaId,
  ]);
  if (!r.ultimoId) throw new Error("No se pudo abrir la conversación.");
  return r.ultimoId;
}

export type ConexionPodcast = { clave: string; agenteId: string; voces: Record<string, string> };

/** La clave y el agente: primero las variables del panel, después lo que cargó el script en la base. */
export async function conexionDelPodcast(
  db: BaseDatos,
  env: { ELEVENLABS_AGENTES_KEY?: string; ELEVENLABS_AGENTE_ID?: string },
): Promise<ConexionPodcast | null> {
  const clave = (env.ELEVENLABS_AGENTES_KEY ?? "").trim() || (await ajuste(db, AJUSTE_CLAVE)).trim();
  const agenteId = (env.ELEVENLABS_AGENTE_ID ?? "").trim() || (await ajuste(db, AJUSTE_AGENTE_ID)).trim();
  if (!clave || !agenteId) return null;
  let voces: Record<string, string> = {};
  try {
    const crudo = JSON.parse(await ajuste(db, AJUSTE_VOCES, "{}")) as unknown;
    if (crudo && typeof crudo === "object")
      voces = Object.fromEntries(
        Object.entries(crudo as Record<string, unknown>).filter(
          (e): e is [string, string] => typeof e[1] === "string",
        ),
      );
  } catch {
    voces = {};
  }
  return { clave, agenteId, voces };
}

export type ErrorDelPodcast = { mensaje: string; fecha: string };

export async function ultimoErrorDelPodcast(db: BaseDatos): Promise<ErrorDelPodcast | null> {
  const crudo = await ajuste(db, AJUSTE_ERROR);
  if (!crudo) return null;
  try {
    const e = JSON.parse(crudo) as ErrorDelPodcast;
    return typeof e.mensaje === "string" ? e : null;
  } catch {
    return { mensaje: crudo, fecha: "" };
  }
}

const anotarError = (db: BaseDatos, mensaje: string) =>
  guardarAjuste(db, AJUSTE_ERROR, JSON.stringify({ mensaje, fecha: new Date().toISOString() }));

/** El canario: apagado sin clave o sin agente, error si la última URL firmada falló, ok si no. */
export async function estadoDelPodcast(
  db: BaseDatos,
  env: { ELEVENLABS_AGENTES_KEY?: string; ELEVENLABS_AGENTE_ID?: string },
): Promise<{ estado: "ok" | "apagado" | "error"; motivo: string }> {
  await db.uno("SELECT COUNT(id) AS n FROM podcast_conversaciones");
  await db.uno("SELECT COUNT(id) AS n FROM podcast_fichas");
  const conexion = await conexionDelPodcast(db, env);
  if (!conexion) return { estado: "apagado", motivo: "" };
  // Clave y agente sin voces (o con la lista dañada): cada conversación daría 503 y el estudio no abriría nada.
  if (Object.keys(conexion.voces).length === 0)
    return {
      estado: "error",
      motivo: "Podcast: faltan las voces del invitado; corre otra vez scripts/podcast-agente.ts.",
    };
  const error = await ultimoErrorDelPodcast(db);
  return error ? { estado: "error", motivo: `Podcast: ${error.mensaje}` } : { estado: "ok", motivo: "" };
}

const BASE_ELEVENLABS = "https://api.elevenlabs.io";

/** Pide a ElevenLabs la URL firmada de UNA conversación con el agente. La clave viaja solo en esta llamada. */
export async function pedirUrlFirmada(db: BaseDatos, conexion: ConexionPodcast): Promise<string> {
  let r: Response;
  try {
    r = await fetch(
      `${BASE_ELEVENLABS}/v1/convai/conversation/get-signed-url?agent_id=${encodeURIComponent(conexion.agenteId)}`,
      { headers: { "xi-api-key": conexion.clave } },
    );
  } catch (e) {
    const mensaje = `ElevenLabs no respondió (${e instanceof Error ? e.message : String(e)}).`;
    await anotarError(db, mensaje);
    throw new Error(mensaje);
  }
  if (!r.ok) {
    const mensaje =
      r.status === 401 || r.status === 403
        ? "La clave de ElevenLabs no sirve o no tiene permiso de Agents."
        : r.status === 404
          ? "El agente del podcast no existe en ElevenLabs: hay que volver a crearlo con el script."
          : r.status === 402 || r.status === 429
            ? "ElevenLabs no tiene minutos o créditos para abrir otra conversación."
            : `ElevenLabs respondió ${r.status} al pedir la conversación.`;
    await anotarError(db, mensaje);
    throw new Error(mensaje);
  }
  const datos = (await r.json().catch(() => null)) as { signed_url?: unknown } | null;
  const url = typeof datos?.signed_url === "string" ? datos.signed_url : "";
  if (!url.startsWith("wss://")) {
    const mensaje = "ElevenLabs respondió sin la URL de la conversación.";
    await anotarError(db, mensaje);
    throw new Error(mensaje);
  }
  if (await ajuste(db, AJUSTE_ERROR)) await guardarAjuste(db, AJUSTE_ERROR, "");
  return url;
}

export type InicioDeConversacion = {
  conversacionId: number;
  signedUrl: string;
  maxSegundos: number;
  overrides: { agent: { prompt: { prompt: string }; firstMessage: string }; tts: { voiceId: string } };
};

/** Todo lo que el estudio necesita para conectar al invitado, con los dos topes revisados antes. */
export async function iniciarConversacion(
  db: BaseDatos,
  conexion: ConexionPodcast,
  ficha: FichaPodcast,
): Promise<InicioDeConversacion> {
  const falta = fichaLista(ficha);
  if (falta) throw new Error(falta);
  const voiceId = idDeVozInvitado(ficha.voz, conexion.voces);
  const conversacionId = await abrirConversacion(db, ficha.id);
  let signedUrl: string;
  try {
    signedUrl = await pedirUrlFirmada(db, conexion);
  } catch (e) {
    // No hubo conversación: se cierra en cero para que no gaste minutos del tope.
    await db.ejecutar(
      "UPDATE podcast_conversaciones SET fin = datetime('now'), segundos = 0 WHERE id = ? AND fin IS NULL",
      [conversacionId],
    );
    throw e;
  }
  return {
    conversacionId,
    signedUrl,
    maxSegundos: MAX_SEGUNDOS_CONVERSACION,
    overrides: {
      agent: { prompt: { prompt: construirPrompt(ficha) }, firstMessage: primerMensaje(ficha) },
      tts: { voiceId },
    },
  };
}
