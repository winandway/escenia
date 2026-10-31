// Un encargo entero para la pantalla del chat de la app: mensajes, tarjetas y cómo va cada video.
import { encargoParaLaApp } from "@/lib/app-encargo";
import { puedeVerEncargo, sesionObligatoria } from "@/lib/app-sesion";
import { encargoPorId } from "@/lib/director";
import { contexto } from "@/lib/entorno";
import { encargoAjeno } from "@/lib/permiso-subida";

export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: RouteContext<"/datos/app/encargos/[id]">) {
  const { db } = await contexto();
  const s = await sesionObligatoria(req, db);
  if (s instanceof Response) return s;
  const id = Number((await ctx.params).id);
  const encargo = Number.isInteger(id) && id > 0 ? await encargoPorId(db, id) : null;
  if (!encargo || encargo.estado !== "abierto" || !(await puedeVerEncargo(db, s, id))) return encargoAjeno();
  return Response.json(await encargoParaLaApp(db, encargo));
}
