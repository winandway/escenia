// Fase 3 (docs/YOUTUBE.md): UNA sola vez, se le da permiso a la Mac para subir a los canales.
// 1) Richard crea en Google Cloud un cliente OAuth tipo «App de escritorio» y descarga su JSON.
// 2) Se corre esto con ese archivo: abre el navegador, Richard elige la cuenta del canal y acepta.
// 3) La llave queda en ~/.config/motor-escenia/youtube.json (carpeta 700, archivo 600), fuera de git.
//
// Uso (desde la raíz):
//   estacion/node_modules/.bin/tsx scripts/autorizar-youtube.ts ~/Downloads/client_secret_XXXX.json
import { execFile } from "node:child_process";
import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { esquemaLlave, PERMISOS_YOUTUBE, RUTA_LLAVE } from "../estacion/src/youtube";

async function principal() {
  const archivo = process.argv[2];
  if (!archivo) throw new Error("Pasa el JSON del cliente OAuth que descargaste de Google Cloud.");
  const crudo = JSON.parse(await readFile(archivo, "utf8")) as {
    installed?: { client_id: string; client_secret: string };
    web?: { client_id: string; client_secret: string };
  };
  const cliente = crudo.installed ?? crudo.web;
  if (!cliente) throw new Error("Ese archivo no es un cliente OAuth de Google.");

  const PUERTO = 53682;
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
      const ok = q.get("state") === estado && q.get("code");
      res.writeHead(ok ? 200 : 400, { "content-type": "text/html; charset=utf-8" });
      res.end(ok ? "<h1>Listo. Ya puedes cerrar esta pestaña.</h1>" : "<h1>No se recibió el permiso.</h1>");
      servidor.close();
      if (ok) resolver(q.get("code") ?? "");
      else fallar(new Error(q.get("error") ?? "Google no devolvió el permiso."));
    });
    servidor.listen(PUERTO, "127.0.0.1", () => {
      console.log("Se abre el navegador: elige la cuenta del canal y acepta.");
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
  await mkdir(path.dirname(RUTA_LLAVE), { recursive: true, mode: 0o700 });
  await writeFile(RUTA_LLAVE, JSON.stringify(llave, null, 1), { mode: 0o600 });
  await chmod(RUTA_LLAVE, 0o600);
  console.log("Llave de YouTube guardada en la Mac. Ya se puede subir con scripts/subir-youtube.ts.");
}

principal().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
