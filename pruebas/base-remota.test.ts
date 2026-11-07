import { describe, expect, it } from "vitest";
import { sqlConRetorno } from "../scripts/sql-retorno";

describe("la base en vivo desde la Mac (scripts/base-remota)", () => {
  it("pide de vuelta el rowid, que existe en toda tabla, y no una columna id que algunas no tienen", () => {
    expect(
      sqlConRetorno(
        "INSERT INTO ajustes (clave, valor) VALUES (?, ?) ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor",
      ),
    ).toMatch(/RETURNING rowid AS id$/);
    expect(sqlConRetorno("INSERT INTO guiones (tema) VALUES (?);")).toBe(
      "INSERT INTO guiones (tema) VALUES (?) RETURNING rowid AS id",
    );
  });

  it("no toca las consultas que no insertan ni las que ya piden algo de vuelta", () => {
    expect(sqlConRetorno("SELECT id FROM guiones")).toBe("SELECT id FROM guiones");
    expect(sqlConRetorno("INSERT INTO x (a) VALUES (1) RETURNING a")).toBe(
      "INSERT INTO x (a) VALUES (1) RETURNING a",
    );
  });
});
