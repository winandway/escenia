// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it } from "vitest";
import { PrimeraConfiguracion } from "@/app/entrar/PrimeraConfiguracion";
import { claveCorrecta } from "@/lib/clave";
import { webcrypto } from "node:crypto";

beforeAll(() => {
  // jsdom no trae Web Crypto; la de Node es la misma API que usa el navegador.
  if (!globalThis.crypto?.subtle) {
    Object.defineProperty(globalThis, "crypto", { value: webcrypto });
  }
});

describe("primera configuración (sin contraseña en el panel)", () => {
  it("dice qué variables faltan y genera una huella que el panel reconoce", async () => {
    const usuario = userEvent.setup();
    render(<PrimeraConfiguracion faltan={["PANEL_CLAVE_HUELLA", "ESTACION_SECRETO"]} />);
    expect(screen.getByText(/PANEL_CLAVE_HUELLA, ESTACION_SECRETO/)).toBeInTheDocument();

    await usuario.type(screen.getByLabelText(/Contraseña nueva/), "una-clave-larga-de-prueba");
    await usuario.type(screen.getByLabelText(/otra vez/), "una-clave-larga-de-prueba");
    await usuario.click(screen.getByRole("button", { name: /Generar/ }));

    const salida = (await screen.findByLabelText(/Pega esto/)) as HTMLTextAreaElement;
    await waitFor(() => expect(salida.value).toMatch(/^pbkdf2\$100000\$/));
    expect(await claveCorrecta("una-clave-larga-de-prueba", salida.value)).toBe(true);
    expect(await claveCorrecta("otra", salida.value)).toBe(false);
  });

  it("rechaza contraseñas cortas o que no coinciden", async () => {
    const usuario = userEvent.setup();
    render(<PrimeraConfiguracion faltan={["PANEL_CLAVE_HUELLA"]} />);
    await usuario.type(screen.getByLabelText(/Contraseña nueva/), "corta");
    await usuario.type(screen.getByLabelText(/otra vez/), "corta");
    await usuario.click(screen.getByRole("button", { name: /Generar/ }));
    expect(screen.getByRole("alert")).toHaveTextContent(/al menos 12/);

    await usuario.clear(screen.getByLabelText(/Contraseña nueva/));
    await usuario.type(screen.getByLabelText(/Contraseña nueva/), "una-clave-larga-de-prueba");
    await usuario.click(screen.getByRole("button", { name: /Generar/ }));
    expect(screen.getByRole("alert")).toHaveTextContent(/no coinciden/);
  });

  it("si solo falta otra variable, no muestra el generador", () => {
    render(<PrimeraConfiguracion faltan={["ESTACION_SECRETO"]} />);
    expect(screen.queryByLabelText(/Contraseña nueva/)).toBeNull();
  });
});
