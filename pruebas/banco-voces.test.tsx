// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BancoDeVoces, muestraDeVoz } from "@/componentes/BancoDeVoces";

// Un reproductor de mentira: anota qué se tocó y si está en pausa.
class AudioFalso {
  static tocados: AudioFalso[] = [];
  src: string;
  pausado = true;
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(src: string) {
    this.src = src;
    AudioFalso.tocados.push(this);
  }
  play() {
    this.pausado = false;
    return Promise.resolve();
  }
  pause() {
    this.pausado = true;
  }
}

beforeEach(() => {
  AudioFalso.tocados = [];
  vi.stubGlobal("Audio", AudioFalso);
});
afterEach(() => vi.unstubAllGlobals());

describe("BancoDeVoces (oír cada voz antes de elegirla)", () => {
  it("muestra las tres voces con la elegida por defecto marcada", () => {
    render(
      <form>
        <BancoDeVoces porDefecto="venezolana" />
      </form>,
    );
    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(3);
    expect(radios.find((r) => (r as HTMLInputElement).checked)).toHaveAttribute("value", "venezolana");
  });

  it("play toca la muestra de esa voz; otra voz pausa la anterior; el mismo botón pausa", async () => {
    const usuario = userEvent.setup();
    render(
      <form>
        <BancoDeVoces porDefecto="richard" />
      </form>,
    );
    await usuario.click(screen.getByRole("button", { name: /Oír la muestra: Voz venezolana/ }));
    expect(AudioFalso.tocados[0]?.src).toBe(muestraDeVoz("venezolana"));
    expect(AudioFalso.tocados[0]?.pausado).toBe(false);
    // Tocar play no elige la voz: la elegida sigue siendo la de antes.
    expect(screen.getByDisplayValue("richard")).toBeChecked();

    await usuario.click(screen.getByRole("button", { name: /Oír la muestra: Voz femenina/ }));
    expect(AudioFalso.tocados[0]?.pausado).toBe(true);
    expect(AudioFalso.tocados[1]?.src).toBe(muestraDeVoz("femenina"));

    await usuario.click(screen.getByRole("button", { name: /Pausar la muestra/ }));
    expect(AudioFalso.tocados[1]?.pausado).toBe(true);
  });

  it("si una voz no tiene muestra todavía, lo dice en su tarjeta", async () => {
    const usuario = userEvent.setup();
    render(
      <form>
        <BancoDeVoces porDefecto="richard" />
      </form>,
    );
    await usuario.click(screen.getByRole("button", { name: /Oír la muestra: Voz venezolana/ }));
    AudioFalso.tocados[0]?.onerror?.();
    expect(await screen.findByText("Todavía no tiene muestra para oír.")).toBeInTheDocument();
  });
});
