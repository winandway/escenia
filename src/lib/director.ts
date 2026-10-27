// El Director (docs/DIRECTOR.md): los encargos, la conversación y las propuestas. La IA conversa,
// mira las fotos y PROPONE el anuncio como una tarjeta con su precio; solo el botón de Richard la
// vuelve un pedido para la Mac (C-DIRECTOR-1). Ninguna herramienta de la IA gasta ni aprueba.
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { asegurarModelo, costoTokensUsd, MODELOS_PERMITIDOS } from "@compartido/modelos";
import { costoEstimadoPublicidadUsd, esquemaPublicidadNueva } from "@compartido/publicidad";
import type { BaseDatos } from "./db";
import {
  contextoDelEncargo,
  dinero,
  HERRAMIENTAS,
  historialParaLaIA,
  SISTEMA,
  type MaterialDelDirector,
} from "./director-prompt";
import { conEstadoIA } from "./ia-estado";
import { carpetasDeImagenes, imagenesActivas, imagenPorId } from "./imagenes";
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
  datos: string; // JSON: el pedido del anuncio
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

export const datosDePropuesta = (p: Pick<FilaPropuesta, "datos">) =>
  esquemaPublicidadNueva.parse(JSON.parse(p.datos) as unknown);

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

/**
 * Lo que propone la IA, revisado como si lo hubiera llenado Richard en el formulario de Publicidad.
 * Si algo no cuadra, el error vuelve a la IA en palabras para que lo corrija (no se guarda nada).
 */
export async function guardarPropuesta(
  db: BaseDatos,
  encargoId: number,
  entrada: unknown,
): Promise<{ ok: true; id: number; precioUsd: number } | { ok: false; error: string }> {
  const parseo = esquemaPublicidadNueva.safeParse(entrada);
  if (!parseo.success) return { ok: false, error: parseo.error.issues[0]?.message ?? "Revisa los datos." };
  const d = parseo.data;
  const imagenes = await imagenesActivas(db);
  const falta = d.carpetas.find((c) => !imagenes.some((i) => i.carpeta === c && i.tipo === "imagen"));
  if (falta)
    return {
      ok: false,
      error: `La carpeta «${falta}» no existe o no tiene fotos. Usa una de la lista, o pide que suban las fotos aquí en el chat.`,
    };
  if (
    d.avatar &&
    !imagenes.some((i) => i.nombre === d.avatar && i.tipo === "imagen" && d.carpetas.includes(i.carpeta))
  )
    return {
      ok: false,
      error: `La foto «${d.avatar}» no está en las carpetas elegidas: usa el nombre exacto de la lista, o déjalo vacío.`,
    };
  const precioUsd = costoEstimadoPublicidadUsd(d.narracion, Boolean(d.avatar));
  await db.ejecutar(
    "UPDATE director_propuestas SET estado = 'reemplazada', actualizado_en = datetime('now') WHERE encargo_id = ? AND estado = 'propuesta'",
    [encargoId],
  );
  const r = await db.ejecutar(
    "INSERT INTO director_propuestas (encargo_id, datos, precio_usd) VALUES (?, ?, ?)",
    [encargoId, JSON.stringify(d), precioUsd],
  );
  if (!r.ultimoId) throw new Error("No se pudo guardar la propuesta.");
  await db.ejecutar("UPDATE director_encargos SET titulo = ? WHERE id = ?", [d.nombre, encargoId]);
  return { ok: true, id: r.ultimoId, precioUsd };
}

/**
 * El botón de Richard (C-DIRECTOR-1): la ÚNICA puerta por la que una propuesta se vuelve un video.
 * Un doble clic no pide dos videos, y una propuesta reemplazada ya no se puede aprobar.
 */
export async function aprobarPropuesta(
  db: BaseDatos,
  propuestaId: number,
): Promise<{ publicidadId: number; encargoId: number }> {
  const p = await db.uno<FilaPropuesta>("SELECT * FROM director_propuestas WHERE id = ?", [propuestaId]);
  if (!p) throw new Error("Esa propuesta no existe.");
  if (p.estado === "aprobada" && p.publicidad_id)
    return { publicidadId: p.publicidad_id, encargoId: p.encargo_id };
  if (p.estado !== "propuesta")
    throw new Error("Esa propuesta ya se cambió por una más nueva: aprueba la de abajo.");
  const tomada = await db.ejecutar(
    "UPDATE director_propuestas SET estado = 'aprobada', actualizado_en = datetime('now') WHERE id = ? AND estado = 'propuesta'",
    [propuestaId],
  );
  if (!tomada.cambios) {
    const otra = await db.uno<FilaPropuesta>("SELECT * FROM director_propuestas WHERE id = ?", [propuestaId]);
    if (otra?.publicidad_id) return { publicidadId: otra.publicidad_id, encargoId: p.encargo_id };
    throw new Error("Esa propuesta ya se está aprobando.");
  }
  try {
    const publicidadId = await crearPublicidad(db, datosDePropuesta(p));
    await db.ejecutar("UPDATE director_propuestas SET publicidad_id = ? WHERE id = ?", [
      publicidadId,
      propuestaId,
    ]);
    await anotarMensaje(
      db,
      p.encargo_id,
      "aviso",
      `Aprobaste la propuesta (unos ${dinero(p.precio_usd)}). La Mac la toma y la arma en unos minutos.`,
    );
    return { publicidadId, encargoId: p.encargo_id };
  } catch (e) {
    // Si el pedido no se pudo anotar, la tarjeta vuelve a quedar para aprobar (no se pierde el clic).
    await db.ejecutar(
      "UPDATE director_propuestas SET estado = 'propuesta' WHERE id = ? AND publicidad_id IS NULL",
      [propuestaId],
    );
    throw e;
  }
}

/** Las carpetas (las más recientes primero), sus fotos, y cómo van las propuestas del encargo. */
export async function materialDelEncargo(db: BaseDatos, encargo: FilaEncargo): Promise<MaterialDelDirector> {
  const [carpetas, imagenes, propuestas] = await Promise.all([
    carpetasDeImagenes(db),
    imagenesActivas(db),
    propuestasDelEncargo(db, encargo.id),
  ]);
  const anuncios = await Promise.all(
    propuestas.map((p) =>
      p.publicidad_id
        ? db.uno<{ estado: string; paso: string; error: string; duracion_seg: number }>(
            "SELECT estado, paso, error, duracion_seg FROM publicidades WHERE id = ?",
            [p.publicidad_id],
          )
        : Promise.resolve(null),
    ),
  );
  return {
    carpetaDelEncargo: encargo.carpeta,
    carpetas: carpetas.map((c) => ({
      carpeta: c.carpeta,
      imagenes: imagenes
        .filter((i) => i.carpeta === c.carpeta)
        .map((i) => ({ id: i.id, nombre: i.nombre, tipo: i.tipo })),
    })),
    propuestas: propuestas.map((p, k) => {
      const a = anuncios[k];
      return {
        id: p.id,
        estado: p.estado,
        precioUsd: p.precio_usd,
        datos: datosDePropuesta(p),
        anuncio: a ? { estado: a.estado, paso: a.paso, error: a.error, duracionSeg: a.duracion_seg } : null,
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

async function verImagen(
  db: BaseDatos,
  uso: Anthropic.ToolUseBlock,
  almacen: AlmacenDeLectura | null,
): Promise<Resultado> {
  const parseo = z.object({ id: z.coerce.number().int().positive() }).safeParse(uso.input);
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

async function ejecutarHerramienta(
  db: BaseDatos,
  encargoId: number,
  uso: Anthropic.ToolUseBlock,
  almacen: AlmacenDeLectura | null,
): Promise<Resultado> {
  if (uso.name === "ver_imagen") return verImagen(db, uso, almacen);
  if (uso.name === "proponer_anuncio") {
    const r = await guardarPropuesta(db, encargoId, uso.input);
    if (!r.ok) return fallo(uso.id, r.error);
    return {
      propuestaId: r.id,
      bloque: {
        type: "tool_result",
        tool_use_id: uso.id,
        content: `Listo: la propuesta ${r.id} ya sale en la tarjeta, con el precio (${dinero(r.precioUsd)}) y el botón para aprobarla.`,
      },
    };
  }
  return fallo(uso.id, `No existe la herramienta «${uso.name}».`);
}

/** Lo que cuesta una vuelta de la IA, con margen: se pregunta al tope de hoy ANTES de cada una. */
const ESTIMADO_VUELTA_USD = 0.06;
/** Mirar fotos y proponer cabe en pocas vueltas; más sería la IA dando vueltas en círculo. */
export const MAX_VUELTAS = 6;

export type OpcionesDirector = {
  modelo: string;
  apiKey: string;
  almacen: AlmacenDeLectura | null;
  fetch?: typeof fetch;
};

/**
 * Responde al último mensaje de Richard: la IA conversa, mira fotos y, si ya tiene el anuncio, lo
 * deja como tarjeta. Cada vuelta pregunta al tope de gasto antes de salir y anota lo que costó.
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
          max_tokens: 4000,
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
    (propuestaId ? "Te dejé la propuesta en la tarjeta." : "Aquí estoy. ¿Qué anuncio hacemos?");
  await anotarMensaje(db, encargoId, "director", texto, propuestaId);
  return { texto, propuestaId, costoUsd };
}
