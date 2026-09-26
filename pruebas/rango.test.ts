import { describe, expect, it } from "vitest";
import { cabecerasDeRango, rangoDesdeCabecera } from "@/lib/rango";

describe("rangos para reproducir video", () => {
  it("entiende los rangos que manda el navegador", () => {
    expect(rangoDesdeCabecera("bytes=0-", 100)).toEqual({ offset: 0, length: 100 });
    expect(rangoDesdeCabecera("bytes=10-19", 100)).toEqual({ offset: 10, length: 10 });
    expect(rangoDesdeCabecera("bytes=90-500", 100)).toEqual({ offset: 90, length: 10 });
    expect(rangoDesdeCabecera("bytes=-20", 100)).toEqual({ suffix: 20 });
  });

  it("ignora rangos inválidos o fuera del archivo", () => {
    expect(rangoDesdeCabecera(null, 100)).toBeNull();
    expect(rangoDesdeCabecera("bytes=200-", 100)).toBeNull();
    expect(rangoDesdeCabecera("bytes=50-10", 100)).toBeNull();
    expect(rangoDesdeCabecera("cosas raras", 100)).toBeNull();
  });

  it("arma la respuesta parcial con Content-Range correcto", () => {
    const r = cabecerasDeRango({ offset: 10, length: 10 }, 100, "video/mp4");
    expect(r.status).toBe(206);
    expect(r.headers["content-range"]).toBe("bytes 10-19/100");
    expect(r.headers["content-length"]).toBe("10");
    const s = cabecerasDeRango({ suffix: 20 }, 100, "video/mp4");
    expect(s.headers["content-range"]).toBe("bytes 80-99/100");
    const c = cabecerasDeRango(null, 100, "video/mp4");
    expect(c.status).toBe(200);
    expect(c.headers["accept-ranges"]).toBe("bytes");
  });
});
