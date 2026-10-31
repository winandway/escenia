// La lista de encargos de la app (cada cuenta ve los suyos) y «Proyecto nuevo».
import {
  anotarEncargoDemo,
  encargosDeLaCuenta,
  encargosDemoAbiertos,
  sesionObligatoria,
  TOPE_ENCARGOS_DEMO,
} from "@/lib/app-sesion";
import { crearEncargo } from "@/lib/director";
import { contexto } from "@/lib/entorno";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { db } = await contexto();
  const s = await sesionObligatoria(req, db);
  if (s instanceof Response) return s;
  const encargos = await encargosDeLaCuenta(db, s.tipo);
  const ultimos = encargos.length
    ? await db.todos<{ encargo_id: number; texto: string }>(
        `SELECT m.encargo_id, m.texto FROM director_mensajes m
         WHERE m.id IN (SELECT MAX(id) FROM director_mensajes WHERE rol != 'aviso' AND encargo_id IN (${encargos
           .map(() => "?")
           .join(",")}) GROUP BY encargo_id)`,
        encargos.map((e) => e.id),
      )
    : [];
  const ultimo = new Map(ultimos.map((u) => [u.encargo_id, u.texto]));
  return Response.json({
    cuenta: s.tipo,
    encargos: encargos.map((e) => ({
      id: e.id,
      titulo: e.titulo,
      costoUsd: e.costo_usd,
      actualizadoEn: e.actualizado_en,
      ultimo: (ultimo.get(e.id) ?? "").slice(0, 140),
    })),
  });
}

export async function POST(req: Request) {
  const { db } = await contexto();
  const s = await sesionObligatoria(req, db);
  if (s instanceof Response) return s;
  if (s.tipo === "demo" && (await encargosDemoAbiertos(db)) >= TOPE_ENCARGOS_DEMO)
    return Response.json(
      { error: "The demo account has too many open projects. Archive one first.", codigo: "tope" },
      { status: 429 },
    );
  const id = await crearEncargo(db);
  if (s.tipo === "demo") await anotarEncargoDemo(db, id);
  return Response.json({ ok: true, id });
}
