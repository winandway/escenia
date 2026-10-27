// La Estación pregunta: ¿hay un trabajo del Director por armar (prueba en vivo o locución)? Si hay, lo
// toma, con lo aprobado y el video del cliente que necesita.
import { videoDelDirector, tomarSiguienteTrabajo } from "@/lib/director-videos";
import { contexto } from "@/lib/entorno";
import { estacionAutorizada, respuestaNoAutorizada } from "@/lib/estacion-auth";
import { tocarLatido } from "@/lib/estacion-estado";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { env, db } = await contexto();
  if (!estacionAutorizada(req.headers.get("authorization"), env.ESTACION_SECRETO))
    return respuestaNoAutorizada();
  await tocarLatido(db);
  const t = await tomarSiguienteTrabajo(db);
  if (!t) return Response.json({ trabajo: null });
  const datos = JSON.parse(t.datos) as { video_id?: number };
  const video = datos.video_id ? await videoDelDirector(db, datos.video_id) : null;
  return Response.json({
    trabajo: {
      id: t.id,
      tipo: t.tipo,
      datos,
      video: video
        ? { id: video.id, nombre: video.nombre, bytes: video.bytes, duracion_seg: video.duracion_seg }
        : null,
    },
  });
}
