import { describe, expect, it } from "vitest";
import { textosMiniatura } from "@compartido/miniatura";

describe("textos de la miniatura", () => {
  it("separa el nombre del gancho por los dos puntos", () => {
    expect(
      textosMiniatura("Celia Cruz: la niña que gritaba azúcar antes de saber lo que era la fama"),
    ).toEqual({
      nombre: "Celia Cruz",
      gancho: "la niña que gritaba azúcar antes de saber lo que era la fama",
    });
  });
  it("sin dos puntos, el título entero es el nombre y no hay gancho", () => {
    expect(textosMiniatura("El QR que evita que tu camisa se pierda")).toEqual({
      nombre: "El QR que evita que tu…",
      gancho: "",
    });
  });
});
