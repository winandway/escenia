// @vitest-environment jsdom
// El estudio y la ficha del Podcast IA (C-PODCAST-1): la leyenda está siempre en escena, sin la clave se
// dice «Falta conectar la voz del invitado», y la ficha no pierde lo escrito (regla de los formularios).
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));

import { Escenario } from "@/app/podcast/Escenario";
import { Estudio, PISTA_GRABAR } from "@/app/podcast/Estudio";
import { RobotInvitado, caminoDeOnda } from "@/app/podcast/RobotInvitado";
import { AVATARES, avatarPorId, type AvatarPodcast } from "@compartido/podcast-avatares";
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
    // La marca del canal va siempre en la grabación.
    expect(screen.getByLabelText("Un podcast de Full Código")).toBeInTheDocument();
    expect(screen.getByText("@FullCodigo")).toBeInTheDocument();
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

  it("dibuja a Mia con sus siete poses, cada una con su cara; empieza tranquila y riéndose no tiene boca", () => {
    const { container } = render(
      <Escenario invitado={{ ...invitado, avatar: "mia" }} estado="escuchando" camara={false} />,
    );
    const mia = screen.getByRole("img", { name: /El invitado/ });
    expect(mia).toHaveAttribute("data-avatar", "mia");
    expect(mia).toHaveAttribute("data-pose", "tranquila");
    const poses = [...container.querySelectorAll<SVGGElement>("g[data-pose]")];
    expect(poses.map((g) => g.getAttribute("data-pose"))).toEqual([
      "tranquila",
      "hablando",
      "pensando",
      "notas",
      "riendo",
      "aplaudiendo",
      "idea",
    ]);
    // Solo se ve una pose a la vez: la primera.
    expect(poses.map((g) => g.style.visibility)).toEqual(["visible", ...Array(6).fill("hidden")]);
    for (const g of poses) {
      expect(g.querySelector("image")?.getAttribute("href")).toMatch(/^\/podcast\/mia-.+\.webp$/);
      // Los ojos son los de la imagen, recortados, y las luces de los oídos laten encima.
      expect(g.querySelectorAll("[data-recorte]")).toHaveLength(2);
      expect(g.querySelectorAll("[data-luz]")).toHaveLength(2);
      expect(g.querySelector("[data-boca]") === null).toBe(g.getAttribute("data-pose") === "riendo");
    }
  });

  it("dibuja a la robot plateada con su cara viva: ojos con ceja y pestañas y la media luna de boca", () => {
    const { container } = render(
      <Escenario invitado={{ ...invitado, avatar: "plateada" }} estado="hablando" camara={false} />,
    );
    const robot = screen.getByRole("img", { name: /El invitado/ });
    expect(robot).toHaveAttribute("data-avatar", "plateada");
    expect(robot).toHaveAttribute("data-cara", "visor");
    expect(container.querySelector("image")).toHaveAttribute("href", "/podcast/robot-plateada.webp");
    expect(container.querySelectorAll("[data-pestana]")).toHaveLength(4);
    // La boca es una media luna de luz llena (sin lengua) y sus dos aros laten.
    expect(container.querySelector("[data-boca]")).toHaveAttribute("data-boca", "media_luna");
    expect(container.querySelector("[data-boca]")).toHaveAttribute("fill", "#f4fbff");
    expect(container.querySelectorAll("[data-luz]")).toHaveLength(2);
    expect(container.querySelector("clipPath")).not.toBeNull();
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

describe("una persona en el estudio (modo sin visor)", () => {
  // Una presentadora de prueba con la imagen de un robot: lo que importa es lo que el estudio le dibuja.
  const presentadora: AvatarPodcast = {
    id: "robot",
    nombre: "Presentadora de prueba",
    descripcion: "Audífonos de luz roja. La boca no se mueve.",
    imagen: "/podcast/robot.webp",
    ancho: 1312,
    alto: 1199,
    encuadre: { tipo: "camara_web", centroX: 656, coronilla: 40, pecho: 900 },
    pivote: [656, 1000],
    miniatura: { x: 300, y: 30, lado: 860 },
    cara: {
      modo: "sin_visor",
      luz: "#ff3344",
      desenfoque: 8,
      oidos: [
        { d: "M100 200 L140 260", grosor: 6 },
        { d: "M900 200 L940 260", grosor: 6 },
      ],
      resplandor: { cx: 656, cy: 400, rx: 400, ry: 500, giro: 0 },
    },
  };

  it("no lleva boca ni ojos dibujados: laten las luces de sus audífonos, en su color, y la acompaña un resplandor", () => {
    const { container } = render(<RobotInvitado estado="hablando" avatar={presentadora} />);
    const svg = screen.getByRole("img", { name: /El invitado/ });
    expect(svg).toHaveAttribute("data-cara", "sin_visor");
    expect(container.querySelector("[data-boca]")).toBeNull();
    expect(container.querySelectorAll("[data-pestana]")).toHaveLength(0);
    expect(container.querySelector("clipPath")).toBeNull();
    const luces = container.querySelectorAll("[data-luz]");
    expect(luces).toHaveLength(2);
    for (const l of luces) expect(l).toHaveAttribute("stroke", "#ff3344");
    // El resplandor va detrás de la imagen, de su color, y arranca apagado (lo enciende la voz).
    const resplandor = container.querySelector("[data-resplandor]");
    expect(resplandor).not.toBeNull();
    expect(resplandor!.compareDocumentPosition(container.querySelector("image")!)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(resplandor).toHaveAttribute("opacity", "0");
    expect(container.querySelector("stop")).toHaveAttribute("stop-color", "#ff3344");
    // El brillo de la silueta es de su color, no el cian de las robots.
    expect(svg.getAttribute("style")).toContain("#ff3344");
  });

  it("se encuadra como una cámara web y las robots no cambian", () => {
    render(<RobotInvitado estado="escuchando" avatar={presentadora} />);
    const [x, y, ancho, alto] = screen
      .getByRole("img", { name: /El invitado/ })
      .getAttribute("viewBox")!
      .split(" ")
      .map(Number);
    expect(y! + alto!).toBeCloseTo(900, 0);
    expect(x! + ancho! / 2).toBeCloseTo(656, 0);
    for (const a of AVATARES) {
      const { unmount, container } = render(<RobotInvitado estado="escuchando" avatar={avatarPorId(a.id)} />);
      expect(container.querySelector("svg")).toHaveAttribute("data-cara", "visor");
      expect(container.querySelector("[data-boca]")).not.toBeNull();
      unmount();
    }
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

  it("dice al lado del botón que el estudio no graba: se graba con el grabador de pantalla", () => {
    render(
      <Estudio
        fichas={[{ ...invitado, id: 1, falta: null }]}
        conectado
        minutosHoy={0}
        topeMinutos={60}
        errorConexion={null}
      />,
    );
    expect(PISTA_GRABAR).toBe("Para grabar, usa tu grabador de pantalla (Pantalay)");
    const controles = screen.getByRole("toolbar", { name: "Controles del estudio" });
    expect(controles).toHaveTextContent(PISTA_GRABAR);
    // Ningún botón del estudio promete grabar.
    expect(screen.queryByRole("button", { name: /grabar/i })).toBeNull();
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
  it("el selector muestra todo el catálogo en orden, cada uno con su miniatura", () => {
    render(<FormularioFicha ficha={null} guardar={vi.fn()} />);
    const opciones = screen.getAllByRole("radio").filter((r) => r.getAttribute("name") === "avatar");
    expect(opciones.map((r) => r.getAttribute("value"))).toEqual(AVATARES.map((a) => a.id));
    expect(opciones.map((r) => r.getAttribute("aria-label"))).toEqual([
      "Mia IA",
      "Robot plateada",
      "Robot de coleta",
      "Robot clásico",
    ]);
    for (const a of AVATARES)
      expect(screen.getByRole("img", { name: a.nombre })).toHaveAttribute("src", a.imagen);
  });

  it("una ficha nueva empieza con Mia y de ficción, y lo elegido se guarda en el borrador", async () => {
    const usuario = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const guardar = vi.fn();
    const { unmount } = render(<FormularioFicha ficha={null} guardar={guardar} />);
    expect(screen.getByRole("radio", { name: /Mia IA/ })).toBeChecked();
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
    expect(screen.getByRole("radio", { name: /Mia IA/ })).not.toBeChecked();
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
