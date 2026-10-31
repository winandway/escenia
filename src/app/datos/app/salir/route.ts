// Salir desde la app: la sesión muere en el servidor, no solo en el teléfono.
import { cerrarSesionApp, sesionDeLaApp } from "@/lib/app-sesion";
import { contexto } from "@/lib/entorno";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { db } = await contexto();
  const s = await sesionDeLaApp(db, req.headers.get("authorization"));
  if (s) await cerrarSesionApp(db, s.token);
  return Response.json({ ok: true });
}
