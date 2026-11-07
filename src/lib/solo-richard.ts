// Las rutas del Podcast IA son solo para Richard: su sesión del panel y desde el propio panel. Ni la
// Estación ni la app de iPhone abren conversaciones (cada una gasta minutos de ElevenLabs).
import { cookies } from "next/headers";
import type { BaseDatos } from "./db";
import { COOKIE_SESION, sesionValida } from "./sesion";

/** Devuelve la respuesta de rechazo, o null si el pedido es de Richard. */
export async function soloRichard(req: Request, db: BaseDatos): Promise<Response | null> {
  const jar = await cookies();
  if (!(await sesionValida(db, jar.get(COOKIE_SESION)?.value)))
    return Response.json({ error: "Tu sesión se cerró. Entra otra vez al panel." }, { status: 401 });
  const origen = req.headers.get("origin");
  if (origen && origen !== new URL(req.url).origin)
    return Response.json({ error: "Petición de otro sitio." }, { status: 403 });
  return null;
}
