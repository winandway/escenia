import { describe, expect, it } from "vitest";
import { paraLaVoz } from "@compartido/pronunciacion";

describe("pronunciación para la voz (C-VOZ-3)", () => {
  it("quita la H muda para que la voz no la aspire («Habana» sonaba «Jabana»)", () => {
    expect(paraLaVoz("Nació en La Habana, con sus hermanos y su hijo.")).toBe(
      "Nació en La Abana, con sus ermanos y su ijo.",
    );
    expect(paraLaVoz("Hoy hay ahora un hotel. ¡Hola, Héctor!")).toBe("Oy ay aora un otel. ¡Ola, Éctor!");
  });

  it("respeta los préstamos del inglés donde la H sí suena", () => {
    expect(paraLaVoz("Usa hardware en Houston y hace hip hop en Harlem.")).toBe(
      "Usa hardware en Houston y ace hip hop en Harlem.",
    );
  });

  it("nunca cambia la cantidad de palabras (los subtítulos dependen de eso)", () => {
    const t = "Hoy la Habana amaneció húmeda; ahí, entre hierro y humo, hablaba Héctor.";
    expect(paraLaVoz(t).split(/\s+/).length).toBe(t.split(/\s+/).length);
  });
});
