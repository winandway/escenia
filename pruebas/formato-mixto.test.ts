import { beforeEach, describe, expect, it } from "vitest";
import { baseEnMemoria } from "./base-memoria";
import { esquemaGrabacionNueva } from "@compartido/grabaciones";
import { dejarSoloFiguras, repartirFiguras, type FiguraDePlano } from "@compartido/ilustrado";
import {
  dibujaPersonas,
  esDeNeon,
  ESTILOS_VIDEO,
  NOMBRE_FORMATO,
  type EstiloVideo,
} from "@compartido/tematicas";
import {
  claveDeGrabacion,
  crearGrabacion,
  grabacionPorId,
  marcarSubida,
  otraVersion,
} from "@/lib/grabaciones";
import { mensajeDePlan, planSinInventos } from "@/lib/plan-grabacion";
import { esquemaGuionGenerado } from "@compartido/guion";
import { esquemaPropsVideo } from "../estacion/src/remotion/props";

type PlanoDePrueba = {
  tipo: "foto" | "dato" | "clip";
  foto: { ruta: string } | null;
  texto: string;
  figura: FiguraDePlano | null;
  sigue: boolean;
};
const plano = (tipo: PlanoDePrueba["tipo"], ruta: string | null, texto = ""): PlanoDePrueba => ({
  tipo,
  foto: ruta ? { ruta } : null,
  texto,
  figura: null,
  sigue: false,
});

describe("formato «Neón con personajes»: diagramas de neón y las personas dibujadas (C-FORMATO-MIXTO-1)", () => {
  let db: ReturnType<typeof baseEnMemoria>;
  beforeEach(() => {
    db = baseEnMemoria();
  });

  it("es el cuarto formato, con su nombre, y cada formato dice si es de neón y si dibuja personas", () => {
    expect([...ESTILOS_VIDEO]).toEqual(["clasico", "ilustrado", "neon", "mixto"]);
    expect(NOMBRE_FORMATO.mixto).toBe("Neón con personajes");
    for (const f of ESTILOS_VIDEO) expect(NOMBRE_FORMATO[f].length).toBeGreaterThan(3);
    const tabla = Object.fromEntries(ESTILOS_VIDEO.map((f) => [f, [esDeNeon(f), dibujaPersonas(f)]]));
    expect(tabla).toEqual({
      clasico: [false, false],
      ilustrado: [false, true],
      neon: [true, false],
      mixto: [true, true],
    });
  });

  it("se puede elegir al subir una grabación y la base lo guarda (el formato se valida en el código)", async () => {
    const nueva = {
      tema: "Una prueba del formato mezclado",
      formato: "mixto",
      canal: "canal-ia",
      archivo: "video.mp4",
      bytes: 5_000_000,
    };
    const d = esquemaGrabacionNueva.parse(nueva);
    // Un formato que no existe no pasa del formulario: la tabla ya no lo frena, lo frena el código.
    expect(esquemaGrabacionNueva.safeParse({ ...nueva, formato: "pizarra" }).success).toBe(false);
    const id = await crearGrabacion(db, d, claveDeGrabacion(d.archivo));
    await marcarSubida(db, id, d.bytes);
    expect((await grabacionPorId(db, id))?.formato).toBe("mixto");
    // Y una grabación de Neón se puede volver a armar con personajes, sin subirla otra vez.
    const otra = await otraVersion(db, id, "neon");
    const deVuelta = await otraVersion(db, otra!, "mixto");
    expect((await grabacionPorId(db, deVuelta!))?.formato).toBe("mixto");
  });

  it("al armar el plan se le explica a la IA cuándo va la persona dibujada y cuándo el diagrama", () => {
    const m = mensajeDePlan({ transcripcion: "Sam Altman frenó el modelo.", formato: "mixto", titulo: "" });
    expect(m).toContain("FORMATO: Neón con personajes.");
    expect(m).toContain("NOMBRA A UNA PERSONA");
    expect(m).toContain("DIBUJADA");
    expect(m).toContain("«diagrama»");
    // Una empresa no es una persona: no se manda a dibujar «OpenAI».
    expect(m).toContain("NO es una persona");
    // En las escenas de personas no entran clips de video real.
    expect(m).toMatch(/NO uses planos «stock»/);
    // Cada formato tiene sus reglas (si se agrega uno y se olvida, esta prueba no compila ni pasa).
    for (const formato of ESTILOS_VIDEO)
      expect(mensajeDePlan({ transcripcion: "hola", formato, titulo: "" })).toContain(
        `FORMATO: ${NOMBRE_FORMATO[formato]}.`,
      );
  });

  it("en una escena de personas solo queda lo dibujado: ni fotos reales ni datos sueltos sobre el neón", () => {
    const altman: FiguraDePlano = { ruta: "ia/altman.png", ancho: 600, alto: 900 };
    const escenas = [
      {
        planos: [
          plano("dato", null, "Un día antes"), // todavía no salió nadie: quedaría a pantalla llena
          plano("foto", "fotos/sin-dibujo.jpg", "Otra persona"), // no se pudo dibujar
          plano("foto", "fotos/altman.jpg", "Sam Altman"),
          plano("dato", null, "Lo frenó"),
        ],
      },
      { planos: [plano("foto", "fotos/sin-dibujo.jpg", "Otra persona")] },
    ];
    repartirFiguras(escenas, new Map([["fotos/altman.jpg", altman]]));
    const quitados = dejarSoloFiguras(escenas);
    expect(quitados).toBe(3);
    expect(escenas[0]?.planos.map((p) => p.texto)).toEqual(["Sam Altman", "Lo frenó"]);
    expect(escenas[0]?.planos.every((p) => p.figura === altman)).toBe(true);
    // El primero que queda es el que hace entrar la figura.
    expect(escenas[0]?.planos.map((p) => p.sigue)).toEqual([false, true]);
    // Una escena que se queda sin planos no se rompe: va la lámina de neón.
    expect(escenas[1]?.planos).toEqual([]);
  });

  it("si la figura la traía un plano que se quitó, el dato que queda la hace entrar", () => {
    const altman: FiguraDePlano = { ruta: "ia/altman.png", ancho: 600, alto: 900 };
    const escenas = [{ planos: [plano("dato", null, "Lo frenó")] }];
    // El dato hereda la figura de la escena anterior y venía marcado como «sigue».
    escenas[0]!.planos[0]!.figura = altman;
    escenas[0]!.planos[0]!.sigue = true;
    expect(dejarSoloFiguras(escenas)).toBe(0);
    expect(escenas[0]?.planos[0]?.sigue).toBe(false);
  });

  it("ningún texto en pantalla sale con un relleno entre corchetes de la IA", () => {
    // Caso real del 5 oct 2026, primera prueba en vivo: debajo del titular salió «[opinión del editor]».
    const plan = esquemaGuionGenerado.parse({
      titulo: "Frenar a tiempo vale más",
      gancho: "Sam Altman frenó el modelo.",
      escenas: [
        {
          parte: "gancho",
          narracion: "Sam Altman frenó el modelo un día antes del evento.",
          visual: {
            tipo: "stock",
            titular: "El freno",
            planos: [
              { frase: "Sam Altman frenó", tipo: "foto", busqueda: "Sam Altman", texto: "Sam Altman" },
              { frase: "un día antes", tipo: "dato", texto: "Un día antes [dato]" },
            ],
          },
        },
        {
          parte: "contexto",
          narracion: "El evento se hizo igual, con más de veinte lanzamientos.",
          visual: { tipo: "texto", titular: "El evento" },
        },
        {
          parte: "cierre",
          narracion: "Para mí, frenar a tiempo vale más que lanzar primero.",
          visual: {
            tipo: "diagrama",
            titular: "[opinión del editor]",
            cuerpo: "[opinión del editor]",
            diagrama: {
              seccion: "Decisión",
              nodos: [
                { id: "a", icono: "listo", etiqueta: "Frenar", nota: "[a tiempo]", frase: "frenar a tiempo" },
              ],
              flechas: [],
              formula: "frenar [opinión del editor]",
            },
          },
        },
      ],
    });
    const limpio = planSinInventos(plan);
    expect(JSON.stringify(limpio)).not.toContain("opinión del editor");
    // Ningún texto entre corchetes en lo que se ve («[dato]», «[a tiempo]»).
    expect(JSON.stringify(limpio.escenas.map((e) => e.visual))).not.toMatch(/\[[a-záéíóúñ ]+\]/i);
    const cierre = limpio.escenas[2]?.visual;
    // El diagrama no se queda sin título: toma el de su sección.
    expect(cierre?.titular).toBe("Decisión");
    expect(cierre?.cuerpo).toBe("");
    expect(cierre?.diagrama?.formula).toBe("frenar");
    expect(limpio.escenas[0]?.visual.planos?.[1]?.texto).toBe("Un día antes");
    // Y a la IA se le dice antes, para que no lo escriba.
    expect(mensajeDePlan({ transcripcion: "hola", formato: "mixto", titulo: "" })).toContain(
      "NO escribas «[opinión del editor]»",
    );
  });

  it("la plantilla del video conoce los mismos formatos que el panel", () => {
    const formatos = (esquemaPropsVideo.shape.estilo.unwrap() as { options: EstiloVideo[] }).options;
    expect([...formatos].sort()).toEqual([...ESTILOS_VIDEO].sort());
  });
});
