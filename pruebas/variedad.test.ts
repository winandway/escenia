import { describe, expect, it } from "vitest";
import { avisoDeParecido, parecido } from "@/lib/variedad";

describe("candado de variedad", () => {
  it("detecta guiones casi iguales", () => {
    const a = "Sam Altman anuncia el nuevo modelo de OpenAI para programadores";
    const b = "OpenAI y Sam Altman anuncian nuevo modelo para programadores";
    expect(parecido(a, b)).toBeGreaterThan(0.45);
    expect(
      avisoDeParecido({ titulo: a, gancho: "", estructura: "" }, [
        { id: 7, titulo: b, gancho: "", estructura: "" },
      ]),
    ).toMatch(/#7/);
  });

  it("no avisa cuando el tema es distinto", () => {
    expect(
      avisoDeParecido(
        { titulo: "Cómo funciona Tintora POS en una lavandería", gancho: "x", estructura: "a" },
        [{ id: 1, titulo: "Sam Altman y el futuro de la IA", gancho: "y", estructura: "b" }],
      ),
    ).toBe("");
  });

  it("avisa si los últimos 3 videos repiten la estructura", () => {
    const r = Array.from({ length: 3 }, (_, i) => ({
      id: i,
      titulo: `Tema ${i} distinto ${i * 7}`,
      gancho: "",
      estructura: "gancho>demo>cta",
    }));
    expect(
      avisoDeParecido({ titulo: "Otro tema totalmente nuevo", gancho: "", estructura: "gancho>demo>cta" }, r),
    ).toMatch(/estructura/);
  });
});
