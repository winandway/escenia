// Subida de un video del chat del Director por partes: paso 3, cerrar. Desde aquí la Mac ya lo puede mirar.
import { z } from "zod";
import { marcarVideoSubido, videoDelDirector } from "@/lib/director-videos";
import { contexto } from "@/lib/entorno";
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

export async function POST(req: Request, ctx: RouteContext<"/datos/director/[id]/videos/terminar">) {
  const { env, db, bucket } = await contexto();
  const permiso = await puedeSubir(req, db, env.ESTACION_SECRETO);
  if (!permiso.ok) return permiso.respuesta;
  if (!bucket) return Response.json({ error: "El almacén no está disponible." }, { status: 503 });
  const parseo = esquema.safeParse(await req.json().catch(() => null));
  if (!parseo.success) return Response.json({ error: "Cuerpo inválido." }, { status: 400 });
  const d = parseo.data;
  const video = await videoDelDirector(db, d.id);
  if (!video || video.encargo_id !== Number((await ctx.params).id) || video.estado !== "subiendo")
    return Response.json(
      { error: "Esa subida ya no está abierta. Vuelve a subir el video." },
      { status: 409 },
    );
  let objeto: R2Object;
  try {
    objeto = await bucket.resumeMultipartUpload(video.clave, d.uploadId).complete(d.partes);
  } catch (e) {
    console.error("[director] no se pudo cerrar la subida", e);
    return Response.json({ error: "No se pudo cerrar la subida. Vuelve a subir el video." }, { status: 500 });
  }
  await marcarVideoSubido(db, d.id, objeto.size);
  return Response.json({ ok: true, id: d.id, bytes: objeto.size });
}
