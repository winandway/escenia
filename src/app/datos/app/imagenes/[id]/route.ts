// Una foto de la biblioteca para la tarjeta de la app (C-DIRECTOR-4): la persona que presenta, el logo y
// las fotos del producto, para verlos antes de aprobar. La cuenta del revisor solo ve las de sus
// proyectos y las de Maggie; la de Richard, todas.
import { carpetaDeEncargoDemo, CARPETA_MAGGIE, sesionObligatoria } from "@/lib/app-sesion";
import { contexto } from "@/lib/entorno";
import { imagenPorId } from "@/lib/imagenes";

export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: RouteContext<"/datos/app/imagenes/[id]">) {
  const { db, bucket } = await contexto();
  const s = await sesionObligatoria(req, db);
  if (s instanceof Response) return s;
  if (!bucket) return new Response("Sin almacén.", { status: 503 });
  const fila = await imagenPorId(db, Number((await ctx.params).id));
  if (!fila || fila.tipo !== "imagen") return new Response("No existe.", { status: 404 });
  if (s.tipo === "demo" && fila.carpeta !== CARPETA_MAGGIE && !(await carpetaDeEncargoDemo(db, fila.carpeta)))
    return new Response("No existe.", { status: 404 });
  const objeto = await bucket.get(fila.clave);
  if (!objeto) return new Response("No existe.", { status: 404 });
  return new Response(objeto.body, {
    headers: {
      "content-type": objeto.httpMetadata?.contentType ?? "image/jpeg",
      "cache-control": "private, max-age=86400",
    },
  });
}
