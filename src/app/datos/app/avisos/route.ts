// La app guarda (POST) o quita (DELETE) la dirección de avisos de su iPhone (C-APP-IOS-4). La Mac la usa
// para avisar cuando un video está listo. Solo se guarda la de la cuenta de Richard.
import { z } from "zod";
import {
  borrarTokenDeAvisos,
  esTokenDeAvisos,
  guardarTokenDeAvisos,
  sesionObligatoria,
} from "@/lib/app-sesion";
import { contexto } from "@/lib/entorno";

export const dynamic = "force-dynamic";

const esquema = z.object({
  token: z.string().refine(esTokenDeAvisos, "Dirección de avisos inválida."),
  idioma: z.enum(["en", "es"]).default("en"),
});

export async function POST(req: Request) {
  const { db } = await contexto();
  const s = await sesionObligatoria(req, db);
  if (s instanceof Response) return s;
  const parseo = esquema.safeParse(await req.json().catch(() => null));
  if (!parseo.success) return Response.json({ error: "Dirección de avisos inválida." }, { status: 400 });
  if (s.tipo === "richard") await guardarTokenDeAvisos(db, parseo.data.token, s.tipo, parseo.data.idioma);
  return Response.json({ ok: true });
}

export async function DELETE(req: Request) {
  const { db } = await contexto();
  const s = await sesionObligatoria(req, db);
  if (s instanceof Response) return s;
  const parseo = esquema.safeParse(await req.json().catch(() => null));
  if (parseo.success) await borrarTokenDeAvisos(db, parseo.data.token);
  return Response.json({ ok: true });
}
