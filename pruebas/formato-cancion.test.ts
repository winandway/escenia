import { describe, expect, it } from "vitest";
import { ALTO_DEL_BOCETO, ESTILO_LAPIZ, momentosDeCancion, promptDeBoceto } from "@compartido/cancion";
import { esquemaGrabacionNueva } from "@compartido/grabaciones";
import { dibujaPersonas, esCancion, esDeNeon, ESTILOS_VIDEO, NOMBRE_FORMATO } from "@compartido/tematicas";
import { mensajeDePlan } from "@/lib/plan-grabacion";
import { esquemaPropsVideo } from "../estacion/src/remotion/props";

describe("formato «Canción»: Richard canta con su fondo real y un boceto a lápiz por verso (C-CANCION-1)", () => {
  it("es el quinto formato, se llama Canción, y no es de neón ni dibuja personas", () => {
    expect(ESTILOS_VIDEO.at(-1)).toBe("cancion");
    expect(NOMBRE_FORMATO.cancion).toBe("Canción");
    expect(esCancion("cancion")).toBe(true);
    expect(esDeNeon("cancion")).toBe(false);
    expect(dibujaPersonas("cancion")).toBe(false);
    // La plantilla lo conoce (su lista va aparte porque no puede importar de fuera).
    expect(esquemaPropsVideo.shape.estilo.parse("cancion")).toBe("cancion");
  });

  it("se puede elegir al subir una grabación", () => {
    const g = esquemaGrabacionNueva.parse({
      tema: "Voy recorriendo caminos",
      formato: "cancion",
      canal: "caprichoso-tv",
      archivo: "IMG_4680.MOV",
      bytes: 5_000_000,
    });
    expect(g.formato).toBe("cancion");
  });

  it("el plan de una canción pide un dibujo «ia» por verso, sin planos, fotos ni diagramas, y la letra copiada", () => {
    const m = mensajeDePlan({
      transcripcion:
        "Voy recorriendo caminos que no tienen final. Y ella a mi lado sin miedo me vuelve a abrazar.",
      formato: "cancion",
      titulo: "Voy recorriendo caminos",
    });
    expect(m).toContain("CANTANDO");
    expect(m).toContain("LA CANCIÓN: Voy recorriendo caminos");
    expect(m).toContain("FORMATO CANCIÓN");
    expect(m).toContain("«ia»");
    expect(m).toContain("entre 6 y 18 palabras");
    expect(m).toMatch(/No uses `planos`/);
    expect(m).toContain("`musica`: «none»");
    // Lo de los videos hablados no se cuela.
    expect(m).not.toContain("entre 25 y 70 palabras");
    expect(m).not.toContain("driving kick and bass beat");
  });

  it("cada boceto lleva el estilo a lápiz sobre papel viejo, sin texto ni color, y él sale entero todo el tiempo", () => {
    const prompt = promptDeBoceto(
      "a road seen through a car windshield, stretching to the horizon with no end. ",
    );
    expect(
      prompt.startsWith("a road seen through a car windshield, stretching to the horizon with no end. "),
    ).toBe(true);
    expect(prompt).toContain(ESTILO_LAPIZ);
    expect(ESTILO_LAPIZ).toMatch(/pencil sketch/i);
    expect(ESTILO_LAPIZ).toMatch(/No text/i);
    expect(ESTILO_LAPIZ).toMatch(/no color/i);
    expect(momentosDeCancion()).toEqual([{ inicioMs: 0, modo: "completo" }]);
    // El papel ocupa un tercio de arriba: encima de su cabeza, nunca sobre su cara.
    expect(ALTO_DEL_BOCETO).toBeGreaterThan(0.25);
    expect(ALTO_DEL_BOCETO).toBeLessThan(0.4);
  });
});
