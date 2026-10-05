// La Estación cuenta cómo va con una grabación: avance, error, o «ya la transcribí:
// arma el plan». Con el plan nace el guion (aprobado: son las palabras de Richard) y su
// trabajo, y la Estación lo produce en su vuelta siguiente.
import { z } from "zod";
import { ajuste } from "@/lib/consultas";
import { contexto } from "@/lib/entorno";
import { estacionAutorizada, respuestaNoAutorizada } from "@/lib/estacion-auth";
import { tocarLatido } from "@/lib/estacion-estado";
import { generarPlan } from "@/lib/generador";
import { anotarAvance, anotarError, grabacionPorId, planDeGrabacion, registrarPlan } from "@/lib/grabaciones";
import { anotarGasto, PresupuestoAgotado } from "@/lib/presupuesto";
import { contarPalabras, MIN_PALABRAS_GRABACION } from "@compartido/grabaciones";
import { esquemaGuion } from "@compartido/guion";
import { MODELO_POR_DEFECTO } from "@compartido/modelos";

export const dynamic = "force-dynamic";

const esquema = z.discriminatedUnion("accion", [
  z.object({ accion: z.literal("avance"), paso: z.string().max(200) }),
  z.object({ accion: z.literal("error"), error: z.string().max(2000) }),
  z.object({
    accion: z.literal("plan"),
    transcripcion: z.string().trim().max(40000),
    costo_transcripcion_usd: z.number().min(0).max(5).default(0),
  }),
]);

export async function POST(req: Request, ctx: RouteContext<"/datos/estacion/grabaciones/[id]">) {
  const { env, db } = await contexto();
  if (!estacionAutorizada(req.headers.get("authorization"), env.ESTACION_SECRETO))
    return respuestaNoAutorizada();
  const id = Number((await ctx.params).id);
  const grabacion = Number.isInteger(id) && id > 0 ? await grabacionPorId(db, id) : null;
  if (!grabacion) return Response.json({ error: "Esa grabación no existe." }, { status: 404 });
  const parseo = esquema.safeParse(await req.json().catch(() => null));
  if (!parseo.success)
    return Response.json({ error: parseo.error.issues[0]?.message ?? "Cuerpo inválido." }, { status: 400 });
  const d = parseo.data;
  await tocarLatido(db);

  if (d.accion === "avance") {
    await anotarAvance(db, id, d.paso);
    return Response.json({ ok: true });
  }
  if (d.accion === "error") {
    await anotarError(db, id, d.error);
    return Response.json({ ok: true });
  }

  // Si el pedido llega dos veces (la Mac reintentó), no se arma ni se cobra otro plan.
  const ya = await planDeGrabacion(db, id);
  if (ya) return Response.json({ ok: true, guion_id: ya.guionId, trabajo_id: ya.trabajoId });
  if (grabacion.estado !== "tomada")
    return Response.json({ error: "Esa grabación no está en preparación." }, { status: 409 });
  if (d.costo_transcripcion_usd > 0)
    await anotarGasto(db, "elevenlabs", `transcripción grabación ${id}`, d.costo_transcripcion_usd);
  // Lo que falle aquí queda escrito en la grabación, en palabras que Richard entienda.
  const fallar = async (error: string) => {
    await anotarError(db, id, error);
    return Response.json({ error }, { status: 422 });
  };
  if (contarPalabras(d.transcripcion) < MIN_PALABRAS_GRABACION)
    return fallar(
      "La grabación es muy corta o casi no se oye la voz. Habla al menos veinte segundos para que haya de qué armar el video.",
    );
  if (!env.ANTHROPIC_API_KEY)
    return fallar("Falta la clave de la IA que arma el plan (Anthropic) en el panel.");
  await anotarAvance(db, id, "armando el plan de lo que va detrás de ti");
  try {
    const r = await generarPlan(
      db,
      { transcripcion: d.transcripcion, formato: grabacion.formato, titulo: grabacion.tema },
      { modelo: await ajuste(db, "modelo_guion", MODELO_POR_DEFECTO), apiKey: env.ANTHROPIC_API_KEY },
    );
    const guion = esquemaGuion.parse(r.guion);
    const hecho = await registrarPlan(db, grabacion, guion, { modelo: r.modelo, costoUsd: r.costoUsd });
    return Response.json({ ok: true, guion_id: hecho.guionId, trabajo_id: hecho.trabajoId });
  } catch (e) {
    if (!(e instanceof PresupuestoAgotado)) console.error("[grabaciones/plan]", e);
    // Un plan que no cumple el formato da un error técnico larguísimo: se dice en corto.
    return fallar(
      e instanceof z.ZodError
        ? "La IA armó un plan que no sirve para este video. Toca «Intentar otra vez»."
        : e instanceof Error
          ? e.message
          : "No se pudo armar el plan.",
    );
  }
}
