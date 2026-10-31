// La app de iPhone (docs/APP-IPHONE.md, C-APP-IOS-1). Entra con la contraseña del panel y recibe un
// token propio que viaja en «Authorization: Bearer» (una app no lleva cookies del panel). En la base
// solo queda la huella del token, igual que las sesiones del panel. La cuenta «demo» es la del
// revisor de Apple: solo ve sus propios encargos, tiene tope de mensajes y aprobar no gasta.
import type { BaseDatos } from "./db";
import { b64url, claveCorrecta, sha256Hex } from "./clave";
import { idiomaDeEscritura } from "./director-prompt";
import { aSqlite } from "./sesion";

export type TipoSesionApp = "richard" | "demo";
export type SesionApp = { tipo: TipoSesionApp; token: string };

export const DURACION_SESION_APP_DIAS = 90;
/** Mensajes al Director por día en la cuenta de demostración (cada uno cuesta unos centavos de IA). */
export const TOPE_MENSAJES_DEMO_DIA = 40;
/** Encargos abiertos a la vez en la cuenta de demostración. */
export const TOPE_ENCARGOS_DEMO = 15;
/** Dónde vive la huella de la contraseña del revisor (se carga desde la Mac, nunca en el repo). */
export const AJUSTE_HUELLA_DEMO = "app_demo_huella";
const PREFIJO = "esc_";
/** La carpeta de Imágenes con las fotos de Maggie, la presentadora de la casa (docs/APP-IPHONE.md). */
export const CARPETA_MAGGIE = "Maggie";

export async function crearSesionApp(db: BaseDatos, tipo: TipoSesionApp): Promise<string> {
  const token = PREFIJO + b64url(crypto.getRandomValues(new Uint8Array(32)));
  const expira = new Date(Date.now() + DURACION_SESION_APP_DIAS * 86_400_000);
  await db.ejecutar("INSERT INTO app_sesiones (id, tipo, expira_en) VALUES (?, ?, ?)", [
    await sha256Hex(token),
    tipo,
    aSqlite(expira),
  ]);
  return token;
}

/** El token de la cabecera, solo si tiene la forma de un token de la app (el secreto de la Estación no). */
export function tokenDeLaApp(cabecera: string | null): string | null {
  if (!cabecera?.startsWith(`Bearer ${PREFIJO}`)) return null;
  const token = cabecera.slice(7).trim();
  return token.length > 20 && token.length < 200 ? token : null;
}

export async function sesionDeLaApp(db: BaseDatos, cabecera: string | null): Promise<SesionApp | null> {
  const token = tokenDeLaApp(cabecera);
  if (!token) return null;
  const fila = await db.uno<{ tipo: TipoSesionApp }>(
    "SELECT tipo FROM app_sesiones WHERE id = ? AND expira_en > datetime('now')",
    [await sha256Hex(token)],
  );
  return fila ? { tipo: fila.tipo, token } : null;
}

export async function cerrarSesionApp(db: BaseDatos, token: string): Promise<void> {
  await db.ejecutar("DELETE FROM app_sesiones WHERE id = ?", [await sha256Hex(token)]);
  await db.ejecutar("DELETE FROM app_sesiones WHERE expira_en <= datetime('now')");
}

/** ¿Qué cuenta abre esta contraseña? La del panel (Richard) o la del revisor; ninguna si no es. */
export async function cuentaDeLaClave(
  db: BaseDatos,
  clave: string,
  huellaPanel: string | undefined,
): Promise<TipoSesionApp | null> {
  if (huellaPanel && (await claveCorrecta(clave, huellaPanel))) return "richard";
  const demo = await db.uno<{ valor: string }>("SELECT valor FROM ajustes WHERE clave = ?", [
    AJUSTE_HUELLA_DEMO,
  ]);
  if (demo?.valor && (await claveCorrecta(clave, demo.valor))) return "demo";
  return null;
}

// ——— Lo que ve cada cuenta ———

export const esEncargoDemo = async (db: BaseDatos, encargoId: number) =>
  (await db.uno<{ encargo_id: number }>("SELECT encargo_id FROM app_encargos_demo WHERE encargo_id = ?", [
    encargoId,
  ])) !== null;

/**
 * ¿Esta sesión puede tocar este encargo? Richard (panel, Estación o app) puede todos; el revisor solo los
 * suyos. Así el revisor de Apple nunca ve el material de un cliente.
 */
export async function puedeVerEncargo(
  db: BaseDatos,
  sesion: SesionApp | null | undefined,
  encargoId: number,
): Promise<boolean> {
  if (sesion?.tipo !== "demo") return true;
  return esEncargoDemo(db, encargoId);
}

/** Los encargos abiertos de cada cuenta, el más reciente primero. */
export function encargosDeLaCuenta(db: BaseDatos, tipo: TipoSesionApp) {
  const condicion =
    tipo === "demo"
      ? "id IN (SELECT encargo_id FROM app_encargos_demo)"
      : "id NOT IN (SELECT encargo_id FROM app_encargos_demo)";
  return db.todos<{
    id: number;
    titulo: string;
    carpeta: string;
    costo_usd: number;
    actualizado_en: string;
  }>(
    `SELECT id, titulo, carpeta, costo_usd, actualizado_en FROM director_encargos
     WHERE estado = 'abierto' AND ${condicion} ORDER BY actualizado_en DESC, id DESC LIMIT 60`,
  );
}

export const carpetaDeEncargoDemo = async (db: BaseDatos, carpeta: string) =>
  (await db.uno<{ id: number }>(
    "SELECT id FROM director_encargos WHERE carpeta = ? AND id IN (SELECT encargo_id FROM app_encargos_demo)",
    [carpeta],
  )) !== null;

export async function anotarEncargoDemo(db: BaseDatos, encargoId: number): Promise<void> {
  await db.ejecutar("INSERT OR IGNORE INTO app_encargos_demo (encargo_id) VALUES (?)", [encargoId]);
}

export async function encargosDemoAbiertos(db: BaseDatos): Promise<number> {
  const fila = await db.uno<{ n: number }>(
    `SELECT COUNT(*) AS n FROM director_encargos
     WHERE estado = 'abierto' AND id IN (SELECT encargo_id FROM app_encargos_demo)`,
  );
  return fila?.n ?? 0;
}

/** Mensajes que la cuenta de demostración le mandó hoy al Director. */
export async function mensajesDemoHoy(db: BaseDatos): Promise<number> {
  const fila = await db.uno<{ n: number }>(
    `SELECT COUNT(*) AS n FROM director_mensajes
     WHERE rol = 'richard' AND creado_en > datetime('now', '-1 day')
       AND encargo_id IN (SELECT encargo_id FROM app_encargos_demo)`,
  );
  return fila?.n ?? 0;
}

/**
 * Aprobar en la cuenta de demostración: la tarjeta queda aprobada y la app muestra un video de ejemplo
 * que trae consigo. No se anota ningún anuncio ni trabajo para la Mac: no se gasta nada.
 */
export const AVISO_DEMO = {
  en: "Demo account: approving here doesn't render a new video or charge anything. You'll see a finished sample video instead.",
  es: "Cuenta de demostración: aprobar aquí no arma un video nuevo ni cobra nada. Verás un video de ejemplo terminado.",
} as const;

export async function aprobarEnDemo(db: BaseDatos, propuestaId: number): Promise<{ encargoId: number }> {
  const p = await db.uno<{ encargo_id: number; estado: string }>(
    "SELECT encargo_id, estado FROM director_propuestas WHERE id = ?",
    [propuestaId],
  );
  if (!p || !(await esEncargoDemo(db, p.encargo_id))) throw new Error("Esa propuesta no existe.");
  if (p.estado === "reemplazada")
    throw new Error("Esa propuesta ya se cambió por una más nueva: aprueba la de abajo.");
  if (p.estado === "propuesta") {
    await db.ejecutar(
      "UPDATE director_propuestas SET estado = 'aprobada', actualizado_en = datetime('now') WHERE id = ? AND estado = 'propuesta'",
      [propuestaId],
    );
    await db.ejecutar("INSERT OR IGNORE INTO app_demo_resultados (propuesta_id) VALUES (?)", [propuestaId]);
    // El aviso va en el idioma de la conversación (el de lo último que escribió quien prueba).
    const ultimo = await db.uno<{ texto: string }>(
      "SELECT texto FROM director_mensajes WHERE encargo_id = ? AND rol = 'richard' ORDER BY id DESC LIMIT 1",
      [p.encargo_id],
    );
    await db.ejecutar(
      "INSERT INTO director_mensajes (encargo_id, rol, texto, propuesta_id) VALUES (?, 'aviso', ?, ?)",
      [
        p.encargo_id,
        idiomaDeEscritura(ultimo?.texto ?? "") === "en" ? AVISO_DEMO.en : AVISO_DEMO.es,
        propuestaId,
      ],
    );
  }
  return { encargoId: p.encargo_id };
}

export const esResultadoDemo = async (db: BaseDatos, propuestaId: number) =>
  (await db.uno<{ propuesta_id: number }>(
    "SELECT propuesta_id FROM app_demo_resultados WHERE propuesta_id = ?",
    [propuestaId],
  )) !== null;

/** Para las rutas de la app: la sesión, o la respuesta 401 que la app entiende («entra otra vez»). */
export async function sesionObligatoria(req: Request, db: BaseDatos): Promise<SesionApp | Response> {
  const s = await sesionDeLaApp(db, req.headers.get("authorization"));
  return (
    s ?? Response.json({ error: "Your session ended. Sign in again.", codigo: "sesion" }, { status: 401 })
  );
}

export const ipDelPedido = (req: Request) =>
  req.headers.get("cf-connecting-ip") ??
  req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
  "desconocida";

// ——— Los avisos al iPhone (C-APP-IOS-4) ———

/** La dirección de avisos de Apple de un iPhone: 64 caracteres hexadecimales (a veces más). */
export const esTokenDeAvisos = (t: string) => /^[0-9a-f]{64,200}$/i.test(t);

export async function guardarTokenDeAvisos(
  db: BaseDatos,
  token: string,
  cuenta: TipoSesionApp,
  idioma: "en" | "es",
): Promise<void> {
  await db.ejecutar(
    `INSERT INTO app_avisos (token, cuenta, idioma) VALUES (?, ?, ?)
     ON CONFLICT(token) DO UPDATE SET cuenta = excluded.cuenta, idioma = excluded.idioma, actualizado_en = datetime('now')`,
    [token.toLowerCase(), cuenta, idioma],
  );
}

export const borrarTokenDeAvisos = (db: BaseDatos, token: string) =>
  db.ejecutar("DELETE FROM app_avisos WHERE token = ?", [token.toLowerCase()]);

/** Los iPhone de la cuenta de Richard (la de demostración nunca recibe avisos: no hay videos de verdad). */
export const telefonosParaAvisar = (db: BaseDatos) =>
  db.todos<{ token: string; idioma: "en" | "es" }>(
    "SELECT token, idioma FROM app_avisos WHERE cuenta = 'richard' ORDER BY actualizado_en DESC LIMIT 20",
  );
