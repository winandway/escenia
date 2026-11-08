"use server";

// C-COMERCIAL-4: Richard elige la imagen y los textos de la miniatura del comercial. Se guarda y la
// Mac la vuelve a dibujar con la misma plantilla (no gasta nada) y la sube al lado del video.
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigirSesion } from "@/lib/auth";
import { pedirPortada } from "@/lib/comerciales";
import { contexto } from "@/lib/entorno";

export type RespuestaMiniatura = { ok: boolean; error: string; cambio: boolean };

export async function elegirMiniatura(datos: FormData): Promise<RespuestaMiniatura> {
  await exigirSesion();
  const id = z.coerce.number().int().positive().safeParse(datos.get("id"));
  if (!id.success) return { ok: false, error: "No se encontró ese comercial.", cambio: false };
  const { db } = await contexto();
  const r = await pedirPortada(db, id.data, {
    archivo: datos.get("archivo") ?? "",
    titulo: datos.get("titulo") ?? "",
    frase: datos.get("frase") ?? "",
  });
  if (!r.ok) return { ok: false, error: r.error, cambio: false };
  revalidatePath(`/comerciales/${id.data}/miniatura`);
  revalidatePath("/comerciales");
  return { ok: true, error: "", cambio: r.cambio };
}
