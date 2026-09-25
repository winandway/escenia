// Cliente HTTP del panel. Todo pasa por /datos/estacion/* con el secreto.
import { readFile } from "node:fs/promises";
import { esquemaGuion, type Guion } from "@compartido/guion";
import { z } from "zod";
import { config } from "./config";

const esquemaTrabajo = z.object({
  trabajo: z
    .object({
      id: z.number(),
      guion_id: z.number(),
      tipo: z.string(),
      tematica_id: z.string(),
      plantilla: z.enum(["TechExplainer", "MiniDocumental"]),
      contenido: esquemaGuion,
      producto: z.object({ nombre: z.string(), url: z.string() }).nullable(),
    })
    .nullable(),
});

export type Trabajo = NonNullable<z.infer<typeof esquemaTrabajo>["trabajo"]> & { contenido: Guion };

async function llamar(
  ruta: string,
  cuerpo: unknown,
  opciones: { crudo?: Buffer; contentType?: string } = {},
): Promise<unknown> {
  const r = await fetch(`${config.PANEL_URL}${ruta}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${config.ESTACION_SECRETO}`,
      "content-type": opciones.contentType ?? "application/json",
    },
    body: opciones.crudo ? new Uint8Array(opciones.crudo) : JSON.stringify(cuerpo),
  });
  const texto = await r.text();
  if (!r.ok) throw new Error(`El panel respondió ${r.status} en ${ruta}: ${texto.slice(0, 300)}`);
  return texto ? JSON.parse(texto) : {};
}

export const panel = {
  async siguiente(): Promise<Trabajo | null> {
    const r = esquemaTrabajo.parse(await llamar("/datos/estacion/siguiente", { version: config.VERSION }));
    return r.trabajo;
  },
  avance: (id: number, paso: string, progreso: number) =>
    llamar(`/datos/estacion/trabajos/${id}`, { accion: "avance", paso, progreso }),
  error: (id: number, error: string) =>
    llamar(`/datos/estacion/trabajos/${id}`, { accion: "error", error: error.slice(0, 2000) }),
  gasto: (id: number, servicio: string, detalle: string, costo_usd: number) =>
    llamar(`/datos/estacion/trabajos/${id}`, { accion: "gasto", servicio, detalle, costo_usd }),
  hecho: (
    id: number,
    renders: {
      formato: "16x9" | "9x16";
      ruta_local: string;
      bytes: number;
      duracion_seg: number;
      voz_de_prueba: boolean;
    }[],
  ) => llamar(`/datos/estacion/trabajos/${id}`, { accion: "hecho", renders }),
  async subirArchivo(
    guionId: number,
    tipo: string,
    extension: "mp3" | "json" | "png",
    ruta: string,
    meta: Record<string, unknown> = {},
  ) {
    const crudo = await readFile(ruta);
    const q = new URLSearchParams({ guion_id: String(guionId), tipo, extension, meta: JSON.stringify(meta) });
    const tipos = { mp3: "audio/mpeg", json: "application/json", png: "image/png" } as const;
    return llamar(`/datos/estacion/archivos?${q}`, null, { crudo, contentType: tipos[extension] });
  },
};
