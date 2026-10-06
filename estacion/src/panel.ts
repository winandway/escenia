// Cliente HTTP del panel. Todo pasa por /datos/estacion/* con el secreto.
import { open, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { partesDe, TAMANO_PARTE } from "@compartido/grabaciones";
import { esquemaGuion, type Guion } from "@compartido/guion";
import { CABECERA_META, metaParaCabecera } from "@compartido/meta";
import { conReintentos, ErrorDelPanel } from "@compartido/reintentos";
import { ESTILOS_VIDEO, type Canal, type EstiloVideo } from "@compartido/tematicas";
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
      // El estilo que decide el panel (paneles viejos no lo mandan: se cae a la lista local).
      estilo: z.enum(ESTILOS_VIDEO).optional(),
      contenido: esquemaGuion,
      producto: z.object({ nombre: z.string(), url: z.string() }).nullable(),
      canal: z.object({ nombre: z.string(), usuario: z.string() }).nullable().default(null),
      // Formato Presentador: el guion salió de una grabación de Richard.
      grabacion: z
        .object({ id: z.number(), formato: z.enum(ESTILOS_VIDEO), archivo: z.string(), bytes: z.number() })
        .nullable()
        .default(null),
      // Comercial de un cliente: sin marca ni Shorts, con sus imágenes y en su idioma.
      comercial: z
        .object({
          id: z.number(),
          idioma: z.enum(["es", "en"]),
          carpetas: z.array(z.string()),
          formato: z.enum(ESTILOS_VIDEO),
        })
        .nullable()
        .default(null),
    })
    .nullable(),
});

const esquemaComercial = z.object({
  comercial: z
    .object({
      id: z.number(),
      nombre: z.string(),
      narracion: z.string(),
      idioma: z.enum(["es", "en"]),
      voz: z.enum(["richard", "femenina"]),
      instrucciones: z.string(),
      carpetas: z.array(z.string()),
      formato: z.enum(ESTILOS_VIDEO),
    })
    .nullable(),
});
export type ComercialDelPanel = NonNullable<z.infer<typeof esquemaComercial>["comercial"]>;

const esquemaImagenes = z.object({
  imagenes: z.array(
    z.object({
      id: z.number(),
      carpeta: z.string(),
      nombre: z.string(),
      tipo: z.enum(["imagen", "pdf"]),
      bytes: z.number(),
    }),
  ),
});
export type ImagenDelPanel = z.infer<typeof esquemaImagenes>["imagenes"][number];

const esquemaGrabacion = z.object({
  grabacion: z
    .object({
      id: z.number(),
      tema: z.string(),
      formato: z.enum(ESTILOS_VIDEO),
      canal: z.enum(["canal-ia", "caprichoso-tv"]),
      archivo: z.string(),
      bytes: z.number(),
    })
    .nullable(),
});
export type GrabacionDelPanel = NonNullable<z.infer<typeof esquemaGrabacion>["grabacion"]>;

export type Trabajo = NonNullable<z.infer<typeof esquemaTrabajo>["trabajo"]> & { contenido: Guion };

async function llamar(
  ruta: string,
  cuerpo: unknown,
  opciones: {
    crudo?: Buffer;
    contentType?: string;
    metodo?: "POST" | "PUT";
    cabeceras?: Record<string, string>;
    /** Cuánto se espera la respuesta (por defecto, 3 minutos). */
    esperaMs?: number;
    /** Para lo que no se puede pedir dos veces (cuesta dinero o crea cosas): un solo intento. */
    unSoloIntento?: boolean;
  } = {},
): Promise<unknown> {
  // Un corte de red de unos segundos no tumba el trabajo: se reintenta con espera (C-ENTREGA-1).
  return conReintentos(
    async () => {
      const r = await fetch(`${config.PANEL_URL}${ruta}`, {
        method: opciones.metodo ?? "POST",
        headers: {
          authorization: `Bearer ${config.ESTACION_SECRETO}`,
          "content-type": opciones.contentType ?? "application/json",
          ...opciones.cabeceras,
        },
        body: opciones.crudo ? new Uint8Array(opciones.crudo) : JSON.stringify(cuerpo),
        signal: AbortSignal.timeout(opciones.esperaMs ?? 180_000),
      });
      const texto = await r.text();
      if (!r.ok)
        throw new ErrorDelPanel(
          `El panel respondió ${r.status} en ${ruta}: ${texto.slice(0, 300)}`,
          r.status,
        );
      return texto ? (JSON.parse(texto) as unknown) : {};
    },
    {
      esperas: opciones.unSoloIntento ? [] : undefined,
      alReintentar: (intento, esperaMs, fallo) =>
        console.warn(
          `  (el panel no respondió en ${ruta.split("?")[0]}: ${fallo instanceof Error ? fallo.message : fallo}; ` +
            `reintento ${intento} en ${Math.round(esperaMs / 1000)} s)`,
        ),
    },
  );
}

const esquemaSonidos = z.object({
  sonidos: z.array(
    z.object({ id: z.number(), tipo: z.enum(["musica", "efecto"]), archivo: z.string(), bytes: z.number() }),
  ),
});
export type SonidoDelPanel = z.infer<typeof esquemaSonidos>["sonidos"][number];

export const panel = {
  /** La biblioteca de sonidos de Richard (C-SONIDOS-1). */
  async sonidos(): Promise<SonidoDelPanel[]> {
    return esquemaSonidos.parse(await llamar("/datos/estacion/sonidos", {})).sonidos;
  },
  async bajarSonido(id: number): Promise<Buffer> {
    return conReintentos(async () => {
      const r = await fetch(`${config.PANEL_URL}/datos/estacion/sonidos/${id}`, {
        headers: { authorization: `Bearer ${config.ESTACION_SECRETO}` },
        signal: AbortSignal.timeout(180_000),
      });
      if (!r.ok)
        throw new ErrorDelPanel(`El panel respondió ${r.status} al bajar el sonido ${id}.`, r.status);
      return Buffer.from(await r.arrayBuffer());
    });
  },
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
  publicacion: (guionId: number, shorts: unknown[]) =>
    llamar(`/datos/estacion/publicacion/${guionId}`, { shorts }),
  /** Formato Presentador: de la transcripción de una grabación, el plan de lo que va detrás de Richard. */
  plan: (transcripcion: string, formato: string, titulo = "") =>
    llamar("/datos/estacion/plan", { transcripcion, formato, titulo }),
  /** La biblioteca de imágenes (unas carpetas, o todas). */
  async imagenes(carpetas: string[]): Promise<ImagenDelPanel[]> {
    return esquemaImagenes.parse(await llamar("/datos/estacion/imagenes", { carpetas })).imagenes;
  },
  async bajarImagen(id: number): Promise<Buffer> {
    return conReintentos(async () => {
      const r = await fetch(`${config.PANEL_URL}/datos/estacion/imagenes/${id}`, {
        headers: { authorization: `Bearer ${config.ESTACION_SECRETO}` },
        signal: AbortSignal.timeout(180_000),
      });
      if (!r.ok)
        throw new ErrorDelPanel(`El panel respondió ${r.status} al bajar la imagen ${id}.`, r.status);
      return Buffer.from(await r.arrayBuffer());
    });
  },
  /** Sube una imagen (o un PDF) a una carpeta de la biblioteca, desde la Mac. */
  subirImagen: (ruta: Buffer, carpeta: string, nombre: string, extension: string) =>
    llamar(`/datos/imagenes?${new URLSearchParams({ carpeta, nombre, extension })}`, null, {
      crudo: ruta,
      contentType: "application/octet-stream",
    }) as Promise<{ id: number }>,
  /** Pide un comercial desde la Mac (lo mismo que el formulario del panel). */
  pedirComercial: (datos: unknown) => llamar("/datos/comerciales", datos) as Promise<{ id: number }>,
  /** ¿Hay un comercial por armar? Si hay, queda tomado. */
  async comercialSiguiente(): Promise<ComercialDelPanel | null> {
    return esquemaComercial.parse(await llamar("/datos/estacion/comerciales/siguiente", {})).comercial;
  },
  avanceComercial: (id: number, paso: string) =>
    llamar(`/datos/estacion/comerciales/${id}`, { accion: "avance", paso }),
  errorComercial: (id: number, error: string) =>
    llamar(`/datos/estacion/comerciales/${id}`, { accion: "error", error: error.slice(0, 2000) }),
  /** Con las imágenes que hay en la Mac, el panel arma el plan, guarda el guion y lo manda a producir. */
  planDeComercial: (
    id: number,
    imagenes: { nombre: string; transparente: boolean; ancho: number; alto: number }[],
  ) =>
    llamar(
      `/datos/estacion/comerciales/${id}`,
      { accion: "plan", imagenes },
      { esperaMs: 420_000, unSoloIntento: true },
    ) as Promise<{ guion_id: number; trabajo_id: number }>,
  /** ¿Richard subió una grabación desde el panel? Si hay, queda tomada. */
  async grabacionSiguiente(): Promise<GrabacionDelPanel | null> {
    return esquemaGrabacion.parse(await llamar("/datos/estacion/grabaciones/siguiente", {})).grabacion;
  },
  avanceGrabacion: (id: number, paso: string) =>
    llamar(`/datos/estacion/grabaciones/${id}`, { accion: "avance", paso }),
  errorGrabacion: (id: number, error: string) =>
    llamar(`/datos/estacion/grabaciones/${id}`, { accion: "error", error: error.slice(0, 2000) }),
  /** Con lo que Richard dijo, el panel arma el plan, guarda el guion y lo manda a producir. */
  planDeGrabacion: (id: number, transcripcion: string, costoTranscripcionUsd: number) =>
    llamar(
      `/datos/estacion/grabaciones/${id}`,
      { accion: "plan", transcripcion, costo_transcripcion_usd: costoTranscripcionUsd },
      // La IA tarda uno o dos minutos con una grabación larga, y el pedido no se repite solo.
      { esperaMs: 420_000, unSoloIntento: true },
    ) as Promise<{ guion_id: number; trabajo_id: number }>,
  /**
   * Baja una grabación a la Mac por rangos de 16 MB. Si quedó a medias de un intento anterior,
   * sigue desde donde iba. Devuelve cuánto pesa.
   */
  async bajarGrabacion(
    id: number,
    destino: string,
    total: number,
    avisar: (pct: number) => void = () => {},
  ): Promise<number> {
    const RANGO = 16 * 1024 * 1024;
    let posicion = await stat(destino).then(
      (s) => s.size,
      () => 0,
    );
    if (posicion > total) posicion = 0;
    const archivo = await open(destino, posicion === 0 ? "w" : "r+");
    try {
      while (posicion < total) {
        const hasta = Math.min(total, posicion + RANGO) - 1;
        const desde = posicion;
        const trozo = await conReintentos(async () => {
          const r = await fetch(`${config.PANEL_URL}/datos/estacion/grabaciones/${id}/archivo`, {
            headers: { authorization: `Bearer ${config.ESTACION_SECRETO}`, range: `bytes=${desde}-${hasta}` },
            signal: AbortSignal.timeout(180_000),
          });
          if (r.status !== 206 && r.status !== 200)
            throw new ErrorDelPanel(`El panel respondió ${r.status} al bajar la grabación ${id}.`, r.status);
          return Buffer.from(await r.arrayBuffer());
        });
        if (trozo.length === 0) throw new Error(`La grabación ${id} llegó cortada del panel.`);
        await archivo.write(trozo, 0, trozo.length, posicion);
        posicion += trozo.length;
        avisar(Math.round((posicion / total) * 100));
      }
    } finally {
      await archivo.close();
    }
    return posicion;
  },
  /** Sube a «Grabaciones» un video que ya está en la Mac (lo mismo que hace el panel desde el navegador). */
  async subirGrabacion(
    ruta: string,
    datos: { tema: string; formato: EstiloVideo; canal: Canal },
    avisar: (pct: number) => void = () => {},
  ): Promise<{ id: number; bytes: number }> {
    const total = (await stat(ruta)).size;
    const inicio = (await llamar("/datos/grabaciones/iniciar", {
      ...datos,
      archivo: path.basename(ruta),
      bytes: total,
    })) as { id: number; uploadId: string };
    const archivo = await open(ruta, "r");
    const partes: { partNumber: number; etag: string }[] = [];
    try {
      for (const p of partesDe(total, TAMANO_PARTE)) {
        const trozo = Buffer.alloc(p.hasta - p.desde);
        await archivo.read(trozo, 0, trozo.length, p.desde);
        const q = new URLSearchParams({ id: String(inicio.id), uploadId: inicio.uploadId, n: String(p.n) });
        const r = (await llamar(`/datos/grabaciones/parte?${q}`, null, {
          crudo: trozo,
          contentType: "application/octet-stream",
          metodo: "PUT",
        })) as { partNumber: number; etag: string };
        partes.push({ partNumber: r.partNumber, etag: r.etag });
        avisar(Math.round((p.hasta / total) * 100));
      }
    } finally {
      await archivo.close();
    }
    return (await llamar("/datos/grabaciones/terminar", {
      id: inicio.id,
      uploadId: inicio.uploadId,
      partes,
    })) as { id: number; bytes: number };
  },
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
    const q = new URLSearchParams({ guion_id: String(guionId), tipo, extension });
    const tipos = { mp3: "audio/mpeg", json: "application/json", png: "image/png" } as const;
    // La ficha va en una cabecera: con cien fotos, los créditos no caben en la dirección (C-ENTREGA-2).
    return llamar(`/datos/estacion/archivos?${q}`, null, {
      crudo,
      contentType: tipos[extension],
      cabeceras: { [CABECERA_META]: metaParaCabecera(meta) },
    });
  },
};
