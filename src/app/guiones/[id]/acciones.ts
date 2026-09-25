"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { exigirSesion } from "@/lib/auth";
import { guionPorId } from "@/lib/consultas";
import { contexto } from "@/lib/entorno";
import { esquemaEscena, esquemaGuion, insertarOpinion, OPINION_MINIMA } from "@compartido/guion";

const esquemaEdicion = z.object({
  id: z.coerce.number().int().positive(),
  titulo: z.string().trim().min(5).max(100),
  gancho: z.string().trim().min(5).max(300),
  opinion: z.string().trim().max(2000).default(""),
  notas: z.string().trim().max(2000).default(""),
  escenas: z.string().transform((s, ctx) => {
    try {
      return z.array(esquemaEscena).min(3).max(30).parse(JSON.parse(s));
    } catch {
      ctx.addIssue({ code: "custom", message: "Las escenas tienen un formato inválido." });
      return z.NEVER;
    }
  }),
});

export type EstadoGuion = { error: string; ok: string };

async function guardarCambios(
  datos: FormData,
): Promise<{ error?: string; id?: number; opinion?: string; escenas?: z.infer<typeof esquemaEscena>[] }> {
  const parseo = esquemaEdicion.safeParse(Object.fromEntries(datos));
  if (!parseo.success) return { error: parseo.error.issues[0]?.message ?? "Revisa el guion." };
  const d = parseo.data;
  const { db } = await contexto();
  const guion = await guionPorId(db, d.id);
  if (!guion) return { error: "Ese guion no existe." };
  if (guion.estado === "aprobado")
    return {
      error: "Este guion ya está aprobado y en producción. Crea una versión nueva si quieres cambiarlo.",
    };

  const actual = esquemaGuion.parse(JSON.parse(guion.contenido));
  const nuevo = esquemaGuion.parse({ ...actual, titulo: d.titulo, gancho: d.gancho, escenas: d.escenas });
  await db.ejecutar(
    `UPDATE guiones SET titulo = ?, contenido = ?, opinion_richard = ?, notas_richard = ?, actualizado_en = datetime('now') WHERE id = ?`,
    [nuevo.titulo, JSON.stringify(nuevo), d.opinion, d.notas, d.id],
  );
  return { id: d.id, opinion: d.opinion, escenas: nuevo.escenas };
}

export async function guardarGuion(_previo: EstadoGuion, datos: FormData): Promise<EstadoGuion> {
  await exigirSesion();
  const r = await guardarCambios(datos);
  if (r.error) return { error: r.error, ok: "" };
  revalidatePath(`/guiones/${r.id}`);
  return { error: "", ok: "Cambios guardados." };
}

export async function aprobarGuion(_previo: EstadoGuion, datos: FormData): Promise<EstadoGuion> {
  await exigirSesion();
  const r = await guardarCambios(datos);
  if (r.error || !r.id || !r.escenas) return { error: r.error ?? "No se pudo guardar.", ok: "" };

  // Candado: sin la opinión de Richard no hay video (aporte humano obligatorio).
  const opinion = (r.opinion ?? "").trim();
  if (opinion.length < OPINION_MINIMA) {
    return {
      error: `Escribe tu opinión (al menos ${OPINION_MINIMA} letras) antes de aprobar. Es lo que hace que el video sea tuyo y no una plantilla.`,
      ok: "",
    };
  }

  const { db } = await contexto();
  const guion = await guionPorId(db, r.id);
  if (!guion) return { error: "Ese guion no existe.", ok: "" };
  const contenido = esquemaGuion.parse(JSON.parse(guion.contenido));
  const conOpinion = { ...contenido, escenas: insertarOpinion(contenido.escenas, opinion) };

  await db.ejecutar(
    `UPDATE guiones SET contenido = ?, estado = 'aprobado', actualizado_en = datetime('now') WHERE id = ?`,
    [JSON.stringify(conOpinion), r.id],
  );
  await db.ejecutar("INSERT INTO trabajos (guion_id, tipo) VALUES (?, 'producir')", [r.id]);
  revalidatePath(`/guiones/${r.id}`);
  revalidatePath("/");
  return { error: "", ok: "Aprobado. La Estación lo tomará en cuanto esté conectada." };
}

export async function rechazarGuion(datos: FormData): Promise<void> {
  await exigirSesion();
  const id = z.coerce.number().int().positive().parse(datos.get("id"));
  const { db } = await contexto();
  await db.ejecutar(
    `UPDATE guiones SET estado = 'rechazado', actualizado_en = datetime('now') WHERE id = ? AND estado = 'borrador'`,
    [id],
  );
  revalidatePath("/");
  redirect("/");
}

export async function reintentarTrabajo(datos: FormData): Promise<void> {
  await exigirSesion();
  const id = z.coerce.number().int().positive().parse(datos.get("guion_id"));
  const { db } = await contexto();
  await db.ejecutar(
    `UPDATE trabajos SET estado = 'cancelado' WHERE guion_id = ? AND estado IN ('pendiente','tomado','error')`,
    [id],
  );
  await db.ejecutar("INSERT INTO trabajos (guion_id, tipo) VALUES (?, 'producir')", [id]);
  revalidatePath(`/guiones/${id}`);
}
