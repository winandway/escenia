// Sirve un archivo del almacén a quien tenga sesión en el panel.
import { cookies } from "next/headers";
import { contexto } from "@/lib/entorno";
import { COOKIE_SESION, sesionValida } from "@/lib/sesion";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: RouteContext<"/datos/archivos/[...clave]">) {
  const { db, bucket } = await contexto();
  const jar = await cookies();
  if (!(await sesionValida(db, jar.get(COOKIE_SESION)?.value)))
    return new Response("No autorizado.", { status: 401 });
  if (!bucket) return new Response("Sin almacén.", { status: 503 });

  const { clave } = await ctx.params;
  const ruta = clave.join("/");
  if (!/^guiones\/\d+\/[a-z]+-\d+\.[a-z0-9]+$/.test(ruta))
    return new Response("Ruta inválida.", { status: 400 });

  const objeto = await bucket.get(ruta);
  if (!objeto) return new Response("No existe.", { status: 404 });
  return new Response(objeto.body, {
    headers: {
      "content-type": objeto.httpMetadata?.contentType ?? "application/octet-stream",
      "cache-control": "private, max-age=3600",
    },
  });
}
