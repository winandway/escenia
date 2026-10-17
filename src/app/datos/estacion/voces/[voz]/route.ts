// El banco de voces: la Estación sube la muestra de cada voz (voces/<voz>.mp3) para que en el panel
// se pueda oír antes de elegirla.
import { contexto } from "@/lib/entorno";
import { estacionAutorizada, respuestaNoAutorizada } from "@/lib/estacion-auth";
import { VOCES } from "@compartido/guion";

export const dynamic = "force-dynamic";

export async function PUT(req: Request, ctx: RouteContext<"/datos/estacion/voces/[voz]">) {
  const { env, bucket } = await contexto();
  if (!estacionAutorizada(req.headers.get("authorization"), env.ESTACION_SECRETO))
    return respuestaNoAutorizada();
  if (!bucket) return Response.json({ error: "Sin almacén." }, { status: 503 });
  const { voz } = await ctx.params;
  if (!(VOCES as readonly string[]).includes(voz))
    return Response.json({ error: "Esa voz no existe." }, { status: 404 });
  const contenido = await req.arrayBuffer();
  if (contenido.byteLength < 1000 || contenido.byteLength > 5 * 1024 * 1024)
    return Response.json({ error: "La muestra llegó vacía o demasiado grande." }, { status: 400 });
  await bucket.put(`voces/${voz}.mp3`, contenido, { httpMetadata: { contentType: "audio/mpeg" } });
  return Response.json({ ok: true });
}
