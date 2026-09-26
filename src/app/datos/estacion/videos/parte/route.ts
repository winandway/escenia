// Subida de un video por partes: paso 2, una parte (entre 5 y 10 MB; la última puede ser menor).
import { z } from "zod";
import { contexto } from "@/lib/entorno";
import { estacionAutorizada, respuestaNoAutorizada } from "@/lib/estacion-auth";

export const dynamic = "force-dynamic";

const MAX_PARTE = 10 * 1024 * 1024;

const esquema = z.object({
  clave: z.string().regex(/^guiones\/\d+\/video-(16x9|9x16)-\d+\.mp4$/),
  uploadId: z.string().min(1).max(500),
  n: z.coerce.number().int().min(1).max(10000),
});

export async function PUT(req: Request) {
  const { env, bucket } = await contexto();
  if (!estacionAutorizada(req.headers.get("authorization"), env.ESTACION_SECRETO))
    return respuestaNoAutorizada();
  if (!bucket) return Response.json({ error: "El almacén (BUCKET) no está disponible." }, { status: 503 });
  const parseo = esquema.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!parseo.success) return Response.json({ error: "Parámetros inválidos." }, { status: 400 });
  const d = parseo.data;
  const contenido = await req.arrayBuffer();
  if (contenido.byteLength === 0 || contenido.byteLength > MAX_PARTE) {
    return Response.json(
      { error: `Cada parte pesa entre 1 byte y ${MAX_PARTE / 1_048_576} MB.` },
      { status: 413 },
    );
  }
  const subida = bucket.resumeMultipartUpload(d.clave, d.uploadId);
  const parte = await subida.uploadPart(d.n, contenido);
  return Response.json({ ok: true, partNumber: parte.partNumber, etag: parte.etag });
}
