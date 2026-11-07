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

const fraccion = z.number().min(0).max(1);
const puntoEnFracciones = z.tuple([fraccion, fraccion]);
export const esquemaRayos = z.object({
  nube: puntoEnFracciones.default([0.5, 0.075]),
  desde: z.array(puntoEnFracciones).min(1).max(12),
});

/** Los íconos de la ficha de un momento (dibujados, sin imágenes de nadie). */
export const ICONOS_FICHA = ["servidor", "candado", "escudo", "nube"] as const;
export type IconoFicha = (typeof ICONOS_FICHA)[number];

export const esquemaPublicidad = z.object({
  marca: z.string(),
  acento: z.string().regex(/^#[0-9a-f]{6}$/i),
  /** El logo; vacío en un anuncio que todavía no dice la marca (no sale ni arriba ni en el cierre). */
  logo: z.string(),
  /** «oscuro» para marcas con logo claro (QRBott): el logo va sobre oscuro y el cierre también. */
  tema: z.enum(["claro", "oscuro"]).default("claro"),
  /**
   * «centro»: la captura en una tarjeta en el medio (versión 1). «pantalla»: la captura ocupa toda la
   * pantalla y la persona se mueve alrededor (cabecita, medio cuerpo señalando, cuerpo pequeño o grande).
   */
  diseno: z.enum(["centro", "pantalla", "telefono", "pizarra"]).default("centro"),
  /**
   * La armonía propia del video (Richard, 22 oct 2026: «todos los videos salen iguales… da la sensación
   * de que ese video uno ya lo vio»): el fondo en degradado con su dibujo, en vez del verde y negro de
   * siempre. Sin paleta, el fondo es el de antes.
   */
  paleta: z
    .object({
      fondo: z.tuple([z.string().regex(/^#[0-9a-f]{6}$/i), z.string().regex(/^#[0-9a-f]{6}$/i)]),
      patron: z.enum(["puntos", "lineas", "ninguno"]).default("puntos"),
      /** Una foto detrás de todo (teñida con la paleta), en vez del degradado solo. */
      foto: z.string().nullable().default(null),
      /**
       * Cables de luz que suben de los teléfonos de la foto a una nube arriba (Kipuu de verano, 6 nov 2026:
       * «varias personas detrás con un teléfono en la mano… unos rayos que se conectan a la nube arriba
       * mientras ella habla»). `desde`: cada teléfono en fracciones de la FOTO (se mueve con su acercamiento);
       * `nube`: el centro de la nube en fracciones de la PANTALLA (no se mueve).
       */
      rayos: esquemaRayos.nullable().default(null),
    })
    .nullable()
    .default(null),
  /**
   * La portada en el primer cuadro (WhatsApp y las redes lo usan de miniatura): el título grande en una o
   * dos líneas y una etiqueta arriba, quietos desde el cuadro 0, hasta `hastaMs`.
   */
  portada: z
    .object({
      lineas: z.array(z.string().max(26)).min(1).max(2),
      etiqueta: z.string().max(24).default(""),
      hastaMs: z.number().min(500).max(6000).default(2200),
    })
    .nullable()
    .default(null),
  /**
   * Una etiqueta quieta en la esquina de arriba a la derecha durante todo el anuncio (menos el cierre, que
   * ya la dice y lleva el logo grande ahí): «14 DÍAS GRATIS · SIN TARJETA» (Kipuu, 7 nov 2026). Cada « · »
   * parte un renglón para que quepa en la esquina sin chocar con la nube del centro.
   */
  etiquetaFija: z.string().nullable().default(null),
  /**
   * La tarjeta de cada momento entra ya opaca (crece un poco, sin fundido). Con el fundido, un cuadro a mitad
   * de la entrada la dejaba casi transparente, «lavada» (Kipuu, video 3, 7 nov 2026).
   */
  tarjetaOpaca: z.boolean().default(false),
  /**
   * Cómo entra la persona en los diseños «centro» y «teléfono»: «deslizar» (de siempre: el medio cuerpo
   * desde la izquierda, el cuerpo entero desde abajo) o «directa» (ya en su sitio, completa, con un rebote
   * suave). Deslizando se veía cortada en el borde en los primeros cuadros (Kipuu, video 3, 7 nov 2026).
   */
  entradaPersona: z.enum(["deslizar", "directa"]).default("deslizar"),
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
  /** El volumen de la música debajo de la voz (sube a 0,35 en el cierre). */
  musicaVolumen: z.number().min(0).max(1).default(0.13),
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
      /**
       * Una ficha con datos y su ícono en la franja del texto grande (en vez de etiquetas sueltas): «Datacenters
       * en EE. UU. · Cifrado AES-256» sobre la presentadora de cuerpo entero (Kipuu, video 2, 7 nov 2026).
       */
      ficha: z
        .array(z.object({ texto: z.string(), icono: z.enum(ICONOS_FICHA).nullable().default(null) }))
        .default([]),
      /** Cómo se ve la persona desde este momento (diseño «pantalla»); null: sigue como venía. */
      vistaPersona: esquemaVistaPersona.nullable().default(null),
      /**
       * Un video real de fondo en vez de la foto (diseño «pantalla»): el archivo ya vertical, desde qué
       * milisegundo y a qué velocidad. `imagen` trae su primer cuadro (para el fondo difuminado y la
       * miniatura). Sin sonido: suena la voz, la música y los efectos del anuncio.
       */
      video: z
        .object({
          ruta: z.string(),
          desdeMs: z.number().min(0),
          velocidad: z.number().min(0.25).max(4),
          /** El sonido real del video, de 0 a 1 (0 = mudo). */
          volumen: z.number().min(0).max(1).default(0),
        })
        .nullable()
        .default(null),
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
        /** Diseño «pizarra»: el lado de la pantalla donde está (el teléfono va del otro lado). */
        lado: z.enum(["izquierda", "derecha"]).default("izquierda"),
        /** Se dibuja volteada (su mano apunta al otro lado). */
        espejo: z.boolean().default(false),
        /** Una foto quieta (PNG) en vez del video que habla: de espaldas, señalando la pantalla. */
        quieta: z.boolean().default(false),
        /** La punta del dedo en la figura (fracciones, sin voltear), para el destello donde señala. */
        dedo: z.object({ x: z.number(), y: z.number() }).nullable().default(null),
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
  /** La tarjeta final; `imagen`: el producto (sin fondo) debajo de las líneas, para que no quede vacía. */
  cierre: z.object({
    inicioMs: z.number(),
    lineas: z.array(z.string()),
    imagen: z.string().nullable().default(null),
    /**
     * La insignia oficial de una tienda (la de Google Play en español, bajada de play.google.com) debajo de la
     * primera línea, tal cual, sin sombra ni cambios; `legal`: la línea de la marca, chiquita abajo.
     */
    insignia: z
      .object({
        imagen: z.string(),
        ancho: z.number().positive(),
        alto: z.number().positive(),
        legal: z.string().nullable().default(null),
      })
      .nullable()
      .default(null),
  }),
  sfx: z.object({ cortes: z.array(z.string()), final: z.string().nullable() }),
  /** Sonidos largos a su hora (el chorro del agua), con entrada y salida suaves. */
  efectos: z
    .array(
      z.object({
        ruta: z.string(),
        desdeMs: z.number().min(0),
        hastaMs: z.number().min(0).nullable(),
        volumen: z.number().min(0).max(1),
      }),
    )
    .default([]),
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
  /** Diseño «teléfono» con una pantalla ancha (de computadora): tarjeta a lo ancho, arriba. */
  telefonoAncha: { x: 60, y: 390, ancho: 960, alto: 760 },
  /**
   * Diseño «pantalla»: la foto a pantalla completa y la persona delante, de un lado o del otro. Desde el
   * comercial de franquicias (25 oct 2026) es para FOTOS (nunca capturas de software, que se ven
   * enteras: C-PUBLICIDAD-ENTERA) y la persona va más grande: es la que presenta.
   */
  pantalla: {
    cabeza: { diametro: 380, abajo: 150, margen: 40, borde: 8 },
    medio: { alto: 820 },
    cuerpo: { alto: 1150, margen: 10 },
    subtitulos: { y: 1500, yLibre: 1560 },
  },
  /**
   * Diseño «pizarra» (Richard, 23 oct 2026: «las capturas bien centradas en la pantalla del teléfono de
   * forma vertical… ella en algunos momentos se ponga como de espalda y apunte como cuando uno está
   * apuntando a una pizarra»): un teléfono dibujado de un lado y la persona del otro, señalándolo.
   */
  pizarra: {
    // Grande (Richard, 23 oct 2026: «estirar un poquito más la pantalla… que el cuerpo de ella quede por
    // arriba como si fuese una pizarra»): ella puede tapar un pedazo del teléfono.
    telefono: { ancho: 660, alto: 1240, y: 370, margen: 30, bisel: 16, radio: 80, barra: 54, relleno: 10 },
    /** Alto de la persona: «medio» (corta) y «cuerpo» (alta, de la cabeza a los pies). */
    persona: { medio: 880, cuerpo: 1300 },
    /** Cuánto entra su cuerpo sobre el teléfono (la de espaldas más, como quien toca la pizarra). */
    solape: 110,
    solapeQuieta: 170,
    /** Su cara nunca queda a menos de esto del borde del video. */
    margenCara: 24,
    subtitulos: 1626,
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

/**
 * La tarjeta del diseño «teléfono» con la forma de la pantalla: una alta (de celular) va a la derecha
 * y llega hasta 655×1115; una ancha (de computadora) va arriba, a lo ancho, hasta 960×760. Siempre
 * del tamaño justo de la imagen: se ve entera y sin franjas.
 */
export function tarjetaTelefono(img: { ancho: number; alto: number }): {
  x: number;
  y: number;
  ancho: number;
  alto: number;
} {
  const t = ZONA_PUBLICIDAD.telefono;
  const a = ZONA_PUBLICIDAD.telefonoAncha;
  const ancho = img.ancho || 1;
  const alto = img.alto || 1;
  if (ancho >= alto) {
    const s = Math.min(a.ancho / ancho, a.alto / alto);
    const w = Math.round(ancho * s);
    const h = Math.round(alto * s);
    return {
      x: a.x + Math.round((a.ancho - w) / 2),
      y: a.y + Math.round((a.alto - h) / 2),
      ancho: w,
      alto: h,
    };
  }
  const s = Math.min(t.ancho / ancho, t.alto / alto);
  const w = Math.round(ancho * s);
  const h = Math.round(alto * s);
  return { x: t.x + t.ancho - w, y: t.y + Math.round((t.alto - h) / 2), ancho: w, alto: h };
}

type Caja = { x: number; y: number; ancho: number; alto: number };

/** El teléfono del diseño «pizarra»: del lado contrario a la persona, o al centro si no hay nadie. */
export function telefonoPizarra(ladoPersona: "izquierda" | "derecha" | null): Caja {
  const t = ZONA_PUBLICIDAD.pizarra.telefono;
  const x =
    ladoPersona === "izquierda"
      ? 1080 - t.margen - t.ancho
      : ladoPersona === "derecha"
        ? t.margen
        : Math.round((1080 - t.ancho) / 2);
  return { x, y: t.y, ancho: t.ancho, alto: t.alto };
}

/** La zona de la pantalla del teléfono donde va la captura (debajo de la barra de la hora), relativa a él. */
export function contenidoDelTelefono(): Caja {
  const t = ZONA_PUBLICIDAD.pizarra.telefono;
  return {
    x: t.bisel,
    y: t.bisel + t.barra,
    ancho: t.ancho - 2 * t.bisel,
    alto: t.alto - 2 * t.bisel - t.barra,
  };
}

/** La captura entera y centrada en la pantalla del teléfono (relativa a la zona del contenido). */
export function capturaEnTelefono(img: { ancho: number; alto: number }): Vista {
  const c = contenidoDelTelefono();
  const r = ZONA_PUBLICIDAD.pizarra.telefono.relleno;
  const v = vistaCompleta(
    { ancho: c.ancho - 2 * r, alto: c.alto - 2 * r },
    {
      ancho: img.ancho || 1,
      alto: img.alto || 1,
    },
  );
  return { ...v, left: v.left + r, top: v.top + r };
}

/**
 * Dónde va la persona en el diseño «pizarra»: apoyada abajo, de su lado, con la mano (el borde de la
 * figura que mira al teléfono) entrando un poco sobre el borde del teléfono. Si así su cara quedara
 * fuera del video, se corre hacia adentro (la mano entra más) hasta que la cara se vea entera.
 */
export function personaEnPizarra(
  a: {
    ancho: number;
    alto: number;
    encuadre: "medio" | "cuerpo";
    lado: "izquierda" | "derecha";
    espejo: boolean;
    quieta: boolean;
    cara: Region | null;
  },
  telefono: Caja,
): { left: number; ancho: number; alto: number } {
  const Z = ZONA_PUBLICIDAD.pizarra;
  const alto = a.encuadre === "cuerpo" ? Z.persona.cuerpo : Z.persona.medio;
  const ancho = Math.round((alto * a.ancho) / Math.max(1, a.alto));
  const solape = a.quieta ? Z.solapeQuieta : Z.solape;
  // La cara en el video ya volteado (fracciones del ancho).
  const cara = a.cara
    ? a.espejo
      ? { desde: 1 - a.cara.x - a.cara.ancho, hasta: 1 - a.cara.x }
      : { desde: a.cara.x, hasta: a.cara.x + a.cara.ancho }
    : { desde: 0.3, hasta: 0.6 };
  if (a.lado === "izquierda") {
    const left = telefono.x + solape - ancho;
    return { left: Math.round(Math.max(left, Z.margenCara - cara.desde * ancho)), ancho, alto };
  }
  const left = telefono.x + telefono.ancho - solape;
  return { left: Math.round(Math.min(left, 1080 - Z.margenCara - cara.hasta * ancho)), ancho, alto };
}

/**
 * El lado del teléfono en `ms` y desde cuándo: sigue a la persona que está hablando (o al centro si no
 * hay nadie); `antes` es de dónde viene, para que cruce la pantalla deslizándose.
 */
export function ladoDelTelefonoEn(
  apariciones: { inicioMs: number; finMs: number; lado: "izquierda" | "derecha" }[],
  ms: number,
): { lado: "izquierda" | "derecha" | null; antes: "izquierda" | "derecha" | null; desdeMs: number } {
  const ladoEn = (t: number) => apariciones.find((a) => t >= a.inicioMs && t < a.finMs)?.lado ?? null;
  // Los momentos donde el lado puede cambiar: cada entrada y cada salida, en orden.
  const marcas = [...new Set(apariciones.flatMap((a) => [a.inicioMs, a.finMs]))].sort((x, y) => x - y);
  let lado = ladoEn(0);
  let antes = lado;
  let desdeMs = 0;
  for (const m of marcas) {
    if (m > ms) break;
    const nuevo = ladoEn(m);
    if (nuevo !== lado) {
      antes = lado;
      lado = nuevo;
      desdeMs = m;
    }
  }
  return { lado, antes, desdeMs };
}

/**
 * El video real que corre dentro de la tarjeta, o `null` si va la captura quieta. En «pantalla» ocupa
 * toda la pantalla; en «teléfono» corre dentro del teléfono (la grabación de la copia de la cámara de
 * Kipuu, 6 nov 2026: «un video como imagen de apoyo mientras la chica habla»). En «centro» y «pizarra»
 * sigue la captura (su cuadro).
 */
export function videoEnTarjeta<V>(
  diseno: z.infer<typeof esquemaPublicidad>["diseno"],
  video: V | null | undefined,
): V | null {
  return video && (diseno === "pantalla" || diseno === "telefono") ? video : null;
}

/** El acercamiento lento de la foto de fondo en cada cuadro: de 1,04 a 1,16 a lo largo del anuncio. */
export function zoomDeFondo(frame: number, total: number): number {
  const t = total > 0 ? Math.min(1, Math.max(0, frame / total)) : 0;
  return 1.04 + 0.12 * t;
}

/**
 * Dónde cae en la pantalla (1080×1920) un punto de la foto de fondo dado en fracciones, con el
 * acercamiento aplicado desde el centro: así el cable sale siempre del teléfono, aunque la foto se mueva.
 */
export function puntoEnPantalla(p: readonly [number, number], zoom: number): { x: number; y: number } {
  return { x: 540 + (p[0] * 1080 - 540) * zoom, y: 960 + (p[1] * 1920 - 960) * zoom };
}

type Punto = { x: number; y: number };

/** El cable de un teléfono a la nube: una curva que sube derecho y llega por debajo de la nube. */
export function curvaDelRayo(desde: Punto, llegada: Punto): [Punto, Punto, Punto, Punto] {
  const alto = Math.max(120, desde.y - llegada.y);
  return [
    desde,
    { x: desde.x, y: desde.y - alto * 0.55 },
    { x: llegada.x, y: llegada.y + alto * 0.45 },
    llegada,
  ];
}

/** Un punto de la curva (t de 0, el teléfono, a 1, la nube): ahí viaja la fotito que sube. */
export function puntoEnCurva(c: readonly [Punto, Punto, Punto, Punto], t: number): Punto {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const d = 3 * u * t * t;
  const e = t * t * t;
  return {
    x: a * c[0].x + b * c[1].x + d * c[2].x + e * c[3].x,
    y: a * c[0].y + b * c[1].y + d * c[2].y + e * c[3].y,
  };
}

/** El cierre conserva la foto de fondo en los dos temas (antes solo en el oscuro; la oficina de verano va en claro). */
export function cierreConFoto(paleta: { foto: string | null } | null | undefined): boolean {
  return Boolean(paleta?.foto);
}

/** Lo que tarda la portada en irse (sube y se apaga): 10 cuadros. */
export const SALIDA_PORTADA_CUADROS = 10;
export const SALIDA_PORTADA_MS = Math.round((SALIDA_PORTADA_CUADROS / 30) * 1000);

/**
 * Cuándo puede entrar el texto grande (o las etiquetas, la cifra o la ficha) de un momento: si la portada
 * todavía está en pantalla o se está yendo, espera a que se haya ido del todo. Antes entraba debajo y se veía
 * un «título fantasma» transparente detrás del de la portada (Kipuu, video 2, 7 nov 2026: «¿ARCHIVOS
 * REGADOS?» detrás de «TUS ARCHIVOS SEGUROS EN LA NUBE»).
 */
export function entradaTrasPortada(inicioMs: number, portada: { hastaMs: number } | null): number {
  return portada ? Math.max(inicioMs, portada.hastaMs + SALIDA_PORTADA_MS) : inicioMs;
}

/** La etiqueta fija en renglones: cada « · » parte uno («14 DÍAS GRATIS · SIN TARJETA» → dos). */
export function lineasDeEtiqueta(texto: string): string[] {
  return texto
    .split(/\s+·\s+/)
    .map((l) => l.trim())
    .filter(Boolean);
}

/** La etiqueta de la portada: con una etiqueta fija en la esquina, la portada no pone la suya (irían encima). */
export function etiquetaDePortada(portada: { etiqueta: string } | null, etiquetaFija: string | null): string {
  return etiquetaFija ? "" : (portada?.etiqueta ?? "");
}

/** La opacidad de la tarjeta mientras entra: la opaca va entera desde el primer cuadro. */
export function opacidadDeEntrada(entra: number, opaca: boolean): number {
  return opaca ? 1 : entra;
}

/** El ancho de la insignia de la tienda en el cierre (en un video de 1080 de ancho). */
export const ANCHO_INSIGNIA = 560;

/**
 * La insignia de Google Play con sus reglas de uso (página de insignias de Google Play, 7 nov 2026): nunca
 * deformada (el alto sale de su proporción), no menos de 28 px de alto, y un aire alrededor de al menos un
 * cuarto de su alto, sin nada encima.
 */
export function medidasDeInsignia(img: { ancho: number; alto: number }): {
  ancho: number;
  alto: number;
  aire: number;
} {
  const ancho = ANCHO_INSIGNIA;
  const alto = Math.max(28, Math.round((ancho * img.alto) / Math.max(1, img.ancho)));
  return { ancho, alto, aire: Math.ceil(alto / 4) };
}

/**
 * La entrada de la persona en el cuadro `frame` desde que aparece (diseños «centro» y «teléfono»): cuánto
 * va corrida (dx, dy en px), su escala y su opacidad. «deslizar» es la de siempre (9 cuadros: el medio cuerpo
 * desde 420 px a la izquierda, el cuerpo entero desde 260 px abajo y apareciendo); «directa» la deja en su
 * sitio y completa desde el primer cuadro, con un rebote de 0,94 a 1 en 6 cuadros. `null`: ya estaba.
 */
export function entradaDePersona(
  frame: number,
  modo: "deslizar" | "directa" | null,
  encuadre: "medio" | "cuerpo",
): { dx: number; dy: number; escala: number; opacidad: number } {
  if (modo === "directa") {
    const t = Math.min(1, Math.max(0, frame / 6));
    return { dx: 0, dy: 0, escala: 0.94 + 0.06 * (1 - (1 - t) ** 3), opacidad: 1 };
  }
  const t = Math.min(1, Math.max(0, frame / 9));
  const mov = modo === "deslizar" ? (1 - t) ** 3 : 0;
  return encuadre === "cuerpo"
    ? { dx: 0, dy: 260 * mov, escala: 1, opacidad: 1 - mov * 0.8 }
    : { dx: -420 * mov, dy: 0, escala: 1, opacidad: 1 };
}
