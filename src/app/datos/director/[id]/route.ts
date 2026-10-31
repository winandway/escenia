// Richard le escribe al Director (docs/DIRECTOR.md). El mensaje se guarda primero; después la IA
// responde. Si la IA falla, lo escrito ya quedó en la conversación y se puede pedir que responda
// otra vez (texto vacío) sin escribirlo de nuevo. También acepta el secreto de la Estación.
import { z } from "zod";
import { CARPETA_MAGGIE, mensajesDemoHoy, puedeVerEncargo, TOPE_MENSAJES_DEMO_DIA } from "@/lib/app-sesion";
import { ajuste } from "@/lib/consultas";
import { anotarMensaje, encargoPorId, mensajesDelEncargo, responderDirector } from "@/lib/director";
import { contexto } from "@/lib/entorno";
import { encargoAjeno, puedeSubir } from "@/lib/permiso-subida";
import { PresupuestoAgotado } from "@/lib/presupuesto";
import { MODELO_POR_DEFECTO } from "@compartido/modelos";

export const dynamic = "force-dynamic";

const esquema = z.object({ texto: z.string().trim().max(4000, "El mensaje es muy largo.").default("") });

export async function POST(req: Request, ctx: RouteContext<"/datos/director/[id]">) {
  const { env, db, bucket } = await contexto();
  const permiso = await puedeSubir(req, db, env.ESTACION_SECRETO, { cuentaDemo: true });
  if (!permiso.ok) return permiso.respuesta;
  const id = Number((await ctx.params).id);
  if (!(await puedeVerEncargo(db, permiso.app, id))) return encargoAjeno();
  if (permiso.app?.tipo === "demo" && (await mensajesDemoHoy(db)) >= TOPE_MENSAJES_DEMO_DIA)
    return Response.json(
      { error: "The demo account reached today's message limit. Try again tomorrow." },
      { status: 429 },
    );
  const encargo = Number.isInteger(id) && id > 0 ? await encargoPorId(db, id) : null;
  if (!encargo || encargo.estado !== "abierto")
    return Response.json({ error: "Ese encargo no existe o está archivado." }, { status: 404 });
  const parseo = esquema.safeParse(await req.json().catch(() => null));
  if (!parseo.success)
    return Response.json({ error: parseo.error.issues[0]?.message ?? "Revisa el mensaje." }, { status: 400 });
  const { texto } = parseo.data;
  if (texto) await anotarMensaje(db, id, "richard", texto);
  else if ((await mensajesDelEncargo(db, id)).at(-1)?.rol !== "richard")
    return Response.json({ error: "Escribe algo para el Director." }, { status: 400 });
  if (!env.ANTHROPIC_API_KEY)
    return Response.json(
      { error: "Falta la clave de la IA (Anthropic) en el panel.", guardado: true },
      { status: 503 },
    );
  try {
    const r = await responderDirector(db, id, {
      modelo: await ajuste(db, "modelo_guion", MODELO_POR_DEFECTO),
      apiKey: env.ANTHROPIC_API_KEY,
      almacen: bucket,
      // La cuenta del revisor de Apple solo ve la carpeta de su encargo y la de Maggie.
      carpetasPermitidas: permiso.app?.tipo === "demo" ? [encargo.carpeta, CARPETA_MAGGIE] : undefined,
    });
    return Response.json({ ok: true, propuestaId: r.propuestaId, costoUsd: r.costoUsd });
  } catch (e) {
    console.error("[director]", e);
    const mensaje = e instanceof Error ? e.message : "El Director no pudo responder.";
    return Response.json(
      { error: `El Director no pudo responder: ${mensaje}`, guardado: true },
      { status: e instanceof PresupuestoAgotado ? 402 : 502 },
    );
  }
}
