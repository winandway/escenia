// La Estación reporta el avance de un trabajo, lo marca hecho o con error,
// y registra los renders (los MP4 se quedan en la Mac: aquí va solo la ruta).
import { z } from "zod";
import { contexto } from "@/lib/entorno";
import { estacionAutorizada, respuestaNoAutorizada } from "@/lib/estacion-auth";
import { anotarGasto } from "@/lib/presupuesto";

export const dynamic = "force-dynamic";

const esquema = z.discriminatedUnion("accion", [
  z.object({
    accion: z.literal("avance"),
    paso: z.string().max(120),
    progreso: z.number().int().min(0).max(100),
  }),
  z.object({ accion: z.literal("error"), error: z.string().max(2000) }),
  z.object({
    accion: z.literal("hecho"),
    renders: z
      .array(
        z.object({
          formato: z.enum(["16x9", "9x16"]),
          ruta_local: z.string().max(500),
          bytes: z.number().int().min(0),
          duracion_seg: z.number().min(0),
          voz_de_prueba: z.boolean().default(false),
        }),
      )
      .min(1),
  }),
  z.object({
    accion: z.literal("gasto"),
    servicio: z.string().max(40),
    detalle: z.string().max(200),
    costo_usd: z.number().min(0).max(50),
  }),
]);

export async function POST(req: Request, ctx: RouteContext<"/datos/estacion/trabajos/[id]">) {
  const { env, db } = await contexto();
  if (!estacionAutorizada(req.headers.get("authorization"), env.ESTACION_SECRETO))
    return respuestaNoAutorizada();
  const { id } = await ctx.params;
  const trabajoId = Number(id);
  if (!Number.isInteger(trabajoId) || trabajoId <= 0)
    return Response.json({ error: "Id inválido." }, { status: 400 });

  const parseo = esquema.safeParse(await req.json().catch(() => null));
  if (!parseo.success) return Response.json({ error: "Cuerpo inválido." }, { status: 400 });
  const d = parseo.data;

  const trabajo = await db.uno<{ id: number; guion_id: number; estado: string }>(
    "SELECT id, guion_id, estado FROM trabajos WHERE id = ?",
    [trabajoId],
  );
  if (!trabajo) return Response.json({ error: "Ese trabajo no existe." }, { status: 404 });
  if (trabajo.estado !== "tomado" && d.accion !== "gasto") {
    return Response.json(
      { error: `El trabajo está «${trabajo.estado}», no se puede actualizar.` },
      { status: 409 },
    );
  }

  switch (d.accion) {
    case "avance":
      await db.ejecutar(
        "UPDATE trabajos SET paso = ?, progreso = ?, actualizado_en = datetime('now') WHERE id = ?",
        [d.paso, d.progreso, trabajoId],
      );
      break;
    case "error":
      await db.ejecutar(
        "UPDATE trabajos SET estado = 'error', error = ?, actualizado_en = datetime('now') WHERE id = ?",
        [d.error, trabajoId],
      );
      break;
    case "hecho":
      for (const r of d.renders) {
        await db.ejecutar(
          "INSERT INTO renders (guion_id, formato, ruta_local, bytes, duracion_seg, voz_de_prueba) VALUES (?, ?, ?, ?, ?, ?)",
          [trabajo.guion_id, r.formato, r.ruta_local, r.bytes, r.duracion_seg, r.voz_de_prueba ? 1 : 0],
        );
      }
      await db.ejecutar(
        "UPDATE trabajos SET estado = 'hecho', paso = 'listo', progreso = 100, actualizado_en = datetime('now') WHERE id = ?",
        [trabajoId],
      );
      break;
    case "gasto":
      await anotarGasto(db, d.servicio, d.detalle, d.costo_usd);
      break;
  }
  return Response.json({ ok: true });
}
