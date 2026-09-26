// Crea un tema y genera su guion. Lo usan el formulario del panel y la ruta
// que la Estación (o el radar) llaman con el secreto.
import { z } from "zod";
import { ajuste, guionesRecientes, productoPorId } from "./consultas";
import type { BaseDatos } from "./db";
import { generarGuion } from "./generador";
import { PresupuestoAgotado } from "./presupuesto";
import { elegirEstructura } from "./prompt";
import { avisoDeParecido } from "./variedad";
import { esquemaGuion } from "@compartido/guion";
import { MODELO_POR_DEFECTO } from "@compartido/modelos";
import { buscarTematica } from "@compartido/tematicas";

export const esquemaNuevoTema = z.object({
  titulo: z.string().trim().min(5, "El tema necesita al menos 5 letras.").max(200),
  contexto: z.string().trim().max(20000).default(""),
  url_fuente: z.union([z.literal(""), z.string().trim().url("El enlace no es válido.")]).default(""),
  tematica_id: z.string().min(1),
  producto_id: z.string().default(""),
});

export type NuevoTema = z.infer<typeof esquemaNuevoTema>;

export type ResultadoCreacion = { ok: true; guionId: number } | { ok: false; error: string };

export async function crearGuionDesdeTema(
  db: BaseDatos,
  apiKey: string | undefined,
  d: NuevoTema,
): Promise<ResultadoCreacion> {
  const tematica = buscarTematica(d.tematica_id);
  if (!tematica || !tematica.activa) return { ok: false, error: "Esa temática no está disponible todavía." };
  if (!apiKey)
    return {
      ok: false,
      error: "Falta la clave de Anthropic en las variables del panel (ANTHROPIC_API_KEY).",
    };

  const producto = d.producto_id ? await productoPorId(db, d.producto_id) : null;
  if (d.producto_id && !producto) return { ok: false, error: "Ese producto no existe." };

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
  if (!temaId) return { ok: false, error: "No se pudo guardar el tema." };

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
      { modelo: await ajuste(db, "modelo_guion", MODELO_POR_DEFECTO), apiKey },
    );
  } catch (e) {
    if (e instanceof PresupuestoAgotado) return { ok: false, error: e.message };
    console.error("[generarGuion]", e);
    return { ok: false, error: e instanceof Error ? e.message : "No se pudo generar el guion." };
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
  if (!g.ultimoId) return { ok: false, error: "No se pudo guardar el guion." };
  return { ok: true, guionId: g.ultimoId };
}
