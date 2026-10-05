// Canario: cada pieza dice ok o error. Se consulta sin sesión pero no revela secretos.
import { contexto } from "@/lib/entorno";
import { latidoEstacion } from "@/lib/consultas";
import { estacionViva } from "@/lib/estacion-estado";
import { problemaAbiertoDeIA } from "@/lib/ia-estado";

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
    // Con clave, pero el último pedido falló por la cuenta (sin saldo, clave revocada): en rojo (C-IA-SALDO-1).
    const problemaIA = env.ANTHROPIC_API_KEY ? await problemaAbiertoDeIA(db) : null;
    piezas.anthropic = !env.ANTHROPIC_API_KEY ? "apagado" : problemaIA ? "error" : "ok";
    if (problemaIA) detalle = detalle || problemaIA.mensaje;
    piezas.turnstile = env.TURNSTILE_SECRET_KEY ? "ok" : "apagado";
    try {
      // La tabla del calendario y su columna `enlace` existen (si faltan, no se aplicó la migración).
      await db.uno("SELECT COUNT(enlace) AS n FROM calendario");
      piezas.calendario = "ok";
    } catch (e) {
      piezas.calendario = "error";
      detalle = detalle || (e instanceof Error ? e.message : String(e));
    }
    try {
      // La biblioteca de sonidos existe (C-SONIDOS-1).
      await db.uno("SELECT COUNT(archivo) AS n FROM sonidos");
      piezas.sonidos = "ok";
    } catch (e) {
      piezas.sonidos = "error";
      detalle = detalle || (e instanceof Error ? e.message : String(e));
    }
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
    {
      estado: todoBien ? "ok" : "error",
      piezas,
      detalle,
      // Qué versión del panel está en vivo: así se comprueba que una publicación ya llegó.
      version: (process.env.NEXT_PUBLIC_VERSION ?? "local").slice(0, 7),
      hora: new Date().toISOString(),
    },
    { status: todoBien ? 200 : 503, headers: { "cache-control": "no-store" } },
  );
}
