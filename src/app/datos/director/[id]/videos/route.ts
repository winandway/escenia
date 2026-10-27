// Los videos del chat del Director (C-DIRECTOR-3). GET: cómo va cada uno (el chat pregunta hasta que
// la Mac lo termina de mirar). POST: empieza la subida por partes (paso 1 de 3, como las grabaciones).
import { z } from "zod";
import { encargoPorId } from "@/lib/director";
import {
  claveDeVideoDelEncargo,
  crearVideoDelEncargo,
  extensionDeVideoDirector,
  tipoDeVideo,
  videosDelEncargo,
} from "@/lib/director-videos";
import { contexto } from "@/lib/entorno";
import { puedeSubir } from "@/lib/permiso-subida";
import { MAX_BYTES_VIDEO_DIRECTOR } from "@compartido/director";
import { TAMANO_PARTE } from "@compartido/grabaciones";

export const dynamic = "force-dynamic";

const esquema = z.object({
  archivo: z.string().trim().min(1).max(200),
  bytes: z
    .number()
    .int()
    .min(50_000, "El archivo llegó vacío o es demasiado chico para ser un video.")
    .max(MAX_BYTES_VIDEO_DIRECTOR, "El video pasa de 2 GB: grábalo en 1080p o recórtalo."),
});

async function encargoAbierto(ctx: RouteContext<"/datos/director/[id]/videos">) {
  const { env, db, bucket } = await contexto();
  const id = Number((await ctx.params).id);
  const encargo = Number.isInteger(id) && id > 0 ? await encargoPorId(db, id) : null;
  return { env, db, bucket, encargo: encargo?.estado === "abierto" ? encargo : null };
}

export async function GET(req: Request, ctx: RouteContext<"/datos/director/[id]/videos">) {
  const { env, db, encargo } = await encargoAbierto(ctx);
  const permiso = await puedeSubir(req, db, env.ESTACION_SECRETO);
  if (!permiso.ok) return permiso.respuesta;
  if (!encargo) return Response.json({ error: "Ese encargo no existe o está archivado." }, { status: 404 });
  const videos = await videosDelEncargo(db, encargo.id);
  return Response.json({
    videos: videos.map((v) => ({
      id: v.id,
      nombre: v.nombre,
      estado: v.estado,
      duracion_seg: v.duracion_seg,
      error: v.error,
    })),
  });
}

export async function POST(req: Request, ctx: RouteContext<"/datos/director/[id]/videos">) {
  const { env, db, bucket, encargo } = await encargoAbierto(ctx);
  const permiso = await puedeSubir(req, db, env.ESTACION_SECRETO);
  if (!permiso.ok) return permiso.respuesta;
  if (!encargo) return Response.json({ error: "Ese encargo no existe o está archivado." }, { status: 404 });
  if (!bucket) return Response.json({ error: "El almacén no está disponible." }, { status: 503 });
  const parseo = esquema.safeParse(await req.json().catch(() => null));
  if (!parseo.success)
    return Response.json({ error: parseo.error.issues[0]?.message ?? "Revisa los datos." }, { status: 400 });
  const extension = extensionDeVideoDirector(parseo.data.archivo);
  if (!extension)
    return Response.json(
      { error: "Ese archivo no es un video que sepamos leer: súbelo en MP4 o MOV." },
      { status: 400 },
    );
  const clave = claveDeVideoDelEncargo(encargo.id, extension);
  const subida = await bucket.createMultipartUpload(clave, {
    httpMetadata: { contentType: tipoDeVideo(extension) },
  });
  const id = await crearVideoDelEncargo(db, {
    encargoId: encargo.id,
    nombre: parseo.data.archivo,
    bytes: parseo.data.bytes,
    clave,
  });
  return Response.json({ ok: true, id, uploadId: subida.uploadId, parte: TAMANO_PARTE });
}
