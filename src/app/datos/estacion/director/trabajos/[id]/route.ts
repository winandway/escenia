// La Estación cuenta cómo va un trabajo del Director: avance, error o lo que gastó (cada gasto se anota
// en el tope del día y en el trabajo, en el momento en que se hace).
import { z } from "zod";
import {
  anotarAvanceTrabajo,
  anotarErrorTrabajo,
  sumarCostoTrabajo,
  trabajoDelDirector,
} from "@/lib/director-videos";
import { contexto } from "@/lib/entorno";
import { estacionAutorizada, respuestaNoAutorizada } from "@/lib/estacion-auth";
import { tocarLatido } from "@/lib/estacion-estado";
import { anotarGasto } from "@/lib/presupuesto";

export const dynamic = "force-dynamic";

const esquema = z.discriminatedUnion("accion", [
  z.object({ accion: z.literal("avance"), paso: z.string().max(200) }),
  z.object({ accion: z.literal("error"), error: z.string().max(2000) }),
  z.object({
    accion: z.literal("gasto"),
    servicio: z.string().max(40),
    detalle: z.string().max(200),
    costo_usd: z.number().min(0).max(20),
  }),
]);

export async function POST(req: Request, ctx: RouteContext<"/datos/estacion/director/trabajos/[id]">) {
  const { env, db } = await contexto();
  if (!estacionAutorizada(req.headers.get("authorization"), env.ESTACION_SECRETO))
    return respuestaNoAutorizada();
  const id = Number((await ctx.params).id);
  const t = Number.isInteger(id) && id > 0 ? await trabajoDelDirector(db, id) : null;
  if (!t) return Response.json({ error: "Ese trabajo no existe." }, { status: 404 });
  const parseo = esquema.safeParse(await req.json().catch(() => null));
  if (!parseo.success)
    return Response.json({ error: parseo.error.issues[0]?.message ?? "Cuerpo inválido." }, { status: 400 });
  const d = parseo.data;
  await tocarLatido(db);
  if (d.accion === "avance") await anotarAvanceTrabajo(db, id, d.paso);
  else if (d.accion === "error") await anotarErrorTrabajo(db, id, d.error);
  else {
    await anotarGasto(db, d.servicio, `director, trabajo ${id}: ${d.detalle}`, d.costo_usd);
    await sumarCostoTrabajo(db, id, d.costo_usd);
  }
  return Response.json({ ok: true });
}
