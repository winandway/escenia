// Lo que la app de iPhone ve de un encargo del Director (docs/APP-IPHONE.md): la conversación, las
// tarjetas con su precio y cómo va cada video. Un solo viaje por pantalla, sin datos internos (ni
// carpetas de clientes ni costos de proveedores): solo lo que se muestra.
import type { BaseDatos } from "./db";
import { esResultadoDemo } from "./app-sesion";
import {
  leerPropuesta,
  mensajesDelEncargo,
  propuestasDelEncargo,
  resultadoDePropuesta,
  type FilaEncargo,
  type FilaPropuesta,
} from "./director";
import { videosDelEncargo } from "./director-videos";
import { materialDelAnuncio, segundosDeTexto, textoDeDemostracion } from "@compartido/director";
import { imagenesActivas, type FilaImagen } from "./imagenes";

export type EstadoResultadoApp = "en-fila" | "armando" | "listo" | "error";

export type ResultadoApp = {
  estado: EstadoResultadoApp;
  paso: string;
  error: string;
  duracionSeg: number;
  costoUsd: number;
  /** La clave del video en el almacén (se pide a /datos/archivos/<clave>); vacía en la demostración. */
  video: string;
  /** Cuenta de demostración: la app muestra su video de ejemplo, no hubo render ni gasto. */
  muestra: boolean;
  trabajoId: number | null;
};

export type PropuestaApp = {
  id: number;
  estado: FilaPropuesta["estado"];
  precioUsd: number;
  tipo: "anuncio" | "demostracion" | "locucion";
  nombre: string;
  voz: string;
  persona: string;
  segundos: number;
  /** El texto que dice la voz; en la prueba en vivo y la locución, frase por frase con su segundo. */
  frases: { texto: string; enSeg: number | null }[];
  /**
   * Lo que va a salir en el video, para verlo antes de aprobar (C-DIRECTOR-4): la foto de la persona, el
   * logo y las fotos del producto (números de imagen; la app las pide a /datos/app/imagenes/<id>).
   */
  material: {
    personaFoto: number | null;
    logo: number | null;
    sinLogo: boolean;
    fotos: number[];
    soloPresentadora: boolean;
  } | null;
  resultado: ResultadoApp | null;
};

export type EncargoApp = {
  id: number;
  titulo: string;
  carpeta: string;
  costoUsd: number;
  mensajes: { id: number; rol: "yo" | "director" | "aviso"; texto: string; propuestaId: number | null }[];
  propuestas: PropuestaApp[];
  videos: { id: number; nombre: string; estado: string; duracionSeg: number; error: string }[];
  /** Hay algo en marcha (un video que la Mac mira o arma): la app vuelve a preguntar sola. */
  enMarcha: boolean;
};

export function estadoParaLaApp(estado: string): EstadoResultadoApp {
  if (estado === "lista") return "listo";
  if (estado === "error" || estado === "quitada") return "error";
  if (estado === "tomada") return "armando";
  return "en-fila";
}

function fichaDePropuesta(p: FilaPropuesta, imagenes: FilaImagen[]): Omit<PropuestaApp, "resultado"> {
  const base = { id: p.id, estado: p.estado, precioUsd: p.precio_usd, material: null };
  const l = leerPropuesta(p);
  if (l.tipo === "anuncio") {
    const m = materialDelAnuncio(imagenes, l.datos);
    return {
      ...base,
      material: {
        personaFoto: m.persona?.id ?? null,
        logo: m.logo?.id ?? null,
        sinLogo: l.datos.sin_logo,
        fotos: m.fotos.slice(0, 8).map((f) => f.id),
        soloPresentadora: l.datos.solo_presentadora,
      },
      tipo: "anuncio",
      nombre: l.datos.nombre,
      voz: l.datos.voz,
      persona: l.datos.avatar.replace(/\.[a-z0-9]+$/i, ""),
      segundos: Math.round(segundosDeTexto(l.datos.narracion)),
      frases: [{ texto: l.datos.narracion, enSeg: null }],
    };
  }
  if (l.tipo === "demostracion")
    return {
      ...base,
      tipo: "demostracion",
      nombre: l.datos.nombre,
      voz: l.datos.voz,
      persona: l.datos.avatar.replace(/\.[a-z0-9]+$/i, ""),
      segundos: Math.round(segundosDeTexto(textoDeDemostracion(l.datos))),
      frases: l.datos.partes.map((x) => ({ texto: x.texto, enSeg: x.en_s })),
    };
  return {
    ...base,
    tipo: "locucion",
    nombre: l.datos.nombre,
    voz: l.datos.voz,
    persona: "",
    segundos: Math.round(segundosDeTexto(l.datos.partes.map((x) => x.texto).join(" "))),
    frases: l.datos.partes.map((x) => ({ texto: x.texto, enSeg: x.en_s ?? null })),
  };
}

async function resultadoParaLaApp(db: BaseDatos, p: FilaPropuesta): Promise<ResultadoApp | null> {
  if (p.estado !== "aprobada") return null;
  if (await esResultadoDemo(db, p.id))
    return {
      estado: "listo",
      paso: "",
      error: "",
      duracionSeg: 0,
      costoUsd: 0,
      video: "",
      muestra: true,
      trabajoId: null,
    };
  const r = await resultadoDePropuesta(db, p);
  if (!r) return null;
  return {
    estado: estadoParaLaApp(r.estado),
    paso: r.paso,
    error: r.error,
    duracionSeg: r.duracionSeg,
    costoUsd: r.costoUsd,
    video: r.estado === "lista" ? r.video : "",
    muestra: false,
    trabajoId: r.trabajo?.id ?? null,
  };
}

export async function encargoParaLaApp(db: BaseDatos, encargo: FilaEncargo): Promise<EncargoApp> {
  const [mensajes, propuestas, videos, imagenes] = await Promise.all([
    mensajesDelEncargo(db, encargo.id),
    propuestasDelEncargo(db, encargo.id),
    videosDelEncargo(db, encargo.id),
    imagenesActivas(db),
  ]);
  const fichas: PropuestaApp[] = [];
  for (const p of propuestas) {
    try {
      fichas.push({ ...fichaDePropuesta(p, imagenes), resultado: await resultadoParaLaApp(db, p) });
    } catch {
      // Una propuesta que ya no se puede leer no tumba la pantalla: simplemente no se muestra.
    }
  }
  const enMarcha =
    videos.some((v) => v.estado === "subido" || v.estado === "mirando") ||
    fichas.some((f) => f.resultado && (f.resultado.estado === "en-fila" || f.resultado.estado === "armando"));
  return {
    id: encargo.id,
    titulo: encargo.titulo,
    carpeta: encargo.carpeta,
    costoUsd: encargo.costo_usd,
    mensajes: mensajes.map((m) => ({
      id: m.id,
      rol: m.rol === "richard" ? "yo" : m.rol,
      texto: m.texto,
      propuestaId: m.propuesta_id,
    })),
    propuestas: fichas,
    videos: videos.map((v) => ({
      id: v.id,
      nombre: v.nombre,
      estado: v.estado,
      duracionSeg: v.duracion_seg,
      error: v.error,
    })),
    enMarcha,
  };
}
