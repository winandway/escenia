// El diseño del anuncio vertical (Publicidad en Short) sin Remotion: el esquema de las props y dónde
// va cada cosa en la pantalla de 1080×1920. Lo prueban las pruebas de la raíz (C-CI-1).
import { z } from "zod";

/** Una zona de la imagen, en fracciones de su ancho y su alto (0 a 1): la parte que se acerca. */
export const esquemaRegion = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  ancho: z.number().min(0.02).max(1),
  alto: z.number().min(0.02).max(1),
});
export type Region = z.infer<typeof esquemaRegion>;

/** Los modos de la persona en el diseño «pantalla». */
export const MODOS_PERSONA = ["grande", "cuerpo", "medio", "cabeza", "oculta"] as const;
export const esquemaVistaPersona = z.object({
  modo: z.enum(MODOS_PERSONA),
  lado: z.enum(["izquierda", "derecha"]).default("izquierda"),
});
export type VistaPersona = z.infer<typeof esquemaVistaPersona>;

export const esquemaPublicidad = z.object({
  marca: z.string(),
  acento: z.string().regex(/^#[0-9a-f]{6}$/i),
  logo: z.string(),
  /** «oscuro» para marcas con logo claro (QRBott): el logo va sobre oscuro y el cierre también. */
  tema: z.enum(["claro", "oscuro"]).default("claro"),
  /**
   * «centro»: la captura en una tarjeta en el medio (versión 1). «pantalla»: la captura ocupa toda la
   * pantalla y la persona se mueve alrededor (cabecita, medio cuerpo señalando, cuerpo pequeño o grande).
   */
  diseno: z.enum(["centro", "pantalla", "telefono"]).default("centro"),
  /**
   * Video transparente (WebM con alfa) del avatar que habla, o una foto quieta (PNG), o nada. Con
   * `recuadro`, la persona trae su fondo y va dentro de un marco redondeado del color de la marca.
   */
  avatar: z
    .object({
      ruta: z.string(),
      video: z.boolean(),
      ancho: z.number(),
      alto: z.number(),
      recuadro: z.boolean().default(false),
    })
    .nullable(),
  audio: z.string(),
  musica: z.string().nullable(),
  duracionMs: z.number(),
  tramos: z.array(
    z.object({
      inicioMs: z.number(),
      finMs: z.number(),
      imagen: z.string().nullable(),
      texto: z.string().nullable(),
      chips: z.array(z.object({ texto: z.string(), inicioMs: z.number() })),
      /** Las medidas de la imagen (para acercar una zona sin deformarla). */
      imagenAncho: z.number().default(0),
      imagenAlto: z.number().default(0),
      /** La zona de la imagen que llena la tarjeta (una captura de pantalla se ve de cerca). */
      enfoque: esquemaRegion.nullable().default(null),
      /** Este momento va sin tarjeta (la persona de cuerpo completo ocupa la pantalla). */
      sinTarjeta: z.boolean().default(false),
      /** El efecto que suena al empezar (una caja registradora, una cámara…), en vez del corte. */
      sonido: z.string().nullable().default(null),
      /** Una cifra que sube como contador en vez del texto grande. */
      cifra: z
        .object({
          valor: z.number(),
          prefijo: z.string().default(""),
          sufijo: z.string().default(""),
          decimales: z.number().int().min(0).max(2).default(0),
        })
        .nullable()
        .default(null),
      /** La tarjeta baja a oscuro (de noche: «mientras tú duermes»). */
      oscurecer: z.boolean().default(false),
      /** Cómo entra la tarjeta: con un golpe de zoom o barriendo de lado. */
      entrada: z.enum(["golpe", "barrido"]).default("golpe"),
      /** Cómo se ve la persona desde este momento (diseño «pantalla»); null: sigue como venía. */
      vistaPersona: esquemaVistaPersona.nullable().default(null),
    }),
  ),
  /**
   * La persona que habla por tramos: de medio cuerpo abajo a la izquierda, o de cuerpo completo en el
   * centro. Cada aparición es su propio video (transparente) con la voz de ese tramo.
   */
  apariciones: z
    .array(
      z.object({
        inicioMs: z.number(),
        finMs: z.number(),
        ruta: z.string(),
        ancho: z.number(),
        alto: z.number(),
        encuadre: z.enum(["medio", "cuerpo"]),
        /** Dónde está su cara en el video (fracciones), para mostrar solo la cabecita. */
        cara: esquemaRegion.nullable().default(null),
      }),
    )
    .default([]),
  subtitulos: z.array(
    z.object({
      inicioMs: z.number(),
      finMs: z.number(),
      palabras: z.array(z.string()),
      resaltada: z.number(),
    }),
  ),
  cierre: z.object({ inicioMs: z.number(), lineas: z.array(z.string()) }),
  sfx: z.object({ cortes: z.array(z.string()), final: z.string().nullable() }),
});
export type PropsPublicidad = z.infer<typeof esquemaPublicidad>;

/**
 * Dónde va cada cosa. En un Short, YouTube tapa más o menos el 15 % de abajo y la columna derecha con
 * los botones (C-MONIGOTES-1): por eso el avatar va abajo a la IZQUIERDA (su mano levantada apunta al
 * producto) y los subtítulos a la derecha de su cabeza, por encima del 85 % del alto.
 */
export const ZONA_PUBLICIDAD = {
  logo: { x: 40, y: 56, alto: 92 },
  texto: { y: 190, alto: 170 },
  tarjeta: { x: 60, y: 390, ancho: 960, alto: 760 },
  subtitulos: { izquierda: 470, derecha: 150, y: 1210 },
  avatar: { x: -30, alto: 1000 },
  /** La persona con su fondo: un marco abajo a la izquierda, por encima de la franja que tapa YouTube. */
  recuadro: { x: 40, abajo: 330, alto: 620, borde: 6, radio: 40 },
  /** La persona de medio cuerpo (de la cabeza a la cadera), abajo a la izquierda. */
  medio: { x: -10, alto: 800 },
  /** La persona de cuerpo completo, centrada, de los pies hasta debajo del texto grande. */
  cuerpo: { alto: 1500 },
  /** Con la persona de cuerpo completo, los subtítulos van sobre sus piernas, a todo lo ancho. */
  subtitulosCuerpo: { y: 1430 },
  /**
   * Diseño «teléfono»: la pantalla del celular ENTERA en una tarjeta alta a la derecha, sin acercar ni
   * mover (Richard, 22 oct 2026: «no tienes que hacerle zoom porque si no se sale del borde»); la persona
   * de medio cuerpo abajo a la izquierda y los subtítulos debajo de la tarjeta.
   */
  telefono: { x: 410, y: 380, ancho: 655, alto: 1115, radio: 46, subtitulos: 1525, persona: 760 },
  /** Diseño «pantalla»: la persona pequeña abajo, de un lado o del otro. */
  pantalla: {
    cabeza: { diametro: 380, abajo: 150, margen: 40, borde: 8 },
    medio: { alto: 720 },
    cuerpo: { alto: 780, margen: 10 },
    subtitulos: { y: 1500, yLibre: 1560 },
  },
  limiteAbajo: 1920 * 0.85,
} as const;

/** Dónde se dibuja una imagen dentro de una caja: posición y tamaño en puntos de la caja. */
export type Vista = { left: number; top: number; width: number; height: number };

/** La imagen entera dentro de la caja, sin cortar nada (como «contain»). */
export function vistaCompleta(
  caja: { ancho: number; alto: number },
  img: { ancho: number; alto: number },
): Vista {
  const s = Math.min(caja.ancho / img.ancho, caja.alto / img.alto);
  const width = img.ancho * s;
  const height = img.alto * s;
  return { left: (caja.ancho - width) / 2, top: (caja.alto - height) / 2, width, height };
}

/**
 * La zona `region` de la imagen, entera y lo más grande posible dentro de la caja (como «contain» de
 * esa zona), centrada; lo que sobra se llena con lo que rodea a la zona en la imagen, nunca deformado.
 * Si la imagen no alcanza a llenar la caja por un lado, queda centrada por ese lado.
 */
export function vistaDeEnfoque(
  caja: { ancho: number; alto: number },
  img: { ancho: number; alto: number },
  region: Region,
): Vista {
  const s = Math.min(caja.ancho / (region.ancho * img.ancho), caja.alto / (region.alto * img.alto));
  const width = img.ancho * s;
  const height = img.alto * s;
  const centroX = (region.x + region.ancho / 2) * width;
  const centroY = (region.y + region.alto / 2) * height;
  const acomodar = (lado: number, tamano: number, centro: number) =>
    tamano <= lado ? (lado - tamano) / 2 : Math.min(0, Math.max(lado - tamano, lado / 2 - centro));
  return {
    left: acomodar(caja.ancho, width, centroX),
    top: acomodar(caja.alto, height, centroY),
    width,
    height,
  };
}

/** Un punto intermedio entre dos vistas (t de 0 a 1). */
export function mezclarVistas(a: Vista, b: Vista, t: number): Vista {
  const m = (x: number, y: number) => x + (y - x) * t;
  return {
    left: m(a.left, b.left),
    top: m(a.top, b.top),
    width: m(a.width, b.width),
    height: m(a.height, b.height),
  };
}

/** Una cifra con separador de miles y sus decimales: 3394.44 → «3,394.44». */
export function formatoCifra(valor: number, decimales: number): string {
  return valor.toLocaleString("en-US", {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  });
}

/** El modo de la persona que manda en `ms`: el del último momento que lo fijó (o el que va por encuadre). */
export function vistaPersonaEn(
  tramos: { inicioMs: number; vistaPersona: VistaPersona | null }[],
  encuadre: "medio" | "cuerpo",
  ms: number,
): VistaPersona & { desdeMs: number } {
  let vista: VistaPersona & { desdeMs: number } = {
    modo: encuadre === "cuerpo" ? "grande" : "medio",
    lado: "izquierda",
    desdeMs: 0,
  };
  for (const t of tramos) {
    if (t.inicioMs > ms) break;
    if (!t.vistaPersona) continue;
    const cambia = t.vistaPersona.modo !== vista.modo || t.vistaPersona.lado !== vista.lado;
    if (cambia) vista = { ...t.vistaPersona, desdeMs: t.inicioMs };
  }
  return vista;
}

/** Dónde van los subtítulos en el diseño «pantalla», del lado contrario a la persona. */
export function subtitulosEnPantalla(vista: VistaPersona | null): {
  left: number;
  right: number;
  top: number;
} {
  const P = ZONA_PUBLICIDAD.pantalla;
  if (!vista || vista.modo === "oculta") return { left: 80, right: 80, top: P.subtitulos.yLibre };
  if (vista.modo === "grande") return { left: 60, right: 60, top: ZONA_PUBLICIDAD.subtitulosCuerpo.y };
  const ancho = vista.modo === "cabeza" ? P.cabeza.diametro + P.cabeza.margen + 30 : 470;
  return vista.lado === "izquierda"
    ? { left: ancho, right: 40, top: P.subtitulos.y }
    : { left: 40, right: ancho, top: P.subtitulos.y };
}
