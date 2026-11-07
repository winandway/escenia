// Cierra una conversación del Podcast IA: el panel cuenta los segundos con SU reloj (desde que la abrió,
// sin pasar de 10 minutos) y anota el costo. Un segundo cierre no cobra otra vez.
import { contexto } from "@/lib/entorno";
import { cerrarConversacion } from "@/lib/podcast";
import { soloRichard } from "@/lib/solo-richard";

export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: RouteContext<"/datos/podcast/conversaciones/[id]/fin">) {
  const { db } = await contexto();
  const rechazo = await soloRichard(req, db);
  if (rechazo) return rechazo;
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id) || id < 1)
    return Response.json({ error: "Esa conversación no existe." }, { status: 404 });
  const cierre = await cerrarConversacion(db, id);
  return Response.json({ ok: true, segundos: cierre?.segundos ?? null, yaCerrada: cierre === null });
}
