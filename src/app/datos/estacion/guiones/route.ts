// Crea un tema y genera su guion desde fuera del panel (la Estación o el
// radar), con el secreto. El guion queda en borrador: Richard lo aprueba en el panel.
import { contexto } from "@/lib/entorno";
import { crearGuionDesdeTema, esquemaNuevoTema } from "@/lib/crear-guion";
import { estacionAutorizada, respuestaNoAutorizada } from "@/lib/estacion-auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { env, db } = await contexto();
  if (!estacionAutorizada(req.headers.get("authorization"), env.ESTACION_SECRETO))
    return respuestaNoAutorizada();
  const parseo = esquemaNuevoTema.safeParse(await req.json().catch(() => null));
  if (!parseo.success)
    return Response.json({ error: parseo.error.issues[0]?.message ?? "Cuerpo inválido." }, { status: 400 });
  const r = await crearGuionDesdeTema(db, env.ANTHROPIC_API_KEY, parseo.data);
  if (!r.ok) return Response.json({ error: r.error }, { status: 422 });
  return Response.json({ ok: true, guion_id: r.guionId, url: `/guiones/${r.guionId}` });
}
