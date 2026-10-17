// La Estación sube el anuncio terminado (un MP4 de 30 a 45 s, unos 10 a 30 MB) y queda listo en el panel.
import { contexto } from "@/lib/entorno";
import { estacionAutorizada, respuestaNoAutorizada } from "@/lib/estacion-auth";
import { marcarPublicidadLista, publicidadPorId } from "@/lib/publicidades";

export const dynamic = "force-dynamic";

const TOPE_BYTES = 90 * 1024 * 1024;

export async function PUT(req: Request, ctx: RouteContext<"/datos/estacion/publicidades/[id]/video">) {
  const { env, db, bucket } = await contexto();
  if (!estacionAutorizada(req.headers.get("authorization"), env.ESTACION_SECRETO))
    return respuestaNoAutorizada();
  if (!bucket) return Response.json({ error: "Sin almacén." }, { status: 503 });
  const id = Number((await ctx.params).id);
  const p = Number.isInteger(id) && id > 0 ? await publicidadPorId(db, id) : null;
  if (!p) return Response.json({ error: "Ese anuncio no existe." }, { status: 404 });
  const contenido = await req.arrayBuffer();
  if (contenido.byteLength < 1000 || contenido.byteLength > TOPE_BYTES)
    return Response.json({ error: "El video llegó vacío o demasiado grande." }, { status: 400 });
  const duracion = Number(new URL(req.url).searchParams.get("duracion") ?? "0") || 0;
  const clave = `publicidades/${id}/anuncio-${Date.now()}.mp4`;
  await bucket.put(clave, contenido, { httpMetadata: { contentType: "video/mp4" } });
  await marcarPublicidadLista(db, id, clave, duracion);
  return Response.json({ ok: true, clave, bytes: contenido.byteLength });
}
