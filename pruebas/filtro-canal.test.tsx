// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ChipCanal } from "@/componentes/ChipCanal";
import { FiltroCanal } from "@/componentes/FiltroCanal";

describe("separador de canales", () => {
  it("ofrece todos los canales y marca el elegido", () => {
    render(
      <FiltroCanal
        elegido="canal-ia"
        enlace={(c) => (c ? `/?canal=${c}` : "/")}
        cuenta={(c) => (c === "canal-ia" ? 2 : c ? 5 : 7)}
      />,
    );
    const todos = screen.getByRole("link", { name: /Todos los canales/ });
    const codigo = screen.getByRole("link", { name: /Full Código/ });
    const caprichoso = screen.getByRole("link", { name: /Caprichoso TV/ });
    expect(todos.getAttribute("href")).toBe("/");
    expect(codigo.getAttribute("href")).toBe("/?canal=canal-ia");
    expect(caprichoso.getAttribute("href")).toBe("/?canal=caprichoso-tv");
    expect(codigo.getAttribute("aria-current")).toBe("true");
    expect(todos.getAttribute("aria-current")).toBeNull();
    expect(codigo.textContent).toContain("2");
    expect(todos.textContent).toContain("7");
  });

  it("cada video lleva el nombre de su canal", () => {
    render(
      <>
        <ChipCanal canal="canal-ia" />
        <ChipCanal canal="caprichoso-tv" />
      </>,
    );
    expect(screen.getByText("Full Código")).toBeTruthy();
    expect(screen.getByText("Caprichoso TV")).toBeTruthy();
  });
});
