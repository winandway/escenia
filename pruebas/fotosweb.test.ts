import { describe, expect, it } from "vitest";
import { consultaWeb, elegirCandidata } from "@compartido/fotosweb";

describe("fotos reales de internet (C-IMAGEN-3)", () => {
  it("arma la consulta con la persona y la época, o la infancia", () => {
    expect(consultaWeb("Luis Miguel", 1987)).toBe("Luis Miguel 1987");
    expect(consultaWeb("Luis Miguel", null)).toBe("Luis Miguel");
    expect(consultaWeb("Luis Miguel", 1985, true)).toBe("Luis Miguel niño");
  });

  it("elige una foto con cara y grande; descarta portadas, logos y fotos chicas", () => {
    const mejor = elegirCandidata([
      { url: "a", ancho: 1200, alto: 800, origen: "x", cara: null },
      { url: "b", ancho: 400, alto: 300, origen: "x", cara: 0.05 },
      { url: "c", ancho: 900, alto: 1200, origen: "x", cara: 0.03 },
      { url: "d", ancho: 1600, alto: 1000, origen: "x", cara: 0.012 },
    ]);
    expect(mejor?.url).toBe("c");
    expect(elegirCandidata([{ url: "a", ancho: 1200, alto: 800, origen: "x", cara: null }])).toBeNull();
    expect(elegirCandidata([])).toBeNull();
  });
});
