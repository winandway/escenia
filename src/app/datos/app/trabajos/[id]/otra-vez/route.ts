// «Intentar otra vez» desde la app: el video que falló vuelve a la fila de la Mac (lo ya pagado no se
// paga dos veces). Solo la cuenta de Richard: en la demostración no hay videos que armar.
import { sesionObligatoria } from "@/lib/app-sesion";
import { otraVezTrabajo, trabajoDelDirector } from "@/lib/director-videos";
import { contexto } from "@/lib/entorno";
import { encargoAjeno } from "@/lib/permiso-subida";

export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: RouteContext<"/datos/app/trabajos/[id]/otra-vez">) {
  const { db } = await contexto();
  const s = await sesionObligatoria(req, db);
  if (s instanceof Response) return s;
  if (s.tipo === "demo") return encargoAjeno();
  const t = await trabajoDelDirector(db, Number((await ctx.params).id));
  if (!t) return encargoAjeno();
  await otraVezTrabajo(db, t.id);
  return Response.json({ ok: true });
}
