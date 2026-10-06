"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigirSesion } from "@/lib/auth";
import { contexto } from "@/lib/entorno";
import { quitarCarpeta, quitarImagen } from "@/lib/imagenes";

/** «Quitar»: la imagen deja de ofrecerse (no se borra nada). */
export async function quitarDeLaBiblioteca(datos: FormData): Promise<void> {
  await exigirSesion();
  const id = z.coerce.number().int().positive().parse(datos.get("id"));
  const { db } = await contexto();
  await quitarImagen(db, id);
  revalidatePath("/imagenes");
}

/** «Quitar la carpeta»: todas sus imágenes dejan de ofrecerse (no se borra nada). */
export async function quitarCarpetaEntera(datos: FormData): Promise<void> {
  await exigirSesion();
  const carpeta = z.string().trim().min(1).max(60).parse(datos.get("carpeta"));
  const { db } = await contexto();
  await quitarCarpeta(db, carpeta);
  revalidatePath("/imagenes");
}
