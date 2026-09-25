import { describe, expect, it } from "vitest";
import {
  duracionEstimadaSeg,
  esquemaGuion,
  insertarOpinion,
  textoNarrado,
  type Escena,
} from "@compartido/guion";

const escena = (parte: Escena["parte"], narracion = "texto"): Escena => ({
  parte,
  narracion,
  visual: { tipo: "texto" },
});

describe("guion", () => {
  it("valida un guion completo y rellena los campos opcionales", () => {
    const g = esquemaGuion.parse({
      titulo: "Un título válido",
      gancho: "Un gancho válido",
      escenas: [escena("gancho"), escena("demo"), escena("cta")],
    });
    expect(g.hechos_a_verificar).toEqual([]);
    expect(g.etiquetas).toEqual([]);
  });

  it("rechaza un guion con menos de 3 escenas o partes inventadas", () => {
    expect(() =>
      esquemaGuion.parse({ titulo: "Título válido", gancho: "Gancho válido", escenas: [escena("gancho")] }),
    ).toThrow();
    expect(() =>
      esquemaGuion.parse({
        titulo: "Título válido",
        gancho: "Gancho válido",
        escenas: [
          escena("gancho"),
          escena("demo"),
          { parte: "chiste", narracion: "x", visual: { tipo: "texto" } },
        ],
      }),
    ).toThrow();
  });

  it("inserta la opinión de Richard antes del cierre y reemplaza la de relleno", () => {
    const escenas = [escena("gancho"), escena("opinion", "[opinión del editor]"), escena("cta")];
    const r = insertarOpinion(escenas, "Yo creo que esto cambia todo.");
    expect(r.map((e) => e.parte)).toEqual(["gancho", "opinion", "cta"]);
    expect(r[1]?.narracion).toBe("Yo creo que esto cambia todo.");
  });

  it("si no hay cierre, la opinión va al final", () => {
    const r = insertarOpinion([escena("gancho"), escena("demo")], "Opinión");
    expect(r.at(-1)?.parte).toBe("opinion");
  });

  it("estima la duración a 150 palabras por minuto", () => {
    const palabras = Array.from({ length: 150 }, () => "palabra").join(" ");
    expect(duracionEstimadaSeg([escena("demo", palabras)])).toBe(60);
    expect(textoNarrado([escena("gancho", "a"), escena("demo", "b")])).toBe("a\n\nb");
  });
});
