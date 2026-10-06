import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { esquemaGuion } from "@compartido/guion";
import { mensajePublicacion } from "@/lib/publicacion";
import {
  ALTO_DEL_BOCETO,
  arribaDeLaLetra,
  bajadaDelVideo,
  caraDeLaToma,
  ESTILO_LAPIZ,
  momentosDeCancion,
  promptDeBoceto,
} from "@compartido/cancion";
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

  it("el video se baja justo hasta que la cabeza queda debajo del papel, y la letra va bajo el mentón, nunca sobre la cara", () => {
    // Cuadros de la toma real del 6 oct 2026: la cara (recuadro) sube y baja mientras canta.
    const cara = caraDeLaToma([
      [{ cy: 0.4396, h: 0.2188 }],
      [{ cy: 0.3942, h: 0.1426 }],
      [{ cy: 0.338, h: 0.1651 }],
      [],
    ]);
    expect(cara).not.toBeNull();
    // La cabeza llega más arriba en el cuadro donde la cara está más alta (gorra incluida).
    expect(cara?.arriba).toBeCloseTo(0.338 - 0.1651 / 2 - 0.1651 * 0.75, 3);
    // El mentón más bajo, en el cuadro de la cara más grande.
    expect(cara?.abajo).toBeCloseTo(0.4396 + 0.2188 / 2, 3);
    const bajada = bajadaDelVideo(cara);
    // Se baja lo que falta para que la cabeza quede bajo el papel, con un pelo de aire.
    expect(bajada).toBeCloseTo(ALTO_DEL_BOCETO + 0.01 - (cara?.arriba ?? 0), 3);
    expect((cara?.arriba ?? 0) + bajada).toBeGreaterThanOrEqual(ALTO_DEL_BOCETO);
    // La letra empieza debajo del mentón bajado y no se va al fondo (YouTube tapa lo de abajo).
    const letra = arribaDeLaLetra(cara, bajada);
    expect(letra).toBeGreaterThan((cara?.abajo ?? 0) + bajada);
    expect(letra).toBeLessThanOrEqual(0.8);
    // Una cabeza ya muy abajo no mueve el video; una muy arriba nunca lo baja más que el papel.
    expect(bajadaDelVideo({ arriba: 0.5, abajo: 0.7 })).toBe(0);
    expect(bajadaDelVideo({ arriba: 0, abajo: 0.3 })).toBe(ALTO_DEL_BOCETO);
    // Sin cara detectada, se baja un poco por si acaso y la letra va a media pantalla.
    expect(bajadaDelVideo(null)).toBe(0.1);
    expect(arribaDeLaLetra(null, 0.1)).toBeCloseTo(0.625, 3);
    expect(caraDeLaToma([[], []])).toBeNull();
  });

  it("el boceto se queda quieto: nada de zoom ni de cámara que avance (lo prohibió Richard el 6 oct 2026)", () => {
    const fuente = readFileSync(path.resolve(__dirname, "../estacion/src/remotion/Cancion.tsx"), "utf8");
    const desde = fuente.indexOf("const Boceto");
    const hasta = fuente.indexOf("const AvisoSuscribete");
    expect(desde).toBeGreaterThan(0);
    const boceto = fuente.slice(desde, hasta);
    // Ni escala, ni desplazamiento, ni ninguna transformación: el dibujo no se toca.
    expect(boceto).not.toMatch(/scale\(|translate\(|transform:/);
    // Lo único que se anima es el barrido de entrada.
    expect(boceto).toContain("clipPath");
  });

  it("el título y la miniatura de una canción se piden como los de un video musical", () => {
    const guion = esquemaGuion.parse({
      titulo: "Voy recorriendo caminos",
      gancho: "Voy recorriendo caminos que no tienen final.",
      escenas: [
        {
          parte: "gancho",
          narracion: "Voy recorriendo caminos que no tienen final.",
          visual: { tipo: "texto", titular: "x" },
        },
        {
          parte: "contexto",
          narracion: "Y ella a mi lado sin miedo me vuelve a abrazar.",
          visual: { tipo: "texto", titular: "z" },
        },
        {
          parte: "cierre",
          narracion: "Pero si dudas, te dejo volar.",
          visual: { tipo: "texto", titular: "y" },
        },
      ],
    });
    const m = mensajePublicacion(guion, "Caprichoso TV", [], "es", true);
    expect(m).toContain("ES UNA CANCIÓN");
    expect(m).toContain("Bachata en vivo con letra");
    expect(m).toContain("VERTICAL");
    expect(mensajePublicacion(guion, "Caprichoso TV", [], "es")).not.toContain("ES UNA CANCIÓN");
  });
});
