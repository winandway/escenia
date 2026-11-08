// C-COMERCIAL-4: la Estación pregunta si hay una miniatura de comercial por dibujar (la que Richard
// eligió en el panel). Si hay, queda tomada. Preguntar sin que haya ninguna no escribe nada.
import { contexto } from "@/lib/entorno";
import { estacionAutorizada, respuestaNoAutorizada } from "@/lib/estacion-auth";
import { tomarSiguientePortada } from "@/lib/comerciales";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { env, db } = await contexto();
  if (!estacionAutorizada(req.headers.get("authorization"), env.ESTACION_SECRETO))
    return respuestaNoAutorizada();
  return Response.json({ portada: await tomarSiguientePortada(db) });
}
