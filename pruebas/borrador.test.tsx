// @vitest-environment jsdom
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AvisoBorrador } from "@/componentes/AvisoBorrador";
import { CampoClave } from "@/componentes/CampoClave";
import {
  claveBorrador,
  datosDelFormulario,
  guardarBorrador,
  leerBorrador,
  rellenarFormulario,
  useBorrador,
} from "@/componentes/useBorrador";

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

  it("no guarda ni devuelve los campos internos del framework ($ACTION_…)", () => {
    guardarBorrador("interno", { titulo: "Mi video", $ACTION_KEY: "k123", "$ACTION_1:0": "{}" });
    expect(leerBorrador("interno")).toEqual({ titulo: "Mi video" });

    const form = document.createElement("form");
    form.innerHTML = '<input name="titulo" /><input type="hidden" name="$ACTION_KEY" value="nuevo" />';
    rellenarFormulario(form, { titulo: "Recuperado", $ACTION_KEY: "viejo" });
    expect((form.elements.namedItem("titulo") as HTMLInputElement).value).toBe("Recuperado");
    expect((form.elements.namedItem("$ACTION_KEY") as HTMLInputElement).value).toBe("nuevo");
  });

  it("los campos ocultos no son borrador: ni se guardan ni se pisan al volver", () => {
    const form = document.createElement("form");
    form.innerHTML = '<input type="hidden" name="id" value="7" /><input name="enlace" value="escrito" />';
    expect(datosDelFormulario(form)).toEqual({ enlace: "escrito" });
    rellenarFormulario(form, { id: "99", enlace: "recuperado" });
    expect((form.elements.namedItem("id") as HTMLInputElement).value).toBe("7");
    expect((form.elements.namedItem("enlace") as HTMLInputElement).value).toBe("recuperado");
  });
});
