import { describe, expect, it } from "vitest";
import { anioDe, elegirReferencia } from "@compartido/referencias";

const refs = [
  { ruta: "1957.jpg", anio: 1957 },
  { ruta: "1985.jpg", anio: 1985 },
  { ruta: "2002.jpg", anio: 2002 },
  { ruta: "sin.jpg", anio: null },
];

describe("referencias por época (C-IMAGEN-2)", () => {
  it("saca el año de una escena, también de una década", () => {
    expect(anioDe("Celia Cruz in 1950 Havana")).toBe(1950);
    expect(anioDe("a 1970s New York club")).toBe(1975);
    expect(anioDe("sin fecha")).toBeNull();
  });

  it("elige la foto de la época más cercana", () => {
    expect(elegirReferencia(refs, 1950, "Celia Cruz as a young woman")?.ruta).toBe("1957.jpg");
    expect(elegirReferencia(refs, 1990, "Celia Cruz on stage")?.ruta).toBe("1985.jpg");
    expect(elegirReferencia(refs, 2003, "Celia Cruz in New Jersey")?.ruta).toBe("2002.jpg");
  });

  it("sin año usa la más antigua; en la infancia no usa ninguna", () => {
    expect(elegirReferencia(refs, null, "Celia Cruz singing")?.ruta).toBe("1957.jpg");
    expect(elegirReferencia(refs, 1935, "Celia Cruz as a young girl singing to her siblings")).toBeNull();
    expect(
      elegirReferencia(
        [...refs, { ruta: "nina.jpg", anio: null, infancia: true }],
        1935,
        "Celia Cruz as a young girl",
      )?.ruta,
    ).toBe("nina.jpg");
    expect(elegirReferencia([], 1950, "Celia Cruz")).toBeNull();
  });
});
