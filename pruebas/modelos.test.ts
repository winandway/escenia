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
    expect(asegurarModeloImagen("fal-ai/bytedance/seedream/v4/edit")).toBeTruthy();
    for (const p of Object.values(IMAGENES_PERMITIDAS)) expect(p).toBeLessThanOrEqual(TOPE_IMAGEN_USD);
  });

  it("calcula el costo con los precios oficiales", () => {
    expect(costoTokensUsd("claude-sonnet-5", 1_000_000, 0)).toBe(2);
    expect(costoTokensUsd("claude-haiku-4-5", 0, 1_000_000)).toBe(5);
    expect(costoVozUsd("eleven_multilingual_v2", 3000)).toBeCloseTo(0.3);
  });
});

describe("avatar guiado por audio: candado de modelos y de segundos (C-AVATAR-1)", () => {
  it("solo corren los dos modelos autorizados, el costo sale de los segundos y nada pasa de 40 s", async () => {
    const { asegurarModeloAvatar, costoAvatarUsd, TOPE_AVATAR_SEG } = await import("@compartido/modelos");
    expect(asegurarModeloAvatar("fal-ai/kling-video/ai-avatar/v2/standard")).toBe(
      "fal-ai/kling-video/ai-avatar/v2/standard",
    );
    expect(() => asegurarModeloAvatar("fal-ai/kling-video/ai-avatar/v2/pro")).toThrow(/bloqueado/);
    expect(() => asegurarModeloAvatar("fal-ai/infinitalk")).toThrow(/bloqueado/);
    expect(() => asegurarModeloAvatar("mirage-api/avatar-x/reference-to-video")).toThrow(/bloqueado/);
    expect(costoAvatarUsd("fal-ai/kling-video/ai-avatar/v2/standard", 15)).toBeCloseTo(0.843, 3);
    expect(costoAvatarUsd("fal-ai/bytedance/omnihuman/v1.5", 15)).toBeCloseTo(2.4, 3);
    expect(costoAvatarUsd("fal-ai/flashtalk", 26)).toBeCloseTo(0.52, 3);
    // Hunyuan cobra por clip, no por segundo, y no pasa de 16 s.
    expect(costoAvatarUsd("fal-ai/hunyuan-avatar", 15.5)).toBeCloseTo(0.4, 3);
    expect(costoAvatarUsd("fal-ai/hunyuan-avatar", 3)).toBeCloseTo(0.4, 3);
    expect(() => costoAvatarUsd("fal-ai/hunyuan-avatar", 20)).toThrow(/hasta 16 s/);
    expect(TOPE_AVATAR_SEG).toBe(40);
    expect(() => costoAvatarUsd("fal-ai/bytedance/omnihuman/v1.5", 41)).toThrow(/tope/);
    expect(() => costoAvatarUsd("fal-ai/bytedance/omnihuman/v1.5", 0)).toThrow(/vacío/);
  });
});
