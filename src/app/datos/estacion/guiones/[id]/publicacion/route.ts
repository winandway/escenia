// La Estación pide aquí los textos de YouTube al terminar un video (título,
// títulos de los shorts, descripción y palabras clave). También sirve para
// regenerarlos desde fuera con el secreto.
import { z } from "zod";
import { contexto } from "@/lib/entorno";
import { estacionAutorizada, respuestaNoAutorizada } from "@/lib/estacion-auth";
import { tocarLatido } from "@/lib/estacion-estado";
import { generarPublicacion } from "@/lib/publicacion";
import { esquemaShortPublicado } from "@compartido/guion";

export const dynamic = "force-dynamic";

const esquema = z.object({ shorts: z.array(esquemaShortPublicado).max(8).default([]) });

export async function POST(req: Request, ctx: RouteContext<"/datos/estacion/guiones/[id]/publicacion">) {
  const { env, db } = await contexto();
  if (!estacionAutorizada(req.headers.get("authorization"), env.ESTACION_SECRETO))
    return respuestaNoAutorizada();
  const { id } = await ctx.params;
  const guionId = Number(id);
  if (!Number.isInteger(guionId) || guionId <= 0)
    return Response.json({ error: "Id inválido." }, { status: 400 });
  const parseo = esquema.safeParse(await req.json().catch(() => ({})));
  if (!parseo.success) return Response.json({ error: "Cuerpo inválido." }, { status: 400 });
  await tocarLatido(db);
  try {
    const publicacion = await generarPublicacion(db, env.ANTHROPIC_API_KEY, guionId, parseo.data.shorts);
    return Response.json({ ok: true, publicacion });
  } catch (e) {
    console.error("[publicacion]", e);
    return Response.json(
      { error: e instanceof Error ? e.message : "No se pudieron generar los textos." },
      { status: 422 },
    );
  }
}
