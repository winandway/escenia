// La Estación y un video del chat del Director (C-DIRECTOR-3). GET: lo baja por rangos. PUT ?hoja=N:
// sube una hoja de cuadros (JPEG). POST: «ya lo miré» (duración, sonido, hojas) o «no pude».
import { z } from "zod";
import { claveDeHoja, marcarVideoConError, marcarVideoListo, videoDelDirector } from "@/lib/director-videos";
import { contexto } from "@/lib/entorno";
import { estacionAutorizada, respuestaNoAutorizada } from "@/lib/estacion-auth";
import { tocarLatido } from "@/lib/estacion-estado";
import { cabecerasDeRango, rangoDesdeCabecera } from "@/lib/rango";

export const dynamic = "force-dynamic";

type Contexto = RouteContext<"/datos/estacion/director/videos/[id]">;

async function videoAutorizado(req: Request, ctx: Contexto) {
  const { env, db, bucket } = await contexto();
  if (!estacionAutorizada(req.headers.get("authorization"), env.ESTACION_SECRETO)) return null;
  const id = Number((await ctx.params).id);
  const video = Number.isInteger(id) && id > 0 ? await videoDelDirector(db, id) : null;
  return { db, bucket, video };
}

export async function GET(req: Request, ctx: Contexto) {
  const a = await videoAutorizado(req, ctx);
  if (!a) return respuestaNoAutorizada();
  if (!a.bucket) return Response.json({ error: "El almacén no está disponible." }, { status: 503 });
  if (!a.video || a.video.estado === "subiendo")
    return Response.json({ error: "Ese video no existe o no terminó de subir." }, { status: 404 });
  const cabeza = await a.bucket.head(a.video.clave);
  if (!cabeza) return Response.json({ error: "El video no está en el almacén." }, { status: 404 });
  const rango = rangoDesdeCabecera(req.headers.get("range"), cabeza.size);
  if (req.headers.get("range") && !rango)
    return new Response("Rango fuera del archivo.", {
      status: 416,
      headers: { "content-range": `bytes */${cabeza.size}` },
    });
  const objeto = rango
    ? await a.bucket.get(a.video.clave, { range: rango })
    : await a.bucket.get(a.video.clave);
  if (!objeto) return Response.json({ error: "El video no está en el almacén." }, { status: 404 });
  await tocarLatido(a.db);
  const { status, headers } = cabecerasDeRango(
    rango,
    cabeza.size,
    cabeza.httpMetadata?.contentType ?? "video/mp4",
  );
  return new Response(objeto.body, { status, headers: { ...headers, "cache-control": "no-store" } });
}

const MAX_HOJA = 4 * 1024 * 1024;

export async function PUT(req: Request, ctx: Contexto) {
  const a = await videoAutorizado(req, ctx);
  if (!a) return respuestaNoAutorizada();
  if (!a.bucket) return Response.json({ error: "El almacén no está disponible." }, { status: 503 });
  if (!a.video) return Response.json({ error: "Ese video no existe." }, { status: 404 });
  const n = z.coerce.number().int().min(1).max(8).safeParse(new URL(req.url).searchParams.get("hoja"));
  if (!n.success) return Response.json({ error: "Falta el número de la hoja." }, { status: 400 });
  const contenido = await req.arrayBuffer();
  if (contenido.byteLength < 100 || contenido.byteLength > MAX_HOJA)
    return Response.json({ error: "La hoja llegó vacía o demasiado grande." }, { status: 413 });
  await a.bucket.put(claveDeHoja(a.video.id, n.data), contenido, {
    httpMetadata: { contentType: "image/jpeg" },
  });
  return Response.json({ ok: true });
}

const esquema = z.discriminatedUnion("accion", [
  z.object({
    accion: z.literal("listo"),
    duracion_seg: z.number().min(0.5).max(36_000),
    con_sonido: z.boolean(),
    vertical: z.boolean(),
    hojas: z.number().int().min(1).max(8),
    segundos_por_cuadro: z.number().min(0.2).max(600),
  }),
  z.object({ accion: z.literal("error"), error: z.string().max(1000) }),
]);

export async function POST(req: Request, ctx: Contexto) {
  const a = await videoAutorizado(req, ctx);
  if (!a) return respuestaNoAutorizada();
  if (!a.video) return Response.json({ error: "Ese video no existe." }, { status: 404 });
  const parseo = esquema.safeParse(await req.json().catch(() => null));
  if (!parseo.success)
    return Response.json({ error: parseo.error.issues[0]?.message ?? "Cuerpo inválido." }, { status: 400 });
  const d = parseo.data;
  await tocarLatido(a.db);
  if (d.accion === "error") await marcarVideoConError(a.db, a.video.id, d.error);
  else
    await marcarVideoListo(a.db, a.video.id, {
      duracionSeg: d.duracion_seg,
      conSonido: d.con_sonido,
      vertical: d.vertical,
      hojas: d.hojas,
      segundosPorCuadro: d.segundos_por_cuadro,
    });
  return Response.json({ ok: true });
}
