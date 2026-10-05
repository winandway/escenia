// Los dos diseños nuevos (docs/ESTILOS.md, candado C-ESTILOS-1): el ilustrado
// (las personas salen dibujadas) y el de neón (todo se explica con diagramas).
import { readFileSync } from "node:fs";
import path from "node:path";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { describe, expect, it } from "vitest";
import { armarDiagrama, numerarDiagramas, PRIMER_NODO_MS, tiemposDeNodos } from "@compartido/diagrama";
import { esquemaDiagrama, esquemaGuionGenerado, ICONOS_DIAGRAMA, TIPOS_VISUAL } from "@compartido/guion";
import {
  figuraSirve,
  fotoSirveParaDibujar,
  repartirFiguras,
  type FiguraDePlano,
} from "@compartido/ilustrado";
import type { PalabraConTiempo } from "@compartido/planos";
import { ESTILOS_VIDEO, estiloDeTematica, TEMATICAS } from "@compartido/tematicas";
import { instruccionesSistema } from "@/lib/prompt";
import { sitiosDeNodos } from "../estacion/src/remotion/diagrama-sitios";
import { NOMBRES_DE_ICONOS } from "../estacion/src/remotion/IconosNeon";
import { esquemaPropsVideo } from "../estacion/src/remotion/props";

const raiz = path.join(__dirname, "..");

/** Palabras con su tiempo, una cada 400 ms desde `inicioMs`. */
function voz(texto: string, inicioMs = 0): PalabraConTiempo[] {
  return texto
    .split(/\s+/)
    .map((text, k) => ({ text, startMs: inicioMs + k * 400, endMs: inicioMs + k * 400 + 350 }));
}

/** Cuenta, en el formato que se le manda a la IA, los campos que no son obligatorios. */
function opcionalesDe(esquema: Parameters<typeof zodOutputFormat>[0]): string[] {
  const formato = zodOutputFormat(esquema) as unknown as { schema: unknown };
  const lista: string[] = [];
  const andar = (n: unknown, ruta: string) => {
    if (!n || typeof n !== "object") return;
    if (Array.isArray(n)) return n.forEach((x, i) => andar(x, `${ruta}[${i}]`));
    const o = n as Record<string, unknown>;
    if (o.properties && typeof o.properties === "object") {
      const obligatorios = new Set((o.required as string[] | undefined) ?? []);
      for (const k of Object.keys(o.properties)) if (!obligatorios.has(k)) lista.push(`${ruta}.${k}`);
    }
    for (const [k, v] of Object.entries(o)) andar(v, `${ruta}.${k}`);
  };
  andar(formato.schema, "");
  return lista;
}

describe("estilos: el formato del guion no rompe a la IA (C-ESTILOS-1)", () => {
  it("el guion no pasa de los 24 campos opcionales que admite el formato de la IA", () => {
    // Límite de la API (leído en su documentación el 5 oct 2026): 24 opcionales en total.
    // Con uno de más, la IA devuelve un error y no se puede escribir NINGÚN guion.
    expect(opcionalesDe(esquemaGuionGenerado).length).toBeLessThanOrEqual(24);
  });

  it("el diagrama no agrega ni un opcional: lo que no aplica va vacío", () => {
    expect(opcionalesDe(esquemaDiagrama)).toEqual([]);
  });

  it("un guion con una escena de diagrama es válido, y uno de antes también", () => {
    const escena = (visual: object) => ({
      parte: "demo",
      narracion: "El cliente compra y el vendedor da salida.",
      visual,
    });
    const guion = (escenas: object[]) => ({
      titulo: "Así funciona una venta",
      gancho: "Una venta, paso a paso.",
      escenas,
    });
    const conDiagrama = esquemaGuionGenerado.parse(
      guion([
        escena({
          tipo: "diagrama",
          titular: "La venta: quién hace qué",
          diagrama: {
            seccion: "Ventas",
            nodos: [
              {
                id: "cliente",
                icono: "persona",
                etiqueta: "Cliente",
                nota: "compra",
                frase: "El cliente compra",
              },
              { id: "vendedor", icono: "vendedor", etiqueta: "Vendedor", nota: "", frase: "el vendedor da" },
            ],
            flechas: [{ de: "cliente", a: "vendedor" }],
            formula: "",
          },
        }),
        escena({ tipo: "stock", busqueda: "shop counter" }),
        escena({ tipo: "texto", texto_en_pantalla: "Mi opinión" }),
      ]),
    );
    expect(conDiagrama.escenas[0]?.visual.diagrama?.nodos).toHaveLength(2);
    expect(conDiagrama.escenas[1]?.visual.diagrama).toBeUndefined();
    expect(TIPOS_VISUAL).toContain("diagrama");
  });

  it("cada ícono que el guion puede pedir tiene su dibujo, y la IA recibe la lista completa", () => {
    expect([...ICONOS_DIAGRAMA].sort()).toEqual([...NOMBRES_DE_ICONOS].sort());
    const instrucciones = instruccionesSistema();
    for (const icono of ICONOS_DIAGRAMA) expect(instrucciones).toContain(`«${icono}»`);
  });
});

describe("estilo neón: cuándo se enciende cada objeto", () => {
  const palabras = voz(
    "En ventas el cliente compra y luego el vendedor le da salida al producto del depósito",
    10_000,
  );

  it("cada objeto se enciende justo antes de que la voz diga su frase", () => {
    const t = tiemposDeNodos(["el cliente compra", "el vendedor", "al producto"], palabras, 10_000, 17_000);
    expect(t[0]).toBe(10_000 + 2 * 400 - 120);
    expect(t[1]).toBe(10_000 + 7 * 400 - 120);
    expect(t[2]).toBe(10_000 + 12 * 400 - 120);
  });

  it("la escena no abre apagada: el primer objeto entra enseguida aunque su frase venga después", () => {
    const t = tiemposDeNodos(["al producto"], palabras, 10_000, 17_000);
    expect(t[0]).toBeLessThanOrEqual(10_000 + PRIMER_NODO_MS);
  });

  it("ningún objeto se pierde: sin su frase se reparte, y todos quedan en orden y dentro de la escena", () => {
    const t = tiemposDeNodos(
      ["el cliente", "frase que nadie dijo", "otra que tampoco", "del depósito"],
      palabras,
      10_000,
      17_000,
    );
    expect(t).toHaveLength(4);
    for (let k = 1; k < t.length; k++) expect(t[k] ?? 0).toBeGreaterThan(t[k - 1] ?? 0);
    expect(Math.min(...t)).toBeGreaterThanOrEqual(10_000);
    expect(Math.max(...t)).toBeLessThan(17_000);
    // Seis objetos en una escena de dos segundos: se aprietan, pero salen todos.
    const apretados = tiemposDeNodos(["a", "b", "c", "d", "e", "f"], [], 0, 2000);
    expect(new Set(apretados).size).toBe(6);
    expect(Math.max(...apretados)).toBeLessThan(2000);
  });

  it("la flecha se enciende cuando ya están sus dos puntas; una que apunta a nada, se quita", () => {
    const d = armarDiagrama(
      {
        titular: " La venta ",
        cuerpo: "",
        diagrama: {
          seccion: "Ventas",
          nodos: [
            { id: "a", icono: "persona", etiqueta: "Cliente", nota: "", frase: "el cliente" },
            { id: "b", icono: "vendedor", etiqueta: "Vendedor", nota: "", frase: "el vendedor" },
            { id: "b", icono: "producto", etiqueta: "Producto", nota: "", frase: "al producto" },
          ],
          flechas: [
            { de: "a", a: "b" },
            { de: "b", a: "a" },
            { de: "a", a: "fantasma" },
            { de: "a", a: "a" },
          ],
          formula: " venta → salida ",
        },
      },
      palabras,
      10_000,
      17_000,
    );
    expect(d.titular).toBe("La venta");
    expect(d.nodos.map((n) => n.id)).toEqual(["a", "b", "b-3"]);
    expect(d.flechas).toHaveLength(2);
    const entraB = d.nodos[1]?.entraMs ?? 0;
    for (const f of d.flechas) expect(f.entraMs).toBe(entraB);
    expect(d.formula).toBe("venta → salida");
    expect(d.formulaMs).toBeGreaterThan(d.nodos[2]?.entraMs ?? 0);
  });

  it("los diagramas se numeran y las escenas seguidas de la misma sección comparten casilla", () => {
    const vacio = () =>
      armarDiagrama({ diagrama: { seccion: "", nodos: [], flechas: [], formula: "" } }, [], 0, 1000);
    const escenas = [
      { diagrama: vacio() },
      { diagrama: vacio() },
      { diagrama: null },
      { diagrama: vacio() },
      { diagrama: vacio() },
    ];
    numerarDiagramas(escenas, ["Ventas", "ventas", null, "Depósito", ""]);
    expect(escenas.map((e) => e.diagrama?.numero ?? 0)).toEqual([1, 2, 0, 3, 4]);
    expect(escenas[0]?.diagrama?.secciones).toEqual(["Ventas", "Depósito"]);
    expect(escenas.map((e) => e.diagrama?.seccion ?? -1)).toEqual([0, 0, -1, 1, 1]);
  });

  it("los objetos caben entre el titular y los subtítulos, sin encimarse, en las dos formas del video", () => {
    for (const vertical of [false, true]) {
      for (let n = 1; n <= 6; n++) {
        const sitios = sitiosDeNodos(n, vertical);
        expect(sitios).toHaveLength(n);
        for (const s of sitios) {
          // El objeto mide unos 100 puntos de alto por su escala y la baldosa 111 de medio ancho.
          const arriba = s.y - 100 * s.s;
          const mitadAncho = 111 * s.s;
          if (vertical) {
            expect(arriba).toBeGreaterThan(520);
            expect(s.y).toBeLessThan(1210);
            expect(s.x - mitadAncho).toBeGreaterThanOrEqual(0);
            // Abajo a la derecha van los botones de la aplicación.
            expect(s.x + mitadAncho).toBeLessThanOrEqual(960);
          } else {
            expect(arriba).toBeGreaterThan(280);
            expect(s.y).toBeLessThan(700);
            expect(s.x - mitadAncho).toBeGreaterThanOrEqual(0);
            expect(s.x + mitadAncho).toBeLessThanOrEqual(1920);
          }
        }
        for (let a = 0; a < n; a++)
          for (let b = a + 1; b < n; b++) {
            const p = sitios[a];
            const q = sitios[b];
            if (!p || !q) continue;
            const juntos =
              Math.abs(p.x - q.x) < 111 * (p.s + q.s) * 0.8 && Math.abs(p.y - q.y) < 64 * (p.s + q.s) * 0.8;
            expect(juntos).toBe(false);
          }
      }
    }
    expect(sitiosDeNodos(0, true)).toEqual([]);
  });
});

describe("estilo ilustrado: quién lleva la figura dibujada", () => {
  const royce: FiguraDePlano = { ruta: "ia/dibujo-royce.png", ancho: 1500, alto: 1900 };
  const romeo: FiguraDePlano = { ruta: "ia/dibujo-romeo.png", ancho: 1400, alto: 1950 };
  const figuras = new Map([
    ["fotos/royce.jpg", royce],
    ["fotos/romeo.jpg", romeo],
  ]);
  const plano = (tipo: "foto" | "clip" | "dato", foto: string | null, texto: string) => ({
    tipo,
    foto: foto ? { ruta: foto } : null,
    texto,
    figura: null as FiguraDePlano | null,
    sigue: false,
  });

  it("la persona sale dibujada y los datos que siguen le caen encima sin que vuelva a entrar", () => {
    const escenas = [
      {
        planos: [
          plano("dato", null, "0 premios"),
          plano("foto", "fotos/royce.jpg", "Prince Royce"),
          plano("dato", null, "15 nominaciones"),
          plano("dato", null, "Ni una sola vez"),
          plano("clip", null, ""),
          plano("dato", null, "Número 1"),
          plano("foto", "fotos/estadio.jpg", ""),
          plano("foto", "fotos/romeo.jpg", "Romeo Santos"),
          plano("dato", null, "4 nominaciones"),
        ],
      },
      { planos: [plano("dato", null, "1 victoria")] },
    ];
    repartirFiguras(escenas, figuras);
    const p = escenas[0]?.planos ?? [];
    // Antes de que salga nadie, el dato queda como estaba (a pantalla llena).
    expect(p[0]?.figura).toBeNull();
    expect(p[1]).toMatchObject({ figura: royce, sigue: false });
    expect(p[2]).toMatchObject({ figura: royce, sigue: true });
    expect(p[3]).toMatchObject({ figura: royce, sigue: true });
    expect(p[4]?.figura).toBeNull();
    // Después de un clip, la figura vuelve a entrar.
    expect(p[5]).toMatchObject({ figura: royce, sigue: false });
    // Una foto sin rótulo (un lugar) no se dibuja y corta la racha.
    expect(p[6]?.figura).toBeNull();
    expect(p[7]).toMatchObject({ figura: romeo, sigue: false });
    expect(p[8]).toMatchObject({ figura: romeo, sigue: true });
    // En otra escena hay un fundido: la última persona vuelve a entrar.
    expect(escenas[1]?.planos[0]).toMatchObject({ figura: romeo, sigue: false });
  });

  it("repartir otra vez (al cambiar una foto) no deja figuras viejas pegadas", () => {
    const escenas = [
      { planos: [plano("foto", "fotos/royce.jpg", "Prince Royce"), plano("dato", null, "15")] },
    ];
    repartirFiguras(escenas, figuras);
    repartirFiguras(escenas, new Map());
    expect(escenas[0]?.planos.map((p) => p.figura)).toEqual([null, null]);
    expect(escenas[0]?.planos.map((p) => p.sigue)).toEqual([false, false]);
  });

  it("solo se dibuja la foto de UNA persona: con dos, el rótulo podría nombrar a la otra", () => {
    const cara = { x: 0.4, y: 0.1, ancho: 0.2, alto: 0.2 };
    expect(fotoSirveParaDibujar({ caras: [cara] })).toBe(true);
    // Caso real del 5 oct 2026: «Sam Altman» trajo una foto de dos invitados en un escenario.
    expect(fotoSirveParaDibujar({ caras: [cara, cara] })).toBe(false);
    expect(fotoSirveParaDibujar({ caras: [] })).toBe(false);
  });

  it("un dibujo al que no se le quitó el fondo no sirve: va la foto real", () => {
    expect(figuraSirve({ ancho: 1500, alto: 1900, lleno: 0.62 })).toBe(true);
    expect(figuraSirve({ ancho: 1536, alto: 2048, lleno: 0.99 })).toBe(false);
    expect(figuraSirve({ ancho: 1536, alto: 2048 })).toBe(false);
    expect(figuraSirve({ ancho: 120, alto: 160, lleno: 0.5 })).toBe(false);
  });
});

describe("estilos: cada temática con su diseño", () => {
  it("tecnología va ilustrada, «Así funciona» va en neón y las biografías siguen como estaban", () => {
    expect(estiloDeTematica("novedades-ia")).toBe("ilustrado");
    expect(estiloDeTematica("noticias-losupe")).toBe("ilustrado");
    expect(estiloDeTematica("explicador")).toBe("neon");
    expect(estiloDeTematica("biografias")).toBe("clasico");
    expect(estiloDeTematica("no-existe")).toBe("clasico");
    for (const t of TEMATICAS) if (t.estilo) expect(ESTILOS_VIDEO).toContain(t.estilo);
    // La temática de neón le prohíbe a la IA las fotos y los clips: solo diagramas.
    const explicador = TEMATICAS.find((t) => t.id === "explicador");
    expect(explicador?.reglas.join(" ")).toContain("«diagrama»");
  });

  it("un video de antes (sin estilo, sin figuras, sin diagramas) se sigue pudiendo volver a armar", () => {
    const p = esquemaPropsVideo.parse({
      titulo: "Video viejo",
      audio: "voz.mp3",
      duracionMs: 5000,
      palabras: [],
      escenas: [
        {
          parte: "gancho",
          inicioMs: 0,
          finMs: 5000,
          clip: null,
          planos: [{ inicioMs: 0, tipo: "dato", texto: "15 nominaciones" }],
        },
      ],
      producto: null,
    });
    expect(p.estilo).toBe("clasico");
    expect(p.escenas[0]?.diagrama).toBeNull();
    expect(p.escenas[0]?.planos[0]).toMatchObject({ figura: null, sigue: false });
  });

  it("la Estación produce cada video con el diseño de su temática", () => {
    const estacion = readFileSync(path.join(raiz, "estacion/src/estacion.ts"), "utf8");
    expect(estacion).toContain("estiloDeTematica(trabajo.tematica_id)");
    const produccion = readFileSync(path.join(raiz, "estacion/src/produccion.ts"), "utf8");
    expect(produccion).toContain('if (estilo === "ilustrado")');
    expect(produccion).toContain("numerarDiagramas(");
  });
});
