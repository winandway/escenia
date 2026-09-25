// Candado de modelos de IA (regla global: los modelos caros se bloquean EN CÓDIGO).
// Solo corre lo que está en esta lista. Poner otro modelo en Ajustes no lo activa:
// `asegurarModelo` lanza error antes de cualquier llamada.
// Precios por millón de tokens, leídos de las páginas oficiales el 25-sep-2026:
// https://platform.claude.com/docs/en/about-claude/pricing
// https://ai.google.dev/gemini-api/docs/pricing

export type Proveedor = "anthropic" | "gemini";

export const MODELOS_PERMITIDOS = {
  "claude-sonnet-5": { proveedor: "anthropic", entrada: 2, salida: 10 },
  "claude-haiku-4-5": { proveedor: "anthropic", entrada: 1, salida: 5 },
  "gemini-2.5-flash": { proveedor: "gemini", entrada: 0.3, salida: 2.5 },
  "gemini-2.5-flash-lite": { proveedor: "gemini", entrada: 0.1, salida: 0.4 },
} as const satisfies Record<string, { proveedor: Proveedor; entrada: number; salida: number }>;

export type ModeloPermitido = keyof typeof MODELOS_PERMITIDOS;

export const MODELO_POR_DEFECTO: ModeloPermitido = "claude-sonnet-5";

export function esModeloPermitido(modelo: string): modelo is ModeloPermitido {
  return Object.prototype.hasOwnProperty.call(MODELOS_PERMITIDOS, modelo);
}

export function asegurarModelo(modelo: string): ModeloPermitido {
  if (!esModeloPermitido(modelo)) {
    throw new Error(`Modelo bloqueado: «${modelo}» no está en la lista de modelos permitidos.`);
  }
  return modelo;
}

export function costoTokensUsd(modelo: ModeloPermitido, tokensEntrada: number, tokensSalida: number): number {
  const p = MODELOS_PERMITIDOS[modelo];
  return (tokensEntrada * p.entrada + tokensSalida * p.salida) / 1_000_000;
}

// ElevenLabs: $0.10 por cada 1.000 caracteres en Multilingual v2 / v3,
// $0.05 en Flash (https://elevenlabs.io/pricing/api, 25-sep-2026).
export const VOCES_PERMITIDAS = {
  eleven_multilingual_v2: 0.1,
  eleven_v3: 0.1,
  eleven_flash_v2_5: 0.05,
} as const;

export type ModeloVoz = keyof typeof VOCES_PERMITIDAS;

export function asegurarModeloVoz(modelo: string): ModeloVoz {
  if (!Object.prototype.hasOwnProperty.call(VOCES_PERMITIDAS, modelo)) {
    throw new Error(`Modelo de voz bloqueado: «${modelo}».`);
  }
  return modelo as ModeloVoz;
}

export function costoVozUsd(modelo: ModeloVoz, caracteres: number): number {
  return (caracteres / 1000) * VOCES_PERMITIDAS[modelo];
}
