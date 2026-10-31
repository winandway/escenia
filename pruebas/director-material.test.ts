// El Director no muestra la tarjeta de un anuncio si le falta algo (C-DIRECTOR-4). Pasó en la app el 31
// oct 2026: la tarjeta se aprobó sin logo y la Mac falló después («No encontré el logo»). Ahora lo que
// falta se pide en el chat antes de la tarjeta, y «sin logo» o «solo con Maggie» son respuestas válidas.
import { describe, expect, it } from "vitest";
import { esquemaAnuncioDelDirector, faltaEnElAnuncio, materialDelAnuncio } from "@compartido/director";

const foto = (id: number, carpeta: string, nombre: string) => ({ id, carpeta, nombre, tipo: "imagen" });
const IMAGENES = [
  foto(1, "Maggie", "maggie-blazer-presenta.png"),
  foto(2, "Maggie", "maggie-blusa-senalando.png"),
  foto(3, "Encargo 9", "captura-inicio.png"),
  foto(4, "Encargo 9", "captura-ventas.png"),
  foto(5, "Logos", "logo-qrbott.png"),
];
const TEXTO =
  "¿Se te complica controlar tu negocio desde el teléfono? Con QRBott lo tienes todo en un solo lugar, fácil y rápido. Ahora ya está disponible en iOS y en Play Store, lista para que la descargues hoy mismo.";
const anuncio = (extra: Record<string, unknown>) =>
  esquemaAnuncioDelDirector.parse({
    nombre: "QRBott · control de negocio",
    narracion: TEXTO,
    idioma: "es",
    voz: "venezolana",
    carpetas: ["Encargo 9", "Maggie"],
    avatar: "maggie-blazer-presenta.png",
    instrucciones: "",
    ...extra,
  });

describe("lo que el anuncio necesita antes de volverse tarjeta (C-DIRECTOR-4)", () => {
  it("sin logo no hay tarjeta: el Director tiene que pedirlo (el caso de QRBott del 31 oct)", () => {
    const falta = faltaEnElAnuncio(IMAGENES, anuncio({}));
    expect(falta).toContain("el logo de la marca");
    expect(falta).toContain("botón +");
    expect(falta).not.toContain("fotos del producto");
  });

  it("con el logo en las carpetas, o si dijeron «sin logo», la tarjeta sale", () => {
    expect(faltaEnElAnuncio(IMAGENES, anuncio({ carpetas: ["Encargo 9", "Maggie", "Logos"] }))).toBeNull();
    expect(faltaEnElAnuncio(IMAGENES, anuncio({ sin_logo: true }))).toBeNull();
  });

  it("las fotos de Maggie nunca cuentan como fotos del producto ni como logo", () => {
    const soloMaggie = anuncio({ carpetas: ["Maggie"] });
    const m = materialDelAnuncio(IMAGENES, soloMaggie);
    expect(m.persona?.id).toBe(1);
    expect(m.fotos).toEqual([]);
    expect(m.logo).toBeNull();
    const falta = faltaEnElAnuncio(IMAGENES, soloMaggie);
    expect(falta).toContain("fotos del producto");
    expect(
      faltaEnElAnuncio(IMAGENES, anuncio({ carpetas: ["Maggie"], sin_logo: true, solo_presentadora: true })),
    ).toBeNull();
  });

  it("el material del anuncio separa la persona, el logo y las fotos", () => {
    const m = materialDelAnuncio(IMAGENES, anuncio({ carpetas: ["Encargo 9", "Maggie", "Logos"] }));
    expect(m.persona?.nombre).toBe("maggie-blazer-presenta.png");
    expect(m.logo?.nombre).toBe("logo-qrbott.png");
    expect(m.fotos.map((f) => f.nombre)).toEqual(["captura-inicio.png", "captura-ventas.png"]);
  });
});
