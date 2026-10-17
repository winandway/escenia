// La Estación cuenta cómo va un anuncio: avance, error, lo que gastó, o «ya tengo las imágenes: arma
// el plan» (la IA decide qué foto y qué texto van en cada frase).
import { z } from "zod";
import { ajuste } from "@/lib/consultas";
import { contexto } from "@/lib/entorno";
import { estacionAutorizada, respuestaNoAutorizada } from "@/lib/estacion-auth";
import { tocarLatido } from "@/lib/estacion-estado";
import { anotarGasto, autorizarGasto, PresupuestoAgotado } from "@/lib/presupuesto";
import { generarPlanPublicidad } from "@/lib/publicidad-ia";
import {
  anotarAvancePublicidad,
  anotarErrorPublicidad,
  guardarPlanPublicidad,
  publicidadPorId,
  sumarCostoPublicidad,
} from "@/lib/publicidades";
import { MODELO_POR_DEFECTO } from "@compartido/modelos";
import { costoEstimadoPublicidadUsd } from "@compartido/publicidad";

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

export async function POST(req: Request, ctx: RouteContext<"/datos/estacion/publicidades/[id]">) {
  const { env, db } = await contexto();
  if (!estacionAutorizada(req.headers.get("authorization"), env.ESTACION_SECRETO))
    return respuestaNoAutorizada();
  const id = Number((await ctx.params).id);
  const p = Number.isInteger(id) && id > 0 ? await publicidadPorId(db, id) : null;
  if (!p) return Response.json({ error: "Ese anuncio no existe." }, { status: 404 });
  const parseo = esquema.safeParse(await req.json().catch(() => null));
  if (!parseo.success)
    return Response.json({ error: parseo.error.issues[0]?.message ?? "Cuerpo inválido." }, { status: 400 });
  const d = parseo.data;
  await tocarLatido(db);
  if (d.accion === "avance") {
    await anotarAvancePublicidad(db, id, d.paso);
    return Response.json({ ok: true });
  }
  if (d.accion === "error") {
    await anotarErrorPublicidad(db, id, d.error);
    return Response.json({ ok: true });
  }
  if (d.accion === "gasto") {
    await anotarGasto(db, d.servicio, `anuncio ${id}: ${d.detalle}`, d.costo_usd);
    await sumarCostoPublicidad(db, id, d.costo_usd);
    return Response.json({ ok: true });
  }
  if (p.plan) return Response.json({ ok: true, plan: JSON.parse(p.plan) as unknown });
  const fallar = async (error: string, status = 422) => {
    await anotarErrorPublicidad(db, id, error);
    return Response.json({ error }, { status });
  };
  if (d.imagenes.length === 0)
    return fallar("No llegó ninguna imagen de las carpetas elegidas: revisa la biblioteca de Imágenes.");
  if (!env.ANTHROPIC_API_KEY)
    return fallar("Falta la clave de la IA que arma el plan (Anthropic) en el panel.");
  await anotarAvancePublicidad(db, id, "armando el plan del anuncio con tus imágenes");
  try {
    // Antes de gastar nada: ¿el anuncio entero (plan, voz y persona) cabe en el tope de hoy?
    await autorizarGasto(db, costoEstimadoPublicidadUsd(p.narracion, Boolean(p.avatar)));
    const sinAvatar = d.imagenes.filter((i) => i.nombre !== p.avatar);
    const r = await generarPlanPublicidad(
      db,
      {
        nombre: p.nombre,
        narracion: p.narracion,
        idioma: p.idioma,
        instrucciones: p.instrucciones,
        imagenes: sinAvatar,
      },
      { modelo: await ajuste(db, "modelo_guion", MODELO_POR_DEFECTO), apiKey: env.ANTHROPIC_API_KEY },
    );
    await sumarCostoPublicidad(db, id, r.costoUsd);
    await guardarPlanPublicidad(db, id, r.plan);
    return Response.json({ ok: true, plan: r.plan });
  } catch (e) {
    if (e instanceof PresupuestoAgotado) return fallar(e.message, 402);
    return fallar(e instanceof Error ? e.message : "No se pudo armar el plan.");
  }
}
