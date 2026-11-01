// El chat de un caso de ayuda para quien tiene su enlace secreto (C-AYUDA-1). Sin correo ni datos internos.
import { ipDelPedido } from "@/lib/app-sesion";
import { casoPorCodigo, pasaLimite } from "@/lib/ayuda";
import { contexto } from "@/lib/entorno";

export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: RouteContext<"/datos/ayuda/casos/[codigo]">) {
  const { db } = await contexto();
  if (!(await pasaLimite(db, `ayuda-leer:${ipDelPedido(req)}`, 60, 60)))
    return Response.json(
      { error: "Too many requests. Try again later.", codigo: "intentos" },
      { status: 429 },
    );
  const caso = await casoPorCodigo(db, (await ctx.params).codigo);
  if (!caso)
    return Response.json({ error: "This case doesn't exist.", codigo: "no_existe" }, { status: 404 });
  return Response.json(caso, { headers: { "cache-control": "no-store" } });
}
