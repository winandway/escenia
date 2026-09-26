import { describe, expect, it } from "vitest";
import {
  asegurarModeloImagen,
  IMAGENES_PERMITIDAS,
  TOPE_IMAGEN_USD,
  asegurarModelo,
  asegurarModeloVoz,
  costoTokensUsd,
  costoVozUsd,
  MODELOS_PERMITIDOS,
} from "@compartido/modelos";

describe("candado de modelos", () => {
  it("bloquea cualquier modelo fuera de la lista, aunque exista", () => {
    expect(() => asegurarModelo("claude-opus-5")).toThrow(/bloqueado/);
    expect(() => asegurarModelo("gpt-image-1")).toThrow(/bloqueado/);
    expect(() => asegurarModeloVoz("eleven_turbo_v2")).toThrow(/bloqueado/);
  });

  it("deja pasar los permitidos", () => {
    expect(asegurarModelo("claude-sonnet-5")).toBe("claude-sonnet-5");
    expect(asegurarModeloVoz("eleven_multilingual_v2")).toBe("eleven_multilingual_v2");
  });

  it("ningún modelo permitido pasa de $10 por millón de tokens de salida", () => {
    for (const m of Object.values(MODELOS_PERMITIDOS)) expect(m.salida).toBeLessThanOrEqual(10);
  });

  it("bloquea modelos de imagen fuera de la lista y ninguno pasa del tope", () => {
    expect(() => asegurarModeloImagen("fal-ai/flux-pro/v1.1-ultra")).toThrow(/bloqueado/);
    expect(() => asegurarModeloImagen("gpt-image-1")).toThrow(/bloqueado/);
    expect(asegurarModeloImagen("fal-ai/bytedance/seedream/v4/text-to-image")).toBeTruthy();
    for (const p of Object.values(IMAGENES_PERMITIDAS)) expect(p).toBeLessThanOrEqual(TOPE_IMAGEN_USD);
  });

  it("calcula el costo con los precios oficiales", () => {
    expect(costoTokensUsd("claude-sonnet-5", 1_000_000, 0)).toBe(2);
    expect(costoTokensUsd("claude-haiku-4-5", 0, 1_000_000)).toBe(5);
    expect(costoVozUsd("eleven_multilingual_v2", 3000)).toBeCloseTo(0.3);
  });
});
