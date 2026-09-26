// Cliente HTTP del panel. Todo pasa por /datos/estacion/* con el secreto.
import { open, readFile } from "node:fs/promises";
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
  opciones: { crudo?: Buffer; contentType?: string; metodo?: "POST" | "PUT" } = {},
): Promise<unknown> {
  const r = await fetch(`${config.PANEL_URL}${ruta}`, {
    method: opciones.metodo ?? "POST",
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
  /** Sube el MP4 al almacén del panel por partes de 8 MB (multipart de R2). */
  async subirVideo(
    guionId: number,
    formato: "16x9" | "9x16",
    ruta: string,
    datos: { duracion_seg: number; voz_de_prueba: boolean },
    avisar: (pct: number) => void = () => {},
  ): Promise<{ clave: string; bytes: number }> {
    const PARTE = 8 * 1024 * 1024;
    const inicio = (await llamar("/datos/estacion/videos/iniciar", { guion_id: guionId, formato })) as {
      clave: string;
      uploadId: string;
    };
    const archivo = await open(ruta, "r");
    const partes: { partNumber: number; etag: string }[] = [];
    try {
      const total = (await archivo.stat()).size;
      let posicion = 0;
      let n = 1;
      while (posicion < total) {
        const largo = Math.min(PARTE, total - posicion);
        const trozo = Buffer.alloc(largo);
        await archivo.read(trozo, 0, largo, posicion);
        const q = new URLSearchParams({ clave: inicio.clave, uploadId: inicio.uploadId, n: String(n) });
        const r = (await llamar(`/datos/estacion/videos/parte?${q}`, null, {
          crudo: trozo,
          contentType: "application/octet-stream",
          metodo: "PUT",
        })) as { partNumber: number; etag: string };
        partes.push({ partNumber: r.partNumber, etag: r.etag });
        posicion += largo;
        n++;
        avisar(Math.round((posicion / total) * 100));
      }
    } finally {
      await archivo.close();
    }
    const fin = (await llamar("/datos/estacion/videos/terminar", {
      guion_id: guionId,
      formato,
      clave: inicio.clave,
      uploadId: inicio.uploadId,
      partes,
      duracion_seg: datos.duracion_seg,
      voz_de_prueba: datos.voz_de_prueba,
    })) as { clave: string; bytes: number };
    return fin;
  },
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
