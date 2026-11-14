// La Estación pregunta qué nombres propios agregó Richard en Ajustes (C-NOMBRES-2), para que la
// transcripción los escriba bien y los subtítulos salgan corregidos. Solo lee: no escribe nada.
import { ajuste } from "@/lib/consultas";
import { contexto } from "@/lib/entorno";
import { estacionAutorizada, respuestaNoAutorizada } from "@/lib/estacion-auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { env, db } = await contexto();
  if (!estacionAutorizada(req.headers.get("authorization"), env.ESTACION_SECRETO))
    return respuestaNoAutorizada();
  return Response.json({ texto: await ajuste(db, "nombres_propios") });
}
