"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigirSesion } from "@/lib/auth";
import {
  agendar,
  agendarEnProximoHueco,
  cambiarEstado,
  descartar,
  guardarEnlace,
  guardarReglas,
  mover,
  pendientes,
  quitar,
} from "@/lib/calendario";
import { contexto } from "@/lib/entorno";
import { CANALES_CALENDARIO, conPunto, cuando, PLATAFORMAS } from "@compartido/calendario";

export type EstadoForm = { error: string; ok: string };
/** El formulario manual recibe de vuelta lo escrito si el servidor lo rechaza. */
export type EstadoManual = EstadoForm & { valores: Record<string, string> };

function refrescar() {
  revalidatePath("/calendario");
  revalidatePath("/guiones/[id]", "page");
}

const textos = (datos: FormData): Record<string, string> => {
  const r: Record<string, string> = {};
  datos.forEach((v, k) => {
    if (typeof v === "string") r[k] = v;
  });
  return r;
};

/** La hora llega del chip tocado o, si se escribió otra, del campo «Otra hora». */
const horaDe = (c: Record<string, string>) => c.hora || c.hora_libre || "";

export async function agendarPieza(_previo: EstadoForm, datos: FormData): Promise<EstadoForm> {
  await exigirSesion();
  const { db } = await contexto();
  const c = textos(datos);
  const r = await agendar(db, { ...c, hora: horaDe(c) }, new Date());
  if (!r.ok) return { error: r.error, ok: "" };
  refrescar();
  return { error: "", ok: conPunto(`Agendado: ${cuando(r.fecha, r.hora)}`) };
}

export async function agregarManual(_previo: EstadoManual, datos: FormData): Promise<EstadoManual> {
  await exigirSesion();
  const { db } = await contexto();
  const c = textos(datos);
  const r = await agendar(db, { ...c, guion_id: "", indice: 0 }, new Date());
  if (!r.ok) return { error: r.error, ok: "", valores: c };
  refrescar();
  return { error: "", ok: conPunto(`Agregado: ${cuando(r.fecha, r.hora)}`), valores: {} };
}

export async function moverEntrada(_previo: EstadoForm, datos: FormData): Promise<EstadoForm> {
  await exigirSesion();
  const { db } = await contexto();
  const c = textos(datos);
  const id = z.coerce.number().int().positive().safeParse(c.id);
  if (!id.success) return { error: "Esa publicación ya no está en el calendario.", ok: "" };
  const r = await mover(db, id.data, c.fecha ?? "", horaDe(c), new Date());
  if (!r.ok) return { error: r.error, ok: "" };
  refrescar();
  return { error: "", ok: conPunto(`Ahora sale: ${cuando(r.fecha, r.hora)}`) };
}

const esquemaFiltro = z.object({
  plataforma: z.enum(PLATAFORMAS).default("youtube"),
  canal: z
    .enum(CANALES_CALENDARIO)
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

/** Un toque: reparte todo lo pendiente en los próximos huecos libres. */
export async function agendarTodas(_previo: EstadoForm, datos: FormData): Promise<EstadoForm> {
  await exigirSesion();
  const filtro = esquemaFiltro.safeParse(textos(datos));
  if (!filtro.success) return { error: "Elige la plataforma.", ok: "" };
  const { db } = await contexto();
  const lista = (await pendientes(db, filtro.data.plataforma)).filter(
    (p) => !filtro.data.canal || p.canal === filtro.data.canal,
  );
  let hechas = 0;
  for (const pieza of lista) {
    const r = await agendarEnProximoHueco(db, { ...pieza, plataforma: filtro.data.plataforma }, new Date());
    if (!r.ok) {
      refrescar();
      return {
        error: `Se agendaron ${hechas} de ${lista.length}. «${pieza.titulo}» no entró: ${r.error}`,
        ok: "",
      };
    }
    hechas += 1;
  }
  refrescar();
  return { error: "", ok: hechas === 1 ? "Se agendó 1 video." : `Se agendaron ${hechas} videos.` };
}

export async function marcarEstado(datos: FormData): Promise<void> {
  await exigirSesion();
  const parseo = z
    .object({
      id: z.coerce.number().int().positive(),
      estado: z.enum(["agendado", "programado", "publicado"]),
    })
    .safeParse(textos(datos));
  if (!parseo.success) return;
  const { db } = await contexto();
  await cambiarEstado(db, parseo.data.id, parseo.data.estado);
  refrescar();
}

export async function quitarEntrada(datos: FormData): Promise<void> {
  await exigirSesion();
  const id = z.coerce.number().int().positive().safeParse(datos.get("id"));
  if (!id.success) return;
  const { db } = await contexto();
  await quitar(db, id.data);
  refrescar();
}

export async function quitarDeLaLista(datos: FormData): Promise<void> {
  await exigirSesion();
  const { db } = await contexto();
  await descartar(db, textos(datos));
  refrescar();
}

export async function guardarReglasCalendario(_previo: EstadoManual, datos: FormData): Promise<EstadoManual> {
  await exigirSesion();
  const { db } = await contexto();
  const c = textos(datos);
  const r = await guardarReglas(db, c);
  if (!r.ok) return { error: r.error, ok: "", valores: c };
  refrescar();
  return { error: "", ok: "Reglas guardadas.", valores: c };
}

export async function guardarEnlaceEntrada(_previo: EstadoManual, datos: FormData): Promise<EstadoManual> {
  await exigirSesion();
  const c = textos(datos);
  const id = z.coerce.number().int().positive().safeParse(c.id);
  if (!id.success) return { error: "Esa publicación ya no está en el calendario.", ok: "", valores: c };
  const { db } = await contexto();
  const r = await guardarEnlace(db, id.data, c.enlace ?? "");
  if (!r.ok) return { error: r.error, ok: "", valores: c };
  refrescar();
  return {
    error: "",
    ok: r.enlace ? "Enlace guardado. Ya se ve su miniatura." : "Enlace quitado.",
    valores: { enlace: r.enlace },
  };
}
