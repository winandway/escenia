// La Mac avisa al iPhone cada respuesta de soporte a un caso de ayuda (C-AYUDA-1): GET trae los avisos
// pendientes; POST {mensajeId, resultado: "enviado"|"fallo", direccionMuerta} cuenta cómo le fue con Apple.
import { z } from "zod";
import { avisosDeAyudaPendientes, marcarAvisoDeAyuda } from "@/lib/ayuda";
import { contexto } from "@/lib/entorno";
import { estacionAutorizada, respuestaNoAutorizada } from "@/lib/estacion-auth";
import { tocarLatido } from "@/lib/estacion-estado";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { env, db } = await contexto();
  if (!estacionAutorizada(req.headers.get("authorization"), env.ESTACION_SECRETO))
    return respuestaNoAutorizada();
  await tocarLatido(db);
  return Response.json({ avisos: await avisosDeAyudaPendientes(db) });
}

const esquema = z.object({
  mensajeId: z.number().int().positive(),
  resultado: z.enum(["enviado", "fallo"]),
  direccionMuerta: z.boolean().default(false),
});

export async function POST(req: Request) {
  const { env, db } = await contexto();
  if (!estacionAutorizada(req.headers.get("authorization"), env.ESTACION_SECRETO))
    return respuestaNoAutorizada();
  const parseo = esquema.safeParse(await req.json().catch(() => null));
  if (!parseo.success) return Response.json({ error: "Datos inválidos." }, { status: 400 });
  await marcarAvisoDeAyuda(db, parseo.data.mensajeId, parseo.data.resultado, parseo.data.direccionMuerta);
  return Response.json({ ok: true });
}
