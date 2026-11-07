"use server";

// Las fichas del Podcast IA (docs/PODCAST.md): guardar, archivar y el tope de minutos del día.
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigirSesion } from "@/lib/auth";
import { guardarAjuste } from "@/lib/consultas";
import { contexto } from "@/lib/entorno";
import { archivarFicha, guardarFicha } from "@/lib/podcast";
import {
  AJUSTE_TOPE_MINUTOS,
  LIMITES_FICHA as L,
  TOPE_MINUTOS_MAXIMO,
  VOCES_INVITADO,
} from "@compartido/podcast";

const texto = (max: number, mensaje: string) => z.string().trim().max(max, mensaje).default("");

const esquemaFicha = z.object({
  id: z.coerce.number().int().positive().optional().catch(undefined),
  nombre: z
    .string()
    .trim()
    .min(1, "Escribe el nombre del invitado.")
    .max(L.nombre, `El nombre va hasta ${L.nombre} letras.`),
  etiqueta: texto(L.etiqueta, `La etiqueta va hasta ${L.etiqueta} letras.`),
  tema: texto(L.tema, `El tema va hasta ${L.tema} letras.`),
  personalidad: texto(L.personalidad, `La personalidad va hasta ${L.personalidad} letras.`),
  voz: z.enum(VOCES_INVITADO, { message: "Elige una voz del banco." }),
  historia: z
    .string()
    .trim()
    .min(40, "Escribe la historia: es lo único que sabe el invitado.")
    .max(L.historia, `La historia va hasta ${L.historia} letras.`),
  primer_mensaje: texto(L.primer_mensaje, `El saludo va hasta ${L.primer_mensaje} letras.`),
  permiso: z.literal("on").optional(),
});

export type EstadoFicha = { error: string; ok: string; id: number | null };

export async function guardarFichaAccion(_previo: EstadoFicha, datos: FormData): Promise<EstadoFicha> {
  await exigirSesion();
  const parseo = esquemaFicha.safeParse(Object.fromEntries(datos));
  if (!parseo.success)
    return { error: parseo.error.issues[0]?.message ?? "Revisa la ficha.", ok: "", id: null };
  const d = parseo.data;
  const { db } = await contexto();
  try {
    const id = await guardarFicha(db, d.id ?? null, {
      nombre: d.nombre,
      etiqueta: d.etiqueta || "Invitado especial",
      tema: d.tema,
      personalidad: d.personalidad,
      voz: d.voz,
      historia: d.historia,
      primer_mensaje: d.primer_mensaje,
      permiso: d.permiso === "on",
    });
    revalidatePath("/podcast/fichas");
    revalidatePath("/podcast");
    return { error: "", ok: "Ficha guardada.", id };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo guardar la ficha.", ok: "", id: null };
  }
}

export async function archivarFichaAccion(datos: FormData): Promise<void> {
  await exigirSesion();
  const id = Number(datos.get("id"));
  if (!Number.isInteger(id) || id < 1) return;
  const { db } = await contexto();
  await archivarFicha(db, id);
  revalidatePath("/podcast/fichas");
  revalidatePath("/podcast");
}

export type EstadoTope = { error: string; ok: string };

export async function guardarTopeAccion(_previo: EstadoTope, datos: FormData): Promise<EstadoTope> {
  await exigirSesion();
  const n = z.coerce
    .number()
    .int("Escribe minutos enteros.")
    .min(0)
    .max(TOPE_MINUTOS_MAXIMO, `El tope va hasta ${TOPE_MINUTOS_MAXIMO} minutos al día.`)
    .safeParse(datos.get("minutos"));
  if (!n.success) return { error: n.error.issues[0]?.message ?? "Revisa el tope.", ok: "" };
  const { db } = await contexto();
  await guardarAjuste(db, AJUSTE_TOPE_MINUTOS, String(n.data));
  revalidatePath("/podcast/fichas");
  revalidatePath("/podcast");
  return { error: "", ok: "Tope guardado." };
}
