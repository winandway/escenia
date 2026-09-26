// Subida de un video terminado, por partes (multipart de R2): paso 1, iniciar.
import { z } from "zod";
import { contexto } from "@/lib/entorno";
import { estacionAutorizada, respuestaNoAutorizada } from "@/lib/estacion-auth";

export const dynamic = "force-dynamic";

const esquema = z.object({
  guion_id: z.number().int().positive(),
  formato: z.enum(["16x9", "9x16"]),
});

export async function POST(req: Request) {
  const { env, bucket } = await contexto();
  if (!estacionAutorizada(req.headers.get("authorization"), env.ESTACION_SECRETO))
    return respuestaNoAutorizada();
  if (!bucket) return Response.json({ error: "El almacén (BUCKET) no está disponible." }, { status: 503 });
  const parseo = esquema.safeParse(await req.json().catch(() => null));
  if (!parseo.success) return Response.json({ error: "Cuerpo inválido." }, { status: 400 });
  const d = parseo.data;
  const clave = `guiones/${d.guion_id}/video-${d.formato}-${Date.now()}.mp4`;
  const subida = await bucket.createMultipartUpload(clave, { httpMetadata: { contentType: "video/mp4" } });
  return Response.json({ ok: true, clave, uploadId: subida.uploadId });
}
