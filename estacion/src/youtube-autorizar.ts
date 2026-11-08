// Fase 3 (docs/YOUTUBE.md, C-YOUTUBE-2): el permiso de la Mac para subir a YouTube, SIN que nadie
// corra un comando. Richard deja en Descargas el JSON del cliente OAuth («App de escritorio») que bajó
// de Google Cloud; la Estación lo ve sola (cada 10 minutos), lo guarda en ~/.config/motor-escenia/
// (carpeta 700, archivo 600, fuera de git), abre el navegador en la Mac y espera a que Richard toque
// «Permitir». La llave larga queda en ~/.config/motor-escenia/youtube.json y no se vuelve a pedir.
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { chmod, copyFile, mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import os from "node:os";
import path from "node:path";
import { esquemaLlave, PERMISOS_YOUTUBE, RUTA_LLAVE } from "./youtube";

export const CARPETA_LLAVES = path.dirname(RUTA_LLAVE);
export const RUTA_CLIENTE = path.join(CARPETA_LLAVES, "youtube-cliente.json");
const PUERTO = 53682;

/** De la lista de Descargas, el archivo del cliente OAuth de Google (el más nuevo si hay varios). */
export function clienteOAuthDe(archivos: { nombre: string; modificado: number }[]): string | null {
  const candidatos = archivos
    .filter((a) => /^client_secret[\w.-]*\.json$/i.test(a.nombre))
    .sort((a, b) => b.modificado - a.modificado);
  return candidatos[0]?.nombre ?? null;
}

/** El id y el secreto del cliente, o null si el archivo no es un cliente OAuth de Google. */
export function leerClienteOAuth(texto: string): { client_id: string; client_secret: string } | null {
  try {
    const crudo = JSON.parse(texto) as Record<string, { client_id?: unknown; client_secret?: unknown }>;
    const c = crudo.installed ?? crudo.web;
    const r = esquemaLlave.omit({ refresh_token: true }).safeParse(c);
    return r.success ? r.data : null;
  } catch {
    return null;
  }
}

/** ¿Ya hay permiso largo guardado? Entonces no se pide nada. */
export async function yaAutorizada(ruta = RUTA_LLAVE): Promise<boolean> {
  try {
    return Boolean(esquemaLlave.parse(JSON.parse(await readFile(ruta, "utf8"))).refresh_token);
  } catch {
    return false;
  }
}

/** Abre el navegador, espera el «Permitir» (hasta `esperaMs`) y guarda la llave larga. */
export async function autorizarYouTube(archivo: string, esperaMs = 6 * 3_600_000): Promise<void> {
  const cliente = leerClienteOAuth(await readFile(archivo, "utf8"));
  if (!cliente) throw new Error("Ese archivo no es un cliente OAuth de Google (App de escritorio).");
  await mkdir(CARPETA_LLAVES, { recursive: true, mode: 0o700 });
  // La clave se guarda una sola vez y para siempre (regla global): aunque se borre de Descargas.
  if (path.resolve(archivo) !== RUTA_CLIENTE) {
    await copyFile(archivo, RUTA_CLIENTE);
    await chmod(RUTA_CLIENTE, 0o600);
  }
  const redirect = `http://127.0.0.1:${PUERTO}`;
  const estado = crypto.randomUUID();
  const url = `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({
    client_id: cliente.client_id,
    redirect_uri: redirect,
    response_type: "code",
    scope: PERMISOS_YOUTUBE.join(" "),
    access_type: "offline",
    prompt: "consent",
    state: estado,
  })}`;
  const codigo = await new Promise<string>((resolver, fallar) => {
    const servidor = createServer((req, res) => {
      const q = new URL(req.url ?? "/", redirect).searchParams;
      if (!q.get("state")) {
        res.writeHead(404).end();
        return;
      }
      const ok = q.get("state") === estado && q.get("code");
      res.writeHead(ok ? 200 : 400, { "content-type": "text/html; charset=utf-8" });
      res.end(ok ? "<h1>Listo. Ya puedes cerrar esta pestaña.</h1>" : "<h1>No se recibió el permiso.</h1>");
      clearTimeout(reloj);
      servidor.close();
      if (ok) resolver(q.get("code") ?? "");
      else fallar(new Error(q.get("error") ?? "Google no devolvió el permiso."));
    });
    const reloj = setTimeout(() => {
      servidor.close();
      fallar(new Error("Nadie tocó «Permitir» a tiempo: se vuelve a pedir en una hora."));
    }, esperaMs);
    servidor.on("error", fallar);
    servidor.listen(PUERTO, "127.0.0.1", () => {
      console.log("YouTube: se abre el navegador de la Mac; elige la cuenta del canal y toca «Permitir».");
      execFile("open", [url]);
    });
  });
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code: codigo,
      client_id: cliente.client_id,
      client_secret: cliente.client_secret,
      redirect_uri: redirect,
      grant_type: "authorization_code",
    }),
  });
  const datos = (await r.json()) as { refresh_token?: string; error?: string };
  if (!r.ok || !datos.refresh_token) throw new Error(`Google no dio la llave: ${datos.error ?? r.status}`);
  const llave = esquemaLlave.parse({ ...cliente, refresh_token: datos.refresh_token });
  await writeFile(RUTA_LLAVE, JSON.stringify(llave, null, 1), { mode: 0o600 });
  await chmod(RUTA_LLAVE, 0o600);
  console.log("YouTube: llave guardada en la Mac. Los videos ya pueden subir solos en privado.");
}

/** Busca el cliente: primero el ya guardado en la Mac; si no, el más nuevo de Descargas. */
export async function buscarClienteGuardadoODescargado(): Promise<string | null> {
  if (existsSync(RUTA_CLIENTE)) return RUTA_CLIENTE;
  const descargas = path.join(os.homedir(), "Downloads");
  const nombres = await readdir(descargas);
  const conFecha = await Promise.all(
    nombres
      .filter((n) => n.toLowerCase().startsWith("client_secret"))
      .map(async (nombre) => ({ nombre, modificado: (await stat(path.join(descargas, nombre))).mtimeMs })),
  );
  const elegido = clienteOAuthDe(conFecha);
  return elegido ? path.join(descargas, elegido) : null;
}

let pidiendo = false;
let ultimoIntento = 0;

/** La Estación mira cada 10 minutos; con la llave ya puesta, no hace nada (ni lee Descargas). */
export function vigilarClienteYouTube(cadaMs = 600_000): void {
  const mirar = async () => {
    if (pidiendo || (await yaAutorizada())) return;
    if (Date.now() - ultimoIntento < 3_600_000) return;
    const archivo = await buscarClienteGuardadoODescargado().catch((e: unknown) => {
      console.warn(`YouTube: no se pudo mirar Descargas (${e instanceof Error ? e.message : e}).`);
      return null;
    });
    if (!archivo) return;
    pidiendo = true;
    ultimoIntento = Date.now();
    await autorizarYouTube(archivo)
      .catch((e: unknown) => console.warn(`YouTube: ${e instanceof Error ? e.message : e}`))
      .finally(() => {
        pidiendo = false;
      });
  };
  void mirar();
  setInterval(() => void mirar(), cadaMs).unref();
}
