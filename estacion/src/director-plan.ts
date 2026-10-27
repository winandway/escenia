// El Director con el video del cliente (docs/DIRECTOR.md, C-DIRECTOR-3): la parte pura de la Mac. De lo
// que aprobó Richard (la prueba en vivo o la locución) sale el plan que ya saben armar `publicidad.ts`
// (como el del agua de Pro In Shop) y `locucion.ts` (como el de los quince años). Y cómo se reparten los
// cuadros de un video en las hojas que mira la IA. La prueban las pruebas de la raíz (C-CI-1).
import {
  palabrasDe,
  palabrasUtiles,
  primerasPalabras,
  type Demostracion,
  type Locucion,
} from "@compartido/director";
import { esquemaPlanLocucion, type PlanLocucion } from "./locucion-plan";
import { esquemaPlanPublicidad, type PlanPublicidad } from "./publicidad-plan";

/** Cuántos cuadros lleva cada hoja y cuántas hojas como mucho (la IA ve hasta cuatro). */
export const CUADROS_POR_HOJA = 15;
export const HOJAS_MAXIMAS = 4;

/**
 * Cada cuántos segundos se toma un cuadro, y en qué segundos: uno por segundo hasta el minuto, y en
 * uno más largo los justos para que quepan en las cuatro hojas (cada 2 s hasta dos minutos, cada 3
 * hasta tres…). Siempre el primero en el segundo 0.
 */
export function cuadrosDelVideo(duracionSeg: number): { paso: number; tiempos: number[] } {
  const maximo = CUADROS_POR_HOJA * HOJAS_MAXIMAS;
  const paso = Math.max(1, Math.ceil(duracionSeg / maximo));
  const tiempos: number[] = [];
  for (let t = 0; t < duracionSeg - 0.2 && tiempos.length < maximo; t += paso) tiempos.push(t);
  return { paso, tiempos };
}

/** Los cuadros repartidos en hojas de 15. */
export const hojasDe = <T>(cuadros: T[]): T[][] =>
  Array.from({ length: Math.ceil(cuadros.length / CUADROS_POR_HOJA) }, (_, i) =>
    cuadros.slice(i * CUADROS_POR_HOJA, (i + 1) * CUADROS_POR_HOJA),
  );

/** Una hora como se escribe en las hojas: «1:05». */
export const horaDeCuadro = (s: number) =>
  `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

/**
 * La prueba en vivo como plan de anuncio: el video del cliente de fondo desde `desde_s`, una sola vez y
 * sin cortes (solo el primer momento lo pone; los demás cambian el título de arriba); cada frase de la
 * voz a su hora (el segundo del video menos `desde_s`); la persona en el círculo de abajo si va; y la
 * tarjeta final con la última frase. La música, casi apagada si el video trae su sonido.
 */
export function planDeDemostracion(
  d: Demostracion,
  x: {
    video: string;
    logo?: string;
    avatar?: string;
    producto?: string;
    musica?: string;
    acento?: string | null;
  },
): PlanPublicidad {
  const ultima = d.partes[d.partes.length - 1];
  return esquemaPlanPublicidad.parse({
    marca: d.nombre.slice(0, 60),
    acento: x.acento ?? undefined,
    logo: x.logo ?? "",
    musica: x.musica,
    musica_volumen: d.sonido_video > 0 ? 0.05 : 0.12,
    voz: d.voz,
    idioma: d.idioma,
    tema: "oscuro",
    diseno: "pantalla",
    paleta: { fondo: ["#1a1a1a", "#050505"], patron: "ninguno" },
    portada: { lineas: d.portada.lineas, etiqueta: d.portada.etiqueta, hasta_ms: 1800 },
    letras_por_segundo: 12.5,
    pausa_ms: 150,
    maximo_seg: 120,
    cola_ms: 3000,
    partes: d.partes.map((p) => ({
      texto: p.texto,
      desde_ms: Math.max(0, Math.round((p.en_s - d.desde_s) * 1000)),
    })),
    // La última frase es el cierre (entra la tarjeta final): no lleva momento propio, o su frase se
    // buscaría dos veces en la voz.
    momentos: d.partes.slice(0, -1).flatMap((p, i): Record<string, unknown>[] => {
      if (i > 0) return [{ frase: primerasPalabras(p.texto), texto: p.titulo || undefined }];
      const primero = {
        frase: primerasPalabras(p.texto),
        video: { archivo: x.video, desde_s: d.desde_s, velocidad: 1, sonido: d.sonido_video },
        vista_persona: { modo: x.avatar ? "cabeza" : "oculta", lado: "izquierda" },
        ...(x.avatar ? { persona: { imagen: x.avatar, encuadre: "medio", lado: "izquierda" } } : {}),
      };
      // La portada ocupa arriba los primeros segundos: el título de la primera frase entra a la mitad
      // de esa frase (si es tan corta que no tiene mitad, va sin título; se montaría sobre la portada).
      const mitad = Math.max(3, Math.floor(palabrasUtiles(p.texto).length / 2));
      const despues = palabrasDe(p.texto, mitad);
      return p.titulo && palabrasUtiles(p.texto).length >= 6
        ? [primero, { frase: despues, texto: p.titulo }]
        : [primero];
    }),
    cierre: {
      frase: primerasPalabras(ultima?.texto ?? ""),
      lineas: d.cierre.lineas,
      imagen: x.producto,
    },
  });
}

/** La locución como plan de `locucion.ts`: el video tal cual, cada párrafo a su hora y el piano debajo. */
export function planDeLocucion(
  d: Locucion,
  x: { video: string; musica?: string; salida: string },
): PlanLocucion {
  return esquemaPlanLocucion.parse({
    video: x.video,
    voz: d.voz,
    musica: d.musica === "piano" ? x.musica : undefined,
    partes: d.partes.map((p) => ({
      texto: p.texto,
      desde_ms: p.en_s === undefined ? undefined : Math.round(p.en_s * 1000),
    })),
    salida: x.salida,
  });
}
