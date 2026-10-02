import { describe, expect, it } from "vitest";
import { enSerie } from "../estacion/src/serie";

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe("fila de espera para los archivos de caché compartidos", () => {
  it("tres tareas pedidas a la vez leen y escriben de una en una: ninguna pisa a otra", async () => {
    // Un «archivo» compartido: cada tarea lo lee, tarda, y lo reescribe entero con su dato.
    let archivo: Record<string, number> = {};
    const anotar = (clave: string, tarda: number) =>
      enSerie("prueba-cache", async () => {
        const copia = { ...archivo };
        await esperar(tarda);
        copia[clave] = tarda;
        archivo = copia;
      });
    await Promise.all([anotar("a", 30), anotar("b", 5), anotar("c", 15)]);
    expect(Object.keys(archivo).sort()).toEqual(["a", "b", "c"]);
  });

  it("si una tarea falla, la fila sigue y el fallo le llega a quien la pidió", async () => {
    const mala = enSerie("prueba-fallo", async () => {
      throw new Error("se rompió");
    });
    const buena = enSerie("prueba-fallo", async () => "sigue");
    await expect(mala).rejects.toThrow("se rompió");
    await expect(buena).resolves.toBe("sigue");
  });

  it("filas con otro nombre no se esperan entre sí", async () => {
    const orden: string[] = [];
    await Promise.all([
      enSerie("fila-lenta", async () => {
        await esperar(30);
        orden.push("lenta");
      }),
      enSerie("fila-rapida", async () => {
        orden.push("rapida");
      }),
    ]);
    expect(orden).toEqual(["rapida", "lenta"]);
  });
});
