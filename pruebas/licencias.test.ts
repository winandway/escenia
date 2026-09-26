import { describe, expect, it } from "vitest";
import { exigeCredito, licenciaLibre } from "@compartido/licencias";

describe("licencias de fotos (Wikimedia Commons)", () => {
  it("acepta las que permiten uso comercial y obras derivadas", () => {
    for (const l of ["CC BY-SA 4.0", "CC BY 3.0", "CC BY-SA 2.0", "CC0", "Public domain", "PD-US"]) {
      expect(licenciaLibre(l)).toBe(true);
    }
  });

  it("rechaza NC, ND, vacías y desconocidas", () => {
    for (const l of ["CC BY-NC 4.0", "CC BY-NC-SA 3.0", "CC BY-ND 4.0", "", "Fair use", "Copyrighted"]) {
      expect(licenciaLibre(l)).toBe(false);
    }
  });

  it("sabe cuándo el crédito es obligatorio", () => {
    expect(exigeCredito("CC BY-SA 4.0")).toBe(true);
    expect(exigeCredito("CC0")).toBe(false);
    expect(exigeCredito("Public domain")).toBe(false);
  });
});
