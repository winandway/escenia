import { describe, expect, it } from "vitest";
import { enteroEnLetras, numerosEnLetras } from "@compartido/numeros";

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
});
