// Subida de un video del chat del Director por partes: paso 2, un trozo (8 MB; el último puede ser menor).
import { z } from "zod";
import { videoDelDirector } from "@/lib/director-videos";
import { contexto } from "@/lib/entorno";
import { puedeSubir } from "@/lib/permiso-subida";

export const dynamic = "force-dynamic";

const MAX_PARTE = 10 * 1024 * 1024;

const esquema = z.object({
  id: z.coerce.number().int().positive(),
  uploadId: z.string().min(1).max(500),
  n: z.coerce.number().int().min(1).max(10000),
});

export async function PUT(req: Request, ctx: RouteContext<"/datos/director/[id]/videos/parte">) {
  const { env, db, bucket } = await contexto();
  const permiso = await puedeSubir(req, db, env.ESTACION_SECRETO);
  if (!permiso.ok) return permiso.respuesta;
  if (!bucket) return Response.json({ error: "El almacén no está disponible." }, { status: 503 });
  const parseo = esquema.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!parseo.success) return Response.json({ error: "Parámetros inválidos." }, { status: 400 });
  const d = parseo.data;
  // La dirección en el almacén sale de la base, nunca de lo que mande el navegador.
  const video = await videoDelDirector(db, d.id);
  if (!video || video.encargo_id !== Number((await ctx.params).id) || video.estado !== "subiendo")
    return Response.json(
      { error: "Esa subida ya no está abierta. Vuelve a subir el video." },
      { status: 409 },
    );
  const contenido = await req.arrayBuffer();
  if (contenido.byteLength === 0 || contenido.byteLength > MAX_PARTE)
    return Response.json({ error: "Ese trozo llegó vacío o demasiado grande." }, { status: 413 });
  const parte = await bucket.resumeMultipartUpload(video.clave, d.uploadId).uploadPart(d.n, contenido);
  return Response.json({ ok: true, partNumber: parte.partNumber, etag: parte.etag });
}
