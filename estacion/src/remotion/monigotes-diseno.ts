// El diseño de la plantilla de monigotes sin Remotion: el esquema de las props, el color, las zonas
// de la pantalla y los tamaños de letra. Lo prueban las pruebas de la raíz; si importara Remotion,
// el panel dejaría de publicarse (C-CI-1).
import { z } from "zod";

export const ROJO = "#ff2a2a";

/** Letra negra sobre un color claro (el verde de Full Código) y blanca sobre uno oscuro (el rojo). */
export function textoSobre(color: string): "#000" | "#fff" {
  const n = (i: number) => parseInt(color.slice(i, i + 2), 16) / 255;
  const lineal = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const luz = 0.2126 * lineal(n(1)) + 0.7152 * lineal(n(3)) + 0.0722 * lineal(n(5));
  return luz > 0.3 ? "#000" : "#fff";
}

export const esquemaMonigotes = z.object({
  titulo: z.tuple([z.string(), z.string()]),
  marca: z.string(),
  acento: z
    .string()
    .regex(/^#[0-9a-f]{6}$/i)
    .default(ROJO),
  audio: z.string(),
  duracionMs: z.number(),
  escenas: z.array(
    z.object({
      inicioMs: z.number(),
      finMs: z.number(),
      // «video»: clip animado de pago (Kling). «imagen»: una pose dibujada que la plantilla mueve gratis.
      clips: z.array(
        z.object({
          ruta: z.string(),
          duracionMs: z.number(),
          tipo: z.enum(["video", "imagen"]).default("video"),
          // Solo en imágenes: cuánto subir (fracción del alto) y acercar el dibujo para dejarlo en la
          // franja libre entre el título y los subtítulos (encuadreDeDibujo en monigotes.ts).
          encuadre: z.object({ subir: z.number(), zoom: z.number() }).optional(),
        }),
      ),
      hueco: z
        .object({ inicioMs: z.number(), finMs: z.number(), cancion: z.string(), artista: z.string() })
        .nullable(),
    }),
  ),
  subtitulos: z.array(
    z.object({
      inicioMs: z.number(),
      finMs: z.number(),
      palabras: z.array(z.string()),
      resaltada: z.number(),
    }),
  ),
});
export type PropsMonigotes = z.infer<typeof esquemaMonigotes>;

/**
 * Dónde va cada cosa (en píxeles de 1080×1920). En un Short, YouTube tapa más o menos el 15 % de abajo
 * con el nombre del canal y el título, y la columna derecha con los botones: el 12 oct 2026 la marca
 * «CAPRICHOSO TV» quedó debajo del título de YouTube (C-MONIGOTES-1). Todo el texto queda por encima
 * del 85 % del alto y lejos del borde derecho. En cada hueco de canción va un recuadro 16:9 PEQUEÑO en la
 * esquina de arriba a la izquierda, siempre en el mismo sitio, para que Richard pegue ahí el video de la
 * canción; el dibujo NO se oscurece: el muñeco sigue siendo el protagonista.
 */
export const ZONA = {
  titulo: 250,
  subtitulos: 1370,
  marca: 1500,
  limiteAbajo: 1920 * 0.85,
  margenLados: 110,
  // Pequeño y en la esquina: el protagonista sigue siendo el dibujo (Richard, 12 oct 2026).
  recuadro: { x: 40, y: 470, ancho: 400, alto: 225 },
  tarjetaCancion: 1370,
} as const;

/** Cada línea del título en una sola línea: la letra se achica si el texto es largo (Anton, ~0,46 del alto por letra). */
export const tamanoDeLinea = (texto: string): number =>
  Math.max(56, Math.min(96, Math.floor(960 / Math.max(1, texto.length * 0.46))));

/** La tarjeta de la canción en UNA línea: «Así se le canta al despecho» se partía y pisaba la marca. */
export const tamanoDeTarjeta = (cancion: string): number =>
  Math.max(44, Math.min(84, Math.floor(820 / Math.max(1, (cancion.length + 2) * 0.47))));
