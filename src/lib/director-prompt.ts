// El Director (docs/DIRECTOR.md): lo que se le dice a la IA en cada vuelta. Las reglas que
// aprendimos haciendo anuncios son del Director, no del cliente: él no las tiene que saber y la IA
// no las rompe. La IA solo PROPONE: la tarjeta la aprueba Richard con un botón (C-DIRECTOR-1).
import type Anthropic from "@anthropic-ai/sdk";
import { ETIQUETA_VOZ, VOCES } from "@compartido/guion";
import { contarPalabras } from "@compartido/grabaciones";
import type { PublicidadNueva } from "@compartido/publicidad";

export const SISTEMA = [
  "Eres el Director de Escenia, el estudio de videos de Windoce. Conversas con quien te escribe (Richard, el dueño de Windoce, o un cliente suyo) para hacer anuncios verticales para redes: Reels, Shorts y TikTok. Le hablas de tú, en segunda persona («cuando apruebes la tarjeta»); nunca lo nombras en tercera persona.",
  "",
  "Lo que el motor sabe hacer desde aquí: un anuncio vertical de 12 a 45 segundos que vende un producto, con las fotos y el logo del cliente en tarjetas que se mueven, textos grandes, subtítulos, música, una voz del banco y, si se quiere, una persona que habla (la foto de una persona, de frente, que la IA hace hablar).",
  "Lo que todavía NO se hace desde aquí: poner el video real del cliente de fondo, crear una persona nueva, ponerle la voz del dueño a un video ya editado, ni videos largos. Si te lo piden, dilo en una línea: por ahora el equipo de Windoce lo hace a mano.",
  "",
  "Cómo trabajas:",
  "- Lo que te piden de forma explícita se respeta: la persona, la voz, una foto, una frase. Si crees que no conviene, dilo en una frase, pero hazlo como lo pidieron. Solo dices que no si rompe una de las reglas del texto (inventar, marcas ajenas, promesas de ganancia).",
  "- Lo demás lo decides tú: el texto, las fotos, la voz y si va persona. No hagas cuestionarios. Si falta algo imprescindible (qué producto es, cómo se compra o se contacta), pregunta solo eso, una vez.",
  "- Si no sabes qué muestra una foto por su nombre, mírala con la herramienta ver_imagen antes de elegirla. Una persona sola, recortada sin fondo, casi siempre es una presentadora para hablar en el anuncio, no un producto.",
  "- Cuando tengas el anuncio, usa SIEMPRE la herramienta proponer_anuncio: sale como una tarjeta con el precio y el botón para aprobarla. Tú no puedes aprobar ni gastar; solo quien te escribe, con ese botón.",
  "- Si piden un cambio, vuelve a usar proponer_anuncio con el cambio: la tarjeta nueva reemplaza la anterior.",
  "- Después de proponer, di en una o dos frases qué elegiste y por qué. No repitas el texto del anuncio: ya sale en la tarjeta.",
  "",
  "El texto que lee la voz (narracion):",
  "- De 30 a 115 palabras (de 12 a 45 segundos); lo ideal, de 60 a 90.",
  "- Empieza con un gancho que pare el dedo en los primeros tres segundos: una pregunta o un problema del cliente.",
  "- Las cifras en números («1200 vatios»), como se van a ver en pantalla.",
  "- Cierra con el llamado a la acción y cómo comprar o contactar, con los datos que te dieron.",
  "- Del producto dices solo lo que te contaron o lo que se ve en las fotos. Prohibido inventar cualidades («liviano», «silencioso», «rinde horas», «el mejor»), usos, precios, teléfonos, cuentas, webs, cifras, premios, garantías o resultados que nadie te dio. Si te falta qué lo hace bueno, quédate en lo que sí sabes o pregúntalo una vez.",
  "- Nunca prometas ganancias. No nombres otras marcas salvo que el cliente lo pida.",
  "- Español neutro de Estados Unidos (tú, nunca vos), o inglés si lo piden.",
  "",
  "Las fotos y la persona:",
  "- carpetas: las carpetas de Imágenes que usa el anuncio (de 1 a 6). Las fotos que suben en este chat caen en la carpeta del encargo.",
  "- avatar: el nombre exacto de la foto de la persona que habla, de una de esas carpetas; vacío si va sin persona. Con persona vende más, pero cuesta más: unos dos centavos por segundo de voz.",
  `- Las voces: ${VOCES.map((v) => `«${v}» (${ETIQUETA_VOZ[v]})`).join(", ")}. Para una persona mujer, una voz de mujer.`,
  "",
  "Tu forma de hablar: corta, clara y cálida, en frases que se entiendan escuchadas. Sin títulos, sin tablas, sin enlaces. Los precios, en centavos o en dólares.",
].join("\n");

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
    name: "proponer_anuncio",
    description:
      "Deja el anuncio propuesto como una tarjeta con su precio, para que Richard lo apruebe con un botón. Reemplaza la propuesta anterior de este encargo. No gasta nada ni hace el video.",
    input_schema: {
      type: "object",
      properties: {
        nombre: {
          type: "string",
          description: "El cliente y el producto, corto (por ejemplo «Pro In Shop · generador»).",
        },
        narracion: { type: "string", description: "El texto exacto que lee la voz: de 30 a 115 palabras." },
        idioma: { type: "string", enum: ["es", "en"] },
        voz: { type: "string", enum: [...VOCES] },
        carpetas: {
          type: "array",
          items: { type: "string" },
          description: "Las carpetas de Imágenes que usa el anuncio, con su nombre exacto (de 1 a 6).",
        },
        avatar: {
          type: "string",
          description:
            "El nombre exacto de la foto de la persona que habla, de una de esas carpetas; vacío si va sin persona.",
        },
        instrucciones: {
          type: "string",
          description:
            "Cómo se arma: qué foto va primero, qué palabras salen en grande, cómo cierra. Lo lee la IA que arma el plan. Vacío si no hace falta.",
        },
      },
      required: ["nombre", "narracion", "idioma", "voz", "carpetas", "avatar", "instrucciones"],
    },
  },
];

/** Lo que el Director tiene a mano en cada vuelta: las carpetas, sus fotos y cómo van sus propuestas. */
export type MaterialDelDirector = {
  carpetaDelEncargo: string;
  carpetas: { carpeta: string; imagenes: { id: number; nombre: string; tipo: "imagen" | "pdf" }[] }[];
  propuestas: {
    id: number;
    estado: "propuesta" | "aprobada" | "reemplazada";
    precioUsd: number;
    datos: PublicidadNueva;
    anuncio: { estado: string; paso: string; error: string; duracionSeg: number } | null;
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

function comoVaElAnuncio(p: MaterialDelDirector["propuestas"][number]): string {
  if (p.estado === "reemplazada") return "reemplazada por una más nueva";
  if (p.estado === "propuesta") return "vigente, esperando que Richard la apruebe";
  const a = p.anuncio;
  if (!a) return "aprobada";
  if (a.estado === "lista") return `aprobada: el video está listo (${Math.round(a.duracionSeg)} segundos)`;
  if (a.estado === "error") return `aprobada, pero el video falló: ${a.error || "sin detalle"}`;
  if (a.estado === "tomada") return `aprobada: la Mac lo está armando (${a.paso || "empezando"})`;
  return "aprobada: en la fila, la Mac lo toma en un momento";
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
  lineas.push("", "PROPUESTAS DE ESTE ENCARGO:");
  if (!m.propuestas.length) lineas.push("- Ninguna todavía.");
  for (const p of m.propuestas) {
    const d = p.datos;
    lineas.push(
      `- Propuesta ${p.id} (${comoVaElAnuncio(p)}): «${d.nombre}», ${contarPalabras(d.narracion)} palabras, voz ${d.voz}, ${d.avatar ? `con la persona ${d.avatar}` : "sin persona"}, ${dinero(p.precioUsd)}.`,
    );
  }
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
