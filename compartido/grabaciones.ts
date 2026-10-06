// Grabaciones (formato Presentador): Richard sube un video suyo hablando y el
// motor lo convierte en un video con gráficos detrás. Aquí va lo que comparten
// el panel y la Estación: tamaños, estados y cómo se parte el archivo al subir.
import { z } from "zod";
import { ESTILOS_VIDEO } from "./tematicas";

/** Cada trozo de la subida. El almacén exige al menos 5 MB por trozo (menos el último). */
export const TAMANO_PARTE = 8 * 1024 * 1024;
/** Lo más que puede pesar una grabación: 4 GB (unos 40 minutos en 1080p de un teléfono). */
export const MAX_BYTES_GRABACION = 4 * 1024 * 1024 * 1024;
export const EXTENSIONES_VIDEO = ["mp4", "mov", "m4v", "webm", "mkv"] as const;

export const ESTADOS_GRABACION = ["subiendo", "subida", "tomada", "planeada", "error", "quitada"] as const;
export type EstadoGrabacion = (typeof ESTADOS_GRABACION)[number];

/** Lo que Richard llena al subir una grabación. */
export const esquemaGrabacionNueva = z.object({
  tema: z
    .string()
    .trim()
    .min(5, "Cuenta en una frase de qué hablas en el video.")
    .max(300, "Con una o dos frases alcanza."),
  formato: z.enum(ESTILOS_VIDEO),
  canal: z.enum(["canal-ia", "caprichoso-tv"]),
  archivo: z.string().trim().min(1).max(200),
  bytes: z
    .number()
    .int()
    .min(100_000, "El archivo llegó vacío o es demasiado chico para ser un video.")
    .max(MAX_BYTES_GRABACION, "El archivo pasa de 4 GB. Grábalo en 1080p o súbelo en partes más cortas."),
});
export type GrabacionNueva = z.infer<typeof esquemaGrabacionNueva>;

/** Lo mínimo que tiene que decir una grabación para que haya de qué armar un video (unos 15 segundos). */
export const MIN_PALABRAS_GRABACION = 30;

export const contarPalabras = (texto: string) => texto.split(/\s+/).filter(Boolean).length;

/** La extensión de un archivo de video, o `null` si no es un video que sepamos leer. */
export function extensionDeVideo(nombre: string): (typeof EXTENSIONES_VIDEO)[number] | null {
  const ext = nombre.toLowerCase().split(".").pop() ?? "";
  return EXTENSIONES_VIDEO.find((e) => e === ext) ?? null;
}

/** En cuántos trozos se sube un archivo y dónde empieza y termina cada uno. */
export function partesDe(
  bytes: number,
  tamano = TAMANO_PARTE,
): { n: number; desde: number; hasta: number }[] {
  const partes: { n: number; desde: number; hasta: number }[] = [];
  for (let desde = 0, n = 1; desde < bytes; desde += tamano, n++) {
    partes.push({ n, desde, hasta: Math.min(bytes, desde + tamano) });
  }
  return partes;
}

/** Cómo va una grabación, con el video que salió de ella (si ya lo tiene). */
export type MarchaDeGrabacion = {
  estado: string;
  paso: string;
  error: string;
  trabajo_estado: string | null;
  trabajo_paso: string | null;
  trabajo_progreso: number | null;
  trabajo_error: string | null;
};

export type AvisoDeGrabacion = {
  texto: string;
  tono: "espera" | "trabajando" | "listo" | "error";
  /** Sigue en marcha: la página se refresca sola para mostrar el avance. */
  enCurso: boolean;
};

/** Lo que se le dice a Richard de cada grabación, en palabras normales. */
export function avisoDeGrabacion(g: MarchaDeGrabacion, macEncendida = true): AvisoDeGrabacion {
  switch (g.estado) {
    case "subiendo":
      return { texto: "La subida no terminó. Sube el archivo otra vez.", tono: "error", enCurso: false };
    case "subida":
      return {
        texto: macEncendida
          ? "Recibido. La Mac lo toma en menos de un minuto."
          : "Recibido. Se queda esperando hasta que la Mac vuelva.",
        tono: "espera",
        enCurso: true,
      };
    case "tomada":
      return {
        texto: g.paso ? `La Mac está en eso: ${g.paso}.` : "La Mac la está preparando.",
        tono: "trabajando",
        enCurso: true,
      };
    case "error":
      return {
        texto: `No se pudo preparar: ${g.error || "falló sin decir por qué"}`,
        tono: "error",
        enCurso: false,
      };
    case "planeada":
      break;
    default:
      return { texto: g.estado, tono: "espera", enCurso: false };
  }
  switch (g.trabajo_estado) {
    case "hecho":
      return { texto: "Video listo.", tono: "listo", enCurso: false };
    case "error":
      return {
        texto: `El video no se pudo armar: ${g.trabajo_error || "falló sin decir por qué"}`,
        tono: "error",
        enCurso: false,
      };
    case "cancelado":
      return { texto: "El video se canceló.", tono: "error", enCurso: false };
    case "tomado":
      return {
        texto: `Armando el video: ${g.trabajo_progreso ?? 0}%${g.trabajo_paso ? ` · ${g.trabajo_paso}` : ""}.`,
        tono: "trabajando",
        enCurso: true,
      };
    default:
      return {
        texto: macEncendida
          ? "Plan listo. El video está en la fila para armarse."
          : "Plan listo. El video se arma cuando la Mac vuelva.",
        tono: "espera",
        enCurso: true,
      };
  }
}
