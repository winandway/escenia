// El Director (docs/DIRECTOR.md): los encargos, la conversación y las propuestas. La IA conversa,
// mira las fotos y los videos y PROPONE (un anuncio con fotos, una prueba en vivo o una locución) como
// una tarjeta con su precio; solo el botón de Richard la vuelve un pedido para la Mac (C-DIRECTOR-1).
// Ninguna herramienta de la IA gasta ni aprueba.
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import {
  costoDemostracionUsd,
  costoLocucionUsd,
  esquemaDemostracion,
  esquemaLocucion,
  problemaDeDemostracion,
  problemaDeLocucion,
} from "@compartido/director";
import { asegurarModelo, costoTokensUsd, MODELOS_PERMITIDOS } from "@compartido/modelos";
import { costoEstimadoPublicidadUsd, esquemaPublicidadNueva } from "@compartido/publicidad";
import type { BaseDatos } from "./db";
import {
  contextoDelEncargo,
  dinero,
  HERRAMIENTAS,
  historialParaLaIA,
  reloj,
  SISTEMA,
  type MaterialDelDirector,
  type PropuestaLeida,
  type ResultadoDePropuesta,
} from "./director-prompt";
import {
  claveDeHoja,
  trabajoDePropuesta,
  videoDelDirector,
  videosDelEncargo,
  type FilaTrabajoDirector,
} from "./director-videos";
import { conEstadoIA } from "./ia-estado";
import { carpetasDeImagenes, imagenesActivas, imagenPorId, type FilaImagen } from "./imagenes";
import { anotarGasto, autorizarGasto } from "./presupuesto";
import { crearPublicidad } from "./publicidades";

export type FilaEncargo = {
  id: number;
  titulo: string;
  carpeta: string;
  estado: "abierto" | "archivado";
  costo_usd: number;
  creado_en: string;
  actualizado_en: string;
};

export type FilaMensaje = {
  id: number;
  encargo_id: number;
  rol: "richard" | "director" | "aviso";
  texto: string;
  propuesta_id: number | null;
  creado_en: string;
};

export type FilaPropuesta = {
  id: number;
  encargo_id: number;
  datos: string; // JSON: lo propuesto (con `tipo`; sin él, un anuncio con fotos)
  precio_usd: number;
  estado: "propuesta" | "aprobada" | "reemplazada";
  publicidad_id: number | null;
  creado_en: string;
  actualizado_en: string;
};

/** Un encargo nuevo trae su propia carpeta de Imágenes para lo que se suba en el chat. */
export async function crearEncargo(db: BaseDatos): Promise<number> {
  const r = await db.ejecutar("INSERT INTO director_encargos (titulo) VALUES ('Encargo nuevo')");
  if (!r.ultimoId) throw new Error("No se pudo abrir el encargo en la base.");
  await db.ejecutar("UPDATE director_encargos SET titulo = ?, carpeta = ? WHERE id = ?", [
    `Encargo ${r.ultimoId}`,
    `Encargo ${r.ultimoId}`,
    r.ultimoId,
  ]);
  return r.ultimoId;
}

export const encargosAbiertos = (db: BaseDatos) =>
  db.todos<FilaEncargo>(
    "SELECT * FROM director_encargos WHERE estado = 'abierto' ORDER BY actualizado_en DESC, id DESC LIMIT 60",
  );

export const encargoPorId = (db: BaseDatos, id: number) =>
  db.uno<FilaEncargo>("SELECT * FROM director_encargos WHERE id = ?", [id]);

export const mensajesDelEncargo = (db: BaseDatos, id: number) =>
  db.todos<FilaMensaje>("SELECT * FROM director_mensajes WHERE encargo_id = ? ORDER BY id", [id]);

export const propuestasDelEncargo = (db: BaseDatos, id: number) =>
  db.todos<FilaPropuesta>("SELECT * FROM director_propuestas WHERE encargo_id = ? ORDER BY id", [id]);

/** Lo propuesto, ya revisado: las primeras tarjetas (sin `tipo`) son anuncios con fotos. */
export function leerPropuesta(p: Pick<FilaPropuesta, "datos">): PropuestaLeida {
  const crudo = JSON.parse(p.datos) as { tipo?: string };
  if (crudo.tipo === "demostracion") return { tipo: "demostracion", datos: esquemaDemostracion.parse(crudo) };
  if (crudo.tipo === "locucion") return { tipo: "locucion", datos: esquemaLocucion.parse(crudo) };
  return { tipo: "anuncio", datos: esquemaPublicidadNueva.parse(crudo) };
}

export async function anotarMensaje(
  db: BaseDatos,
  encargoId: number,
  rol: FilaMensaje["rol"],
  texto: string,
  propuestaId: number | null = null,
): Promise<void> {
  await db.ejecutar(
    "INSERT INTO director_mensajes (encargo_id, rol, texto, propuesta_id) VALUES (?, ?, ?, ?)",
    [encargoId, rol, texto.slice(0, 8000), propuestaId],
  );
  await db.ejecutar("UPDATE director_encargos SET actualizado_en = datetime('now') WHERE id = ?", [
    encargoId,
  ]);
}

/** «Archivar»: sale de la lista. No se borra nada (ni la conversación ni sus videos). */
export const archivarEncargo = (db: BaseDatos, id: number) =>
  db.ejecutar(
    "UPDATE director_encargos SET estado = 'archivado', actualizado_en = datetime('now') WHERE id = ?",
    [id],
  );

type GuardadoDePropuesta = { ok: true; id: number; precioUsd: number } | { ok: false; error: string };

/** La tarjeta nueva reemplaza la que estaba esperando, y le pone nombre al encargo. */
async function insertarPropuesta(
  db: BaseDatos,
  encargoId: number,
  datos: { nombre: string },
  precioUsd: number,
): Promise<GuardadoDePropuesta> {
  await db.ejecutar(
    "UPDATE director_propuestas SET estado = 'reemplazada', actualizado_en = datetime('now') WHERE encargo_id = ? AND estado = 'propuesta'",
    [encargoId],
  );
  const r = await db.ejecutar(
    "INSERT INTO director_propuestas (encargo_id, datos, precio_usd) VALUES (?, ?, ?)",
    [encargoId, JSON.stringify(datos), precioUsd],
  );
  if (!r.ultimoId) throw new Error("No se pudo guardar la propuesta.");
  await db.ejecutar("UPDATE director_encargos SET titulo = ? WHERE id = ?", [datos.nombre, encargoId]);
  return { ok: true, id: r.ultimoId, precioUsd };
}

/** ¿Las carpetas existen con fotos, y las fotos nombradas (la persona, el producto) están en ellas? */
function problemaDeFotos(
  imagenes: FilaImagen[],
  carpetas: string[],
  fotos: { nombre: string; que: string }[],
): string | null {
  const falta = carpetas.find((c) => !imagenes.some((i) => i.carpeta === c && i.tipo === "imagen"));
  if (falta)
    return `La carpeta «${falta}» no existe o no tiene fotos. Usa una de la lista, o pide que suban las fotos aquí en el chat.`;
  for (const f of fotos)
    if (
      f.nombre &&
      !imagenes.some((i) => i.nombre === f.nombre && i.tipo === "imagen" && carpetas.includes(i.carpeta))
    )
      return `La foto «${f.nombre}» (${f.que}) no está en las carpetas elegidas: usa el nombre exacto de la lista, o déjalo vacío.`;
  return null;
}

/**
 * El anuncio con fotos que propone la IA, revisado como si lo hubiera llenado Richard en el formulario
 * de Publicidad. Si algo no cuadra, el error vuelve a la IA en palabras para que lo corrija.
 */
export async function guardarPropuesta(
  db: BaseDatos,
  encargoId: number,
  entrada: unknown,
): Promise<GuardadoDePropuesta> {
  const parseo = esquemaPublicidadNueva.safeParse(entrada);
  if (!parseo.success) return { ok: false, error: parseo.error.issues[0]?.message ?? "Revisa los datos." };
  const d = parseo.data;
  const problema = problemaDeFotos(await imagenesActivas(db), d.carpetas, [
    { nombre: d.avatar, que: "la persona" },
  ]);
  if (problema) return { ok: false, error: problema };
  return insertarPropuesta(db, encargoId, d, costoEstimadoPublicidadUsd(d.narracion, Boolean(d.avatar)));
}

/**
 * La prueba en vivo o la locución que propone la IA (C-DIRECTOR-3): el video tiene que ser de este
 * encargo y estar mirado, y el texto tiene que calzar con su duración.
 */
export async function guardarPropuestaConVideo(
  db: BaseDatos,
  encargoId: number,
  tipo: "demostracion" | "locucion",
  entrada: unknown,
): Promise<GuardadoDePropuesta> {
  const base = typeof entrada === "object" && entrada ? entrada : {};
  const parseo = (tipo === "demostracion" ? esquemaDemostracion : esquemaLocucion).safeParse({
    ...base,
    tipo,
  });
  if (!parseo.success) {
    const i = parseo.error.issues[0];
    return { ok: false, error: `${i?.path.join(".") || "datos"}: ${i?.message ?? "revisa los datos"}` };
  }
  const d = parseo.data;
  const video = await videoDelDirector(db, d.video_id);
  if (!video || video.encargo_id !== encargoId)
    return { ok: false, error: `El video V${d.video_id} no es de este encargo.` };
  if (video.estado !== "listo")
    return {
      ok: false,
      error: `El video V${d.video_id} todavía no está listo (${video.estado === "error" ? video.error : "la Mac lo está mirando"}).`,
    };
  if (d.tipo === "locucion") {
    const problema = problemaDeLocucion(d, video.duracion_seg);
    if (problema) return { ok: false, error: problema };
    return insertarPropuesta(db, encargoId, d, costoLocucionUsd(d));
  }
  const problema =
    problemaDeDemostracion(d, video.duracion_seg) ??
    problemaDeFotos(await imagenesActivas(db), d.carpetas, [
      { nombre: d.avatar, que: "la persona" },
      { nombre: d.cierre.imagen, que: "el producto del cierre" },
    ]);
  if (problema) return { ok: false, error: problema };
  return insertarPropuesta(db, encargoId, d, costoDemostracionUsd(d));
}

/**
 * El botón de Richard (C-DIRECTOR-1): la ÚNICA puerta por la que una propuesta se vuelve un video.
 * Un doble clic no pide dos videos, y una propuesta reemplazada ya no se puede aprobar.
 */
export async function aprobarPropuesta(
  db: BaseDatos,
  propuestaId: number,
): Promise<{ encargoId: number; publicidadId?: number; trabajoId?: number }> {
  const p = await db.uno<FilaPropuesta>("SELECT * FROM director_propuestas WHERE id = ?", [propuestaId]);
  if (!p) throw new Error("Esa propuesta no existe.");
  const yaHecho = async () => {
    if (p.publicidad_id) return { encargoId: p.encargo_id, publicidadId: p.publicidad_id };
    const otra = await db.uno<FilaPropuesta>("SELECT * FROM director_propuestas WHERE id = ?", [propuestaId]);
    if (otra?.publicidad_id) return { encargoId: p.encargo_id, publicidadId: otra.publicidad_id };
    const t = await trabajoDePropuesta(db, propuestaId);
    return t ? { encargoId: p.encargo_id, trabajoId: t.id } : null;
  };
  if (p.estado === "aprobada") {
    const hecho = await yaHecho();
    if (hecho) return hecho;
  }
  if (p.estado !== "propuesta")
    throw new Error("Esa propuesta ya se cambió por una más nueva: aprueba la de abajo.");
  const tomada = await db.ejecutar(
    "UPDATE director_propuestas SET estado = 'aprobada', actualizado_en = datetime('now') WHERE id = ? AND estado = 'propuesta'",
    [propuestaId],
  );
  if (!tomada.cambios) {
    const hecho = await yaHecho();
    if (hecho) return hecho;
    throw new Error("Esa propuesta ya se está aprobando.");
  }
  try {
    const leida = leerPropuesta(p);
    const avisar = () =>
      anotarMensaje(
        db,
        p.encargo_id,
        "aviso",
        `Aprobaste la propuesta (unos ${dinero(p.precio_usd)}). La Mac la toma y la arma en unos minutos.`,
      );
    if (leida.tipo === "anuncio") {
      const publicidadId = await crearPublicidad(db, leida.datos);
      await db.ejecutar("UPDATE director_propuestas SET publicidad_id = ? WHERE id = ?", [
        publicidadId,
        propuestaId,
      ]);
      await avisar();
      return { encargoId: p.encargo_id, publicidadId };
    }
    // Una sola fila por propuesta (UNIQUE en la base): aunque dos aprobaciones lleguen juntas.
    await db.ejecutar(
      "INSERT OR IGNORE INTO director_trabajos (propuesta_id, encargo_id, tipo, datos) VALUES (?, ?, ?, ?)",
      [propuestaId, p.encargo_id, leida.tipo, JSON.stringify(leida.datos)],
    );
    const t = await trabajoDePropuesta(db, propuestaId);
    if (!t) throw new Error("No se pudo anotar el trabajo para la Mac.");
    await avisar();
    return { encargoId: p.encargo_id, trabajoId: t.id };
  } catch (e) {
    // Si el pedido no se pudo anotar, la tarjeta vuelve a quedar para aprobar (no se pierde el clic).
    if (!(await trabajoDePropuesta(db, propuestaId)))
      await db.ejecutar(
        "UPDATE director_propuestas SET estado = 'propuesta' WHERE id = ? AND publicidad_id IS NULL",
        [propuestaId],
      );
    throw e;
  }
}

/** Cómo va lo que salió de una propuesta: su anuncio de Publicidad o su trabajo con video. */
export async function resultadoDePropuesta(
  db: BaseDatos,
  p: FilaPropuesta,
): Promise<
  (ResultadoDePropuesta & { video: string; costoUsd: number; trabajo?: FilaTrabajoDirector }) | null
> {
  if (p.publicidad_id) {
    const a = await db.uno<{
      estado: string;
      paso: string;
      error: string;
      duracion_seg: number;
      video: string;
      costo_usd: number;
    }>("SELECT estado, paso, error, duracion_seg, video, costo_usd FROM publicidades WHERE id = ?", [
      p.publicidad_id,
    ]);
    return a
      ? {
          estado: a.estado,
          paso: a.paso,
          error: a.error,
          duracionSeg: a.duracion_seg,
          video: a.video,
          costoUsd: a.costo_usd,
        }
      : null;
  }
  const t = p.estado === "aprobada" ? await trabajoDePropuesta(db, p.id) : null;
  return t
    ? {
        estado: t.estado,
        paso: t.paso,
        error: t.error,
        duracionSeg: t.duracion_seg,
        video: t.video,
        costoUsd: t.costo_usd,
        trabajo: t,
      }
    : null;
}

/** Las carpetas (las más recientes primero), sus fotos, los videos del chat y cómo van las propuestas. */
export async function materialDelEncargo(db: BaseDatos, encargo: FilaEncargo): Promise<MaterialDelDirector> {
  const [carpetas, imagenes, propuestas, videos] = await Promise.all([
    carpetasDeImagenes(db),
    imagenesActivas(db),
    propuestasDelEncargo(db, encargo.id),
    videosDelEncargo(db, encargo.id),
  ]);
  const resultados = await Promise.all(propuestas.map((p) => resultadoDePropuesta(db, p)));
  return {
    carpetaDelEncargo: encargo.carpeta,
    carpetas: carpetas.map((c) => ({
      carpeta: c.carpeta,
      imagenes: imagenes
        .filter((i) => i.carpeta === c.carpeta)
        .map((i) => ({ id: i.id, nombre: i.nombre, tipo: i.tipo })),
    })),
    videos: videos.map((v) => ({
      id: v.id,
      nombre: v.nombre,
      estado: v.estado,
      duracionSeg: v.duracion_seg,
      conSonido: Boolean(v.con_sonido),
      vertical: Boolean(v.vertical),
      error: v.error,
    })),
    propuestas: propuestas.map((p, k) => {
      const r = resultados[k];
      return {
        id: p.id,
        estado: p.estado,
        precioUsd: p.precio_usd,
        leida: leerPropuesta(p),
        resultado: r ? { estado: r.estado, paso: r.paso, error: r.error, duracionSeg: r.duracionSeg } : null,
      };
    }),
  };
}

/** Lo justo del almacén para leer una foto (en las pruebas, uno de mentira). */
export type AlmacenDeLectura = {
  get(clave: string): Promise<{ size: number; arrayBuffer(): Promise<ArrayBuffer> } | null>;
};

/** La API de la IA acepta fotos de hasta 5 MB; se deja margen. */
export const MAX_BYTES_PARA_MIRAR = 3_500_000;
const TIPO_PARA_MIRAR: Record<string, "image/jpeg" | "image/png" | "image/webp"> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

function aBase64(bytes: Uint8Array): string {
  let binario = "";
  for (let i = 0; i < bytes.length; i += 0x8000)
    binario += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binario);
}

type Resultado = { bloque: Anthropic.ToolResultBlockParam; propuestaId?: number };

const fallo = (id: string, texto: string): Resultado => ({
  bloque: { type: "tool_result", tool_use_id: id, is_error: true, content: texto },
});

const numeroDe = (input: unknown) => z.object({ id: z.coerce.number().int().positive() }).safeParse(input);

async function verImagen(
  db: BaseDatos,
  uso: Anthropic.ToolUseBlock,
  almacen: AlmacenDeLectura | null,
): Promise<Resultado> {
  const parseo = numeroDe(uso.input);
  if (!parseo.success) return fallo(uso.id, "Falta el número de la imagen (#).");
  const fila = await imagenPorId(db, parseo.data.id);
  if (!fila || fila.tipo !== "imagen")
    return fallo(uso.id, `No hay una foto con el número ${parseo.data.id}.`);
  const tipo = TIPO_PARA_MIRAR[fila.clave.split(".").pop()?.toLowerCase() ?? ""];
  if (!tipo || !almacen)
    return fallo(uso.id, `No se puede abrir «${fila.nombre}» ahora: guíate por su nombre.`);
  if (fila.bytes > MAX_BYTES_PARA_MIRAR)
    return fallo(uso.id, `«${fila.nombre}» pesa demasiado para mirarla: guíate por su nombre.`);
  const objeto = await almacen.get(fila.clave);
  if (!objeto) return fallo(uso.id, `«${fila.nombre}» no está en el almacén: guíate por su nombre.`);
  const datos = aBase64(new Uint8Array(await objeto.arrayBuffer()));
  return {
    bloque: {
      type: "tool_result",
      tool_use_id: uso.id,
      content: [
        { type: "text", text: `#${fila.id} «${fila.nombre}», de la carpeta «${fila.carpeta}».` },
        { type: "image", source: { type: "base64", media_type: tipo, data: datos } },
      ],
    },
  };
}

/** Las hojas que se le muestran a la IA de un video (cada una, unos 15 cuadros con su hora). */
export const HOJAS_MAXIMAS = 4;

async function verVideo(
  db: BaseDatos,
  encargoId: number,
  uso: Anthropic.ToolUseBlock,
  almacen: AlmacenDeLectura | null,
): Promise<Resultado> {
  const parseo = numeroDe(uso.input);
  if (!parseo.success) return fallo(uso.id, "Falta el número del video (V#).");
  const v = await videoDelDirector(db, parseo.data.id);
  if (!v || v.encargo_id !== encargoId)
    return fallo(uso.id, `No hay un video V${parseo.data.id} en este encargo.`);
  if (v.estado === "error") return fallo(uso.id, `No se pudo mirar V${v.id}: ${v.error || "sin detalle"}.`);
  if (v.estado !== "listo")
    return fallo(
      uso.id,
      `V${v.id} todavía no está listo: la Mac lo está mirando (menos de un minuto si está encendida). Dilo y espera.`,
    );
  const contenido: Exclude<Anthropic.ToolResultBlockParam["content"], string | undefined> = [
    {
      type: "text",
      text: `V${v.id} «${v.nombre}»: dura ${reloj(v.duracion_seg)} (${v.duracion_seg.toFixed(1)} s), ${v.vertical ? "vertical" : "acostado"}, ${v.con_sonido ? "con sonido" : "sin sonido"}. Un cuadro cada ${v.segundos_por_cuadro} s; la hora de cada uno va encima.`,
    },
  ];
  for (let n = 1; n <= Math.min(v.hojas, HOJAS_MAXIMAS); n++) {
    const objeto = almacen ? await almacen.get(claveDeHoja(v.id, n)) : null;
    if (!objeto) continue;
    contenido.push({
      type: "image",
      source: {
        type: "base64",
        media_type: "image/jpeg",
        data: aBase64(new Uint8Array(await objeto.arrayBuffer())),
      },
    });
  }
  if (contenido.length === 1) return fallo(uso.id, `No se pudieron abrir las hojas de V${v.id}.`);
  return { bloque: { type: "tool_result", tool_use_id: uso.id, content: contenido } };
}

const listo = (uso: Anthropic.ToolUseBlock, r: { id: number; precioUsd: number }): Resultado => ({
  propuestaId: r.id,
  bloque: {
    type: "tool_result",
    tool_use_id: uso.id,
    content: `Listo: la propuesta ${r.id} ya sale en la tarjeta, con el precio (${dinero(r.precioUsd)}) y el botón para aprobarla.`,
  },
});

async function ejecutarHerramienta(
  db: BaseDatos,
  encargoId: number,
  uso: Anthropic.ToolUseBlock,
  almacen: AlmacenDeLectura | null,
): Promise<Resultado> {
  if (uso.name === "ver_imagen") return verImagen(db, uso, almacen);
  if (uso.name === "ver_video") return verVideo(db, encargoId, uso, almacen);
  if (uso.name === "proponer_anuncio") {
    const r = await guardarPropuesta(db, encargoId, uso.input);
    return r.ok ? listo(uso, r) : fallo(uso.id, r.error);
  }
  if (uso.name === "proponer_demostracion" || uso.name === "proponer_locucion") {
    const tipo = uso.name === "proponer_demostracion" ? "demostracion" : "locucion";
    const r = await guardarPropuestaConVideo(db, encargoId, tipo, uso.input);
    return r.ok ? listo(uso, r) : fallo(uso.id, r.error);
  }
  return fallo(uso.id, `No existe la herramienta «${uso.name}».`);
}

/** Lo que cuesta una vuelta de la IA, con margen: se pregunta al tope de hoy ANTES de cada una. */
const ESTIMADO_VUELTA_USD = 0.06;
/** Mirar fotos y videos y proponer cabe en pocas vueltas; más sería la IA dando vueltas en círculo. */
export const MAX_VUELTAS = 8;

export type OpcionesDirector = {
  modelo: string;
  apiKey: string;
  almacen: AlmacenDeLectura | null;
  fetch?: typeof fetch;
};

/**
 * Responde al último mensaje de Richard: la IA conversa, mira fotos y videos y, si ya tiene la
 * propuesta, la deja como tarjeta. Cada vuelta pregunta al tope de gasto antes de salir y anota lo
 * que costó.
 */
export async function responderDirector(
  db: BaseDatos,
  encargoId: number,
  opciones: OpcionesDirector,
): Promise<{ texto: string; propuestaId: number | null; costoUsd: number }> {
  const modelo = asegurarModelo(opciones.modelo);
  if (MODELOS_PERMITIDOS[modelo].proveedor !== "anthropic")
    throw new Error("El Director trabaja con Claude: elige un modelo de Claude en Ajustes.");
  const encargo = await encargoPorId(db, encargoId);
  if (!encargo) throw new Error("Ese encargo no existe.");
  const historial = historialParaLaIA(await mensajesDelEncargo(db, encargoId));
  if (historial.at(-1)?.role !== "user") throw new Error("No hay ningún mensaje nuevo que responder.");
  const material = await materialDelEncargo(db, encargo);
  const cliente = new Anthropic({ apiKey: opciones.apiKey, fetch: opciones.fetch, maxRetries: 2 });
  const conversacion: Anthropic.MessageParam[] = [...historial];
  const textos: string[] = [];
  let propuestaId: number | null = null;
  let costoUsd = 0;
  try {
    for (let vuelta = 0; vuelta < MAX_VUELTAS; vuelta++) {
      await autorizarGasto(db, ESTIMADO_VUELTA_USD);
      const r = await conEstadoIA(db, () =>
        cliente.messages.create({
          model: modelo,
          max_tokens: 6000,
          thinking: { type: "adaptive" },
          system: [
            { type: "text", text: SISTEMA },
            { type: "text", text: contextoDelEncargo(material) },
          ],
          tools: HERRAMIENTAS,
          messages: conversacion,
        }),
      );
      const costo = costoTokensUsd(modelo, r.usage.input_tokens, r.usage.output_tokens);
      costoUsd += costo;
      await anotarGasto(db, "claude", `director: encargo ${encargoId}`, costo);
      for (const b of r.content) if (b.type === "text" && b.text.trim()) textos.push(b.text.trim());
      if (r.stop_reason === "refusal")
        throw new Error("La IA no quiso seguir con este pedido. Revisa lo que pediste.");
      // Cortada a la mitad: una herramienta con datos a medias no se ejecuta.
      if (r.stop_reason !== "tool_use") break;
      conversacion.push({ role: "assistant", content: r.content });
      const resultados: Anthropic.ToolResultBlockParam[] = [];
      for (const b of r.content) {
        if (b.type !== "tool_use") continue;
        const res = await ejecutarHerramienta(db, encargoId, b, opciones.almacen);
        if (res.propuestaId) {
          propuestaId = res.propuestaId;
          // Lo que la IA ve en la vuelta siguiente ya incluye su tarjeta.
          material.propuestas = (await materialDelEncargo(db, encargo)).propuestas;
        }
        resultados.push(res.bloque);
      }
      conversacion.push({ role: "user", content: resultados });
    }
  } finally {
    if (costoUsd > 0)
      await db.ejecutar("UPDATE director_encargos SET costo_usd = costo_usd + ? WHERE id = ?", [
        costoUsd,
        encargoId,
      ]);
  }
  const texto =
    textos.join("\n\n") ||
    (propuestaId ? "Te dejé la propuesta en la tarjeta." : "Aquí estoy. ¿Qué video hacemos?");
  await anotarMensaje(db, encargoId, "director", texto, propuestaId);
  return { texto, propuestaId, costoUsd };
}
