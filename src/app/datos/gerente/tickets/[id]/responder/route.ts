// El gerente contesta un caso (C-GERENTE-1): {texto, plantilla?: "P1".."P9", cerrar?: boolean}.
// Devuelve {ok, numero, plantilla, aviso: "ok"|"error"|"sin_app", correo: "ok"|"error", correo_motivo?}.
import { z } from "zod";
import { ipDelPedido } from "@/lib/app-sesion";
import { pasaLimite, responderComoSoporte, secretoDelGerenteValido } from "@/lib/ayuda";
import { contexto } from "@/lib/entorno";

export const dynamic = "force-dynamic";

const esquema = z.object({
  texto: z.string().trim().min(1).max(4000),
  plantilla: z
    .string()
    .regex(/^P[1-9]$/)
    .optional(),
  cerrar: z.boolean().default(false),
});

export async function POST(req: Request, ctx: RouteContext<"/datos/gerente/tickets/[id]/responder">) {
  const { env, db } = await contexto();
  if (!(await pasaLimite(db, `gerente:${ipDelPedido(req)}`, 30, 60)))
    return Response.json({ error: "Demasiados pedidos." }, { status: 429 });
  if (!(await secretoDelGerenteValido(db, req.headers.get("authorization"), env.GERENTE_SECRETO)))
    return Response.json({ error: "No autorizado." }, { status: 401 });
  const parseo = esquema.safeParse(await req.json().catch(() => null));
  if (!parseo.success) return Response.json({ error: "Falta el texto de la respuesta." }, { status: 400 });
  const id = Number((await ctx.params).id);
  const r =
    Number.isInteger(id) && id > 0
      ? await responderComoSoporte(db, id, parseo.data, { token: env.YAD_TOKEN })
      : null;
  if (!r) return Response.json({ error: "Ese caso no existe." }, { status: 404 });
  return Response.json(r);
}
