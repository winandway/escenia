// La Estación baja una imagen de la biblioteca (con el secreto).
import { contexto } from "@/lib/entorno";
import { estacionAutorizada, respuestaNoAutorizada } from "@/lib/estacion-auth";
import { imagenPorId } from "@/lib/imagenes";

export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: RouteContext<"/datos/estacion/imagenes/[id]">) {
  const { env, db, bucket } = await contexto();
  if (!estacionAutorizada(req.headers.get("authorization"), env.ESTACION_SECRETO))
    return respuestaNoAutorizada();
  if (!bucket) return Response.json({ error: "El almacén no está disponible." }, { status: 503 });
  const id = Number((await ctx.params).id);
  const imagen = Number.isInteger(id) && id > 0 ? await imagenPorId(db, id) : null;
  if (!imagen) return Response.json({ error: "Esa imagen no existe." }, { status: 404 });
  const objeto = await bucket.get(imagen.clave);
  if (!objeto) return Response.json({ error: "El archivo no está en el almacén." }, { status: 404 });
  return new Response(objeto.body, {
    headers: {
      "content-type": objeto.httpMetadata?.contentType ?? "application/octet-stream",
      "content-length": String(objeto.size),
    },
  });
}
