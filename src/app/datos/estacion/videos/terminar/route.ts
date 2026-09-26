// Subida de un video por partes: paso 3, cerrar la subida y registrar el video.
import { z } from "zod";
import { contexto } from "@/lib/entorno";
import { estacionAutorizada, respuestaNoAutorizada } from "@/lib/estacion-auth";

export const dynamic = "force-dynamic";

const esquema = z.object({
  guion_id: z.number().int().positive(),
  formato: z.enum(["16x9", "9x16"]),
  clave: z.string().regex(/^guiones\/\d+\/video-(16x9|9x16)-\d+\.mp4$/),
  uploadId: z.string().min(1).max(500),
  partes: z
    .array(z.object({ partNumber: z.number().int().min(1), etag: z.string().min(1) }))
    .min(1)
    .max(10000),
  duracion_seg: z.number().min(0),
  voz_de_prueba: z.boolean().default(false),
});

export async function POST(req: Request) {
  const { env, db, bucket } = await contexto();
  if (!estacionAutorizada(req.headers.get("authorization"), env.ESTACION_SECRETO))
    return respuestaNoAutorizada();
  if (!bucket) return Response.json({ error: "El almacén (BUCKET) no está disponible." }, { status: 503 });
  const parseo = esquema.safeParse(await req.json().catch(() => null));
  if (!parseo.success) return Response.json({ error: "Cuerpo inválido." }, { status: 400 });
  const d = parseo.data;
  if (!d.clave.startsWith(`guiones/${d.guion_id}/`))
    return Response.json({ error: "La clave no es de ese guion." }, { status: 400 });

  const subida = bucket.resumeMultipartUpload(d.clave, d.uploadId);
  let objeto: R2Object;
  try {
    objeto = await subida.complete(d.partes);
  } catch (e) {
    return Response.json(
      { error: `No se pudo cerrar la subida: ${e instanceof Error ? e.message : String(e)}` },
      { status: 500 },
    );
  }
  const fila = await db.ejecutar(
    "INSERT INTO videos (guion_id, formato, clave, bytes, duracion_seg, voz_de_prueba) VALUES (?, ?, ?, ?, ?, ?)",
    [d.guion_id, d.formato, d.clave, objeto.size, d.duracion_seg, d.voz_de_prueba ? 1 : 0],
  );
  return Response.json({ ok: true, id: fila.ultimoId, clave: d.clave, bytes: objeto.size });
}
