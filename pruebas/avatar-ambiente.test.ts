import { describe, expect, it } from "vitest";
import { filtroAmbiente, VOLUMEN_AMBIENTE } from "../estacion/src/avatar-ambiente";

describe("avatar: el ambiente va debajo de la voz, recortado al clip y con fundidos", () => {
  it("arma el filtro con el largo del clip, el volumen bajo y la mezcla sin normalizar", () => {
    const f = filtroAmbiente(13, 0.2);
    expect(f).toContain("atrim=0:13.00");
    expect(f).toContain("volume=0.2");
    expect(f).toContain("afade=t=out:st=12.00:d=1");
    expect(f).toContain("amix=inputs=2:duration=first");
    expect(f).toContain("normalize=0");
    expect(VOLUMEN_AMBIENTE).toBeLessThanOrEqual(0.35);
  });
  it("revienta con un clip vacío o un volumen que tape la voz", () => {
    expect(() => filtroAmbiente(0)).toThrow(/no dura/);
    expect(() => filtroAmbiente(10, 1.5)).toThrow(/entre 0 y 1/);
  });
});
