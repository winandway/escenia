// Publicidad en Short (docs/PUBLICIDAD.md): la IA arma el PLAN del anuncio. El texto es del cliente y
// no se toca; la IA solo decide en qué palabra entra cada foto, qué texto grande sale y qué etiquetas.
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { asegurarModelo, costoTokensUsd, MODELOS_PERMITIDOS } from "@compartido/modelos";
import { esquemaPlanPublicidadDeLaIA, planDesdeLaIA, type PlanDePublicidad } from "@compartido/publicidad";
import type { BaseDatos } from "./db";
import { conEstadoIA } from "./ia-estado";
import { anotarGasto, autorizarGasto } from "./presupuesto";

const ESTIMADO_PLAN_USD = 0.05;

export type EntradaPlanPublicidad = {
  nombre: string;
  narracion: string;
  idioma: "es" | "en";
  instrucciones: string;
  imagenes: { nombre: string; transparente: boolean; ancho: number; alto: number }[];
};

const SISTEMA = [
  "Armas el plan visual de un anuncio vertical de 30 a 45 segundos que vende un producto en redes (Shorts, Reels, TikTok).",
  "El texto que lee la voz es del cliente: NO se cambia, NO se agrega nada y NO se inventan datos, precios ni contactos.",
  "Respondes SOLO con el formato pedido; lo que no aplica va vacío («» o []).",
].join("\n");

export function mensajeDePlanPublicidad(e: EntradaPlanPublicidad): string {
  const lista = e.imagenes
    .map((i) => `- «${i.nombre}» (${i.ancho}×${i.alto}${i.transparente ? ", sin fondo: logo o figura" : ""})`)
    .join("\n");
  return [
    `ANUNCIO: ${e.nombre}`,
    `IDIOMA DEL TEXTO: ${e.idioma === "en" ? "inglés" : "español"}`,
    "",
    "TEXTO QUE LEE LA VOZ (tal cual):",
    e.narracion,
    "",
    "IMÁGENES DEL CLIENTE (usa el nombre exacto):",
    lista,
    "",
    e.instrucciones ? `LO QUE PIDE EL CLIENTE:\n${e.instrucciones}\n` : "",
    "REGLAS DEL PLAN:",
    "- `momentos`: de 6 a 12, en el orden del texto, cubriéndolo entero. Cada uno cambia la imagen o el texto de la pantalla.",
    "- `frase`: de 2 a 5 palabras LITERALES y seguidas del texto (con los números escritos igual que en el texto, por ejemplo «1200 vatios»), las del momento exacto en que entra.",
    "- `imagen`: el nombre exacto de una imagen de la lista; las fotos del producto primero. Cambia de imagen en casi cada momento y no repitas la misma dos veces seguidas. No uses aquí los logos ni la persona que habla.",
    "- `texto`: lo que sale grande arriba, de 1 a 5 palabras: el gancho, una cifra con su unidad, una ventaja («1200 W», «MOTOR 4 TIEMPOS», «ENTREGA INMEDIATA»). Vacío si ese momento solo cambia la foto.",
    "- `chips`: cuando el texto enumera usos o cosas (luces, ventilador, nevera…), una etiqueta por cada una con un emoji y una o dos palabras («💡 Luces»), y `palabra` = la palabra del texto en que entra. Máximo 6. Si hay chips, `texto` va vacío.",
    "- `cierre`: `frase` = las 2 a 5 primeras palabras del llamado a la acción del final (donde dice cómo comprar o contactar); desde ahí sale la tarjeta con el logo. `lineas`: de 2 a 4 líneas cortas en mayúsculas sacadas SOLO del texto o de lo que pide el cliente (la cuenta de Instagram, la web, «VENTA AL MAYOR Y DETAL», «¡PÍDELO HOY!»). Nunca inventes una cuenta, un teléfono ni una web.",
  ]
    .filter(Boolean)
    .join("\n");
}

export async function generarPlanPublicidad(
  db: BaseDatos,
  entrada: EntradaPlanPublicidad,
  opciones: { modelo: string; apiKey: string; fetch?: typeof fetch },
): Promise<{ plan: PlanDePublicidad; costoUsd: number }> {
  const modelo = asegurarModelo(opciones.modelo);
  if (MODELOS_PERMITIDOS[modelo].proveedor !== "anthropic")
    throw new Error("Por ahora el plan de un anuncio se hace con Claude.");
  await autorizarGasto(db, ESTIMADO_PLAN_USD);
  const cliente = new Anthropic({ apiKey: opciones.apiKey, fetch: opciones.fetch, maxRetries: 2 });
  const respuesta = await conEstadoIA(db, () =>
    cliente.messages
      .stream({
        model: modelo,
        max_tokens: 6000,
        thinking: { type: "disabled" },
        system: SISTEMA,
        messages: [{ role: "user", content: mensajeDePlanPublicidad(entrada) }],
        output_config: { format: zodOutputFormat(esquemaPlanPublicidadDeLaIA) },
      })
      .finalMessage(),
  );
  const costoUsd = costoTokensUsd(modelo, respuesta.usage.input_tokens, respuesta.usage.output_tokens);
  await anotarGasto(db, "claude", `plan de anuncio: ${entrada.nombre}`, costoUsd);
  if (respuesta.stop_reason === "refusal")
    throw new Error("La IA no quiso armar este anuncio. Revisa el texto.");
  if (!respuesta.parsed_output)
    throw new Error("La IA devolvió un plan con formato inválido. Vuelve a intentarlo.");
  const plan = planDesdeLaIA(
    esquemaPlanPublicidadDeLaIA.parse(respuesta.parsed_output),
    entrada.narracion,
    entrada.imagenes.map((i) => i.nombre),
  );
  return { plan, costoUsd };
}
