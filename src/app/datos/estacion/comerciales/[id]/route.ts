// La Estación cuenta cómo va con un comercial: avance, error, o «ya tengo las imágenes:
// arma el plan». Con el plan nace el guion (aprobado: el texto es del cliente) y su trabajo.
import { z } from "zod";
import { ajuste } from "@/lib/consultas";
import { contexto } from "@/lib/entorno";
import { estacionAutorizada, respuestaNoAutorizada } from "@/lib/estacion-auth";
import { tocarLatido } from "@/lib/estacion-estado";
import { generarPlanComercial } from "@/lib/generador";
import {
  anotarAvanceComercial,
  anotarErrorComercial,
  comercialPorId,
  planDeComercial,
  registrarPlanComercial,
} from "@/lib/comerciales";
import { PresupuestoAgotado } from "@/lib/presupuesto";
import { esquemaGuion } from "@compartido/guion";
import { MODELO_POR_DEFECTO } from "@compartido/modelos";

export const dynamic = "force-dynamic";

const esquema = z.discriminatedUnion("accion", [
  z.object({ accion: z.literal("avance"), paso: z.string().max(200) }),
  z.object({ accion: z.literal("error"), error: z.string().max(2000) }),
  z.object({
    accion: z.literal("plan"),
    imagenes: z
      .array(
        z.object({
          nombre: z.string().trim().min(1).max(160),
          transparente: z.boolean().default(false),
          ancho: z.number().int().min(1).default(1),
          alto: z.number().int().min(1).default(1),
        }),
      )
      .max(120),
  }),
]);

export async function POST(req: Request, ctx: RouteContext<"/datos/estacion/comerciales/[id]">) {
  const { env, db } = await contexto();
  if (!estacionAutorizada(req.headers.get("authorization"), env.ESTACION_SECRETO))
    return respuestaNoAutorizada();
  const id = Number((await ctx.params).id);
  const comercial = Number.isInteger(id) && id > 0 ? await comercialPorId(db, id) : null;
  if (!comercial) return Response.json({ error: "Ese comercial no existe." }, { status: 404 });
  const parseo = esquema.safeParse(await req.json().catch(() => null));
  if (!parseo.success)
    return Response.json({ error: parseo.error.issues[0]?.message ?? "Cuerpo inválido." }, { status: 400 });
  const d = parseo.data;
  await tocarLatido(db);
  if (d.accion === "avance") {
    await anotarAvanceComercial(db, id, d.paso);
    return Response.json({ ok: true });
  }
  if (d.accion === "error") {
    await anotarErrorComercial(db, id, d.error);
    return Response.json({ ok: true });
  }
  const ya = await planDeComercial(db, id);
  if (ya) return Response.json({ ok: true, guion_id: ya.guionId, trabajo_id: ya.trabajoId });
  if (comercial.estado !== "tomada")
    return Response.json({ error: "Ese comercial no está en preparación." }, { status: 409 });
  const fallar = async (error: string) => {
    await anotarErrorComercial(db, id, error);
    return Response.json({ error }, { status: 422 });
  };
  if (d.imagenes.length === 0)
    return fallar("No llegó ninguna imagen de las carpetas elegidas: revisa la biblioteca de Imágenes.");
  if (!env.ANTHROPIC_API_KEY)
    return fallar("Falta la clave de la IA que arma el plan (Anthropic) en el panel.");
  await anotarAvanceComercial(db, id, "armando el plan del video con tus imágenes");
  try {
    const r = await generarPlanComercial(
      db,
      {
        nombre: comercial.nombre,
        narracion: comercial.narracion,
        idioma: comercial.idioma,
        instrucciones: comercial.instrucciones,
        imagenes: d.imagenes,
      },
      { modelo: await ajuste(db, "modelo_guion", MODELO_POR_DEFECTO), apiKey: env.ANTHROPIC_API_KEY },
    );
    const guion = esquemaGuion.parse(r.guion);
    const hecho = await registrarPlanComercial(db, comercial, guion, {
      modelo: r.modelo,
      costoUsd: r.costoUsd,
    });
    return Response.json({ ok: true, guion_id: hecho.guionId, trabajo_id: hecho.trabajoId });
  } catch (e) {
    if (!(e instanceof PresupuestoAgotado)) console.error("[comerciales/plan]", e);
    return fallar(
      e instanceof z.ZodError
        ? "La IA armó un plan que no sirve para este video. Toca «Intentar otra vez»."
        : e instanceof Error
          ? e.message
          : "No se pudo armar el plan.",
    );
  }
}
