// Sirve un archivo del almacén a quien tenga sesión en el panel.
// Los videos se sirven por rangos (206) para que el reproductor pueda saltar,
// y con `?descargar=1` bajan como archivo.
import { cookies } from "next/headers";
import { contexto } from "@/lib/entorno";
import { cabecerasDeRango, rangoDesdeCabecera } from "@/lib/rango";
import { COOKIE_SESION, sesionValida } from "@/lib/sesion";

export const dynamic = "force-dynamic";

const RUTA_VALIDA =
  /^guiones\/\d+\/(voz|subtitulos|miniatura|imagen|clip|screen)-\d+\.[a-z0-9]+$|^guiones\/\d+\/video-(16x9|9x16)-\d+\.mp4$/;

export async function GET(req: Request, ctx: RouteContext<"/datos/archivos/[...clave]">) {
  const { db, bucket } = await contexto();
  const jar = await cookies();
  if (!(await sesionValida(db, jar.get(COOKIE_SESION)?.value)))
    return new Response("No autorizado.", { status: 401 });
  if (!bucket) return new Response("Sin almacén.", { status: 503 });

  const { clave } = await ctx.params;
  const ruta = clave.join("/");
  if (!RUTA_VALIDA.test(ruta)) return new Response("Ruta inválida.", { status: 400 });

  const cabeza = await bucket.head(ruta);
  if (!cabeza) return new Response("No existe.", { status: 404 });
  const tipo =
    cabeza.httpMetadata?.contentType ?? (ruta.endsWith(".mp4") ? "video/mp4" : "application/octet-stream");
  const rango = rangoDesdeCabecera(req.headers.get("range"), cabeza.size);
  if (req.headers.get("range") && !rango) {
    return new Response("Rango fuera del archivo.", {
      status: 416,
      headers: { "content-range": `bytes */${cabeza.size}` },
    });
  }

  const objeto = rango ? await bucket.get(ruta, { range: rango }) : await bucket.get(ruta);
  if (!objeto) return new Response("No existe.", { status: 404 });
  const { status, headers } = cabecerasDeRango(rango, cabeza.size, tipo);
  if (new URL(req.url).searchParams.get("descargar") === "1") {
    headers["content-disposition"] = `attachment; filename="${ruta.split("/").pop() ?? "archivo"}"`;
  }
  return new Response(objeto.body, { status, headers });
}
