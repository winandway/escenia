// «Archivar» desde la app: sale de la lista; la conversación y sus videos se guardan.
import { puedeVerEncargo, sesionObligatoria } from "@/lib/app-sesion";
import { archivarEncargo, encargoPorId } from "@/lib/director";
import { contexto } from "@/lib/entorno";
import { encargoAjeno } from "@/lib/permiso-subida";

export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: RouteContext<"/datos/app/encargos/[id]/archivar">) {
  const { db } = await contexto();
  const s = await sesionObligatoria(req, db);
  if (s instanceof Response) return s;
  const id = Number((await ctx.params).id);
  const encargo = Number.isInteger(id) && id > 0 ? await encargoPorId(db, id) : null;
  if (!encargo || !(await puedeVerEncargo(db, s, id))) return encargoAjeno();
  await archivarEncargo(db, id);
  return Response.json({ ok: true });
}
