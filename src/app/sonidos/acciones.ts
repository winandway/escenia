"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigirSesion } from "@/lib/auth";
import { contexto } from "@/lib/entorno";
import { quitarSonido } from "@/lib/sonidos";

/** «Quitar»: el sonido deja de usarse en los videos nuevos (no se borra nada). */
export async function quitarDeLaBiblioteca(datos: FormData): Promise<void> {
  await exigirSesion();
  const id = z.coerce.number().int().positive().parse(datos.get("id"));
  const { db } = await contexto();
  await quitarSonido(db, id);
  revalidatePath("/sonidos");
}
