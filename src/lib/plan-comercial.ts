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

const palabrasDe = (t: string) => t.trim().split(/\s+/).filter(Boolean);

/** Dónde empieza la secuencia `sub` dentro de `en` (buscando desde `desde`), o -1 si no está entera. */
function indiceDe(en: string[], sub: string[], desde = 0): number {
  if (sub.length === 0) return -1;
  for (let i = desde; i + sub.length <= en.length; i++) {
    let k = 0;
    while (k < sub.length && en[i + k] === sub[k]) k++;
    if (k === sub.length) return i;
  }
  return -1;
}

type EscenaConPlanos = {
  narracion: string;
  visual: { planos?: GuionGenerado["escenas"][number]["visual"]["planos"] };
};

/**
 * C-COMERCIAL-2: la voz lee el texto del cliente UNA vez, entero y en orden. La IA tiene
 * que copiarlo, pero a veces repite una frase en dos escenas (el 5 oct 2026 dijo dos veces
 * «an AI-powered online store»), se salta palabras o cambia una. Aquí se vuelve a pegar
 * cada escena al texto original: lo repetido sale (sus planos pasan a la escena anterior),
 * lo saltado se devuelve a la escena anterior, y lo que cambió se reemplaza por lo que
 * escribió el cliente. Al final, las narraciones juntas son exactamente su texto.
 */
export function alinearNarracion<E extends EscenaConPlanos>(escenas: E[], texto: string): E[] {
  const todas = palabrasDe(texto);
  if (todas.length === 0 || escenas.length === 0) return escenas;
  const salida: E[] = [];
  let planosSueltos: NonNullable<E["visual"]["planos"]> = [];
  let pos = 0;
  const cuantasSiguen = (propias: string[]) => {
    let m = 0;
    while (m < propias.length && pos + m < todas.length && todas[pos + m] === propias[m]) m++;
    return m;
  };
  const apartar = (e: E) => {
    const planos = e.visual.planos ?? [];
    const ultima = salida.at(-1);
    if (ultima) ultima.visual.planos = [...(ultima.visual.planos ?? []), ...planos];
    else planosSueltos = [...planosSueltos, ...planos];
  };
  for (const e of escenas) {
    let propias = palabrasDe(e.narracion);
    let m = cuantasSiguen(propias);
    if (m === 0) {
      // Repite algo ya dicho (o viene vacía): fuera; lo que quería mostrar se queda en la anterior.
      if (propias.length === 0 || indiceDe(todas.slice(0, pos), propias) !== -1) {
        apartar(e);
        continue;
      }
      // ¿Se saltó un trozo? Lo que falta se devuelve a la escena anterior (o a esta, si es la primera).
      const j = indiceDe(todas, propias.slice(0, Math.min(3, propias.length)), pos);
      if (j === -1) {
        // Ni sigue el texto ni repite: lo reescribió. Fuera; el texto que le tocaba lo recoge la siguiente.
        apartar(e);
        continue;
      }
      const faltante = todas.slice(pos, j);
      const ultima = salida.at(-1);
      if (ultima) ultima.narracion = [ultima.narracion, ...faltante].join(" ");
      else propias = [...faltante, ...propias];
      pos = j - (ultima ? 0 : faltante.length);
      m = cuantasSiguen(propias);
    }
    const narracion = todas.slice(pos, pos + m).join(" ");
    pos += m;
    const planos = [...planosSueltos, ...(e.visual.planos ?? [])];
    planosSueltos = [];
    salida.push({ ...e, narracion, visual: { ...e.visual, planos } });
  }
  if (salida.length === 0) return escenas;
  const ultima = salida.at(-1);
  if (ultima && pos < todas.length) ultima.narracion = [ultima.narracion, ...todas.slice(pos)].join(" ");
  return salida;
}

/**
 * Lo que no cabe en un comercial se limpia después de la IA (mismo criterio que el plan de
 * una grabación). Con `textoDelCliente`, además, las escenas se vuelven a pegar a su texto
 * (C-COMERCIAL-2): nada repetido, nada saltado, nada reescrito.
 */
export function planComercialLimpio(guion: GuionGenerado, textoDelCliente = ""): GuionGenerado {
  const escenas = guion.escenas
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
    }));
  return {
    ...guion,
    hechos_a_verificar: [],
    descripcion_youtube: "",
    etiquetas: [],
    escenas: textoDelCliente.trim() ? alinearNarracion(escenas, textoDelCliente) : escenas,
  };
}
