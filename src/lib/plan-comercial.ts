// Comerciales (docs/COMERCIALES.md): el PLAN de un video publicitario con el material
// del cliente. El texto ya está escrito (lo mandó el cliente): la IA lo reparte en
// escenas, copiándolo, y decide qué va en pantalla en cada frase con las imágenes
// que hay en la carpeta (logos, capturas) y con diagramas de neón. Nada de fotos
// de internet: en el video de un cliente solo sale lo suyo.
import type { GuionGenerado } from "@compartido/guion";
import type { Idioma } from "@compartido/comerciales";

export type EntradaPlanComercial = {
  nombre: string;
  narracion: string;
  idioma: Idioma;
  instrucciones: string;
  /** Los archivos que la Estación tiene en la Mac, con su nombre exacto y si es un logo (fondo transparente). */
  imagenes: { nombre: string; transparente: boolean; ancho: number; alto: number }[];
};

const NOMBRE_IDIOMA: Record<Idioma, string> = { es: "español", en: "inglés" };

export function mensajeDePlanComercial(e: EntradaPlanComercial): string {
  const lista = e.imagenes
    .map(
      (i) =>
        `- «${i.nombre}» (${i.transparente ? "logo o figura con fondo transparente" : "captura o foto"}, ${i.ancho}×${i.alto})`,
    )
    .join("\n");
  return [
    "ESTE NO ES UN GUION NUEVO: es el PLAN VISUAL de un VIDEO PUBLICITARIO para un cliente. El texto ya está escrito por el cliente y lo lee nuestra voz; tú decides qué sale en pantalla en cada frase.",
    `NOMBRE DEL VIDEO: ${e.nombre}`,
    `IDIOMA DEL TEXTO: ${NOMBRE_IDIOMA[e.idioma]}. TODO lo que se lea en pantalla (titulares, etiquetas de los diagramas, datos) va en ${NOMBRE_IDIOMA[e.idioma]}.`,
    `TEXTO DEL CLIENTE (lo que lee la voz):\n"""\n${e.narracion.trim()}\n"""`,
    e.instrucciones.trim()
      ? `INSTRUCCIONES DE RICHARD (mandan sobre lo demás):\n${e.instrucciones.trim()}`
      : "",
    `IMÁGENES DISPONIBLES (las únicas que pueden salir; el nombre va COPIADO TAL CUAL en \`archivo\`):\n${lista || "- (ninguna)"}`,
    "REGLAS DEL PLAN (mandan sobre cualquier otra regla que las contradiga):",
    "- `narracion` NO se escribe: se COPIA. Reparte el texto del cliente en escenas, en orden, copiando su texto LITERAL: sin corregir, sin resumir, sin traducir y sin agregar nada. Cada palabra queda en exactamente una escena; la primera escena empieza con la primera palabra.",
    "- Corta donde cambia la idea: cada escena tiene entre 15 y 45 palabras. Mínimo 3 escenas; si el texto es corto, haz exactamente 3 aunque queden de menos palabras.",
    "- `parte`: «gancho» la primera; después «contexto», «demo», «dato» o «problema»; «cierre» la última. NO uses «opinion», «interludio» ni «cta».",
    "- Cada escena es UNA de dos cosas. (A) ESCENA DE IMÁGENES: `visual.tipo`: «stock» con `visual.planos` de tipo «imagen», cada uno con `archivo` = el nombre EXACTO de la lista y `frase` = 2 a 5 palabras LITERALES y seguidas de la narración de ESA escena (el instante en que entra). Cada escena de imágenes lleva en `visual.titular` un título de 2 a 5 palabras, en el idioma del texto («Logos people remember»). Pon de 2 a 5 imágenes por escena, una detrás de otra, para que la pantalla cambie cada 3 o 4 segundos; donde el texto habla de logos, de trabajos hechos o de ejemplos, muestra VARIAS imágenes seguidas. Entre imágenes puedes meter un plano «dato» con una cifra o una frase del texto en 2 a 4 palabras. (B) ESCENA DE DIAGRAMA: `visual.tipo`: «diagrama», con 2 a 5 objetos que se encienden cuando la voz los nombra y SIEMPRE su `visual.titular` (3 a 7 palabras, en el idioma del texto): para explicar pasos, paquetes, un proceso («One: tell me… Two: … Three: …» es un diagrama de 3 o 4 objetos).",
    "- NUNCA uses planos «foto» ni «stock» (no hay fotos de internet en el video de un cliente), ni nombres a personas para dibujarlas. Si una frase no tiene imagen que la ilustre, va un diagrama o un plano «dato».",
    "- Usa TODAS las imágenes de la lista al menos una vez si el texto lo permite, sin repetir ninguna en escenas seguidas. No inventes nombres de archivo.",
    "- `titulo`: el nombre del video. `gancho`: la primera frase del texto. `hechos_a_verificar`, `descripcion_youtube` y `etiquetas`: vacíos. `musica`: en inglés, un fondo moderno y limpio que no compita con la voz («modern corporate tech, soft synth pulse, upbeat, clean»).",
    "- La opinión no existe: NO escribas «[opinión del editor]» ni ningún texto entre corchetes en ningún campo.",
  ]
    .filter(Boolean)
    .join("\n\n");
}

/** Lo que no cabe en un comercial se limpia después de la IA (mismo criterio que el plan de una grabación). */
export function planComercialLimpio(guion: GuionGenerado): GuionGenerado {
  return {
    ...guion,
    hechos_a_verificar: [],
    descripcion_youtube: "",
    etiquetas: [],
    escenas: guion.escenas
      .filter((e) => e.narracion.trim().length > 0)
      .map((e) => ({
        ...e,
        parte: e.parte === "opinion" || e.parte === "interludio" || e.parte === "cta" ? "contexto" : e.parte,
        duracion_seg: undefined,
        visual: {
          ...e.visual,
          // Fotos de internet y clips: fuera. Imágenes que no están en la lista: también (se buscan
          // por parecido en la Mac, pero una inventada no entra).
          planos: e.visual.planos?.filter(
            (p) => p.tipo === "dato" || (p.tipo === "imagen" && Boolean(p.archivo)),
          ),
        },
      })),
  };
}
