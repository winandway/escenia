// Genera el guion con la IA, respetando el candado de modelos y el de gasto.
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { esquemaGuionGenerado, type GuionGenerado } from "@compartido/guion";
import { asegurarModelo, costoTokensUsd, MODELOS_PERMITIDOS } from "@compartido/modelos";
import type { BaseDatos } from "./db";
import { anotarGasto, autorizarGasto } from "./presupuesto";
import { instruccionesSistema, mensajeUsuario, type EntradaGuion } from "./prompt";

// Un guion con sus planos suele costar 5–10 centavos; se reserva un poco más por seguridad.
const ESTIMADO_GUION_USD = 0.15;

export type ResultadoGeneracion = { guion: GuionGenerado; modelo: string; costoUsd: number };

// Un guion largo (biografías) pasa de 8 000 tokens, y con los planos de cada escena (C-RITMO-1)
// casi se duplica; sin razonamiento interno, para que todo el presupuesto vaya al JSON del guion.
export const MAX_TOKENS_GUION = 30000;

export async function generarGuion(
  db: BaseDatos,
  entrada: EntradaGuion,
  opciones: { modelo: string; apiKey: string; fetch?: typeof fetch },
): Promise<ResultadoGeneracion> {
  const modelo = asegurarModelo(opciones.modelo);
  if (MODELOS_PERMITIDOS[modelo].proveedor !== "anthropic") {
    throw new Error("Por ahora los guiones se generan con Claude; Gemini queda para una fase siguiente.");
  }
  await autorizarGasto(db, ESTIMADO_GUION_USD);

  const cliente = new Anthropic({ apiKey: opciones.apiKey, fetch: opciones.fetch, maxRetries: 2 });
  // Por STREAMING, siempre (C-GUION-2): con un tope de salida tan alto, el SDK se niega a hacer el
  // pedido de una sola vez («Streaming is required for operations that may take longer than 10
  // minutes») y no se podía escribir ningún guion. `finalMessage()` junta todo y deja el guion
  // ya validado en `parsed_output`, igual que antes.
  const respuesta = await cliente.messages
    .stream({
      model: modelo,
      max_tokens: MAX_TOKENS_GUION,
      thinking: { type: "disabled" },
      system: instruccionesSistema(),
      messages: [{ role: "user", content: mensajeUsuario(entrada) }],
      output_config: { format: zodOutputFormat(esquemaGuionGenerado) },
    })
    .finalMessage();

  const costoUsd = costoTokensUsd(modelo, respuesta.usage.input_tokens, respuesta.usage.output_tokens);
  await anotarGasto(db, "claude", `guion: ${entrada.tema.titulo}`, costoUsd);

  if (respuesta.stop_reason === "max_tokens") {
    throw new Error("El guion salió demasiado largo y se cortó. Pide un video más corto o menos escenas.");
  }
  if (respuesta.stop_reason === "refusal") {
    throw new Error("La IA no quiso escribir este guion. Cambia el tema o el contexto.");
  }
  if (!respuesta.parsed_output) {
    throw new Error("La IA devolvió un guion con formato inválido. Vuelve a intentarlo.");
  }
  return { guion: esquemaGuionGenerado.parse(respuesta.parsed_output), modelo, costoUsd };
}
