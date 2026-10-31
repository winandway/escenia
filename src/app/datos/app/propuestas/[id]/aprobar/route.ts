// El botón «Aprobar» de la app (C-DIRECTOR-1): la única forma de que una tarjeta se vuelva un video.
// En la cuenta del revisor de Apple no se gasta nada: la tarjeta queda aprobada y la app muestra un
// video de ejemplo (C-APP-IOS-1).
import { aprobarEnDemo, puedeVerEncargo, sesionObligatoria } from "@/lib/app-sesion";
import { aprobarPropuesta } from "@/lib/director";
import { contexto } from "@/lib/entorno";
import { encargoAjeno } from "@/lib/permiso-subida";

export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: RouteContext<"/datos/app/propuestas/[id]/aprobar">) {
  const { db } = await contexto();
  const s = await sesionObligatoria(req, db);
  if (s instanceof Response) return s;
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id) || id <= 0) return encargoAjeno();
  const p = await db.uno<{ encargo_id: number }>("SELECT encargo_id FROM director_propuestas WHERE id = ?", [
    id,
  ]);
  if (!p || !(await puedeVerEncargo(db, s, p.encargo_id))) return encargoAjeno();
  try {
    const r = s.tipo === "demo" ? await aprobarEnDemo(db, id) : await aprobarPropuesta(db, id);
    return Response.json({ ok: true, encargoId: r.encargoId });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "No se pudo aprobar. Inténtalo otra vez." },
      { status: 409 },
    );
  }
}
