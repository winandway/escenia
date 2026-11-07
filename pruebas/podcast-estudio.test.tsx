// @vitest-environment jsdom
// El estudio y la ficha del Podcast IA (C-PODCAST-1): la leyenda está siempre en escena, sin la clave se
// dice «Falta conectar la voz del invitado», y la ficha no pierde lo escrito (regla de los formularios).
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));

import { Escenario } from "@/app/podcast/Escenario";
import { Estudio } from "@/app/podcast/Estudio";
import { caminoDeOnda } from "@/app/podcast/RobotInvitado";
import { FormularioFicha } from "@/app/podcast/fichas/FormularioFicha";
import { leerBorrador } from "@/componentes/useBorrador";
import { LEYENDA_PODCAST } from "@compartido/podcast";

const invitado = {
  nombre: "Alma (ejemplo)",
  etiqueta: "Invitada especial",
  tema: "Del pan a la panadería",
  ejemplo: false,
};

beforeEach(() => {
  window.localStorage.clear();
  vi.useFakeTimers({ shouldAdvanceTime: true });
});
afterEach(() => vi.useRealTimers());

describe("el escenario del estudio", () => {
  it("lleva siempre la leyenda, el título, las dos etiquetas y el tema de la ficha", () => {
    render(<Escenario invitado={invitado} estado="reposo" camara={false} />);
    expect(screen.getByText(LEYENDA_PODCAST)).toBeInTheDocument();
    expect(screen.getByText("Richard")).toBeInTheDocument();
    expect(screen.getByText("Host")).toBeInTheDocument();
    expect(screen.getByText("Alma (ejemplo)")).toBeInTheDocument();
    expect(screen.getByText("Invitada especial")).toBeInTheDocument();
    expect(screen.getByText("Del pan a la panadería")).toBeInTheDocument();
    expect(screen.getByText(/Historias reales/)).toBeInTheDocument();
    expect(screen.getByText("En espera")).toBeInTheDocument();
  });

  it("muestra el estado del invitado y marca la historia de ejemplo para que no se publique", () => {
    render(<Escenario invitado={{ ...invitado, ejemplo: true }} estado="hablando" camara={false} />);
    expect(screen.getByText("Hablando")).toBeInTheDocument();
    expect(screen.getByText(/Historia de ejemplo \(ficticia\)/)).toBeInTheDocument();
    expect(screen.getByText(LEYENDA_PODCAST)).toBeInTheDocument();
  });

  it("la boca del robot es una onda cerrada que crece con la voz", () => {
    const quieta = caminoDeOnda([0, 6, 6, 6, 0]);
    const fuerte = caminoDeOnda([0, 60, 70, 60, 0]);
    expect(quieta.startsWith("M")).toBe(true);
    expect(fuerte.endsWith("Z")).toBe(true);
    expect(fuerte).not.toBe(quieta);
  });
});

describe("el estudio sin la clave de ElevenLabs", () => {
  it("carga, muestra al invitado y la leyenda, y dice con claridad lo que falta", () => {
    render(
      <Estudio
        fichas={[{ ...invitado, id: 1, falta: null }]}
        conectado={false}
        minutosHoy={0}
        topeMinutos={60}
        errorConexion={null}
      />,
    );
    expect(screen.getByText(LEYENDA_PODCAST)).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /El invitado/ })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Falta conectar la voz del invitado.");
    expect(screen.getByRole("button", { name: "Empezar la conversación" })).toBeDisabled();
    expect(screen.getByRole("switch", { name: "Mi cámara" })).toHaveAttribute("aria-checked", "false");
  });

  it("una historia real sin permiso tampoco deja empezar, y dice por qué", () => {
    render(
      <Estudio
        fichas={[
          {
            ...invitado,
            id: 1,
            falta: "Falta confirmar en la ficha que tienes el permiso por escrito de su protagonista.",
          },
        ]}
        conectado
        minutosHoy={0}
        topeMinutos={60}
        errorConexion={null}
      />,
    );
    expect(screen.getByRole("status")).toHaveTextContent(/permiso por escrito/);
    expect(screen.getByRole("button", { name: "Empezar la conversación" })).toBeDisabled();
  });
});

describe("la ficha no pierde lo escrito", () => {
  it("guarda mientras se escribe, lo devuelve al volver y no ofrece la voz de Richard", async () => {
    const usuario = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const guardar = vi.fn();
    const { unmount } = render(<FormularioFicha ficha={null} guardar={guardar} />);
    expect(screen.queryByLabelText("Mi voz")).not.toBeInTheDocument();
    await usuario.type(screen.getByLabelText(/Nombre del invitado/), "Invitado nuevo");
    await usuario.type(
      screen.getByLabelText(/La historia, en primera persona/),
      "Una historia que todavía no termino",
    );
    await act(async () => {
      vi.advanceTimersByTime(600);
    });
    expect(leerBorrador("podcast-ficha-nueva")).toMatchObject({
      nombre: "Invitado nuevo",
      historia: "Una historia que todavía no termino",
    });
    unmount();

    render(<FormularioFicha ficha={null} guardar={guardar} />);
    expect(screen.getByLabelText(/Nombre del invitado/)).toHaveValue("Invitado nuevo");
    await act(async () => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.getByText("Recuperamos lo que estabas escribiendo.")).toBeInTheDocument();
  });

  it("si el panel no confirma, lo escrito sigue en pantalla y en el borrador; con la confirmación se borra", async () => {
    const usuario = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const guardar = vi
      .fn()
      .mockRejectedValueOnce(new Error("sin internet"))
      .mockResolvedValueOnce({ error: "", ok: "Ficha guardada.", id: 7 });
    const alGuardar = vi.fn();
    render(<FormularioFicha ficha={null} guardar={guardar} alGuardar={alGuardar} />);
    await usuario.type(screen.getByLabelText(/Nombre del invitado/), "Invitado nuevo");
    await usuario.type(
      screen.getByLabelText(/La historia, en primera persona/),
      "Una historia con más de cuarenta letras para poder guardarla.",
    );
    await act(async () => {
      vi.advanceTimersByTime(600);
    });
    await usuario.click(screen.getByRole("button", { name: "Guardar la ficha" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/Lo escrito sigue aquí/);
    expect(screen.getByLabelText(/Nombre del invitado/)).toHaveValue("Invitado nuevo");
    expect(leerBorrador("podcast-ficha-nueva")).not.toBeNull();

    await usuario.click(screen.getByRole("button", { name: "Guardar la ficha" }));
    // Esperar la confirmación en vez de dar 1 ms fijo: con toda la suite en paralelo la promesa tardaba más
    // y la prueba fallaba a veces en el pre-push (6 nov 2026).
    await vi.waitFor(() => expect(alGuardar).toHaveBeenCalledWith(7));
    expect(leerBorrador("podcast-ficha-nueva")).toBeNull();
  });
});
