// El Director (docs/DIRECTOR.md): lo que se le dice a la IA en cada vuelta. Las reglas que
// aprendimos haciendo anuncios son del Director, no del cliente: él no las tiene que saber y la IA
// no las rompe. La IA solo PROPONE: la tarjeta la aprueba Richard con un botón (C-DIRECTOR-1).
import type Anthropic from "@anthropic-ai/sdk";
import type { Demostracion, Locucion } from "@compartido/director";
import { contarPalabras } from "@compartido/grabaciones";
import { ETIQUETA_VOZ, VOCES } from "@compartido/guion";
import type { PublicidadNueva } from "@compartido/publicidad";

export const SISTEMA = [
  "Eres el Director de Escenia, el estudio de videos de Windoce. Conversas con quien te escribe (Richard, el dueño de Windoce, o un cliente suyo) para hacer videos verticales para redes: Reels, Shorts y TikTok. Le hablas de tú, en segunda persona («cuando apruebes la tarjeta»); nunca lo nombras en tercera persona.",
  "",
  "Lo que sabes hacer desde aquí, y con qué herramienta se propone cada uno:",
  "1. Anuncio con fotos (proponer_anuncio): de 12 a 45 segundos, con las fotos y el logo del cliente en tarjetas que se mueven, textos grandes, subtítulos, música, una voz del banco y, si se quiere, una persona que habla.",
  "2. Prueba en vivo con el video del cliente (proponer_demostracion): su video ENTERO, sin un solo corte, de fondo; la voz dice cada frase en el segundo en que pasa lo que dice (se llena el vaso, el medidor se pone rojo), con títulos grandes arriba, una persona que narra en un círculo abajo si se quiere, y la tarjeta final. Para demostraciones, pruebas y antes-y-después: lo que convence es que no hay cortes.",
  "3. Locución sobre un video ya editado (proponer_locucion): la voz (la de Richard, si no piden otra) leída con calma sobre su video, respetando las comas, con pausas y un piano suave debajo. El video no se toca; si la voz no cabe, se estira un poco en vez de acelerar la voz. Para homenajes, quince años, aniversarios, historias.",
  "Lo que todavía NO se hace desde aquí: crear una persona nueva ni videos largos. Si te lo piden, dilo en una línea: por ahora el equipo de Windoce lo hace a mano.",
  "",
  "Cómo trabajas:",
  "- Lo que te piden de forma explícita se respeta: la persona, la voz, una foto, una frase. Si crees que no conviene, dilo en una frase, pero hazlo como lo pidieron. Solo dices que no si rompe una de las reglas del texto (inventar, marcas ajenas, promesas de ganancia).",
  "- Lo demás lo decides tú: el formato, el texto, las fotos, la voz y si va persona. No hagas cuestionarios. Si falta algo imprescindible (qué producto es, cómo se compra o se contacta), pregunta solo eso, una vez.",
  "- Si no sabes qué muestra una foto por su nombre, mírala con ver_imagen antes de elegirla. Una persona sola, recortada sin fondo, casi siempre es una presentadora para hablar en el anuncio, no un producto.",
  "- Antes de proponer algo con un video, MÍRALO con ver_video: verás hojas con un cuadro cada pocos segundos y su hora encima. Usa esas horas para que cada frase vaya donde pasa lo que dice. Si el video todavía no está listo (la Mac lo está mirando), dilo y espera.",
  "- Cuando tengas la propuesta, usa SIEMPRE su herramienta: sale como una tarjeta con el precio y el botón para aprobarla. Tú no puedes aprobar ni gastar; solo quien te escribe, con ese botón.",
  "- Si piden un cambio, vuelve a proponer con el cambio: la tarjeta nueva reemplaza la anterior. Si la herramienta te devuelve un problema (una frase que no cabe, una carpeta que no existe), corrígelo y vuelve a proponer.",
  "- Después de proponer, di en una o dos frases qué elegiste y por qué. No repitas el texto: ya sale en la tarjeta.",
  "",
  "El texto que lee la voz:",
  "- Anuncio con fotos: de 30 a 115 palabras (de 12 a 45 segundos); lo ideal, de 60 a 90.",
  "- Prueba en vivo: una frase corta por cosa que pasa en el video, en orden y a su hora (en_s, el segundo DEL VIDEO que ves en las hojas). Cada frase tiene que alcanzar a decirse antes de la siguiente: la voz lee unas 12 letras por segundo. Abre presentando la prueba, nombra lo que se ve justo cuando se ve, y la última frase es el cierre con cómo comprar o contactar. Hasta 120 segundos en total.",
  "- Locución: el texto que te den, tal cual (si te lo dan), partido en párrafos donde haya una pausa natural. Si te piden escribirlo, que suene hablado, cálido y sin adornos.",
  "- En los anuncios, empieza con un gancho que pare el dedo en los primeros tres segundos: una pregunta o un problema del cliente.",
  "- Las cifras en números («1200 vatios»), como se van a ver en pantalla.",
  "- Del producto dices solo lo que te contaron o lo que se ve en las fotos y en el video. Prohibido inventar cualidades («liviano», «silencioso», «rinde horas», «el mejor»), usos, precios, teléfonos, cuentas, webs, cifras, premios, garantías o resultados que nadie te dio. Si te falta qué lo hace bueno, quédate en lo que sí sabes o pregúntalo una vez.",
  "- Nunca prometas ganancias. No nombres otras marcas salvo que el cliente lo pida.",
  "- Español neutro de Estados Unidos (tú, nunca vos), o inglés si lo piden.",
  "",
  "Las fotos y la persona:",
  "- carpetas: las carpetas de Imágenes que se usan (de donde salen las fotos, el logo, la persona y el producto del cierre). Las fotos que suben en este chat caen en la carpeta del encargo.",
  "- avatar: el nombre exacto de la foto de la persona que habla, de una de esas carpetas; vacío si va sin persona. Con persona vende más, pero cuesta más: unos dos centavos por segundo de voz.",
  `- Las voces: ${VOCES.map((v) => `«${v}» (${ETIQUETA_VOZ[v]})`).join(", ")}. Para una persona mujer, una voz de mujer.`,
  "",
  "Tu forma de hablar: corta, clara y cálida, en frases que se entiendan escuchadas. Sin títulos, sin tablas, sin enlaces. Los precios, en centavos o en dólares.",
].join("\n");

const propiedadesComunes = {
  nombre: {
    type: "string",
    description: "El cliente y el producto, corto (por ejemplo «Pro In Shop · generador»).",
  },
  idioma: { type: "string", enum: ["es", "en"] },
  voz: { type: "string", enum: [...VOCES] },
  carpetas: {
    type: "array",
    items: { type: "string" },
    description: "Las carpetas de Imágenes que se usan, con su nombre exacto (hasta 6).",
  },
  avatar: {
    type: "string",
    description:
      "El nombre exacto de la foto de la persona que habla, de una de esas carpetas; vacío si va sin persona.",
  },
} as const;

export const HERRAMIENTAS: Anthropic.Tool[] = [
  {
    name: "ver_imagen",
    description:
      "Mira una foto de la biblioteca de Imágenes para saber qué muestra. Se pide por su número (#) de la lista del material.",
    input_schema: {
      type: "object",
      properties: {
        id: { type: "integer", description: "El número de la imagen en la lista del material." },
      },
      required: ["id"],
    },
  },
  {
    name: "ver_video",
    description:
      "Mira un video que subieron en este chat: su duración, si trae sonido, y hojas con un cuadro cada pocos segundos con su hora (minuto:segundo) encima. Se pide por su número (V#) de la lista del material.",
    input_schema: {
      type: "object",
      properties: {
        id: { type: "integer", description: "El número del video (el de V#) en la lista del material." },
      },
      required: ["id"],
    },
  },
  {
    name: "proponer_anuncio",
    description:
      "Propone un anuncio con fotos como una tarjeta con su precio, para que lo aprueben con un botón. Reemplaza la propuesta anterior de este encargo. No gasta nada ni hace el video.",
    input_schema: {
      type: "object",
      properties: {
        ...propiedadesComunes,
        narracion: { type: "string", description: "El texto exacto que lee la voz: de 30 a 115 palabras." },
        instrucciones: {
          type: "string",
          description:
            "Cómo se arma: qué foto va primero, qué palabras salen en grande, cómo cierra. Lo lee la IA que arma el plan. Vacío si no hace falta.",
        },
      },
      required: ["nombre", "narracion", "idioma", "voz", "carpetas", "avatar", "instrucciones"],
    },
  },
  {
    name: "proponer_demostracion",
    description:
      "Propone una prueba en vivo con el video del cliente entero y sin cortes, con cada frase de la voz en su segundo del video. Sale como una tarjeta con el precio para aprobarla con un botón. Reemplaza la propuesta anterior. No gasta nada.",
    input_schema: {
      type: "object",
      properties: {
        ...propiedadesComunes,
        video_id: { type: "integer", description: "El número del video (V#)." },
        desde_s: {
          type: "number",
          description:
            "Desde qué segundo del video arranca (0 si desde el principio), para saltar lo que sobra.",
        },
        partes: {
          type: "array",
          description:
            "Las frases de la voz, en orden. De 4 a 20; la última es el cierre con cómo comprar o contactar.",
          items: {
            type: "object",
            properties: {
              texto: { type: "string", description: "Lo que dice la voz en esta frase." },
              en_s: { type: "number", description: "El segundo DEL VIDEO en que empieza (de las hojas)." },
              titulo: {
                type: "string",
                description:
                  "Lo que sale grande arriba mientras se dice (1 a 5 palabras); vacío si nada. En la primera frase entra a la mitad (antes está la portada).",
              },
            },
            required: ["texto", "en_s", "titulo"],
          },
        },
        portada: {
          type: "object",
          description: "La portada del primer cuadro (la miniatura): una o dos líneas cortas y una etiqueta.",
          properties: {
            lineas: {
              type: "array",
              items: { type: "string" },
              description: "1 o 2 líneas de hasta 26 letras.",
            },
            etiqueta: { type: "string", description: "Hasta 24 letras; vacío si nada." },
          },
          required: ["lineas", "etiqueta"],
        },
        sonido_video: {
          type: "number",
          description:
            "El sonido real del video, de 0 a 1 (0,8 si lo que suena ayuda, como el agua cayendo; 0 si es ruido).",
        },
        cierre: {
          type: "object",
          description: "La tarjeta final.",
          properties: {
            lineas: {
              type: "array",
              items: { type: "string" },
              description:
                "De 1 a 4 líneas cortas (la cuenta, «Venta al mayor y detal»), sacadas de lo que te dijeron.",
            },
            imagen: {
              type: "string",
              description:
                "El nombre exacto de la foto del producto (mejor sin fondo) de las carpetas; vacío si no hay.",
            },
          },
          required: ["lineas", "imagen"],
        },
      },
      required: [
        "nombre",
        "video_id",
        "desde_s",
        "partes",
        "idioma",
        "voz",
        "portada",
        "carpetas",
        "avatar",
        "sonido_video",
        "cierre",
      ],
    },
  },
  {
    name: "proponer_locucion",
    description:
      "Propone ponerle la voz a un video ya editado (el video no se toca), con un piano suave debajo. Sale como una tarjeta con el precio para aprobarla con un botón. Reemplaza la propuesta anterior. No gasta nada.",
    input_schema: {
      type: "object",
      properties: {
        nombre: { type: "string", description: "Un nombre corto para el video." },
        video_id: { type: "integer", description: "El número del video (V#)." },
        voz: { type: "string", enum: [...VOCES], description: "«richard» si no piden otra." },
        idioma: { type: "string", enum: ["es", "en"] },
        partes: {
          type: "array",
          description: "Los párrafos de la voz, en orden.",
          items: {
            type: "object",
            properties: {
              texto: { type: "string" },
              en_s: {
                type: "number",
                description: "Opcional: el segundo del video antes del cual NO debe empezar este párrafo.",
              },
            },
            required: ["texto"],
          },
        },
        musica: { type: "string", enum: ["piano", "ninguna"] },
      },
      required: ["nombre", "video_id", "voz", "idioma", "partes", "musica"],
    },
  },
];

export type PropuestaLeida =
  | { tipo: "anuncio"; datos: PublicidadNueva }
  | { tipo: "demostracion"; datos: Demostracion }
  | { tipo: "locucion"; datos: Locucion };

/** Cómo va lo que salió de una propuesta aprobada (el anuncio de fotos o el trabajo con video). */
export type ResultadoDePropuesta = { estado: string; paso: string; error: string; duracionSeg: number };

/** Lo que el Director tiene a mano en cada vuelta: las carpetas, sus fotos, los videos y sus propuestas. */
export type MaterialDelDirector = {
  carpetaDelEncargo: string;
  carpetas: { carpeta: string; imagenes: { id: number; nombre: string; tipo: "imagen" | "pdf" }[] }[];
  videos: {
    id: number;
    nombre: string;
    estado: string;
    duracionSeg: number;
    conSonido: boolean;
    vertical: boolean;
    error: string;
  }[];
  propuestas: {
    id: number;
    estado: "propuesta" | "aprobada" | "reemplazada";
    precioUsd: number;
    leida: PropuestaLeida;
    resultado: ResultadoDePropuesta | null;
  }[];
};

const IMAGENES_POR_CARPETA = 40;
const CARPETAS_MAXIMAS = 15;

export function dinero(usd: number): string {
  if (usd >= 1) return `$${usd.toFixed(2)}`;
  const centavos = Math.round(usd * 100);
  if (centavos <= 0) return usd > 0 ? "menos de 1 centavo" : "0 centavos";
  return centavos === 1 ? "1 centavo" : `${centavos} centavos`;
}

export const reloj = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

function comoVa(p: MaterialDelDirector["propuestas"][number]): string {
  if (p.estado === "reemplazada") return "reemplazada por una más nueva";
  if (p.estado === "propuesta") return "vigente, esperando que la aprueben";
  const a = p.resultado;
  if (!a) return "aprobada";
  if (a.estado === "lista") return `aprobada: el video está listo (${Math.round(a.duracionSeg)} segundos)`;
  if (a.estado === "error") return `aprobada, pero el video falló: ${a.error || "sin detalle"}`;
  if (a.estado === "tomada") return `aprobada: la Mac lo está armando (${a.paso || "empezando"})`;
  return "aprobada: en la fila, la Mac lo toma en un momento";
}

function resumenDePropuesta(l: PropuestaLeida): string {
  if (l.tipo === "anuncio")
    return `anuncio con fotos «${l.datos.nombre}», ${contarPalabras(l.datos.narracion)} palabras, voz ${l.datos.voz}, ${l.datos.avatar ? `con la persona ${l.datos.avatar}` : "sin persona"}`;
  if (l.tipo === "demostracion")
    return `prueba en vivo «${l.datos.nombre}» con el video V${l.datos.video_id}, ${l.datos.partes.length} frases, voz ${l.datos.voz}, ${l.datos.avatar ? `con la persona ${l.datos.avatar}` : "sin persona"}`;
  return `locución «${l.datos.nombre}» sobre el video V${l.datos.video_id}, ${l.datos.partes.length} párrafos, voz ${l.datos.voz}`;
}

function comoVaElVideo(v: MaterialDelDirector["videos"][number]): string {
  if (v.estado === "listo")
    return `${reloj(v.duracionSeg)}, ${v.vertical ? "vertical" : "acostado (en la prueba en vivo se recorta a vertical)"}, ${v.conSonido ? "con sonido" : "sin sonido"}; míralo con ver_video`;
  if (v.estado === "error") return `no se pudo mirar: ${v.error || "sin detalle"}`;
  return "la Mac lo está mirando (menos de un minuto si está encendida)";
}

/** El bloque que cambia en cada vuelta (va aparte del sistema fijo). */
export function contextoDelEncargo(m: MaterialDelDirector): string {
  const lineas = [
    "MATERIAL DISPONIBLE (biblioteca de Imágenes):",
    `La carpeta de este encargo es «${m.carpetaDelEncargo}»: ahí caen las fotos que suben en este chat.`,
  ];
  if (!m.carpetas.some((c) => c.carpeta === m.carpetaDelEncargo))
    lineas.push(`- Carpeta «${m.carpetaDelEncargo}»: todavía vacía.`);
  for (const c of m.carpetas.slice(0, CARPETAS_MAXIMAS)) {
    const vistas = c.imagenes
      .slice(0, IMAGENES_POR_CARPETA)
      .map((i) => `#${i.id} ${i.nombre}${i.tipo === "pdf" ? " (PDF, no sirve de foto)" : ""}`);
    const resto = c.imagenes.length - vistas.length;
    lineas.push(
      `- Carpeta «${c.carpeta}» (${c.imagenes.length}): ${vistas.join(", ")}${resto > 0 ? ` y ${resto} más` : ""}`,
    );
  }
  if (m.carpetas.length > CARPETAS_MAXIMAS)
    lineas.push(`(y ${m.carpetas.length - CARPETAS_MAXIMAS} carpetas más, menos recientes)`);
  lineas.push("", "VIDEOS SUBIDOS EN ESTE CHAT:");
  if (!m.videos.length) lineas.push("- Ninguno todavía.");
  for (const v of m.videos) lineas.push(`- V${v.id} ${v.nombre}: ${comoVaElVideo(v)}.`);
  lineas.push("", "PROPUESTAS DE ESTE ENCARGO:");
  if (!m.propuestas.length) lineas.push("- Ninguna todavía.");
  for (const p of m.propuestas)
    lineas.push(
      `- Propuesta ${p.id} (${comoVa(p)}): ${resumenDePropuesta(p.leida)}, ${dinero(p.precioUsd)}.`,
    );
  return lineas.join("\n");
}

export type MensajeGuardado = { rol: "richard" | "director" | "aviso"; texto: string };

/** Cuántos mensajes viejos se le recuerdan a la IA: más gasta sin ayudar. */
export const MENSAJES_EN_MEMORIA = 30;

/**
 * La conversación guardada, como la entiende la IA: Richard habla como usuario; los avisos del
 * panel (una aprobación) también, marcados como aviso; los mensajes seguidos del mismo lado se
 * juntan (la IA exige que se alternen) y siempre empieza Richard.
 */
export function historialParaLaIA(mensajes: MensajeGuardado[]): Anthropic.MessageParam[] {
  const salida: { role: "user" | "assistant"; partes: string[] }[] = [];
  for (const m of mensajes.slice(-MENSAJES_EN_MEMORIA)) {
    const texto = m.texto.trim();
    if (!texto) continue;
    const role = m.rol === "director" ? "assistant" : "user";
    const parte = m.rol === "aviso" ? `[Aviso del panel] ${texto}` : texto;
    const ultimo = salida.at(-1);
    if (ultimo && ultimo.role === role) ultimo.partes.push(parte);
    else salida.push({ role, partes: [parte] });
  }
  while (salida[0]?.role === "assistant") salida.shift();
  return salida.map((m) => ({ role: m.role, content: m.partes.join("\n\n") }));
}

/** Lo que se le añade al mensaje cuando se suben fotos en el chat, para que el Director sepa cuáles son. */
export function notaDeFotos(nombres: string[], carpeta: string): string {
  if (!nombres.length) return "";
  const cuales = nombres.length === 1 ? "esta foto" : `estas ${nombres.length} fotos`;
  return `(Te subí ${cuales} a la carpeta «${carpeta}»: ${nombres.join(", ")})`;
}

/** Lo mismo con los videos (la Mac los mira y el Director los ve con ver_video). */
export function notaDeVideos(nombres: string[]): string {
  if (!nombres.length) return "";
  const cuales = nombres.length === 1 ? "este video" : `estos ${nombres.length} videos`;
  return `(Te subí ${cuales}: ${nombres.join(", ")})`;
}
