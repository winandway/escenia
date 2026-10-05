// Quién puede subir una grabación: Richard desde el panel (su sesión, y solo desde
// el propio panel) o la Estación con su secreto (para subir un archivo que ya está en la Mac).
import { cookies } from "next/headers";
import type { BaseDatos } from "./db";
import { estacionAutorizada } from "./estacion-auth";
import { COOKIE_SESION, sesionValida } from "./sesion";

export async function puedeSubir(
  req: Request,
  db: BaseDatos,
  secretoEstacion: string,
): Promise<{ ok: true } | { ok: false; respuesta: Response }> {
  if (estacionAutorizada(req.headers.get("authorization"), secretoEstacion)) return { ok: true };
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
