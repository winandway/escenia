import { describe, expect, it } from "vitest";
import { esquemaGuion, esquemaGuionGenerado, VOCES } from "@compartido/guion";
import { elegirIdDeVoz } from "@compartido/voces";

describe("voces (C-VOZ-1)", () => {
  it("elige el id de la voz pedida", () => {
    expect(elegirIdDeVoz("richard", { richard: "abc", femenina: "xyz" })).toBe("abc");
    expect(elegirIdDeVoz("femenina", { richard: "abc", femenina: "xyz" })).toBe("xyz");
  });

  it("si la voz pedida no está configurada, falla con aviso y NUNCA cae a la otra voz", () => {
    expect(() => elegirIdDeVoz("femenina", { richard: "abc" })).toThrow(/ELEVENLABS_VOICE_ID_FEMENINA/);
    expect(() => elegirIdDeVoz("richard", { femenina: "xyz" })).toThrow(/ELEVENLABS_VOICE_ID/);
    expect(() => elegirIdDeVoz("femenina", { richard: "abc", femenina: "   " })).toThrow();
  });

  it("los guiones viejos sin voz narran con la voz de Richard", () => {
    const g = esquemaGuion.parse({
      titulo: "Un título válido",
      gancho: "Un gancho válido",
      escenas: [
        { parte: "gancho", narracion: "a", visual: { tipo: "texto" } },
        { parte: "dato", narracion: "b", visual: { tipo: "texto" } },
        { parte: "cta", narracion: "c", visual: { tipo: "texto" } },
      ],
    });
    expect(g.voz).toBe("richard");
    expect(VOCES).toContain("femenina");
  });

  it("la IA no elige la voz: el formato que se le exige no la incluye", () => {
    expect(Object.keys(esquemaGuionGenerado.shape)).not.toContain("voz");
    expect(Object.keys(esquemaGuion.shape)).toContain("voz");
  });
});
