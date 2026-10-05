"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigirSesion } from "@/lib/auth";
import { contexto } from "@/lib/entorno";
import { otraVersion, quitarGrabacion, reintentarGrabacion } from "@/lib/grabaciones";
import { ESTILOS_VIDEO } from "@compartido/tematicas";

const idDe = (datos: FormData) => z.coerce.number().int().positive().parse(datos.get("id"));

/** «Probar con otro formato»: la misma grabación, sin subirla otra vez, con otro diseño detrás. */
export async function probarOtroFormato(datos: FormData): Promise<void> {
  await exigirSesion();
  const formato = z.enum(ESTILOS_VIDEO).parse(datos.get("formato"));
  const { db } = await contexto();
  await otraVersion(db, idDe(datos), formato);
  revalidatePath("/grabaciones");
}

/** Una que falló al prepararse vuelve a la fila. */
export async function reintentar(datos: FormData): Promise<void> {
  await exigirSesion();
  const { db } = await contexto();
  await reintentarGrabacion(db, idDe(datos));
  revalidatePath("/grabaciones");
}

/** «Quitar»: sale de la lista (no se borra nada: ni el archivo, ni su guion, ni sus videos). */
export async function quitarDeLaLista(datos: FormData): Promise<void> {
  await exigirSesion();
  const { db } = await contexto();
  await quitarGrabacion(db, idDe(datos));
  revalidatePath("/grabaciones");
}
