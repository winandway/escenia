// Subida de una grabación por partes: paso 3, cerrar. Desde aquí la Estación ya puede tomarla.
import { z } from "zod";
import { contexto } from "@/lib/entorno";
import { grabacionPorId, marcarSubida } from "@/lib/grabaciones";
import { puedeSubir } from "@/lib/permiso-subida";

export const dynamic = "force-dynamic";

const esquema = z.object({
  id: z.number().int().positive(),
  uploadId: z.string().min(1).max(500),
  partes: z
    .array(z.object({ partNumber: z.number().int().min(1), etag: z.string().min(1) }))
    .min(1)
    .max(10000),
});

export async function POST(req: Request) {
  const { env, db, bucket } = await contexto();
  const permiso = await puedeSubir(req, db, env.ESTACION_SECRETO);
  if (!permiso.ok) return permiso.respuesta;
  if (!bucket) return Response.json({ error: "El almacén no está disponible." }, { status: 503 });
  const parseo = esquema.safeParse(await req.json().catch(() => null));
  if (!parseo.success) return Response.json({ error: "Cuerpo inválido." }, { status: 400 });
  const d = parseo.data;
  const grabacion = await grabacionPorId(db, d.id);
  if (!grabacion || grabacion.estado !== "subiendo")
    return Response.json({ error: "Esa subida ya no está abierta. Empieza de nuevo." }, { status: 409 });
  let objeto: R2Object;
  try {
    objeto = await bucket.resumeMultipartUpload(grabacion.clave, d.uploadId).complete(d.partes);
  } catch (e) {
    console.error("[grabaciones] no se pudo cerrar la subida", e);
    return Response.json({ error: "No se pudo cerrar la subida. Vuelve a subir el video." }, { status: 500 });
  }
  await marcarSubida(db, d.id, objeto.size);
  return Response.json({ ok: true, id: d.id, bytes: objeto.size });
}
