// La Estación pregunta qué sonidos hay en la biblioteca para bajarlos a la Mac.
import { contexto } from "@/lib/entorno";
import { estacionAutorizada, respuestaNoAutorizada } from "@/lib/estacion-auth";
import { sonidosActivos } from "@/lib/sonidos";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { env, db } = await contexto();
  if (!estacionAutorizada(req.headers.get("authorization"), env.ESTACION_SECRETO))
    return respuestaNoAutorizada();
  const sonidos = await sonidosActivos(db);
  return Response.json({
    sonidos: sonidos
      .filter((s) => s.archivo)
      .map((s) => ({ id: s.id, tipo: s.tipo, archivo: s.archivo, bytes: s.bytes })),
  });
}
