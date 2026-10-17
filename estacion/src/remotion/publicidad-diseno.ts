// El diseño del anuncio vertical (Publicidad en Short) sin Remotion: el esquema de las props y dónde
// va cada cosa en la pantalla de 1080×1920. Lo prueban las pruebas de la raíz (C-CI-1).
import { z } from "zod";

export const esquemaPublicidad = z.object({
  marca: z.string(),
  acento: z.string().regex(/^#[0-9a-f]{6}$/i),
  logo: z.string(),
  /** Video transparente (WebM con alfa) del avatar que habla, o una foto quieta (PNG), o nada. */
  avatar: z.object({ ruta: z.string(), video: z.boolean(), ancho: z.number(), alto: z.number() }).nullable(),
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
  limiteAbajo: 1920 * 0.85,
} as const;
