// Los casos de ayuda (docs/AYUDA.md, C-AYUDA-1) y la puerta del gerente de correo de Richard (C-GERENTE-1).
// La persona escribe sin cuenta desde la página de soporte o desde la app y sigue su caso como un chat con
// su enlace secreto. El gerente lee los casos abiertos y los contesta con un secreto propio: la respuesta
// queda en el chat, la Mac avisa al iPhone que abrió el caso y sale un correo si Escenia tiene dominio.
import { CORREO_SOPORTE } from "@/app/legal/textos";
import { b64url, igualesSinFiltrarTiempo, sha256Hex } from "./clave";
import { latidoEstacion } from "./consultas";
import type { BaseDatos } from "./db";
import { estacionViva } from "./estacion-estado";

export type IdiomaCaso = "en" | "es";
export type EstadoCaso = "abierto" | "respondido" | "cerrado";
type Autor = "cliente" | "soporte";

export const SITIO_PUBLICO = "https://escenia.sitios.dev";
/** Huella SHA-256 del secreto del gerente (se carga desde la Mac; el secreto vive en ~/.config). */
export const AJUSTE_HUELLA_GERENTE = "gerente_huella";
/** El dominio conectado al sitio desde el que salen los correos (sin él no hay correo, y se dice). */
export const AJUSTE_CORREO_DOMINIO = "correo_dominio";
/** El token del sitio para la API de correo de YaDominios, si no está en las variables del panel. */
export const AJUSTE_CORREO_TOKEN = "correo_token";
/** El último fallo de correo (para el canario); se borra con el primer envío bueno. */
export const AJUSTE_CORREO_ERROR = "correo_ultimo_error";

/** El número que ve la persona y con el que firma el gerente: «ESC-1001». */
export const numeroDeCaso = (id: number) => `ESC-${1000 + id}`;
export const codigoValido = (c: string) => /^[A-Za-z0-9_-]{40,60}$/.test(c);
export const enlaceDelCaso = (codigo: string, idioma: IdiomaCaso) =>
  `${SITIO_PUBLICO}${idioma === "es" ? "/es" : ""}/support/case/${codigo}`;
const iso = (f: string) => `${f.replace(" ", "T")}Z`;

/** ¿Esta llave todavía tiene pedidos en la ventana? Si sí, anota uno. */
export async function pasaLimite(
  db: BaseDatos,
  llave: string,
  maximo: number,
  ventanaSeg: number,
): Promise<boolean> {
  const fila = await db.uno<{ n: number }>(
    "SELECT COUNT(*) AS n FROM limites WHERE llave = ? AND creado_en > datetime('now', ?)",
    [llave, `-${ventanaSeg} seconds`],
  );
  if ((fila?.n ?? 0) >= maximo) return false;
  await db.ejecutar("INSERT INTO limites (llave) VALUES (?)", [llave]);
  await db.ejecutar("DELETE FROM limites WHERE creado_en < datetime('now', '-1 day')");
  return true;
}

// ——— Lo que hace la persona ———

export type CasoNuevo = {
  origen: "web" | "app";
  nombre: string;
  correo: string;
  idioma: IdiomaCaso;
  asunto: string;
  mensaje: string;
  avisoToken?: string;
};

export async function crearCaso(
  db: BaseDatos,
  d: CasoNuevo,
): Promise<{ id: number; codigo: string; numero: string }> {
  const codigo = b64url(crypto.getRandomValues(new Uint8Array(32)));
  const r = await db.ejecutar(
    `INSERT INTO ayuda_casos (codigo, origen, nombre, correo, idioma, asunto, aviso_token)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [codigo, d.origen, d.nombre, d.correo.toLowerCase(), d.idioma, d.asunto, d.avisoToken ?? ""],
  );
  const id = Number(r.ultimoId);
  await db.ejecutar("INSERT INTO ayuda_mensajes (caso_id, de, texto) VALUES (?, 'cliente', ?)", [
    id,
    d.mensaje,
  ]);
  return { id, codigo, numero: numeroDeCaso(id) };
}

type FilaCaso = {
  id: number;
  codigo: string;
  nombre: string;
  correo: string;
  idioma: IdiomaCaso;
  asunto: string;
  estado: EstadoCaso;
  aviso_token: string;
  creado_en: string;
  actualizado_en: string;
};
type FilaMensaje = { caso_id: number; de: Autor; texto: string; creado_en: string };

async function mensajesDe(db: BaseDatos, ids: number[]): Promise<FilaMensaje[]> {
  if (!ids.length) return [];
  return db.todos<FilaMensaje>(
    `SELECT caso_id, de, texto, creado_en FROM ayuda_mensajes
      WHERE caso_id IN (SELECT value FROM json_each(?)) ORDER BY id`,
    [JSON.stringify(ids)],
  );
}

const mensajesPublicos = (todos: FilaMensaje[], id: number) =>
  todos.filter((m) => m.caso_id === id).map((m) => ({ de: m.de, texto: m.texto, fecha: iso(m.creado_en) }));

/** El chat de un caso, para la persona que tiene el enlace. Sin su correo: el enlace se puede reenviar. */
export async function casoPorCodigo(db: BaseDatos, codigo: string) {
  if (!codigoValido(codigo)) return null;
  const c = await db.uno<FilaCaso>("SELECT * FROM ayuda_casos WHERE codigo = ?", [codigo]);
  if (!c) return null;
  return {
    numero: numeroDeCaso(c.id),
    nombre: c.nombre,
    idioma: c.idioma,
    asunto: c.asunto,
    estado: c.estado,
    creado: iso(c.creado_en),
    mensajes: mensajesPublicos(await mensajesDe(db, [c.id]), c.id),
  };
}

/** «Mis casos»: los casos cuyos enlaces guardó este teléfono o este navegador (no hay cuentas). */
export async function casosPorCodigos(db: BaseDatos, codigos: string[]) {
  const validos = [...new Set(codigos.filter(codigoValido))].slice(0, 30);
  if (!validos.length) return [];
  const casos = await db.todos<FilaCaso>(
    `SELECT * FROM ayuda_casos WHERE codigo IN (SELECT value FROM json_each(?)) ORDER BY actualizado_en DESC`,
    [JSON.stringify(validos)],
  );
  const mensajes = await mensajesDe(
    db,
    casos.map((c) => c.id),
  );
  return casos.map((c) => {
    const ultimo = mensajes.filter((m) => m.caso_id === c.id).at(-1);
    return {
      codigo: c.codigo,
      numero: numeroDeCaso(c.id),
      asunto: c.asunto,
      estado: c.estado,
      actualizado: iso(c.actualizado_en),
      ultimo: ultimo ? { de: ultimo.de, texto: ultimo.texto.slice(0, 140) } : null,
    };
  });
}

/** La persona escribe otra vez en su caso: vuelve a quedar abierto para el gerente. */
export async function escribirComoCliente(
  db: BaseDatos,
  codigo: string,
  texto: string,
  avisoToken?: string,
): Promise<boolean> {
  if (!codigoValido(codigo)) return false;
  const c = await db.uno<{ id: number }>("SELECT id FROM ayuda_casos WHERE codigo = ?", [codigo]);
  if (!c) return false;
  await db.ejecutar("INSERT INTO ayuda_mensajes (caso_id, de, texto) VALUES (?, 'cliente', ?)", [
    c.id,
    texto,
  ]);
  await db.ejecutar(
    `UPDATE ayuda_casos SET estado = 'abierto', actualizado_en = datetime('now'),
       aviso_token = CASE WHEN ? = '' THEN aviso_token ELSE ? END
     WHERE id = ?`,
    [avisoToken ?? "", avisoToken ?? "", c.id],
  );
  return true;
}

// ——— La puerta del gerente (C-GERENTE-1) ———

/**
 * ¿La cabecera trae el secreto del gerente? Vale el de la variable GERENTE_SECRETO del panel o, si no
 * está, la huella guardada en la base. Se comparan huellas del mismo largo, sin cortar en la primera
 * diferencia. Sin ninguna de las dos, la puerta no existe para nadie.
 */
export async function secretoDelGerenteValido(
  db: BaseDatos,
  cabecera: string | null,
  secretoDelPanel: string | undefined,
): Promise<boolean> {
  if (!cabecera?.startsWith("Bearer ")) return false;
  const recibido = cabecera.slice(7).trim();
  if (recibido.length < 32 || recibido.length > 200) return false;
  const esperada = secretoDelPanel
    ? await sha256Hex(secretoDelPanel)
    : (await db.uno<{ valor: string }>("SELECT valor FROM ajustes WHERE clave = ?", [AJUSTE_HUELLA_GERENTE]))
        ?.valor;
  if (!esperada) return false;
  const enc = new TextEncoder();
  return igualesSinFiltrarTiempo(enc.encode(await sha256Hex(recibido)), enc.encode(esperada));
}

/** Los casos para el gerente: sin correo, pagos ni direcciones. Solo nombre, idioma, asunto y el chat. */
export async function ticketsParaElGerente(db: BaseDatos, todos: boolean) {
  const casos = await db.todos<FilaCaso>(
    `SELECT * FROM ayuda_casos ${todos ? "" : "WHERE estado = 'abierto'"} ORDER BY actualizado_en DESC LIMIT 100`,
  );
  const mensajes = await mensajesDe(
    db,
    casos.map((c) => c.id),
  );
  return casos.map((c) => ({
    id: String(c.id),
    numero: numeroDeCaso(c.id),
    app: "escenia",
    cliente_nombre: c.nombre,
    idioma: c.idioma,
    asunto: c.asunto,
    estado: c.estado,
    creado: iso(c.creado_en),
    mensajes: mensajesPublicos(mensajes, c.id),
  }));
}

export type ResultadoRespuesta = {
  ok: true;
  numero: string;
  plantilla: string | null;
  aviso: "ok" | "error" | "sin_app";
  correo: "ok" | "error";
  correo_motivo?: string;
};

/**
 * El gerente contesta: el mensaje queda como «soporte», el caso pasa a respondido (o cerrado), el iPhone
 * que lo abrió recibe el aviso por la Mac y sale el correo. Nada falla en silencio: si la Mac está apagada
 * el aviso queda en cola y se dice «error»; si el correo no sale, se dice y queda para el canario.
 */
export async function responderComoSoporte(
  db: BaseDatos,
  id: number,
  d: { texto: string; plantilla?: string; cerrar: boolean },
  correo: { token: string | undefined; enviar?: typeof fetch },
): Promise<ResultadoRespuesta | null> {
  const c = await db.uno<FilaCaso>("SELECT * FROM ayuda_casos WHERE id = ?", [id]);
  if (!c) return null;
  const conIphone = c.aviso_token !== "";
  await db.ejecutar(
    "INSERT INTO ayuda_mensajes (caso_id, de, texto, plantilla, aviso) VALUES (?, 'soporte', ?, ?, ?)",
    [c.id, d.texto, d.plantilla ?? "", conIphone ? "pendiente" : ""],
  );
  await db.ejecutar("UPDATE ayuda_casos SET estado = ?, actualizado_en = datetime('now') WHERE id = ?", [
    d.cerrar ? "cerrado" : "respondido",
    c.id,
  ]);
  const numero = numeroDeCaso(c.id);
  const aviso = !conIphone ? "sin_app" : estacionViva(await latidoEstacion(db)) ? "ok" : "error";
  const en = c.idioma === "en";
  const envio = await enviarCorreoDeAyuda(db, correo, {
    para: c.correo,
    asunto: en ? `We replied to your case ${numero}` : `Te respondimos tu caso ${numero}`,
    texto: [
      en ? `Hi ${c.nombre},` : `Hola, ${c.nombre}:`,
      "",
      d.texto,
      "",
      en ? `Your case ${numero}. See it and reply here:` : `Tu caso ${numero}. Míralo y responde aquí:`,
      enlaceDelCaso(c.codigo, c.idioma),
      "",
      en ? "Escenia Support" : "Soporte de Escenia",
    ].join("\n"),
  });
  return {
    ok: true,
    numero,
    plantilla: d.plantilla ?? null,
    aviso,
    correo: envio.ok ? "ok" : "error",
    ...(envio.ok ? {} : { correo_motivo: envio.motivo }),
  };
}

// ——— El correo (API de YaDominios Cloud, docs/CONTRATO-YADOMINIOS.md) ———

const API_CORREO = "https://yapanel.yadominios.com/api/hosting/correo/enviar";

async function ajuste(db: BaseDatos, clave: string): Promise<string> {
  return (await db.uno<{ valor: string }>("SELECT valor FROM ajustes WHERE clave = ?", [clave]))?.valor ?? "";
}

async function guardarAjuste(db: BaseDatos, clave: string, valor: string) {
  await db.ejecutar(
    "INSERT INTO ajustes (clave, valor) VALUES (?, ?) ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor",
    [clave, valor],
  );
}

/**
 * Manda un correo de soporte desde el dominio conectado al sitio. La plataforma solo acepta remitentes de
 * un dominio conectado: sin él, no se intenta y se devuelve el motivo. Las respuestas a ese correo van al
 * buzón de soporte de Windoce.
 */
export async function enviarCorreoDeAyuda(
  db: BaseDatos,
  correo: { token: string | undefined; enviar?: typeof fetch },
  m: { para: string; asunto: string; texto: string },
): Promise<{ ok: true } | { ok: false; motivo: string }> {
  const dominio = await ajuste(db, AJUSTE_CORREO_DOMINIO);
  const token = correo.token || (await ajuste(db, AJUSTE_CORREO_TOKEN));
  let motivo = "";
  if (!dominio) motivo = "Escenia todavía no tiene un dominio conectado para mandar correos.";
  else if (!token) motivo = "Falta el token del sitio para mandar correos.";
  else {
    try {
      const r = await (correo.enviar ?? fetch)(API_CORREO, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sitio: "escenia",
          token,
          from: { address: `support@${dominio}`, name: "Escenia Support" },
          to: [{ address: m.para }],
          reply_to: CORREO_SOPORTE,
          subject: m.asunto,
          text: m.texto,
        }),
        signal: AbortSignal.timeout(10_000),
      });
      const j = (await r.json().catch(() => null)) as {
        success?: boolean;
        error?: string;
        rebotados?: string[];
      } | null;
      if (!r.ok || !j?.success) motivo = j?.error ?? `El servicio de correo respondió ${r.status}.`;
      else if (j.rebotados?.length) motivo = `La dirección no existe: ${j.rebotados.join(", ")}`;
    } catch (e) {
      motivo = `No se pudo hablar con el servicio de correo: ${e instanceof Error ? e.message : String(e)}`;
    }
  }
  if (motivo) {
    // Sin dominio no es un fallo nuevo (el canario lo muestra apagado); lo demás queda en rojo.
    if (dominio) await guardarAjuste(db, AJUSTE_CORREO_ERROR, `${new Date().toISOString()} ${motivo}`);
    return { ok: false, motivo };
  }
  await db.ejecutar("DELETE FROM ajustes WHERE clave = ?", [AJUSTE_CORREO_ERROR]);
  return { ok: true };
}

/** El correo en el canario: apagado sin dominio, error si el último envío falló, ok si no. */
export async function estadoDelCorreo(
  db: BaseDatos,
): Promise<{ estado: "ok" | "error" | "apagado"; motivo: string }> {
  if (!(await ajuste(db, AJUSTE_CORREO_DOMINIO))) return { estado: "apagado", motivo: "" };
  const error = await ajuste(db, AJUSTE_CORREO_ERROR);
  return error ? { estado: "error", motivo: `Correo de soporte: ${error}` } : { estado: "ok", motivo: "" };
}

// ——— Los avisos al iPhone, que manda la Mac (la llave de Apple nunca sube a la nube) ———

export async function avisosDeAyudaPendientes(db: BaseDatos) {
  const filas = await db.todos<{
    id: number;
    texto: string;
    caso_id: number;
    codigo: string;
    idioma: IdiomaCaso;
    aviso_token: string;
  }>(
    `SELECT m.id, m.texto, m.caso_id, c.codigo, c.idioma, c.aviso_token
       FROM ayuda_mensajes m JOIN ayuda_casos c ON c.id = m.caso_id
      WHERE m.aviso = 'pendiente' ORDER BY m.id LIMIT 20`,
  );
  return filas.map((f) => ({
    mensajeId: f.id,
    token: f.aviso_token,
    idioma: f.idioma,
    numero: numeroDeCaso(f.caso_id),
    codigo: f.codigo,
    texto: f.texto.slice(0, 140),
  }));
}

/** La Mac cuenta cómo le fue con Apple. Si la dirección ya no sirve, el caso se queda sin iPhone. */
export async function marcarAvisoDeAyuda(
  db: BaseDatos,
  mensajeId: number,
  resultado: "enviado" | "fallo",
  direccionMuerta: boolean,
): Promise<void> {
  await db.ejecutar("UPDATE ayuda_mensajes SET aviso = ? WHERE id = ? AND aviso = 'pendiente'", [
    resultado,
    mensajeId,
  ]);
  if (direccionMuerta)
    await db.ejecutar(
      "UPDATE ayuda_casos SET aviso_token = '' WHERE id = (SELECT caso_id FROM ayuda_mensajes WHERE id = ?)",
      [mensajeId],
    );
  // Si la dirección murió, los demás avisos pendientes de ese caso tampoco van a llegar.
  if (direccionMuerta)
    await db.ejecutar(
      `UPDATE ayuda_mensajes SET aviso = 'fallo'
        WHERE aviso = 'pendiente' AND caso_id = (SELECT caso_id FROM ayuda_mensajes WHERE id = ?)`,
      [mensajeId],
    );
}

/** Avisos que llevan más de 10 minutos sin salir (con la Mac encendida es un fallo: va al canario). */
export async function avisosDeAyudaAtascados(db: BaseDatos): Promise<number> {
  const f = await db.uno<{ n: number }>(
    "SELECT COUNT(*) AS n FROM ayuda_mensajes WHERE aviso = 'pendiente' AND creado_en < datetime('now', '-10 minutes')",
  );
  return f?.n ?? 0;
}
