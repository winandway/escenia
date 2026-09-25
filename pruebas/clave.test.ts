import { describe, expect, it } from "vitest";
import { claveCorrecta, huellaDeClave, igualesSinFiltrarTiempo } from "@/lib/clave";

describe("contraseña del panel", () => {
  it("genera una huella que se comprueba y nunca guarda el texto", async () => {
    const huella = await huellaDeClave("una-clave-muy-larga-123", undefined, 10_000);
    expect(huella.startsWith("pbkdf2$10000$")).toBe(true);
    expect(huella).not.toContain("una-clave");
    expect(await claveCorrecta("una-clave-muy-larga-123", huella)).toBe(true);
    expect(await claveCorrecta("otra", huella)).toBe(false);
  });

  it("rechaza huellas mal formadas sin explotar", async () => {
    expect(await claveCorrecta("x", "basura")).toBe(false);
    expect(await claveCorrecta("x", "pbkdf2$5$abc$def")).toBe(false);
  });

  it("compara bytes sin depender del largo", () => {
    expect(igualesSinFiltrarTiempo(new Uint8Array([1, 2]), new Uint8Array([1, 2]))).toBe(true);
    expect(igualesSinFiltrarTiempo(new Uint8Array([1, 2]), new Uint8Array([1, 3]))).toBe(false);
    expect(igualesSinFiltrarTiempo(new Uint8Array([1]), new Uint8Array([1, 2]))).toBe(false);
  });
});
