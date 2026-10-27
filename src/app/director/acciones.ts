"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { exigirSesion } from "@/lib/auth";
import { aprobarPropuesta, archivarEncargo, crearEncargo } from "@/lib/director";
import { contexto } from "@/lib/entorno";

const idDe = (datos: FormData) => z.coerce.number().int().positive().parse(datos.get("id"));

/** «Encargo nuevo»: una conversación nueva con su propia carpeta de fotos. */
export async function nuevoEncargo(): Promise<void> {
  await exigirSesion();
  const { db } = await contexto();
  const id = await crearEncargo(db);
  redirect(`/director/${id}`);
}

/** El botón de la tarjeta (C-DIRECTOR-1): la única forma de que una propuesta se vuelva un video. */
export async function aprobar(datos: FormData): Promise<void> {
  await exigirSesion();
  const { db } = await contexto();
  const r = await aprobarPropuesta(db, idDe(datos));
  revalidatePath(`/director/${r.encargoId}`);
  revalidatePath("/publicidad");
}

/** «Archivar»: sale de la lista; la conversación y sus videos se conservan. */
export async function archivar(datos: FormData): Promise<void> {
  await exigirSesion();
  const { db } = await contexto();
  await archivarEncargo(db, idDe(datos));
  revalidatePath("/director");
}
