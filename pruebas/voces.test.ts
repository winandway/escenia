import { describe, expect, it } from "vitest";
import { esquemaGuion, esquemaGuionGenerado, VOCES } from "@compartido/guion";
import { elegirIdDeVoz, modeloDeVoz, VARIABLE_DE_VOZ } from "@compartido/voces";

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

describe("la voz venezolana (Publicidad, 17 oct 2026)", () => {
  it("existe, tiene su variable propia y su modelo (el mismo con que se diseñó, para que no pierda el acento)", async () => {
    const { modeloDeVoz, VARIABLE_DE_VOZ } = await import("@compartido/voces");
    expect(VOCES).toContain("venezolana");
    expect(elegirIdDeVoz("venezolana", { venezolana: "ve1" })).toBe("ve1");
    expect(() => elegirIdDeVoz("venezolana", { richard: "abc", femenina: "xyz" })).toThrow(
      /ELEVENLABS_VOICE_ID_VENEZOLANA/,
    );
    expect(VARIABLE_DE_VOZ.venezolana).toBe("ELEVENLABS_VOICE_ID_VENEZOLANA");
    expect(modeloDeVoz("venezolana", "eleven_flash_v2_5")).toBe("eleven_v3");
    expect(modeloDeVoz("richard", "eleven_flash_v2_5")).toBe("eleven_flash_v2_5");
  });
});

describe("la voz neutra latina (comerciales para varios países, 5 nov 2026)", () => {
  it("está en el banco, sale de su variable y se lee con Eleven v3", () => {
    expect(VOCES).toContain("neutra");
    expect(elegirIdDeVoz("neutra", { neutra: "ne1" })).toBe("ne1");
    expect(() => elegirIdDeVoz("neutra", { venezolana: "ve1" })).toThrow(/ELEVENLABS_VOICE_ID_NEUTRA/);
    expect(VARIABLE_DE_VOZ.neutra).toBe("ELEVENLABS_VOICE_ID_NEUTRA");
    expect(modeloDeVoz("neutra", "eleven_flash_v2_5")).toBe("eleven_v3");
  });
});

describe("la voz paisa (comerciales con acento colombiano, 6 nov 2026)", () => {
  it("está en el banco, sale de su variable y se lee con Eleven v3", () => {
    expect(VOCES).toContain("paisa");
    expect(elegirIdDeVoz("paisa", { paisa: "pa1" })).toBe("pa1");
    expect(() => elegirIdDeVoz("paisa", { neutra: "ne1" })).toThrow(/ELEVENLABS_VOICE_ID_PAISA/);
    expect(VARIABLE_DE_VOZ.paisa).toBe("ELEVENLABS_VOICE_ID_PAISA");
    expect(modeloDeVoz("paisa", "eleven_flash_v2_5")).toBe("eleven_v3");
  });
});
