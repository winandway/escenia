// Subida de una grabación por partes: paso 2, un trozo (8 MB; el último puede ser menor).
import { z } from "zod";
import { contexto } from "@/lib/entorno";
import { grabacionPorId } from "@/lib/grabaciones";
import { puedeSubir } from "@/lib/permiso-subida";

export const dynamic = "force-dynamic";

const MAX_PARTE = 10 * 1024 * 1024;

const esquema = z.object({
  id: z.coerce.number().int().positive(),
  uploadId: z.string().min(1).max(500),
  n: z.coerce.number().int().min(1).max(10000),
});

export async function PUT(req: Request) {
  const { env, db, bucket } = await contexto();
  const permiso = await puedeSubir(req, db, env.ESTACION_SECRETO);
  if (!permiso.ok) return permiso.respuesta;
  if (!bucket) return Response.json({ error: "El almacén no está disponible." }, { status: 503 });
  const parseo = esquema.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!parseo.success) return Response.json({ error: "Parámetros inválidos." }, { status: 400 });
  const d = parseo.data;
  // La dirección en el almacén sale de la base, nunca de lo que mande el navegador.
  const grabacion = await grabacionPorId(db, d.id);
  if (!grabacion || grabacion.estado !== "subiendo")
    return Response.json({ error: "Esa subida ya no está abierta. Empieza de nuevo." }, { status: 409 });
  const contenido = await req.arrayBuffer();
  if (contenido.byteLength === 0 || contenido.byteLength > MAX_PARTE)
    return Response.json({ error: "Ese trozo llegó vacío o demasiado grande." }, { status: 413 });
  const subida = bucket.resumeMultipartUpload(grabacion.clave, d.uploadId);
  const parte = await subida.uploadPart(d.n, contenido);
  return Response.json({ ok: true, partNumber: parte.partNumber, etag: parte.etag });
}
