// La puerta del gerente de correo de Richard (C-GERENTE-1, mismo contrato que Divoox).
// GET ?estado=abiertos (los que esperan respuesta) o ?estado=todos. Con «Authorization: Bearer <secreto>».
import { ipDelPedido } from "@/lib/app-sesion";
import { pasaLimite, secretoDelGerenteValido, ticketsParaElGerente } from "@/lib/ayuda";
import { contexto } from "@/lib/entorno";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { env, db } = await contexto();
  // El límite cuenta también los intentos con el secreto malo: así no se puede adivinar a la fuerza.
  if (!(await pasaLimite(db, `gerente:${ipDelPedido(req)}`, 30, 60)))
    return Response.json({ error: "Demasiados pedidos." }, { status: 429 });
  if (!(await secretoDelGerenteValido(db, req.headers.get("authorization"), env.GERENTE_SECRETO)))
    return Response.json({ error: "No autorizado." }, { status: 401 });
  const todos = new URL(req.url).searchParams.get("estado") === "todos";
  return Response.json(
    { tickets: await ticketsParaElGerente(db, todos, env.ESTACION_SECRETO) },
    { headers: { "cache-control": "no-store" } },
  );
}
