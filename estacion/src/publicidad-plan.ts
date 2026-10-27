// Publicidad en Short (prototipo, 17 oct 2026): un anuncio vertical de 30 a 40 segundos para vender un
// producto de un cliente, con sus fotos, su logo, una voz y un avatar que habla en la esquina. Aquí va
// la lógica pura (el plan, los tiempos y el costo), sin nada de la Mac: la prueban las pruebas de la
// raíz (C-CI-1). Los pasos están en `publicidad.ts` y la plantilla en `remotion/Publicidad.tsx`.
import { z } from "zod";
import { VOCES } from "@compartido/guion";
import { COSTO_AVATAR_POR_SEGUNDO } from "@compartido/publicidad";
import { esquemaRegion, esquemaVistaPersona } from "./remotion/publicidad-diseno";

/** Lo más largo que puede salir un anuncio: un Short de venta no pasa de 45 segundos. */
export const SEGUNDOS_MAXIMOS = 45;

/** El avatar que habla (FlashTalk): 2 centavos por segundo de voz (el valor vive en compartido). */
export { COSTO_AVATAR_POR_SEGUNDO };

export const esquemaPlanPublicidad = z
  .object({
    /** El nombre de la tienda, como sale escrito. */
    marca: z.string().min(2),
    /** El color de la marca (cajas de los textos y de la palabra que se dice). */
    acento: z
      .string()
      .regex(/^#[0-9a-f]{6}$/i)
      .default("#ff2a2a"),
    /**
     * Rutas relativas a la carpeta del cliente. Sin logo (vacío), el anuncio no muestra ninguna marca:
     * para crear expectativa antes de decir el nombre (franquicias, 25 oct 2026).
     */
    logo: z.string().default(""),
    avatar: z.string().optional(),
    musica: z.string().optional(),
    /** La venezolana por defecto: con la femenina de catálogo «suena a extranjera» (Richard, 17 oct 2026). */
    voz: z.enum(VOCES).default("venezolana"),
    idioma: z.enum(["es", "en"]).default("es"),
    /** «oscuro» para marcas con logo claro: el logo va sobre oscuro y el cierre también. */
    tema: z.enum(["claro", "oscuro"]).default("claro"),
    /** «pantalla»: la captura ocupa toda la pantalla y la persona se mueve alrededor (ver `vista_persona`). */
    diseno: z.enum(["centro", "pantalla", "telefono", "pizarra"]).default("centro"),
    /** La armonía propia del video: el fondo en degradado (dos colores) y su dibujo. */
    paleta: z
      .object({
        fondo: z.tuple([z.string().regex(/^#[0-9a-f]{6}$/i), z.string().regex(/^#[0-9a-f]{6}$/i)]),
        patron: z.enum(["puntos", "lineas", "ninguno"]).default("puntos"),
      })
      .optional(),
    /** La portada del primer cuadro (la miniatura de WhatsApp): título en una o dos líneas y etiqueta. */
    portada: z
      .object({
        lineas: z.array(z.string().max(26)).min(1).max(2),
        etiqueta: z.string().max(24).default(""),
        hasta_ms: z.number().min(500).max(6000).default(2200),
      })
      .optional(),
    /** Letras por segundo de la voz (11,6 es el ritmo de los documentales; un comercial va a 13,5). */
    letras_por_segundo: z.number().min(8).max(16).optional(),
    /**
     * La pausa entre una parte y la siguiente, en milisegundos, SIN contar el silencio que traiga cada
     * parte al principio y al final (se recorta: Richard, 25 oct 2026, «en los cambios de escena hay una
     * pausa, como que se queda un poquito allí»).
     */
    pausa_ms: z.number().min(0).max(1000).default(150),
    /** El volumen de la voz (LUFS integrados); las redes suenan a −14. Solo se sube o baja, sin efectos. */
    voz_lufs: z.number().min(-24).max(-10).default(-14),
    /**
     * Otra versión del mismo anuncio: usa la voz y los videos de la persona de ese otro plan (su carpeta
     * de trabajo), sin pagarlos de nuevo. Los momentos con `persona` tienen que ser los mismos.
     */
    trabajo_de: z.string().min(1).optional(),
    /** Lo que dice la voz, entero (o `partes`: la voz se hace por partes y se puede rehacer una sola). */
    texto: z.string().min(20).optional(),
    /**
     * Cada parte es un texto, o `{ texto, desde_ms }` para que empiece en ese milisegundo del anuncio
     * (una demostración en vivo: la voz va donde pasa cada cosa en el video, no seguida).
     */
    partes: z
      .array(
        z.union([z.string().min(2), z.object({ texto: z.string().min(2), desde_ms: z.number().min(0) })]),
      )
      .min(1)
      .optional(),
    /** El volumen de la música debajo de la voz (0,13 de siempre; más bajo si el video trae su sonido). */
    musica_volumen: z.number().min(0).max(1).default(0.13),
    /** Lo más largo que puede durar la voz (el anuncio de bienvenida de QRBott dura 90 s). */
    maximo_seg: z.number().min(10).max(120).default(SEGUNDOS_MAXIMOS),
    /** Cuánto queda la tarjeta final después de la última palabra. */
    cola_ms: z.number().min(0).max(6000).default(1200),
    /** Cada cambio de imagen o de texto entra cuando la voz dice su `frase` (palabras literales). */
    momentos: z
      .array(
        z.object({
          frase: z.string().min(2),
          imagen: z.string().optional(),
          texto: z.string().max(40).optional(),
          /** Etiquetas que entran una a una, cada una cuando se dice su palabra. */
          chips: z
            .array(z.object({ texto: z.string().max(24), palabra: z.string().min(2) }))
            .max(6)
            .optional(),
          /** La zona de la imagen que se acerca (fracciones de 0 a 1): la captura se ve de cerca. */
          enfoque: esquemaRegion.optional(),
          /** Sin tarjeta: la persona de cuerpo completo ocupa la pantalla. */
          sin_tarjeta: z.boolean().optional(),
          /** El efecto de este momento (un archivo de recursos/sfx o una ruta). */
          sonido: z.string().optional(),
          /** Una cifra que sube como contador. */
          cifra: z
            .object({
              valor: z.number(),
              prefijo: z.string().max(4).optional(),
              sufijo: z.string().max(8).optional(),
              decimales: z.number().int().min(0).max(2).optional(),
            })
            .optional(),
          /** La tarjeta baja a oscuro (de noche). */
          oscurecer: z.boolean().optional(),
          entrada: z.enum(["golpe", "barrido"]).optional(),
          /**
           * Un video real de fondo (diseño «pantalla»): el archivo, desde qué segundo y a qué velocidad
           * (1,5 = más rápido, para quitar tiempos muertos). Gira solo si el teléfono lo grabó acostado.
           * `sonido`: el sonido real del video (el chorro del agua), de 0 a 1; 0 = mudo.
           */
          video: z
            .object({
              archivo: z.string().min(1),
              desde_s: z.number().min(0).default(0),
              velocidad: z.number().min(0.25).max(4).default(1),
              sonido: z.number().min(0).max(1).default(0),
            })
            .optional(),
          /** Diseño «pantalla»: cómo se ve la persona desde este momento (grande, cuerpo, medio, cabeza u oculta). */
          vista_persona: esquemaVistaPersona.optional(),
          /**
           * Desde este momento habla esta persona con este encuadre (hasta que otro momento la cambie):
           * «medio» de la cabeza a la cadera abajo a la izquierda, «cuerpo» entera al centro; «ninguna»
           * la saca. `corte`: hasta qué fracción de su figura llega el medio cuerpo (0,56 = la cadera).
           */
          persona: z
            .union([
              z.literal("ninguna"),
              z.object({
                imagen: z.string().min(1),
                encuadre: z.enum(["medio", "cuerpo"]),
                corte: z.number().min(0.3).max(0.9).optional(),
                /** Diseño «pizarra»: de qué lado está (el teléfono va del otro). */
                lado: z.enum(["izquierda", "derecha"]).optional(),
                /** Hacia dónde apunta su mano en la foto (para voltearla y que señale el teléfono). */
                apunta: z.enum(["izquierda", "derecha"]).optional(),
                /** Foto quieta que no habla (de espaldas, señalando): no se paga el avatar. */
                quieta: z.boolean().optional(),
              }),
            ])
            .optional(),
        }),
      )
      .min(3),
    /** La tarjeta final con el logo: entra cuando se dice `frase`. */
    cierre: z.object({
      frase: z.string().min(2),
      lineas: z.array(z.string().max(32)).max(4),
      /** El producto (mejor sin fondo) debajo de las líneas de la tarjeta final. */
      imagen: z.string().optional(),
    }),
  })
  .superRefine((p, ctx) => {
    if (!p.texto && !p.partes)
      ctx.addIssue({ code: "custom", message: "Falta lo que dice la voz: `texto` o `partes`." });
  });
export type PlanPublicidad = z.infer<typeof esquemaPlanPublicidad>;

/** Lo que queda de cada parte de la voz al juntarlas: un poco antes de la primera palabra y un poco después de la última. */
export const MARGEN_VOZ = { antesMs: 20, despuesMs: 70 } as const;

/**
 * El tramo de una parte que se queda al juntarla con las otras: desde donde empieza a sonar la voz
 * hasta donde deja de sonar, con un margen corto (el silencio de las puntas es lo que hacía la pausa
 * larga entre escena y escena). `silencios` en milisegundos; si no hay silencio en una punta, se queda
 * entera por ese lado.
 */
export function tramoConVoz(
  silencios: { desdeMs: number; hastaMs: number }[],
  duracionMs: number,
  margen: { antesMs: number; despuesMs: number } = MARGEN_VOZ,
): { desdeMs: number; hastaMs: number } {
  const inicial = silencios.find((x) => x.desdeMs <= 1);
  const final = [...silencios].reverse().find((x) => x.hastaMs >= duracionMs - 1);
  const desde = inicial ? Math.max(0, inicial.hastaMs - margen.antesMs) : 0;
  const hasta = final ? Math.min(duracionMs, final.desdeMs + margen.despuesMs) : duracionMs;
  // Una parte que fuera todo silencio se queda entera (no se tira la voz pagada por un mal cálculo).
  return hasta - desde > 200
    ? { desdeMs: Math.round(desde), hastaMs: Math.round(hasta) }
    : { desdeMs: 0, hastaMs: duracionMs };
}

/**
 * Cuánto hay que subir (o bajar) la voz para que suene a `objetivo` LUFS: una ganancia simple, sin
 * efectos (Richard: «nada de efectos, lo más natural»). Nunca más de 12 dB arriba ni 8 abajo.
 */
export function gananciaDeVoz(lufs: number, objetivo = -14): number {
  if (!Number.isFinite(lufs)) return 0;
  return Math.round(Math.min(12, Math.max(-8, objetivo - lufs)) * 10) / 10;
}

/** El texto de una parte de la voz (puede venir sola o con su hora). */
export const textoDeParte = (p: string | { texto: string }): string => (typeof p === "string" ? p : p.texto);

/** Lo que dice la voz, entero (las partes van seguidas). */
export const textoDelPlan = (plan: Pick<PlanPublicidad, "texto" | "partes">): string =>
  plan.partes ? plan.partes.map(textoDeParte).join(" ") : (plan.texto ?? "");

/**
 * Dónde empieza cada parte de la voz: seguida de la anterior con `pausaMs`, salvo que tenga su hora
 * (`desdeMs`), y entonces espera hasta esa hora; si la anterior todavía habla a esa hora, entra apenas
 * termine (nunca se pisan).
 */
export function iniciosDePartes(
  partes: { duracionMs: number; desdeMs?: number }[],
  pausaMs: number,
): number[] {
  const inicios: number[] = [];
  let fin = -pausaMs;
  for (const p of partes) {
    const seguida = fin + pausaMs;
    const inicio = p.desdeMs === undefined ? Math.max(0, seguida) : Math.max(seguida, p.desdeMs);
    inicios.push(Math.round(inicio));
    fin = inicio + p.duracionMs;
  }
  return inicios;
}

/** Lo más largo que puede durar UN video de la persona hablando (FlashTalk admite 40 s). */
export const TRAMO_PERSONA_MAX_MS = 35_000;

export type Persona = {
  imagen: string;
  encuadre: "medio" | "cuerpo";
  corte?: number;
  lado?: "izquierda" | "derecha";
  apunta?: "izquierda" | "derecha";
  quieta?: boolean;
};
export type Aparicion = Persona & { inicioMs: number; finMs: number };

/**
 * Cuándo sale cada persona: cada momento que trae `persona` la cambia desde que empieza; «ninguna» la
 * saca. Todo termina al entrar el cierre. Un tramo largo se parte en los cambios de momento para que
 * ningún video pase de `topeMs` (y, si un solo momento es más largo, se parte en pedazos iguales).
 */
export function aparicionesDelPlan(
  momentos: { inicioMs: number; persona?: Persona | "ninguna" }[],
  cierreMs: number,
  topeMs = TRAMO_PERSONA_MAX_MS,
): Aparicion[] {
  // 1) Los tramos de cada persona, de cambio a cambio.
  const tramos: (Aparicion & { cortes: number[] })[] = [];
  let actual: (Aparicion & { cortes: number[] }) | null = null;
  for (const m of momentos) {
    if (m.inicioMs >= cierreMs) break;
    if (m.persona === undefined) {
      actual?.cortes.push(m.inicioMs);
      continue;
    }
    if (actual) {
      actual.finMs = m.inicioMs;
      tramos.push(actual);
      actual = null;
    }
    if (m.persona !== "ninguna") actual = { ...m.persona, inicioMs: m.inicioMs, finMs: cierreMs, cortes: [] };
  }
  if (actual) tramos.push(actual);
  // 2) Ninguno pasa del tope: se corta en el último cambio de momento que cabe.
  const salida: Aparicion[] = [];
  for (const t of tramos) {
    const { cortes, ...persona } = t;
    let inicio = t.inicioMs;
    while (t.finMs - inicio > topeMs) {
      const cabe = cortes.filter((c) => c > inicio + 1500 && c - inicio <= topeMs).pop();
      const piezas = Math.ceil((t.finMs - inicio) / topeMs);
      const corte = cabe ?? Math.round(inicio + (t.finMs - inicio) / piezas);
      salida.push({ ...persona, inicioMs: inicio, finMs: corte });
      inicio = corte;
    }
    if (t.finMs - inicio > 0) salida.push({ ...persona, inicioMs: inicio, finMs: t.finMs });
  }
  return salida;
}

/**
 * Si la figura se dibuja volteada: su mano tiene que apuntar al teléfono, que está del lado contrario
 * al de ella (a la derecha si ella está a la izquierda). Sin `apunta`, la foto apunta a la derecha.
 */
export function vaVolteada(p: Pick<Persona, "lado" | "apunta">): boolean {
  const apunta = p.apunta ?? "derecha";
  return (p.lado ?? "izquierda") === "izquierda" ? apunta === "izquierda" : apunta === "derecha";
}

/**
 * La punta del dedo que señala: el punto de la figura más metido hacia el lado donde apunta (la columna
 * de más afuera con figura, en su centro). Recibe el canal alfa de la figura ya recortada y devuelve
 * fracciones de su ancho y su alto.
 */
export function puntaDelDedo(
  alfa: Uint8Array,
  ancho: number,
  alto: number,
  apunta: "izquierda" | "derecha" = "derecha",
): { x: number; y: number } | null {
  const columnas = Array.from({ length: ancho }, (_, i) => (apunta === "derecha" ? ancho - 1 - i : i));
  for (const x of columnas) {
    const ys: number[] = [];
    for (let y = 0; y < alto; y++) if ((alfa[y * ancho + x] ?? 0) > 40) ys.push(y);
    if (ys.length >= 2) return { x: (x + 0.5) / ancho, y: (ys[Math.floor(ys.length / 2)] ?? 0) / alto };
  }
  return null;
}

/**
 * El recorte de la figura para cada encuadre, en puntos de la imagen: «cuerpo» es toda la figura;
 * «medio» va desde arriba (la gorra o la mano levantada) hasta `corte` de su alto (la cadera).
 */
export function recorteDeEncuadre(
  figura: { x: number; y: number; ancho: number; alto: number },
  encuadre: "medio" | "cuerpo",
  corte = 0.56,
): { x: number; y: number; ancho: number; alto: number } {
  if (encuadre === "cuerpo") return figura;
  return { ...figura, alto: Math.round(figura.alto * corte) };
}

const normal = (t: string) =>
  t
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9ñ ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

type Palabra = { text: string; startMs: number; endMs: number };

/**
 * Dónde empieza cada frase en la voz, en orden: la búsqueda de una sigue donde terminó la anterior.
 * Devuelve null para la que no aparece (así se ve en el registro, en vez de entrar en otro sitio).
 */
export function tiemposDeFrases(frases: string[], palabras: Palabra[]): (number | null)[] {
  const tokens = palabras.map((p) => normal(p.text));
  let desde = 0;
  return frases.map((frase) => {
    const buscadas = normal(frase).split(" ").filter(Boolean);
    if (!buscadas.length) return null;
    for (let i = desde; i + buscadas.length <= tokens.length; i++) {
      if (buscadas.every((b, k) => tokens[i + k] === b)) {
        desde = i + 1;
        return palabras[i]?.startMs ?? null;
      }
    }
    return null;
  });
}

/** Lo que cuesta un anuncio: la voz (la cobra ElevenLabs) y el avatar por segundo, si lleva. */
export function costoPublicidadUsd(segundos: number, conAvatar: boolean, costoVozUsd: number): number {
  const avatar = conAvatar ? segundos * COSTO_AVATAR_POR_SEGUNDO : 0;
  return Math.round((avatar + costoVozUsd) * 1000) / 1000;
}

// ——— Un anuncio pedido desde el panel (menú «Publicidad») ———

type ImagenDeLaBiblioteca = { nombre: string; ruta: string; transparente: boolean };

/**
 * El logo del anuncio: la imagen que se llama «logo» (en cualquier carpeta elegida); si no hay, la
 * primera sin fondo que no sea la persona que habla. Null si no hay ninguna que sirva.
 */
export function elegirLogo(imagenes: ImagenDeLaBiblioteca[], avatar: string): ImagenDeLaBiblioteca | null {
  const candidatas = imagenes.filter((i) => i.nombre !== avatar);
  return (
    candidatas.find((i) => normal(i.nombre).includes("logo")) ??
    candidatas.find((i) => i.transparente) ??
    null
  );
}

/**
 * El color de la marca sacado del logo: entre los puntos visibles y con color (ni grises, ni casi
 * negros, ni casi blancos) gana el tono que más se repite. Null si el logo es gris o no tiene color.
 * Recibe los puntos en RGBA, uno detrás de otro.
 */
export function acentoDeLogo(rgba: Uint8Array): string | null {
  const grupos = new Map<number, { n: number; r: number; g: number; b: number }>();
  for (let i = 0; i + 3 < rgba.length; i += 4) {
    const r = rgba[i] ?? 0;
    const g = rgba[i + 1] ?? 0;
    const b = rgba[i + 2] ?? 0;
    const a = rgba[i + 3] ?? 0;
    if (a < 200) continue;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const saturacion = max === 0 ? 0 : (max - min) / max;
    if (saturacion < 0.45 || max < 70) continue;
    const d = max - min;
    let tono = 0;
    if (max === r) tono = ((g - b) / d + 6) % 6;
    else if (max === g) tono = (b - r) / d + 2;
    else tono = (r - g) / d + 4;
    const grupo = Math.floor(tono * 2); // 12 grupos de 30°
    const actual = grupos.get(grupo) ?? { n: 0, r: 0, g: 0, b: 0 };
    grupos.set(grupo, { n: actual.n + 1, r: actual.r + r, g: actual.g + g, b: actual.b + b });
  }
  const total = [...grupos.values()].reduce((s, x) => s + x.n, 0);
  const mejor = [...grupos.values()].sort((a, b) => b.n - a.n)[0];
  // Un par de puntos de color en un logo gris no lo vuelven de ese color.
  if (!mejor || total < 20) return null;
  const hex = (v: number) =>
    Math.round(v / mejor.n)
      .toString(16)
      .padStart(2, "0");
  return `#${hex(mejor.r)}${hex(mejor.g)}${hex(mejor.b)}`;
}

/**
 * El plan que arma la Mac a partir del que hizo la IA en el panel: cada imagen, de su nombre en la
 * biblioteca a su archivo en la Mac (la que no está en la Mac va sin imagen, nunca otra).
 */
export function planParaArmar(d: {
  marca: string;
  texto: string;
  voz: (typeof VOCES)[number];
  idioma: "es" | "en";
  plan: {
    momentos: {
      frase: string;
      imagen?: string;
      texto?: string;
      chips?: { texto: string; palabra: string }[];
    }[];
    cierre: { frase: string; lineas: string[] };
  };
  rutas: Map<string, string>;
  logo: string;
  avatar?: string;
  musica?: string;
  acento?: string | null;
}): PlanPublicidad {
  return esquemaPlanPublicidad.parse({
    marca: d.marca.slice(0, 60),
    acento: d.acento ?? undefined,
    logo: d.logo,
    avatar: d.avatar,
    musica: d.musica,
    voz: d.voz,
    idioma: d.idioma,
    texto: d.texto,
    momentos: d.plan.momentos.map((m) => ({
      frase: m.frase,
      imagen: m.imagen ? d.rutas.get(m.imagen) : undefined,
      texto: m.texto,
      chips: m.chips,
    })),
    cierre: d.plan.cierre,
  });
}
