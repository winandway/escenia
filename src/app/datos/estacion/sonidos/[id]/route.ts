// La Estación baja un sonido de la biblioteca (con el secreto).
import { contexto } from "@/lib/entorno";
import { estacionAutorizada, respuestaNoAutorizada } from "@/lib/estacion-auth";
import { sonidoPorId } from "@/lib/sonidos";

export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: RouteContext<"/datos/estacion/sonidos/[id]">) {
  const { env, db, bucket } = await contexto();
  if (!estacionAutorizada(req.headers.get("authorization"), env.ESTACION_SECRETO))
    return respuestaNoAutorizada();
  if (!bucket) return Response.json({ error: "El almacén no está disponible." }, { status: 503 });
  const id = Number((await ctx.params).id);
  const sonido = Number.isInteger(id) && id > 0 ? await sonidoPorId(db, id) : null;
  if (!sonido) return Response.json({ error: "Ese sonido no existe." }, { status: 404 });
  const objeto = await bucket.get(sonido.clave);
  if (!objeto) return Response.json({ error: "El archivo no está en el almacén." }, { status: 404 });
  return new Response(objeto.body, {
    headers: {
      "content-type": objeto.httpMetadata?.contentType ?? "application/octet-stream",
      "content-length": String(objeto.size),
    },
  });
}
