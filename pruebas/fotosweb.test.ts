import { describe, expect, it } from "vitest";
import { candidatasDeSerper, consultaWeb, elegirCandidata } from "@compartido/fotosweb";

describe("fotos reales de internet (C-IMAGEN-3)", () => {
  it("arma la consulta con la persona y la época, o la infancia", () => {
    expect(consultaWeb("Luis Miguel", 1987)).toBe("Luis Miguel 1987");
    expect(consultaWeb("Luis Miguel", null)).toBe("Luis Miguel");
    expect(consultaWeb("Luis Miguel", 1985, true)).toBe("Luis Miguel niño");
  });

  it("lee la respuesta de Serper: solo imágenes http(s) y grandes, con la página de origen", () => {
    const candidatas = candidatasDeSerper({
      images: [
        { imageUrl: "https://a.com/1.jpg", imageWidth: 1200, imageHeight: 800, link: "https://a.com/nota" },
        { imageUrl: "https://b.com/chica.jpg", imageWidth: 300, imageHeight: 200, link: "https://b.com" },
        { imageUrl: "data:image/png;base64,xx", link: "https://c.com" },
        { imageUrl: "https://d.com/sin-tamano.jpg", source: "d.com" },
      ],
    });
    expect(candidatas).toEqual([
      { url: "https://a.com/1.jpg", origen: "https://a.com/nota" },
      { url: "https://d.com/sin-tamano.jpg", origen: "d.com" },
    ]);
    expect(candidatasDeSerper(null)).toEqual([]);
    expect(candidatasDeSerper({ message: "Unauthorized" })).toEqual([]);
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
