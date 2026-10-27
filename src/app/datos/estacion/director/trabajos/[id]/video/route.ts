// La Estación entrega el video de un trabajo del Director, por partes (una prueba en vivo de casi dos
// minutos pesa unos cien megas: no cabe en una sola petición). POST {accion: iniciar | terminar}, PUT un trozo.
import { z } from "zod";
import { claveDeResultado, marcarTrabajoListo, trabajoDelDirector } from "@/lib/director-videos";
import { contexto } from "@/lib/entorno";
import { estacionAutorizada, respuestaNoAutorizada } from "@/lib/estacion-auth";
import { tocarLatido } from "@/lib/estacion-estado";

export const dynamic = "force-dynamic";

type Contexto = RouteContext<"/datos/estacion/director/trabajos/[id]/video">;
const MAX_PARTE = 10 * 1024 * 1024;

async function trabajoAutorizado(req: Request, ctx: Contexto) {
  const { env, db, bucket } = await contexto();
  if (!estacionAutorizada(req.headers.get("authorization"), env.ESTACION_SECRETO)) return null;
  const id = Number((await ctx.params).id);
  const trabajo = Number.isInteger(id) && id > 0 ? await trabajoDelDirector(db, id) : null;
  return { db, bucket, trabajo };
}

const esquema = z.discriminatedUnion("accion", [
  z.object({ accion: z.literal("iniciar") }),
  z.object({
    accion: z.literal("terminar"),
    uploadId: z.string().min(1).max(500),
    duracion_seg: z.number().min(0.5).max(36_000),
    partes: z
      .array(z.object({ partNumber: z.number().int().min(1), etag: z.string().min(1) }))
      .min(1)
      .max(10000),
  }),
]);

export async function POST(req: Request, ctx: Contexto) {
  const a = await trabajoAutorizado(req, ctx);
  if (!a) return respuestaNoAutorizada();
  if (!a.bucket) return Response.json({ error: "El almacén no está disponible." }, { status: 503 });
  if (!a.trabajo || a.trabajo.estado !== "tomada")
    return Response.json({ error: "Ese trabajo no existe o no está tomado." }, { status: 409 });
  const parseo = esquema.safeParse(await req.json().catch(() => null));
  if (!parseo.success) return Response.json({ error: "Cuerpo inválido." }, { status: 400 });
  const d = parseo.data;
  await tocarLatido(a.db);
  if (d.accion === "iniciar") {
    // La dirección se guarda ya en el trabajo: los trozos y el cierre la leen de la base.
    const clave = claveDeResultado(a.trabajo.id);
    const subida = await a.bucket.createMultipartUpload(clave, {
      httpMetadata: { contentType: "video/mp4" },
    });
    await a.db.ejecutar("UPDATE director_trabajos SET video = ? WHERE id = ?", [clave, a.trabajo.id]);
    return Response.json({ ok: true, uploadId: subida.uploadId });
  }
  if (!a.trabajo.video) return Response.json({ error: "La subida no se inició." }, { status: 409 });
  try {
    await a.bucket.resumeMultipartUpload(a.trabajo.video, d.uploadId).complete(d.partes);
  } catch (e) {
    console.error("[director] no se pudo cerrar la entrega", e);
    return Response.json({ error: "No se pudo cerrar la subida del video." }, { status: 500 });
  }
  await marcarTrabajoListo(a.db, a.trabajo.id, a.trabajo.video, d.duracion_seg);
  return Response.json({ ok: true });
}

export async function PUT(req: Request, ctx: Contexto) {
  const a = await trabajoAutorizado(req, ctx);
  if (!a) return respuestaNoAutorizada();
  if (!a.bucket) return Response.json({ error: "El almacén no está disponible." }, { status: 503 });
  if (!a.trabajo?.video || a.trabajo.estado !== "tomada")
    return Response.json({ error: "Esa subida no está abierta." }, { status: 409 });
  const q = z
    .object({ uploadId: z.string().min(1).max(500), n: z.coerce.number().int().min(1).max(10000) })
    .safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!q.success) return Response.json({ error: "Parámetros inválidos." }, { status: 400 });
  const contenido = await req.arrayBuffer();
  if (contenido.byteLength === 0 || contenido.byteLength > MAX_PARTE)
    return Response.json({ error: "Ese trozo llegó vacío o demasiado grande." }, { status: 413 });
  const parte = await a.bucket
    .resumeMultipartUpload(a.trabajo.video, q.data.uploadId)
    .uploadPart(q.data.n, contenido);
  return Response.json({ ok: true, partNumber: parte.partNumber, etag: parte.etag });
}
