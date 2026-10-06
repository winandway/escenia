// Richard sube una imagen (o un PDF) a una carpeta de la biblioteca. Cada archivo viaja
// en su propia petición (el navegador las manda una detrás de otra); los datos van en
// la dirección. También acepta el secreto de la Estación (para subir desde la Mac).
import { contexto } from "@/lib/entorno";
import { guardarImagen } from "@/lib/imagenes";
import { puedeSubir } from "@/lib/permiso-subida";
import { esquemaImagenNueva, MAX_BYTES_IMAGEN } from "@compartido/imagenes";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { env, db, bucket } = await contexto();
  const permiso = await puedeSubir(req, db, env.ESTACION_SECRETO);
  if (!permiso.ok) return permiso.respuesta;
  if (!bucket) return Response.json({ error: "El almacén no está disponible." }, { status: 503 });
  const parseo = esquemaImagenNueva.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!parseo.success)
    return Response.json({ error: parseo.error.issues[0]?.message ?? "Revisa los datos." }, { status: 400 });
  const megas = MAX_BYTES_IMAGEN / 1_048_576;
  if (Number(req.headers.get("content-length") ?? "0") > MAX_BYTES_IMAGEN)
    return Response.json({ error: `«${parseo.data.nombre}» pasa de ${megas} MB.` }, { status: 413 });
  const contenido = await req.arrayBuffer();
  if (contenido.byteLength < 100)
    return Response.json({ error: `«${parseo.data.nombre}» llegó vacío.` }, { status: 400 });
  if (contenido.byteLength > MAX_BYTES_IMAGEN)
    return Response.json({ error: `«${parseo.data.nombre}» pasa de ${megas} MB.` }, { status: 413 });
  try {
    const r = await guardarImagen(db, bucket, parseo.data, contenido);
    return Response.json({ ok: true, id: r.id });
  } catch (e) {
    console.error("[imagenes]", e);
    return Response.json({ error: "No se pudo guardar la imagen. Inténtalo otra vez." }, { status: 500 });
  }
}
