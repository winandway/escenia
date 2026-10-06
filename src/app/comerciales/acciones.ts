"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigirSesion } from "@/lib/auth";
import { contexto } from "@/lib/entorno";
import { otraVersionComercial, quitarComercial, reintentarComercial } from "@/lib/comerciales";

const idDe = (datos: FormData) => z.coerce.number().int().positive().parse(datos.get("id"));

/** «Armar otra vez»: el mismo pedido vuelve a la fila (plan nuevo, video nuevo). */
export async function armarOtraVez(datos: FormData): Promise<void> {
  await exigirSesion();
  const { db } = await contexto();
  await otraVersionComercial(db, idDe(datos));
  revalidatePath("/comerciales");
}

export async function reintentar(datos: FormData): Promise<void> {
  await exigirSesion();
  const { db } = await contexto();
  await reintentarComercial(db, idDe(datos));
  revalidatePath("/comerciales");
}

/** «Quitar»: sale de la lista (no se borra nada: ni el guion ni sus videos). */
export async function quitarDeLaLista(datos: FormData): Promise<void> {
  await exigirSesion();
  const { db } = await contexto();
  await quitarComercial(db, idDe(datos));
  revalidatePath("/comerciales");
}
