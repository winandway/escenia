// Canario: cada pieza dice ok o error. Se consulta sin sesión pero no revela secretos.
import { contexto } from "@/lib/entorno";
import { latidoEstacion } from "@/lib/consultas";
import { estacionViva } from "@/lib/estacion-estado";

export const dynamic = "force-dynamic";

export async function GET() {
  const piezas: Record<string, "ok" | "error" | "apagado"> = {};
  let detalle = "";
  try {
    const { env, db, bucket } = await contexto();
    piezas.variables = "ok";
    try {
      await db.uno("SELECT 1 AS uno");
      piezas.base = "ok";
    } catch (e) {
      piezas.base = "error";
      detalle = e instanceof Error ? e.message : String(e);
    }
    piezas.almacen = bucket ? "ok" : "error";
    piezas.anthropic = env.ANTHROPIC_API_KEY ? "ok" : "apagado";
    piezas.turnstile = env.TURNSTILE_SECRET_KEY ? "ok" : "apagado";
    try {
      const latido = await latidoEstacion(db);
      piezas.estacion = estacionViva(latido) ? "ok" : "apagado";
    } catch {
      piezas.estacion = "error";
    }
  } catch (e) {
    piezas.variables = "error";
    detalle = e instanceof Error ? e.message : String(e);
  }
  const todoBien = Object.values(piezas).every((v) => v !== "error");
  return Response.json(
    { estado: todoBien ? "ok" : "error", piezas, detalle, hora: new Date().toISOString() },
    { status: todoBien ? 200 : 503, headers: { "cache-control": "no-store" } },
  );
}
