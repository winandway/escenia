"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { exigirSesion } from "@/lib/auth";
import { ajuste, guionesRecientes, productoPorId } from "@/lib/consultas";
import { contexto } from "@/lib/entorno";
import { generarGuion } from "@/lib/generador";
import { PresupuestoAgotado } from "@/lib/presupuesto";
import { elegirEstructura } from "@/lib/prompt";
import { avisoDeParecido } from "@/lib/variedad";
import { esquemaGuion } from "@compartido/guion";
import { MODELO_POR_DEFECTO } from "@compartido/modelos";
import { buscarTematica } from "@compartido/tematicas";

const esquema = z.object({
  titulo: z.string().trim().min(5, "El tema necesita al menos 5 letras.").max(200),
  contexto: z.string().trim().max(20000).default(""),
  url_fuente: z.union([z.literal(""), z.string().trim().url("El enlace no es válido.")]).default(""),
  tematica_id: z.string().min(1),
  producto_id: z.string().default(""),
});

export type EstadoNuevo = { error: string };

export async function crearGuion(_previo: EstadoNuevo, datos: FormData): Promise<EstadoNuevo> {
  await exigirSesion();
  const parseo = esquema.safeParse(Object.fromEntries(datos));
  if (!parseo.success) return { error: parseo.error.issues[0]?.message ?? "Revisa el formulario." };
  const d = parseo.data;

  const tematica = buscarTematica(d.tematica_id);
  if (!tematica || !tematica.activa) return { error: "Esa temática no está disponible todavía." };

  const { env, db } = await contexto();
  if (!env.ANTHROPIC_API_KEY)
    return { error: "Falta la clave de Anthropic en las variables del panel (ANTHROPIC_API_KEY)." };

  const producto = d.producto_id ? await productoPorId(db, d.producto_id) : null;
  if (d.producto_id && !producto) return { error: "Ese producto no existe." };

  const recientes = await guionesRecientes(db, tematica.id);
  const recientesResumen = recientes.map((r) => {
    const c = esquemaGuion.safeParse(JSON.parse(r.contenido));
    return { id: r.id, titulo: r.titulo, gancho: c.success ? c.data.gancho : "", estructura: r.estructura };
  });
  const estructura = elegirEstructura(
    tematica,
    recientes.map((r) => r.estructura),
  );

  const tema = await db.ejecutar(
    "INSERT INTO temas (tematica_id, titulo, contexto, url_fuente, estado) VALUES (?, ?, ?, ?, 'elegido')",
    [tematica.id, d.titulo, d.contexto, d.url_fuente],
  );
  const temaId = tema.ultimoId;
  if (!temaId) return { error: "No se pudo guardar el tema." };

  let resultado;
  try {
    resultado = await generarGuion(
      db,
      {
        tematica,
        tema: { titulo: d.titulo, contexto: d.contexto, urlFuente: d.url_fuente },
        producto,
        estructura,
        recientes: recientesResumen,
        instruccionesExtra: await ajuste(db, "instrucciones_extra"),
      },
      { modelo: await ajuste(db, "modelo_guion", MODELO_POR_DEFECTO), apiKey: env.ANTHROPIC_API_KEY },
    );
  } catch (e) {
    if (e instanceof PresupuestoAgotado) return { error: e.message };
    console.error("[generarGuion]", e);
    return { error: e instanceof Error ? e.message : "No se pudo generar el guion." };
  }

  const aviso = avisoDeParecido(
    { titulo: resultado.guion.titulo, gancho: resultado.guion.gancho, estructura: estructura.join(">") },
    recientesResumen,
  );

  const g = await db.ejecutar(
    `INSERT INTO guiones (tema_id, tematica_id, producto_id, titulo, contenido, estructura, modelo, costo_usd, aviso_parecido)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      temaId,
      tematica.id,
      producto?.id ?? null,
      resultado.guion.titulo,
      JSON.stringify(resultado.guion),
      estructura.join(">"),
      resultado.modelo,
      resultado.costoUsd,
      aviso,
    ],
  );
  redirect(`/guiones/${g.ultimoId}`);
}
