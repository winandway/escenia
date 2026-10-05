// La Estación pregunta: ¿Richard subió una grabación? Si hay, la toma (una a la vez).
import { contexto } from "@/lib/entorno";
import { estacionAutorizada, respuestaNoAutorizada } from "@/lib/estacion-auth";
import { tocarLatido } from "@/lib/estacion-estado";
import { tomarSiguiente } from "@/lib/grabaciones";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { env, db } = await contexto();
  if (!estacionAutorizada(req.headers.get("authorization"), env.ESTACION_SECRETO))
    return respuestaNoAutorizada();
  await tocarLatido(db);
  const g = await tomarSiguiente(db);
  if (!g) return Response.json({ grabacion: null });
  return Response.json({
    grabacion: {
      id: g.id,
      tema: g.tema,
      formato: g.formato,
      canal: g.canal,
      archivo: g.archivo,
      bytes: g.bytes,
    },
  });
}
