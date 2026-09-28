"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigirSesion } from "@/lib/auth";
import { guardarAjuste } from "@/lib/consultas";
import { contexto } from "@/lib/entorno";
import { esModeloPermitido } from "@compartido/modelos";

const esquema = z.object({
  presupuesto_diario_usd: z.coerce.number().min(0).max(100),
  modelo_guion: z.string().refine(esModeloPermitido, "Ese modelo está bloqueado."),
  instrucciones_extra: z.string().trim().max(4000).default(""),
  canal_ia_nombre: z.string().trim().max(60).default(""),
  canal_ia_usuario: z.string().trim().max(60).default(""),
  canal_caprichoso_nombre: z.string().trim().max(60).default(""),
  canal_caprichoso_usuario: z.string().trim().max(60).default(""),
});

export type EstadoAjustes = { error: string; ok: string };

export async function guardarAjustes(_previo: EstadoAjustes, datos: FormData): Promise<EstadoAjustes> {
  await exigirSesion();
  const parseo = esquema.safeParse(Object.fromEntries(datos));
  if (!parseo.success) return { error: parseo.error.issues[0]?.message ?? "Revisa los ajustes.", ok: "" };
  const { db } = await contexto();
  const d = parseo.data;
  await guardarAjuste(db, "presupuesto_diario_usd", String(d.presupuesto_diario_usd));
  await guardarAjuste(db, "modelo_guion", d.modelo_guion);
  await guardarAjuste(db, "instrucciones_extra", d.instrucciones_extra);
  for (const clave of [
    "canal_ia_nombre",
    "canal_ia_usuario",
    "canal_caprichoso_nombre",
    "canal_caprichoso_usuario",
  ] as const) {
    await guardarAjuste(db, clave, d[clave]);
  }
  revalidatePath("/ajustes");
  return { error: "", ok: "Ajustes guardados." };
}
