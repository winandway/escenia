// Deja escuchar un sonido de la biblioteca a quien tenga sesión en el panel
// (por rangos, para que el reproductor del navegador pueda saltar).
import { cookies } from "next/headers";
import { contexto } from "@/lib/entorno";
import { cabecerasDeRango, rangoDesdeCabecera } from "@/lib/rango";
import { COOKIE_SESION, sesionValida } from "@/lib/sesion";
import { sonidoPorId } from "@/lib/sonidos";

export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: RouteContext<"/datos/sonidos/[id]">) {
  const { db, bucket } = await contexto();
  const jar = await cookies();
  if (!(await sesionValida(db, jar.get(COOKIE_SESION)?.value)))
    return new Response("No autorizado.", { status: 401 });
  if (!bucket) return new Response("Sin almacén.", { status: 503 });
  const id = Number((await ctx.params).id);
  const sonido = Number.isInteger(id) && id > 0 ? await sonidoPorId(db, id) : null;
  if (!sonido) return new Response("No existe.", { status: 404 });

  const cabeza = await bucket.head(sonido.clave);
  if (!cabeza) return new Response("No existe.", { status: 404 });
  const tipo = cabeza.httpMetadata?.contentType ?? "audio/mpeg";
  const rango = rangoDesdeCabecera(req.headers.get("range"), cabeza.size);
  const objeto = rango ? await bucket.get(sonido.clave, { range: rango }) : await bucket.get(sonido.clave);
  if (!objeto) return new Response("No existe.", { status: 404 });
  const { status, headers } = cabecerasDeRango(rango, cabeza.size, tipo);
  return new Response(objeto.body, { status, headers });
}
