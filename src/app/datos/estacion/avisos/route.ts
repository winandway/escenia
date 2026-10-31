// La Mac pide a quién avisar cuando entrega un video (C-APP-IOS-4): los iPhone de la cuenta de Richard y,
// si el video salió del Director, el número y el nombre del proyecto (al tocar el aviso se abre ese chat).
// GET ?trabajo=<id> o ?publicidad=<id>. DELETE {token}: Apple dijo que esa dirección ya no sirve.
import { z } from "zod";
import { borrarTokenDeAvisos, telefonosParaAvisar } from "@/lib/app-sesion";
import { contexto } from "@/lib/entorno";
import { estacionAutorizada, respuestaNoAutorizada } from "@/lib/estacion-auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { env, db } = await contexto();
  if (!estacionAutorizada(req.headers.get("authorization"), env.ESTACION_SECRETO))
    return respuestaNoAutorizada();
  const p = new URL(req.url).searchParams;
  const trabajo = Number(p.get("trabajo") ?? 0);
  const publicidad = Number(p.get("publicidad") ?? 0);
  const encargo = trabajo
    ? await db.uno<{ id: number; titulo: string }>(
        "SELECT e.id, e.titulo FROM director_trabajos t JOIN director_encargos e ON e.id = t.encargo_id WHERE t.id = ?",
        [trabajo],
      )
    : publicidad
      ? await db.uno<{ id: number; titulo: string }>(
          "SELECT e.id, e.titulo FROM director_propuestas p JOIN director_encargos e ON e.id = p.encargo_id WHERE p.publicidad_id = ?",
          [publicidad],
        )
      : null;
  const nombre = publicidad
    ? await db.uno<{ nombre: string }>("SELECT nombre FROM publicidades WHERE id = ?", [publicidad])
    : null;
  return Response.json({
    telefonos: await telefonosParaAvisar(db),
    encargoId: encargo?.id ?? null,
    titulo: encargo?.titulo ?? nombre?.nombre ?? "",
  });
}

export async function DELETE(req: Request) {
  const { env, db } = await contexto();
  if (!estacionAutorizada(req.headers.get("authorization"), env.ESTACION_SECRETO))
    return respuestaNoAutorizada();
  const parseo = z
    .object({ token: z.string().min(10).max(200) })
    .safeParse(await req.json().catch(() => null));
  if (parseo.success) await borrarTokenDeAvisos(db, parseo.data.token);
  return Response.json({ ok: true });
}
