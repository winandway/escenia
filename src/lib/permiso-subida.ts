// Quién puede subir una grabación: Richard desde el panel (su sesión, y solo desde
// el propio panel), la Estación con su secreto (para subir un archivo que ya está en la Mac)
// o la app de iPhone con su token (C-APP-IOS-1). Con la app, `app` dice qué cuenta es: la del
// revisor de Apple («demo») solo puede tocar sus propios encargos (lo comprueba cada ruta).
import { cookies } from "next/headers";
import { sesionDeLaApp, tokenDeLaApp, type SesionApp } from "./app-sesion";
import type { BaseDatos } from "./db";
import { estacionAutorizada } from "./estacion-auth";
import { COOKIE_SESION, sesionValida } from "./sesion";

export type PermisoDeSubida = { ok: true; app?: SesionApp } | { ok: false; respuesta: Response };

export async function puedeSubir(
  req: Request,
  db: BaseDatos,
  secretoEstacion: string,
  opciones: { cuentaDemo?: boolean } = {},
): Promise<PermisoDeSubida> {
  const cabecera = req.headers.get("authorization");
  if (estacionAutorizada(cabecera, secretoEstacion)) return { ok: true };
  if (tokenDeLaApp(cabecera)) {
    const app = await sesionDeLaApp(db, cabecera);
    // La cuenta del revisor solo entra donde la ruta lo permite (el chat del Director y sus fotos).
    if (app?.tipo === "demo" && !opciones.cuentaDemo)
      return {
        ok: false,
        respuesta: Response.json({ error: "The demo account can't do this." }, { status: 403 }),
      };
    return app
      ? { ok: true, app }
      : {
          ok: false,
          respuesta: Response.json({ error: "Your session ended. Sign in again." }, { status: 401 }),
        };
  }
  const jar = await cookies();
  if (!(await sesionValida(db, jar.get(COOKIE_SESION)?.value)))
    return {
      ok: false,
      respuesta: Response.json(
        { error: "Tu sesión se cerró. Entra otra vez y vuelve a subir el video." },
        { status: 401 },
      ),
    };
  // Solo desde el propio panel: otra página no puede subir cosas con la sesión de Richard.
  const origen = req.headers.get("origin");
  if (origen && origen !== new URL(req.url).origin)
    return { ok: false, respuesta: Response.json({ error: "Petición de otro sitio." }, { status: 403 }) };
  return { ok: true };
}

/** La cuenta del revisor solo toca sus encargos: para todo lo demás, como si no existiera. */
export const encargoAjeno = () =>
  Response.json({ error: "Ese encargo no existe o está archivado." }, { status: 404 });
