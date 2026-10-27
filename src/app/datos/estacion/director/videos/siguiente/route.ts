// La Estación pregunta: ¿hay un video del chat del Director por mirar? Si hay, lo toma (uno a la vez).
import { tomarVideoPorMirar } from "@/lib/director-videos";
import { contexto } from "@/lib/entorno";
import { estacionAutorizada, respuestaNoAutorizada } from "@/lib/estacion-auth";
import { tocarLatido } from "@/lib/estacion-estado";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { env, db } = await contexto();
  if (!estacionAutorizada(req.headers.get("authorization"), env.ESTACION_SECRETO))
    return respuestaNoAutorizada();
  await tocarLatido(db);
  const v = await tomarVideoPorMirar(db);
  return Response.json({ video: v ? { id: v.id, nombre: v.nombre, bytes: v.bytes } : null });
}
