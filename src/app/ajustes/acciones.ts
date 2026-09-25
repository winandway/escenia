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
  revalidatePath("/ajustes");
  return { error: "", ok: "Ajustes guardados." };
}
