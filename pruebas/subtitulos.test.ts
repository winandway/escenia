import { describe, expect, it } from "vitest";
import { alineacionAproximada, palabrasDesdeAlineacion } from "@compartido/subtitulos";

function alinear(texto: string, paso = 0.1) {
  const letras = [...texto];
  return {
    characters: letras,
    character_start_times_seconds: letras.map((_, i) => i * paso),
    character_end_times_seconds: letras.map((_, i) => (i + 1) * paso),
  };
}

describe("palabrasDesdeAlineacion", () => {
  it("convierte letras en palabras con tiempos y espacio adelante (formato Remotion)", () => {
    const r = palabrasDesdeAlineacion(alinear("hola mundo"), ["hola mundo"]);
    expect(r.palabras.map((p) => p.text)).toEqual(["hola", " mundo"]);
    expect(r.palabras[0]).toMatchObject({ startMs: 0, endMs: 400 });
    expect(r.palabras[1]).toMatchObject({ startMs: 500, endMs: 1000 });
    expect(r.duracionMs).toBe(1000);
  });

  it("asigna cada palabra a su escena y calcula los tramos sin huecos", () => {
    const escenas = ["uno dos", "tres"];
    const r = palabrasDesdeAlineacion(alinear(escenas.join("\n\n")), escenas);
    expect(r.palabras.map((p) => p.text.trim())).toEqual(["uno", "dos", "tres"]);
    expect(r.escenas).toHaveLength(2);
    expect(r.escenas[0]).toMatchObject({ indice: 0, inicioMs: 0 });
    expect(r.escenas[0]?.finMs).toBe(r.escenas[1]?.inicioMs);
    expect(r.escenas[1]?.finMs).toBe(r.duracionMs);
  });

  it("falla claro si la alineación viene incompleta", () => {
    const rota = alinear("hola");
    rota.character_end_times_seconds.pop();
    expect(() => palabrasDesdeAlineacion(rota, ["hola"])).toThrow(/incompleta/);
  });

  it("la alineación aproximada reparte la duración real del audio", () => {
    const a = alineacionAproximada("abcd", 2);
    expect(a.characters).toHaveLength(4);
    expect(a.character_end_times_seconds[3]).toBeCloseTo(2);
    const r = palabrasDesdeAlineacion(a, ["abcd"]);
    expect(r.duracionMs).toBe(2000);
  });
});
