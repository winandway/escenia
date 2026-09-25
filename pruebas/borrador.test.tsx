// @vitest-environment jsdom
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AvisoBorrador } from "@/componentes/AvisoBorrador";
import { CampoClave } from "@/componentes/CampoClave";
import { claveBorrador, guardarBorrador, leerBorrador, useBorrador } from "@/componentes/useBorrador";

function Formulario() {
  const { ref, recuperado, empezarDeNuevo, descartar } = useBorrador("prueba");
  return (
    <form ref={ref} onSubmit={(e) => (e.preventDefault(), descartar())}>
      <AvisoBorrador visible={recuperado} alEmpezarDeNuevo={empezarDeNuevo} />
      <input name="titulo" aria-label="Título" />
      <input name="clave" type="password" aria-label="Clave" />
      <button type="submit">Enviar</button>
    </form>
  );
}

beforeEach(() => {
  window.localStorage.clear();
  vi.useFakeTimers({ shouldAdvanceTime: true });
});
afterEach(() => vi.useRealTimers());

describe("useBorrador (ningún formulario pierde lo escrito)", () => {
  it("guarda mientras se escribe y lo devuelve al volver", async () => {
    const usuario = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const { unmount } = render(<Formulario />);
    await usuario.type(screen.getByLabelText("Título"), "Mi video");
    await act(async () => {
      vi.advanceTimersByTime(600);
    });
    expect(leerBorrador("prueba")).toEqual({ titulo: "Mi video" });
    unmount();

    render(<Formulario />);
    expect(screen.getByLabelText("Título")).toHaveValue("Mi video");
    await act(async () => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.getByText("Recuperamos lo que estabas escribiendo.")).toBeInTheDocument();
  });

  it("nunca guarda contraseñas", () => {
    guardarBorrador("prueba", { titulo: "a", clave: "secreta", password: "x" });
    expect(leerBorrador("prueba")).toEqual({ titulo: "a" });
  });

  it("se borra al enviar y al empezar de nuevo", async () => {
    const usuario = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    guardarBorrador("prueba", { titulo: "viejo" });
    render(<Formulario />);
    await act(async () => {
      vi.advanceTimersByTime(1);
    });
    await usuario.click(screen.getByText("Empezar de nuevo"));
    expect(window.localStorage.getItem(claveBorrador("prueba"))).toBeNull();
    expect(screen.getByLabelText("Título")).toHaveValue("");

    await usuario.type(screen.getByLabelText("Título"), "nuevo");
    await act(async () => {
      vi.advanceTimersByTime(600);
    });
    expect(leerBorrador("prueba")).toEqual({ titulo: "nuevo" });
    await usuario.click(screen.getByText("Enviar"));
    expect(leerBorrador("prueba")).toBeNull();
  });
});

describe("CampoClave", () => {
  it("arranca oculto y el ojito lo muestra", async () => {
    const usuario = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<CampoClave name="clave" />);
    const campo = document.querySelector("input[name=clave]") as HTMLInputElement;
    expect(campo.type).toBe("password");
    await usuario.click(screen.getByLabelText("Ver la contraseña"));
    expect(campo.type).toBe("text");
    expect(screen.getByLabelText("Ocultar la contraseña")).toBeInTheDocument();
  });
});
