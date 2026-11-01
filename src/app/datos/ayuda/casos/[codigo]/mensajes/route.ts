// La persona escribe otra vez en su caso (C-AYUDA-1): el caso vuelve a quedar abierto para el gerente.
import { z } from "zod";
import { esTokenDeAvisos, ipDelPedido } from "@/lib/app-sesion";
import { escribirComoCliente, pasaLimite } from "@/lib/ayuda";
import { contexto } from "@/lib/entorno";

export const dynamic = "force-dynamic";

const esquema = z.object({
  texto: z.string().trim().min(1).max(4000),
  aviso_token: z.string().refine(esTokenDeAvisos).optional(),
});

export async function POST(req: Request, ctx: RouteContext<"/datos/ayuda/casos/[codigo]/mensajes">) {
  const { db } = await contexto();
  const parseo = esquema.safeParse(await req.json().catch(() => null));
  if (!parseo.success)
    return Response.json({ error: "Write your message first.", codigo: "datos" }, { status: 400 });
  if (!(await pasaLimite(db, `ayuda-escribir:${ipDelPedido(req)}`, 20, 600)))
    return Response.json(
      { error: "Too many requests. Try again later.", codigo: "intentos" },
      { status: 429 },
    );
  const ok = await escribirComoCliente(
    db,
    (await ctx.params).codigo,
    parseo.data.texto,
    parseo.data.aviso_token,
  );
  if (!ok) return Response.json({ error: "This case doesn't exist.", codigo: "no_existe" }, { status: 404 });
  return Response.json({ ok: true }, { status: 201 });
}
