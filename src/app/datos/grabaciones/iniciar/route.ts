// Richard sube una grabación suya (formato Presentador), por partes: paso 1, iniciar.
// Un video pesa cientos de megas: no cabe en una sola petición, así que va en trozos de 8 MB.
import { contexto } from "@/lib/entorno";
import { claveDeGrabacion, crearGrabacion } from "@/lib/grabaciones";
import { puedeSubir } from "@/lib/permiso-subida";
import { esquemaGrabacionNueva, extensionDeVideo, TAMANO_PARTE } from "@compartido/grabaciones";

export const dynamic = "force-dynamic";

const TIPOS = {
  mp4: "video/mp4",
  m4v: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
  mkv: "video/x-matroska",
} as const;

export async function POST(req: Request) {
  const { env, db, bucket } = await contexto();
  const permiso = await puedeSubir(req, db, env.ESTACION_SECRETO);
  if (!permiso.ok) return permiso.respuesta;
  if (!bucket) return Response.json({ error: "El almacén no está disponible." }, { status: 503 });
  const parseo = esquemaGrabacionNueva.safeParse(await req.json().catch(() => null));
  if (!parseo.success)
    return Response.json({ error: parseo.error.issues[0]?.message ?? "Revisa los datos." }, { status: 400 });
  const d = parseo.data;
  const extension = extensionDeVideo(d.archivo);
  if (!extension)
    return Response.json(
      { error: "Ese archivo no es un video que sepamos leer. Súbelo en MP4 o MOV." },
      { status: 400 },
    );
  const clave = claveDeGrabacion(d.archivo);
  const subida = await bucket.createMultipartUpload(clave, {
    httpMetadata: { contentType: TIPOS[extension] },
  });
  const id = await crearGrabacion(db, d, clave);
  return Response.json({ ok: true, id, uploadId: subida.uploadId, parte: TAMANO_PARTE });
}
