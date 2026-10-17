"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigirSesion } from "@/lib/auth";
import { contexto } from "@/lib/entorno";
import { otraVezPublicidad, quitarPublicidad } from "@/lib/publicidades";

const idDe = (datos: FormData) => z.coerce.number().int().positive().parse(datos.get("id"));

/** «Armar otra vez»: el mismo pedido vuelve a la fila (plan nuevo, video nuevo). */
export async function armarOtraVez(datos: FormData): Promise<void> {
  await exigirSesion();
  const { db } = await contexto();
  await otraVezPublicidad(db, idDe(datos));
  revalidatePath("/publicidad");
}

/** «Quitar»: sale de la lista (no se borra nada: el video sigue guardado). */
export async function quitarDeLaLista(datos: FormData): Promise<void> {
  await exigirSesion();
  const { db } = await contexto();
  await quitarPublicidad(db, idDe(datos));
  revalidatePath("/publicidad");
}
