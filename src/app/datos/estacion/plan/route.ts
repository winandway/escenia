// Formato Presentador: la Estación manda la transcripción de una grabación y
// recibe el plan visual (qué va detrás de Richard en cada tramo). No guarda nada:
// el plan vuelve a la Mac, donde se revisa y se arma el video.
import { z } from "zod";
import { ajuste } from "@/lib/consultas";
import { contexto } from "@/lib/entorno";
import { estacionAutorizada, respuestaNoAutorizada } from "@/lib/estacion-auth";
import { tocarLatido } from "@/lib/estacion-estado";
import { generarPlan } from "@/lib/generador";
import { PresupuestoAgotado } from "@/lib/presupuesto";
import { MODELO_POR_DEFECTO } from "@compartido/modelos";
import { ESTILOS_VIDEO } from "@compartido/tematicas";

export const dynamic = "force-dynamic";

const esquema = z.object({
  transcripcion: z
    .string()
    .trim()
    .min(40, "La transcripción es demasiado corta para armar un plan.")
    .max(40000),
  formato: z.enum(ESTILOS_VIDEO),
  titulo: z.string().trim().max(200).default(""),
});

export async function POST(req: Request) {
  const { env, db } = await contexto();
  if (!estacionAutorizada(req.headers.get("authorization"), env.ESTACION_SECRETO))
    return respuestaNoAutorizada();
  const parseo = esquema.safeParse(await req.json().catch(() => null));
  if (!parseo.success)
    return Response.json({ error: parseo.error.issues[0]?.message ?? "Cuerpo inválido." }, { status: 400 });
  if (!env.ANTHROPIC_API_KEY)
    return Response.json(
      { error: "Falta la clave de Anthropic en las variables del panel (ANTHROPIC_API_KEY)." },
      { status: 422 },
    );
  await tocarLatido(db);
  try {
    const r = await generarPlan(db, parseo.data, {
      modelo: await ajuste(db, "modelo_guion", MODELO_POR_DEFECTO),
      apiKey: env.ANTHROPIC_API_KEY,
    });
    return Response.json({ ok: true, guion: r.guion, costo_usd: r.costoUsd });
  } catch (e) {
    if (!(e instanceof PresupuestoAgotado)) console.error("[plan]", e);
    return Response.json(
      { error: e instanceof Error ? e.message : "No se pudo armar el plan." },
      { status: 422 },
    );
  }
}
