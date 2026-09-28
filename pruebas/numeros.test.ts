import { describe, expect, it } from "vitest";
import { emparejarConLetras, enteroEnLetras, numerosEnLetras } from "@compartido/numeros";

describe("números en letras (C-VOZ-2)", () => {
  it("enteros", () => {
    expect(enteroEnLetras(0)).toBe("cero");
    expect(enteroEnLetras(16)).toBe("dieciséis");
    expect(enteroEnLetras(21)).toBe("veintiuno");
    expect(enteroEnLetras(37)).toBe("treinta y siete");
    expect(enteroEnLetras(100)).toBe("cien");
    expect(enteroEnLetras(101)).toBe("ciento uno");
    expect(enteroEnLetras(1000)).toBe("mil");
    expect(enteroEnLetras(1925)).toBe("mil novecientos veinticinco");
    expect(enteroEnLetras(2003)).toBe("dos mil tres");
    expect(enteroEnLetras(21000)).toBe("veintiún mil");
    expect(enteroEnLetras(250000)).toBe("doscientos cincuenta mil");
    expect(enteroEnLetras(1000000)).toBe("un millón");
    expect(enteroEnLetras(2500000)).toBe("dos millones quinientos mil");
  });

  it("los años y cantidades del guion de Celia se leen bien", () => {
    expect(numerosEnLetras("Nació el 21 de octubre de 1925, en Santos Suárez.")).toBe(
      "Nació el veintiuno de octubre de mil novecientos veinticinco, en Santos Suárez.",
    );
    expect(numerosEnLetras("Vendió 250.000 discos en 1987.")).toBe(
      "Vendió doscientos cincuenta mil discos en mil novecientos ochenta y siete.",
    );
    expect(numerosEnLetras("Tenía 21 años y 1 hijo; 1 de cada 3 lo sabía.")).toBe(
      "Tenía veintiún años y un hijo; uno de cada tres lo sabía.",
    );
  });

  it("porcentajes, dólares, decimales, horas y rangos", () => {
    expect(numerosEnLetras("Subió 15% y costó $22.")).toBe(
      "Subió quince por ciento y costó veintidós dólares.",
    );
    expect(numerosEnLetras("Cuesta $1 al mes")).toBe("Cuesta un dólar al mes");
    expect(numerosEnLetras("Pesa 2.5 kilos")).toBe("Pesa dos punto cinco kilos");
    expect(numerosEnLetras("A las 3:30 de la tarde")).toBe("A las tres y treinta de la tarde");
    expect(numerosEnLetras("Vivió 1925-2003")).toBe("Vivió mil novecientos veinticinco a dos mil tres");
  });

  it("no toca lo que va pegado a letras", () => {
    expect(numerosEnLetras("Flash v2.5, un MP3 y H2O")).toBe("Flash v2.5, un MP3 y H2O");
  });

  it("empareja cada cifra del texto con las palabras que la voz dice por ella (C-VOZ-5)", () => {
    const texto = "Nació en 1925, vendió 250.000 discos y 1 de cada 3 lo sabía.";
    const originales = texto.split(" ");
    const voz = numerosEnLetras(texto).split(" ");
    const grupos = emparejarConLetras(originales, voz);
    expect(grupos).not.toBeNull();
    expect(grupos?.length).toBe(originales.length);
    expect(grupos?.[2]?.map((j) => voz[j]).join(" ")).toBe("mil novecientos veinticinco,");
    expect(grupos?.[4]?.map((j) => voz[j]).join(" ")).toBe("doscientos cincuenta mil");
    expect(grupos?.[7]?.map((j) => voz[j]).join(" ")).toBe("uno");
    expect(grupos?.[10]?.map((j) => voz[j]).join(" ")).toBe("tres");
    expect(grupos?.[11]).toEqual([voz.length - 2]);
    // Sin cifras: uno a uno. Si no cuadra (palabra cambiada sin ser cifra), null.
    expect(emparejarConLetras(["Hola", "mundo"], ["Hola", "mundo"])).toEqual([[0], [1]]);
    expect(emparejarConLetras(["Hola", "mundo"], ["Hola", "tierra"])).toBeNull();
  });
});
