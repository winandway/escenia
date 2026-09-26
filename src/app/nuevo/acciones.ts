"use server";

import { redirect } from "next/navigation";
import { exigirSesion } from "@/lib/auth";
import { crearGuionDesdeTema, esquemaNuevoTema } from "@/lib/crear-guion";
import { contexto } from "@/lib/entorno";

export type EstadoNuevo = { error: string };

export async function crearGuion(_previo: EstadoNuevo, datos: FormData): Promise<EstadoNuevo> {
  await exigirSesion();
  const parseo = esquemaNuevoTema.safeParse(Object.fromEntries(datos));
  if (!parseo.success) return { error: parseo.error.issues[0]?.message ?? "Revisa el formulario." };
  const { env, db } = await contexto();
  const r = await crearGuionDesdeTema(db, env.ANTHROPIC_API_KEY, parseo.data);
  if (!r.ok) return { error: r.error };
  redirect(`/guiones/${r.guionId}`);
}
