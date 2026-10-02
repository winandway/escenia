// La Estación sube archivos chicos (voz, subtítulos, miniatura) al almacén del sitio.
// Los MP4 NO pasan por aquí: se quedan en la Mac.
import { z } from "zod";
import { contexto } from "@/lib/entorno";
import { estacionAutorizada, respuestaNoAutorizada } from "@/lib/estacion-auth";
import { CABECERA_META, leerMeta } from "@compartido/meta";

export const dynamic = "force-dynamic";

const MAX_BYTES = 40 * 1024 * 1024;
const TIPOS = ["voz", "subtitulos", "miniatura", "imagen", "clip", "screen"] as const;
const CONTENT_TYPES: Record<string, string> = {
  mp3: "audio/mpeg",
  json: "application/json",
  png: "image/png",
  jpg: "image/jpeg",
  webp: "image/webp",
};

const esquemaMeta = z.object({
  guion_id: z.coerce.number().int().positive(),
  tipo: z.enum(TIPOS),
  extension: z.enum(["mp3", "json", "png", "jpg", "webp"]),
});

export async function POST(req: Request) {
  const { env, db, bucket } = await contexto();
  if (!estacionAutorizada(req.headers.get("authorization"), env.ESTACION_SECRETO))
    return respuestaNoAutorizada();
  if (!bucket) return Response.json({ error: "El almacén (BUCKET) no está disponible." }, { status: 503 });

  const url = new URL(req.url);
  const parseo = esquemaMeta.safeParse(Object.fromEntries(url.searchParams));
  if (!parseo.success) return Response.json({ error: "Parámetros inválidos." }, { status: 400 });
  const d = parseo.data;
  // La ficha (créditos y demás) viene en una cabecera; un video con cien fotos no cabe en la dirección (C-ENTREGA-2).
  const meta = leerMeta(req.headers.get(CABECERA_META), url.searchParams.get("meta"));
  if (meta === null) return Response.json({ error: "La ficha del archivo no es válida." }, { status: 400 });

  const largo = Number(req.headers.get("content-length") ?? "0");
  if (!largo || largo > MAX_BYTES)
    return Response.json(
      { error: `El archivo debe pesar entre 1 byte y ${MAX_BYTES / 1_048_576} MB.` },
      { status: 413 },
    );
  if (!req.body) return Response.json({ error: "Sin contenido." }, { status: 400 });
  // R2 exige conocer el largo del cuerpo; un stream de Next no lo trae. Se lee entero (tope 40 MB).
  const contenido = await req.arrayBuffer();
  if (contenido.byteLength === 0 || contenido.byteLength > MAX_BYTES) {
    return Response.json({ error: "El archivo llegó vacío o demasiado grande." }, { status: 413 });
  }

  const clave = `guiones/${d.guion_id}/${d.tipo}-${Date.now()}.${d.extension}`;
  await bucket.put(clave, contenido, {
    httpMetadata: { contentType: CONTENT_TYPES[d.extension] ?? "application/octet-stream" },
  });
  const fila = await db.ejecutar("INSERT INTO archivos (guion_id, tipo, clave, meta) VALUES (?, ?, ?, ?)", [
    d.guion_id,
    d.tipo,
    clave,
    meta,
  ]);
  return Response.json({ ok: true, id: fila.ultimoId, clave });
}
