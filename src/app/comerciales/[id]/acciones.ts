"use server";

// C-COMERCIAL-3: Richard ve el plan del comercial (qué imagen va en cada frase), cambia o quita
// una imagen y toca «Armar el video». Recién ahí nace el trabajo y se gasta en la voz.
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigirSesion } from "@/lib/auth";
import { armarComercial, guardarCambiosDelPlan } from "@/lib/comerciales";
import { contexto } from "@/lib/entorno";
import type { CambioDeImagen } from "@compartido/comerciales";

export type RespuestaPlan = { ok: boolean; error: string; armado: boolean };

const CAMPO = /^p-(\d{1,3})-(\d{1,3})$/;

/** Los selectores del formulario se llaman «p-<escena>-<plano>» y traen el archivo elegido. */
export async function cambiosDelFormulario(datos: FormData): Promise<CambioDeImagen[]> {
  const cambios: CambioDeImagen[] = [];
  for (const [clave, valor] of datos.entries()) {
    const m = CAMPO.exec(clave);
    if (!m || typeof valor !== "string") continue;
    cambios.push({ escena: Number(m[1]), plano: Number(m[2]), archivo: valor.slice(0, 160) });
  }
  return cambios;
}

export async function guardarPlan(datos: FormData): Promise<RespuestaPlan> {
  await exigirSesion();
  const id = z.coerce.number().int().positive().safeParse(datos.get("id"));
  if (!id.success) return { ok: false, error: "No se encontró ese comercial.", armado: false };
  const armar = datos.get("accion") === "armar";
  const { db } = await contexto();
  const guardado = await guardarCambiosDelPlan(db, id.data, await cambiosDelFormulario(datos));
  // Un segundo toque a «Armar» con el video ya en marcha no es un error: se lleva a la lista.
  if (!guardado && armar && (await armarComercial(db, id.data))) return { ok: true, error: "", armado: true };
  if (!guardado)
    return {
      ok: false,
      error: "Este plan ya no se puede cambiar: el video ya se mandó a armar.",
      armado: false,
    };
  if (armar) {
    const trabajo = await armarComercial(db, id.data);
    if (!trabajo) return { ok: false, error: "No se pudo mandar a armar. Intenta otra vez.", armado: false };
  }
  revalidatePath("/comerciales");
  revalidatePath(`/comerciales/${id.data}`);
  return { ok: true, error: "", armado: armar };
}
