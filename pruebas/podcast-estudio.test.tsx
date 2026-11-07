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
import { LEYENDAS, LEYENDA_ENTREVISTA_IA } from "@compartido/podcast";

const invitado = {
  nombre: "Alma (ejemplo)",
  etiqueta: "Invitada especial",
  tema: "Del pan a la panadería",
  ejemplo: false,
  origen: "real" as const,
};

beforeEach(() => {
  window.localStorage.clear();
  vi.useFakeTimers({ shouldAdvanceTime: true });
});
afterEach(() => vi.useRealTimers());

describe("el escenario del estudio", () => {
  it("lleva siempre la leyenda, el título, las dos etiquetas y el tema de la ficha", () => {
    render(<Escenario invitado={invitado} estado="reposo" camara={false} />);
    expect(screen.getByText(LEYENDAS.real)).toBeInTheDocument();
    expect(screen.getByText("Richard")).toBeInTheDocument();
    expect(screen.getByText("Host")).toBeInTheDocument();
    expect(screen.getByText("Alma (ejemplo)")).toBeInTheDocument();
    expect(screen.getByText("Invitada especial")).toBeInTheDocument();
    expect(screen.getByText("Del pan a la panadería")).toBeInTheDocument();
    // Las historias son de ficción (Richard, 7 nov 2026): la cinta no puede prometer «historias reales».
    expect(screen.getByText(/Historias que inspiran/)).toBeInTheDocument();
    expect(screen.queryByText(/Historias reales/)).toBeNull();
    expect(screen.getByText("En espera")).toBeInTheDocument();
  });

  it("muestra el estado del invitado y marca la historia de ejemplo para que no se publique", () => {
    render(
      <Escenario
        invitado={{ ...invitado, ejemplo: true, origen: "ficcion" }}
        estado="hablando"
        camara={false}
      />,
    );
    expect(screen.getByText("Hablando")).toBeInTheDocument();
    expect(screen.getByText(/Historia de ejemplo \(ficticia\)/)).toBeInTheDocument();
    expect(screen.getByText(LEYENDAS.ficcion)).toBeInTheDocument();
  });

  it("una ficha de ficción jamás muestra «historia real», y sin ser de ejemplo no lleva el letrero amarillo", () => {
    render(
      <Escenario
        invitado={{ ...invitado, nombre: "Lucía", origen: "ficcion", ejemplo: false }}
        estado="reposo"
        camara={false}
      />,
    );
    const escenario = screen.getByTestId("escenario");
    expect(screen.getByText(LEYENDAS.ficcion)).toBeInTheDocument();
    expect(escenario).not.toHaveTextContent(/historia real/i);
    expect(escenario).not.toHaveTextContent(/no publicar/);
  });

  it("una entrevista a la IA lleva la leyenda de IA, sin hablar de historias", () => {
    render(
      <Escenario
        invitado={{ ...invitado, nombre: "Luna IA", tipo: "entrevista_ia", origen: "real", tema: "" }}
        estado="escuchando"
        camara={false}
      />,
    );
    const escenario = screen.getByTestId("escenario");
    expect(screen.getByText(LEYENDA_ENTREVISTA_IA)).toBeInTheDocument();
    expect(escenario).not.toHaveTextContent(/historia real/i);
    expect(escenario).not.toHaveTextContent(/ficción/i);
  });

  it("dibuja al invitado de la ficha: la robot de coleta o el robot clásico, cada uno con su imagen", () => {
    const { container, rerender } = render(
      <Escenario invitado={{ ...invitado, avatar: "coleta" }} estado="hablando" camara={false} />,
    );
    const robot = () => screen.getByRole("img", { name: /El invitado/ });
    expect(robot()).toHaveAttribute("data-avatar", "coleta");
    expect(container.querySelector("image")).toHaveAttribute("href", "/podcast/robot-coleta.webp");
    // La coleta lleva pestañas (dos por ojo) y su visor recorta la luz de la cara.
    expect(container.querySelectorAll("[data-pestana]")).toHaveLength(4);
    expect(container.querySelector("clipPath")).not.toBeNull();
    rerender(<Escenario invitado={{ ...invitado, avatar: "robot" }} estado="pensando" camara={false} />);
    expect(robot()).toHaveAttribute("data-avatar", "robot");
    expect(container.querySelector("image")).toHaveAttribute("href", "/podcast/robot.webp");
    expect(container.querySelectorAll("[data-pestana]")).toHaveLength(0);
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
    expect(screen.getByText(LEYENDAS.real)).toBeInTheDocument();
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

describe("el avatar de la ficha", () => {
  it("una ficha nueva empieza con la robot de coleta y de ficción, y lo elegido se guarda en el borrador", async () => {
    const usuario = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const guardar = vi.fn();
    const { unmount } = render(<FormularioFicha ficha={null} guardar={guardar} />);
    expect(screen.getByRole("radio", { name: /Robot de coleta/ })).toBeChecked();
    expect(screen.getByRole("radio", { name: /De ficción/ })).toBeChecked();
    await usuario.click(screen.getByRole("radio", { name: /Real, con permiso/ }));
    // Cada opción lleva su miniatura.
    expect(screen.getByRole("img", { name: /Robot clásico/ })).toHaveAttribute("src", "/podcast/robot.webp");
    await usuario.click(screen.getByRole("radio", { name: /Robot clásico/ }));
    await act(async () => {
      vi.advanceTimersByTime(600);
    });
    expect(leerBorrador("podcast-ficha-nueva")).toMatchObject({ avatar: "robot", origen: "real" });
    unmount();

    render(<FormularioFicha ficha={null} guardar={guardar} />);
    expect(screen.getByRole("radio", { name: /Robot clásico/ })).toBeChecked();
    expect(screen.getByRole("radio", { name: /Real, con permiso/ })).toBeChecked();
    expect(screen.getByRole("radio", { name: /Robot de coleta/ })).not.toBeChecked();
  });

  it("una ficha que ya existe muestra el avatar que tiene", () => {
    const ficha = {
      id: 3,
      nombre: "Vieja",
      etiqueta: "Invitado especial",
      tema: "",
      personalidad: "",
      voz: "neutra" as const,
      avatar: "robot" as const,
      origen: "real" as const,
      tipo: "historia" as const,
      historia: "Una historia que ya estaba guardada.",
      primer_mensaje: "",
      ejemplo: false,
      permiso: true,
    };
    render(<FormularioFicha ficha={ficha} guardar={vi.fn()} />);
    expect(screen.getByRole("radio", { name: /Robot clásico/ })).toBeChecked();
    expect(screen.getByRole("radio", { name: /Real, con permiso/ })).toBeChecked();
  });
});

describe("el tipo de ficha", () => {
  it("una ficha nueva es una historia; la entrevista a la IA se elige, se guarda en el borrador y vuelve", async () => {
    const usuario = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const { unmount } = render(<FormularioFicha ficha={null} guardar={vi.fn()} />);
    expect(screen.getByRole("radio", { name: /Una historia/ })).toBeChecked();
    await usuario.click(screen.getByRole("radio", { name: /Entrevista a la IA/ }));
    await usuario.type(screen.getByLabelText(/Nombre del invitado/), "Luna IA");
    await act(async () => {
      vi.advanceTimersByTime(600);
    });
    expect(leerBorrador("podcast-ficha-nueva")).toMatchObject({ tipo: "entrevista_ia", nombre: "Luna IA" });
    unmount();
    render(<FormularioFicha ficha={null} guardar={vi.fn()} />);
    expect(screen.getByRole("radio", { name: /Entrevista a la IA/ })).toBeChecked();
    // La historia no es obligatoria en el navegador (se esconde en una entrevista): la exige el panel si toca.
    expect(screen.getByLabelText(/La historia, en primera persona/)).not.toBeRequired();
  });

  it("una historia sin texto suficiente avisa antes de mandar, y no borra lo escrito", async () => {
    const usuario = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const guardar = vi.fn();
    render(<FormularioFicha ficha={null} guardar={guardar} />);
    await usuario.type(screen.getByLabelText(/Nombre del invitado/), "Alguien");
    await usuario.click(screen.getByRole("button", { name: "Guardar la ficha" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/Escribe la historia/);
    expect(guardar).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/Nombre del invitado/)).toHaveValue("Alguien");
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

    // El botón dice «Guardando…» hasta que termina el primer intento: se espera a que vuelva (en GitHub tardaba).
    await usuario.click(await screen.findByRole("button", { name: "Guardar la ficha" }));
    // Esperar la confirmación en vez de dar 1 ms fijo: con toda la suite en paralelo la promesa tardaba más
    // y la prueba fallaba a veces en el pre-push (6 nov 2026).
    await vi.waitFor(() => expect(alGuardar).toHaveBeenCalledWith(7));
    expect(leerBorrador("podcast-ficha-nueva")).toBeNull();
  });
});
