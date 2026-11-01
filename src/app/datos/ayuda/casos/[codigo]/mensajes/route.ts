// La persona escribe otra vez en su caso (C-AYUDA-1), con texto, capturas ya subidas (C-AYUDA-2) o las dos
// cosas: el caso vuelve a quedar abierto para el gerente.
import { z } from "zod";
import { esTokenDeAvisos, ipDelPedido } from "@/lib/app-sesion";
import { escribirComoCliente, pasaLimite } from "@/lib/ayuda";
import { MAX_ADJUNTOS_POR_MENSAJE } from "@/lib/ayuda-adjuntos";
import { contexto } from "@/lib/entorno";

export const dynamic = "force-dynamic";

const esquema = z
  .object({
    texto: z.string().trim().max(4000).default(""),
    adjuntos: z.array(z.number().int().positive()).max(MAX_ADJUNTOS_POR_MENSAJE).default([]),
    aviso_token: z.string().refine(esTokenDeAvisos).optional(),
  })
  .refine((d) => d.texto !== "" || d.adjuntos.length > 0);

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
  const d = parseo.data;
  const r = await escribirComoCliente(db, (await ctx.params).codigo, d.texto, d.aviso_token, d.adjuntos);
  if (r === "no_existe")
    return Response.json({ error: "This case doesn't exist.", codigo: "no_existe" }, { status: 404 });
  if (r === "adjuntos")
    return Response.json(
      { error: "Upload the images again and resend your message.", codigo: "adjuntos" },
      { status: 409 },
    );
  return Response.json({ ok: true }, { status: 201 });
}
