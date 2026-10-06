// Planos (C-RITMO-1): trae la imagen de cada cambio dentro de una escena y
// rellena los tramos donde nada cambiaría, para que el video no se quede en una
// sola imagen mientras la voz habla medio minuto.
import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";
import type { Plano } from "@compartido/guion";
import { buscarImagenPorNombre } from "@compartido/imagenes";
import type { ImagenLocal } from "./comerciales";
import { rellenarHuecos, tiemposDePlanos, type PalabraConTiempo } from "@compartido/planos";
import { buscarFoto } from "./fotos";
import type { PropsVideo } from "./remotion/props";
import { buscarClip } from "./visuales";

type EscenaVideo = PropsVideo["escenas"][number];
export type PlanoVideo = EscenaVideo["planos"][number];
type FotoVideo = NonNullable<EscenaVideo["foto"]>;

/** Un plano nace sin figura dibujada: el estilo ilustrado se la pone después (ilustrado.ts). */
const SIN_FIGURA = { figura: null, sigue: false, transparente: false } as const;

/** De a cuántas imágenes se piden a la vez (internet aguanta, y el trabajo no se eterniza). */
const A_LA_VEZ = 3;

export async function resolverPlanos(args: {
  planos: Plano[];
  palabras: PalabraConTiempo[];
  inicioMs: number;
  finMs: number;
  carpetaPublica: string;
  alCredito: (credito: string) => void;
  /** Comerciales: las imágenes del cliente que puede pedir un plano «imagen». */
  imagenes?: ImagenLocal[];
}): Promise<{ planos: PlanoVideo[]; sinFrase: number; sinImagen: number }> {
  const { tiempos, sinFrase } = tiemposDePlanos(
    args.planos.map((p) => p.frase),
    args.palabras,
    args.inicioMs,
    args.finMs,
  );
  const pedidos = args.planos
    .map((plano, i) => ({ plano, inicioMs: tiempos[i] ?? null }))
    .filter((x): x is { plano: Plano; inicioMs: number } => x.inicioMs !== null);
  const listos: (PlanoVideo | null)[] = [];
  for (let k = 0; k < pedidos.length; k += A_LA_VEZ) {
    const lote = pedidos.slice(k, k + A_LA_VEZ);
    listos.push(...(await Promise.all(lote.map((x) => unPlano(x.plano, x.inicioMs, args)))));
  }
  const planos = listos.filter((p): p is PlanoVideo => p !== null);
  return { planos, sinFrase, sinImagen: pedidos.length - planos.length };
}

async function unPlano(
  plano: Plano,
  inicioMs: number,
  args: { carpetaPublica: string; alCredito: (credito: string) => void; imagenes?: ImagenLocal[] },
): Promise<PlanoVideo | null> {
  const texto = (plano.texto ?? "").trim();
  if (plano.tipo === "dato") {
    // Un dato sin texto no tiene nada que mostrar.
    return texto ? { inicioMs, tipo: "dato", foto: null, clip: null, texto, ...SIN_FIGURA } : null;
  }
  if (plano.tipo === "imagen") {
    // La imagen del cliente, por su nombre; se copia a la carpeta pública del trabajo.
    const elegida = buscarImagenPorNombre(plano.archivo ?? "", args.imagenes ?? []);
    if (!elegida) {
      console.warn(`  plano «${plano.archivo ?? ""}»: no hay una imagen con ese nombre en la carpeta`);
      return null;
    }
    const ruta = `imagenes/${path.basename(elegida.ruta)}`;
    await mkdir(path.join(args.carpetaPublica, "imagenes"), { recursive: true });
    await copyFile(elegida.ruta, path.join(args.carpetaPublica, ruta));
    return {
      inicioMs,
      tipo: "imagen",
      foto: { ruta, ancho: elegida.ancho, alto: elegida.alto, enfoque: null },
      clip: null,
      texto,
      ...SIN_FIGURA,
      transparente: elegida.transparente,
    };
  }
  const busqueda = (plano.busqueda ?? "").trim();
  if (!busqueda) return null;
  if (plano.tipo === "foto") {
    const f = await buscarFoto([busqueda], args.carpetaPublica, { persona: plano.foto_de !== "lugar" }).catch(
      (e) => {
        console.warn(`  plano «${busqueda}»: ${e instanceof Error ? e.message : e}`);
        return null;
      },
    );
    if (!f) return null;
    args.alCredito(f.credito);
    return {
      inicioMs,
      tipo: "foto",
      foto: { ruta: f.ruta, ancho: f.ancho, alto: f.alto, enfoque: null },
      clip: null,
      texto,
      ...SIN_FIGURA,
    };
  }
  const c = await buscarClip([busqueda], false, args.carpetaPublica);
  if (!c) return null;
  args.alCredito(c.credito);
  return {
    inicioMs,
    tipo: "clip",
    foto: null,
    clip: { ruta: c.ruta, duracionSeg: c.duracionSeg },
    texto: "",
    ...SIN_FIGURA,
  };
}

/**
 * Planos de relleno: donde una escena se quedaría quieta más de unos segundos,
 * mete imágenes del propio video (las fotos que ya se trajeron, sin repetir la
 * de al lado) o clips de ambiente nuevos. Devuelve los planos de la escena ya
 * completos y en orden.
 */
export async function rellenarPlanos(args: {
  escena: EscenaVideo;
  fotosDelVideo: FotoVideo[];
  /** Biografías: se prefiere una foto de la persona antes que un clip de ambiente. */
  preferirFotos: boolean;
  busquedasDeClip: string[];
  carpetaPublica: string;
  alCredito: (credito: string) => void;
  /** Lleva la cuenta entre escenas para ir rotando las fotos. */
  turno: { n: number };
}): Promise<PlanoVideo[]> {
  const { escena } = args;
  const planos = [...escena.planos].sort((a, b) => a.inicioMs - b.inicioMs);
  const nuevos = rellenarHuecos(
    planos.map((p) => p.inicioMs),
    escena.inicioMs,
    escena.finMs,
  );
  for (const inicioMs of nuevos) {
    const vecinos = new Set(
      [escena.foto?.ruta, ...planos.map((p) => p.foto?.ruta)].filter((r): r is string => Boolean(r)),
    );
    const candidatas = args.fotosDelVideo.filter((f) => !vecinos.has(f.ruta));
    const usarFoto = args.preferirFotos && candidatas.length > 0;
    let plano: PlanoVideo | null = null;
    if (usarFoto) {
      const foto = candidatas[args.turno.n++ % candidatas.length];
      if (foto) plano = { inicioMs, tipo: "foto", foto: { ...foto }, clip: null, texto: "", ...SIN_FIGURA };
    }
    if (!plano) {
      const c = await buscarClip(args.busquedasDeClip, false, args.carpetaPublica);
      if (c) {
        args.alCredito(c.credito);
        plano = {
          inicioMs,
          tipo: "clip",
          foto: null,
          clip: { ruta: c.ruta, duracionSeg: c.duracionSeg },
          texto: "",
          ...SIN_FIGURA,
        };
      }
    }
    // Sin clip nuevo (sin clave o sin resultados): una foto del video, aunque se repita.
    if (!plano && args.fotosDelVideo.length > 0) {
      const foto = args.fotosDelVideo[args.turno.n++ % args.fotosDelVideo.length];
      if (foto) plano = { inicioMs, tipo: "foto", foto: { ...foto }, clip: null, texto: "", ...SIN_FIGURA };
    }
    if (plano) planos.push(plano);
  }
  return planos.sort((a, b) => a.inicioMs - b.inicioMs);
}
