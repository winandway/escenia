// Genera el guion con la IA, respetando el candado de modelos y el de gasto.
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { esquemaGuion, type Guion } from "@compartido/guion";
import { asegurarModelo, costoTokensUsd, MODELOS_PERMITIDOS } from "@compartido/modelos";
import type { BaseDatos } from "./db";
import { anotarGasto, autorizarGasto } from "./presupuesto";
import { instruccionesSistema, mensajeUsuario, type EntradaGuion } from "./prompt";

// Un guion suele costar 2–4 centavos; se reserva un poco más por seguridad.
const ESTIMADO_GUION_USD = 0.08;

export type ResultadoGeneracion = { guion: Guion; modelo: string; costoUsd: number };

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
  const respuesta = await cliente.messages.parse({
    model: modelo,
    max_tokens: 8000,
    system: instruccionesSistema(),
    messages: [{ role: "user", content: mensajeUsuario(entrada) }],
    output_config: { format: zodOutputFormat(esquemaGuion) },
  });

  const costoUsd = costoTokensUsd(modelo, respuesta.usage.input_tokens, respuesta.usage.output_tokens);
  await anotarGasto(db, "claude", `guion: ${entrada.tema.titulo}`, costoUsd);

  if (respuesta.stop_reason === "refusal") {
    throw new Error("La IA no quiso escribir este guion. Cambia el tema o el contexto.");
  }
  if (!respuesta.parsed_output) {
    throw new Error("La IA devolvió un guion con formato inválido. Vuelve a intentarlo.");
  }
  return { guion: esquemaGuion.parse(respuesta.parsed_output), modelo, costoUsd };
}
