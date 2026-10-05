// La Estación baja una grabación a la Mac, por rangos (un video pesa cientos de megas:
// si se corta, sigue desde donde iba en vez de empezar otra vez).
import { contexto } from "@/lib/entorno";
import { estacionAutorizada, respuestaNoAutorizada } from "@/lib/estacion-auth";
import { tocarLatido } from "@/lib/estacion-estado";
import { grabacionPorId } from "@/lib/grabaciones";
import { cabecerasDeRango, rangoDesdeCabecera } from "@/lib/rango";

export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: RouteContext<"/datos/estacion/grabaciones/[id]/archivo">) {
  const { env, db, bucket } = await contexto();
  if (!estacionAutorizada(req.headers.get("authorization"), env.ESTACION_SECRETO))
    return respuestaNoAutorizada();
  if (!bucket) return Response.json({ error: "El almacén no está disponible." }, { status: 503 });
  const id = Number((await ctx.params).id);
  const grabacion = Number.isInteger(id) && id > 0 ? await grabacionPorId(db, id) : null;
  if (!grabacion || grabacion.estado === "subiendo")
    return Response.json({ error: "Esa grabación no existe o no terminó de subir." }, { status: 404 });
  const cabeza = await bucket.head(grabacion.clave);
  if (!cabeza) return Response.json({ error: "El archivo no está en el almacén." }, { status: 404 });
  const rango = rangoDesdeCabecera(req.headers.get("range"), cabeza.size);
  if (req.headers.get("range") && !rango)
    return new Response("Rango fuera del archivo.", {
      status: 416,
      headers: { "content-range": `bytes */${cabeza.size}` },
    });
  const objeto = rango
    ? await bucket.get(grabacion.clave, { range: rango })
    : await bucket.get(grabacion.clave);
  if (!objeto) return Response.json({ error: "El archivo no está en el almacén." }, { status: 404 });
  await tocarLatido(db);
  const { status, headers } = cabecerasDeRango(
    rango,
    cabeza.size,
    cabeza.httpMetadata?.contentType ?? "video/mp4",
  );
  return new Response(objeto.body, { status, headers: { ...headers, "cache-control": "no-store" } });
}
