// Una captura de un caso de ayuda (C-AYUDA-2), solo con su enlace firmado y vigente (?v=<vence>&f=<firma>).
// Se sirve como imagen y nada más: sin scripts, sin dejar la dirección a otros sitios, sin caché pública.
import { adjuntoPorId, enlaceValido } from "@/lib/ayuda-adjuntos";
import { contexto } from "@/lib/entorno";

export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: RouteContext<"/datos/ayuda/adjuntos/[id]">) {
  const { env, db, bucket } = await contexto();
  const id = Number((await ctx.params).id);
  const p = new URL(req.url).searchParams;
  const valido = await enlaceValido(env.ESTACION_SECRETO, id, Number(p.get("v")), p.get("f") ?? "");
  if (!valido) return Response.json({ error: "This link isn't valid or has expired." }, { status: 403 });
  const a = await adjuntoPorId(db, id);
  const objeto = a && bucket ? await bucket.get(a.clave) : null;
  if (!a || !objeto) return Response.json({ error: "This image doesn't exist." }, { status: 404 });
  return new Response(objeto.body, {
    headers: {
      "content-type": a.tipo,
      "content-disposition": `inline; filename="${a.nombre.replace(/"/g, "")}"`,
      "cache-control": "private, max-age=86400",
      "x-content-type-options": "nosniff",
      "content-security-policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'",
      "referrer-policy": "no-referrer",
    },
  });
}
