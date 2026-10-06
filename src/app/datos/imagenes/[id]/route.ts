// Muestra una imagen de la biblioteca a quien tenga sesión en el panel.
import { cookies } from "next/headers";
import { contexto } from "@/lib/entorno";
import { imagenPorId } from "@/lib/imagenes";
import { COOKIE_SESION, sesionValida } from "@/lib/sesion";

export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: RouteContext<"/datos/imagenes/[id]">) {
  const { db, bucket } = await contexto();
  const jar = await cookies();
  if (!(await sesionValida(db, jar.get(COOKIE_SESION)?.value)))
    return new Response("No autorizado.", { status: 401 });
  if (!bucket) return new Response("Sin almacén.", { status: 503 });
  const id = Number((await ctx.params).id);
  const imagen = Number.isInteger(id) && id > 0 ? await imagenPorId(db, id) : null;
  if (!imagen) return new Response("No existe.", { status: 404 });
  const objeto = await bucket.get(imagen.clave);
  if (!objeto) return new Response("No existe.", { status: 404 });
  return new Response(objeto.body, {
    headers: {
      "content-type": objeto.httpMetadata?.contentType ?? "application/octet-stream",
      "content-length": String(objeto.size),
      "cache-control": "private, max-age=3600",
    },
  });
}
