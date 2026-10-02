// Richard sube un sonido (música o efecto) desde el panel. El archivo viaja como
// cuerpo de la petición y sus datos en la dirección; se guarda en el almacén.
import { cookies } from "next/headers";
import { contexto } from "@/lib/entorno";
import { COOKIE_SESION, sesionValida } from "@/lib/sesion";
import { guardarSonido } from "@/lib/sonidos";
import { esquemaSonidoNuevo, MAX_BYTES_SONIDO } from "@compartido/sonidos";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { db, bucket } = await contexto();
  const jar = await cookies();
  if (!(await sesionValida(db, jar.get(COOKIE_SESION)?.value)))
    return Response.json(
      { error: "Tu sesión se cerró. Entra otra vez y vuelve a subirlo." },
      { status: 401 },
    );
  // Solo desde el propio panel: otra página no puede subir cosas con la sesión de Richard.
  const origen = req.headers.get("origin");
  if (origen && origen !== new URL(req.url).origin)
    return Response.json({ error: "Petición de otro sitio." }, { status: 403 });
  if (!bucket) return Response.json({ error: "El almacén no está disponible." }, { status: 503 });

  const parseo = esquemaSonidoNuevo.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!parseo.success)
    return Response.json({ error: parseo.error.issues[0]?.message ?? "Revisa los datos." }, { status: 400 });

  const megas = MAX_BYTES_SONIDO / 1_048_576;
  if (Number(req.headers.get("content-length") ?? "0") > MAX_BYTES_SONIDO)
    return Response.json({ error: `El archivo pasa de ${megas} MB.` }, { status: 413 });
  const contenido = await req.arrayBuffer();
  if (contenido.byteLength < 1000)
    return Response.json({ error: "El archivo llegó vacío. Vuelve a elegirlo." }, { status: 400 });
  if (contenido.byteLength > MAX_BYTES_SONIDO)
    return Response.json({ error: `El archivo pasa de ${megas} MB.` }, { status: 413 });

  try {
    const r = await guardarSonido(db, bucket, parseo.data, contenido);
    return Response.json({ ok: true, id: r.id });
  } catch (e) {
    console.error("[sonidos]", e);
    return Response.json({ error: "No se pudo guardar el sonido. Inténtalo otra vez." }, { status: 500 });
  }
}
