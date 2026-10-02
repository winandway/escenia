import { describe, expect, it } from "vitest";
import { leerMeta, META_MAXIMA, metaParaCabecera } from "@compartido/meta";

describe("la ficha de un archivo cabe aunque el video tenga cien fotos (C-ENTREGA-2)", () => {
  const creditos = Array.from(
    { length: 150 },
    (_, i) =>
      `Foto de internet (uso editorial): https://www.ejemplo.com/musica/latin/nota-larga-numero-${i}/galería-ñ`,
  );

  it("ciento cincuenta créditos pasan de 4.000 letras y aun así viajan enteros", () => {
    const meta = { creditos };
    expect(JSON.stringify(meta).length).toBeGreaterThan(4000);
    const leida = leerMeta(metaParaCabecera(meta), null);
    expect(leida).not.toBeNull();
    expect(JSON.parse(leida ?? "{}")).toEqual(meta);
  });

  it("la cabecera solo lleva letras seguras y pesa poco (los acentos y la ñ van codificados)", () => {
    const cabecera = metaParaCabecera({ creditos });
    expect(cabecera).toMatch(/^[A-Za-z0-9+/=]+$/);
    expect(cabecera.length).toBeLessThan(JSON.stringify({ creditos }).length * 1.5);
  });

  it("una Estación vieja, que manda la ficha en la dirección, sigue valiendo", () => {
    expect(leerMeta(null, '{"voz_de_prueba":false}')).toBe('{"voz_de_prueba":false}');
    expect(leerMeta(null, null)).toBe("{}");
  });

  it("rechaza lo que no es una ficha: texto roto, una lista, o algo desmedido", () => {
    expect(leerMeta(btoa("{no-es-json"), null)).toBeNull();
    expect(leerMeta("esto no es base64 ñ", null)).toBeNull();
    expect(leerMeta(null, "[1,2]")).toBeNull();
    expect(leerMeta(metaParaCabecera({ x: "a".repeat(META_MAXIMA) }), null)).toBeNull();
  });
});
