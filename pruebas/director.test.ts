// El Director (docs/DIRECTOR.md, C-DIRECTOR-1): la IA conversa, mira fotos y PROPONE; solo el botón
// de Richard vuelve una propuesta un video. Nada de esto le pega a la IA de verdad: la respuesta de
// Anthropic es de mentira y la base es SQLite en memoria con el esquema de producción.
import { describe, expect, it } from "vitest";
import {
  aprobarPropuesta,
  crearEncargo,
  guardarPropuesta,
  materialDelEncargo,
  mensajesDelEncargo,
  responderDirector,
  type AlmacenDeLectura,
} from "@/lib/director";
import {
  contextoDelEncargo,
  SISTEMA,
  dinero,
  HERRAMIENTAS,
  historialParaLaIA,
  MENSAJES_EN_MEMORIA,
  notaDeFotos,
} from "@/lib/director-prompt";
import { PresupuestoAgotado } from "@/lib/presupuesto";
import { costoEstimadoPublicidadUsd } from "@compartido/publicidad";
import { baseEnMemoria } from "./base-memoria";

const TEXTO =
  "¿Se te va la luz y se te para todo? Mira esto. El generador a gasolina de 1200 vatios de Pro In Shop. Con él prendes las luces, el ventilador y la nevera sin miedo. Es fácil de mover y arranca rápido. Escríbenos por Instagram y pídelo hoy mismo.";

type Base = ReturnType<typeof baseEnMemoria>;

async function conFotos(db: Base) {
  for (const [carpeta, nombre] of [
    ["Pro In Shop", "generador-frente.jpg"],
    ["Pro In Shop", "chica.webp"],
    ["Otra marca", "logo.png"],
  ] as const)
    await db.ejecutar(
      "INSERT INTO imagenes (carpeta, nombre, clave, tipo, bytes) VALUES (?, ?, ?, 'imagen', 2000)",
      [carpeta, nombre, `imagenes/${nombre}`],
    );
}

const pedido = (extra: Record<string, unknown> = {}) => ({
  nombre: "Pro In Shop · generador",
  narracion: TEXTO,
  idioma: "es",
  voz: "venezolana",
  carpetas: ["Pro In Shop"],
  avatar: "chica.webp",
  instrucciones: "",
  ...extra,
});

/** Una respuesta de la IA de mentira, con el mismo formato que la de verdad. */
function respuesta(
  content: unknown[],
  stop_reason: string,
  usage = { input_tokens: 4000, output_tokens: 500 },
) {
  return new Response(
    JSON.stringify({
      id: "msg_prueba",
      type: "message",
      role: "assistant",
      model: "claude-sonnet-5",
      content,
      stop_reason,
      stop_sequence: null,
      usage,
    }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
}

function iaDeMentira(respuestas: Response[]) {
  const pedidos: Record<string, unknown>[] = [];
  const falso: typeof fetch = async (_url, init) => {
    pedidos.push(JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>);
    const r = respuestas.shift();
    if (!r) throw new Error("La IA de mentira no tiene más respuestas.");
    return r;
  };
  return { pedidos, falso };
}

const opciones = (falso: typeof fetch, almacen: AlmacenDeLectura | null = null) => ({
  modelo: "claude-sonnet-5",
  apiKey: "clave-de-prueba",
  almacen,
  fetch: falso,
});

describe("Director: la IA propone, solo Richard aprueba (C-DIRECTOR-1)", () => {
  it("las herramientas de la IA son mirar una foto y proponer; ninguna aprueba, gasta ni pide un video", () => {
    expect(HERRAMIENTAS.map((h) => h.name)).toEqual([
      "ver_imagen",
      "ver_video",
      "proponer_anuncio",
      "proponer_demostracion",
      "proponer_locucion",
    ]);
    for (const h of HERRAMIENTAS) expect(h.name).toMatch(/^(ver|proponer)_/);
    for (const h of HERRAMIENTAS) expect(h.name).not.toMatch(/aprob|pag|gast|crear|armar|entreg/i);
  });

  it("un encargo nuevo trae su propia carpeta de fotos", async () => {
    const db = baseEnMemoria();
    const id = await crearEncargo(db);
    const e = await db.uno<{ titulo: string; carpeta: string; estado: string }>(
      "SELECT titulo, carpeta, estado FROM director_encargos WHERE id = ?",
      [id],
    );
    expect(e).toEqual({ titulo: `Encargo ${id}`, carpeta: `Encargo ${id}`, estado: "abierto" });
  });

  it("la propuesta se revisa como el formulario: el error vuelve a la IA en palabras y no se guarda nada", async () => {
    const db = baseEnMemoria();
    await conFotos(db);
    const id = await crearEncargo(db);
    const corto = await guardarPropuesta(db, id, pedido({ narracion: "Muy corto." }));
    expect(corto).toEqual({ ok: false, error: expect.stringContaining("muy corto") as string });
    const sinCarpeta = await guardarPropuesta(db, id, pedido({ carpetas: ["No existe"] }));
    expect(sinCarpeta.ok ? "" : sinCarpeta.error).toContain("«No existe» no existe");
    const personaAjena = await guardarPropuesta(db, id, pedido({ avatar: "logo.png" }));
    expect(personaAjena.ok ? "" : personaAjena.error).toContain("no está en las carpetas elegidas");
    expect(await db.todos("SELECT id FROM director_propuestas")).toHaveLength(0);
  });

  it("una propuesta buena lleva su precio, le pone nombre al encargo y reemplaza la anterior", async () => {
    const db = baseEnMemoria();
    await conFotos(db);
    const id = await crearEncargo(db);
    const primera = await guardarPropuesta(db, id, pedido({ avatar: "" }));
    const segunda = await guardarPropuesta(db, id, pedido());
    expect(primera.ok && segunda.ok).toBe(true);
    if (!primera.ok || !segunda.ok) return;
    expect(primera.precioUsd).toBe(costoEstimadoPublicidadUsd(TEXTO, false));
    expect(segunda.precioUsd).toBe(costoEstimadoPublicidadUsd(TEXTO, true));
    const estados = await db.todos<{ id: number; estado: string }>(
      "SELECT id, estado FROM director_propuestas ORDER BY id",
    );
    expect(estados).toEqual([
      { id: primera.id, estado: "reemplazada" },
      { id: segunda.id, estado: "propuesta" },
    ]);
    const e = await db.uno<{ titulo: string }>("SELECT titulo FROM director_encargos WHERE id = ?", [id]);
    expect(e?.titulo).toBe("Pro In Shop · generador");
  });

  it("aprobar crea UN solo pedido para la Mac (un doble clic no pide dos videos)", async () => {
    const db = baseEnMemoria();
    await conFotos(db);
    const id = await crearEncargo(db);
    const p = await guardarPropuesta(db, id, pedido());
    if (!p.ok) throw new Error(p.error);
    const a = await aprobarPropuesta(db, p.id);
    const b = await aprobarPropuesta(db, p.id);
    expect(b.publicidadId).toBe(a.publicidadId);
    const anuncios = await db.todos<{
      nombre: string;
      narracion: string;
      avatar: string;
      carpetas: string;
      estado: string;
    }>("SELECT nombre, narracion, avatar, carpetas, estado FROM publicidades");
    expect(anuncios).toEqual([
      {
        nombre: "Pro In Shop · generador",
        narracion: TEXTO,
        avatar: "chica.webp",
        carpetas: '["Pro In Shop"]',
        estado: "subida",
      },
    ]);
    const aviso = (await mensajesDelEncargo(db, id)).at(-1);
    expect(aviso?.rol).toBe("aviso");
    expect(aviso?.texto).toContain("Aprobaste la propuesta");
  });

  it("una propuesta ya reemplazada no se puede aprobar", async () => {
    const db = baseEnMemoria();
    await conFotos(db);
    const id = await crearEncargo(db);
    const vieja = await guardarPropuesta(db, id, pedido({ avatar: "" }));
    await guardarPropuesta(db, id, pedido());
    if (!vieja.ok) throw new Error(vieja.error);
    await expect(aprobarPropuesta(db, vieja.id)).rejects.toThrow("más nueva");
    expect(await db.todos("SELECT id FROM publicidades")).toHaveLength(0);
  });
});

describe("Director: la conversación con la IA", () => {
  it("la IA propone con su herramienta, la tarjeta queda guardada y NO se pide ningún video", async () => {
    const db = baseEnMemoria();
    await conFotos(db);
    const id = await crearEncargo(db);
    await db.ejecutar("INSERT INTO director_mensajes (encargo_id, rol, texto) VALUES (?, 'richard', ?)", [
      id,
      "Quiero un anuncio del generador de Pro In Shop, se pide por Instagram.",
    ]);
    const { pedidos, falso } = iaDeMentira([
      respuesta(
        [
          { type: "text", text: "Ya lo tengo." },
          { type: "tool_use", id: "toolu_1", name: "proponer_anuncio", input: pedido() },
        ],
        "tool_use",
      ),
      respuesta(
        [{ type: "text", text: "Elegí a la chica de la pijama rosa porque ya vende ese producto." }],
        "end_turn",
      ),
    ]);
    const r = await responderDirector(db, id, opciones(falso));
    expect(pedidos).toHaveLength(2);
    expect(JSON.stringify(pedidos[0]?.system)).toContain("Carpeta «Pro In Shop» (2)");
    expect(pedidos[0]?.thinking).toEqual({ type: "adaptive" });
    const resultado = JSON.stringify((pedidos[1]?.messages as unknown[]).at(-1));
    expect(resultado).toContain("toolu_1");
    expect(resultado).toContain("ya sale en la tarjeta");
    expect(r.propuestaId).not.toBeNull();
    const ultimo = (await mensajesDelEncargo(db, id)).at(-1);
    expect(ultimo).toMatchObject({ rol: "director", propuesta_id: r.propuestaId });
    expect(ultimo?.texto).toBe(
      "Ya lo tengo.\n\nElegí a la chica de la pijama rosa porque ya vende ese producto.",
    );
    // La IA no puede pedir el video: solo queda la tarjeta, esperando el botón.
    expect(await db.todos("SELECT id FROM publicidades")).toHaveLength(0);
    expect(await db.todos("SELECT id FROM gastos WHERE detalle LIKE 'director:%'")).toHaveLength(2);
    const e = await db.uno<{ costo_usd: number }>("SELECT costo_usd FROM director_encargos WHERE id = ?", [
      id,
    ]);
    expect(e?.costo_usd).toBeCloseTo(r.costoUsd, 6);
    expect(r.costoUsd).toBeGreaterThan(0);
  });

  it("si la propuesta viene mal, la IA recibe el error en palabras y puede corregirla", async () => {
    const db = baseEnMemoria();
    await conFotos(db);
    const id = await crearEncargo(db);
    await db.ejecutar(
      "INSERT INTO director_mensajes (encargo_id, rol, texto) VALUES (?, 'richard', 'Hazlo')",
      [id],
    );
    const { pedidos, falso } = iaDeMentira([
      respuesta(
        [
          {
            type: "tool_use",
            id: "toolu_1",
            name: "proponer_anuncio",
            input: pedido({ narracion: "Corto." }),
          },
        ],
        "tool_use",
      ),
      respuesta([{ type: "tool_use", id: "toolu_2", name: "proponer_anuncio", input: pedido() }], "tool_use"),
      respuesta([{ type: "text", text: "Listo." }], "end_turn"),
    ]);
    const r = await responderDirector(db, id, opciones(falso));
    const primerResultado = JSON.stringify((pedidos[1]?.messages as unknown[]).at(-1));
    expect(primerResultado).toContain('"is_error":true');
    expect(primerResultado).toContain("muy corto");
    expect(r.propuestaId).not.toBeNull();
  });

  it("la IA puede mirar una foto: le llega la imagen; una muy pesada no se manda", async () => {
    const db = baseEnMemoria();
    await conFotos(db);
    await db.ejecutar("UPDATE imagenes SET bytes = 9000000 WHERE nombre = 'chica.webp'");
    const fotos = await db.todos<{ id: number; nombre: string }>(
      "SELECT id, nombre FROM imagenes ORDER BY id",
    );
    const frente = fotos.find((f) => f.nombre === "generador-frente.jpg")?.id;
    const chica = fotos.find((f) => f.nombre === "chica.webp")?.id;
    const id = await crearEncargo(db);
    await db.ejecutar(
      "INSERT INTO director_mensajes (encargo_id, rol, texto) VALUES (?, 'richard', 'Mira las fotos')",
      [id],
    );
    const almacen: AlmacenDeLectura = {
      async get() {
        return { size: 3, arrayBuffer: async () => new Uint8Array([255, 216, 255]).buffer };
      },
    };
    const { pedidos, falso } = iaDeMentira([
      respuesta(
        [
          { type: "tool_use", id: "toolu_a", name: "ver_imagen", input: { id: frente } },
          { type: "tool_use", id: "toolu_b", name: "ver_imagen", input: { id: chica } },
        ],
        "tool_use",
      ),
      respuesta([{ type: "text", text: "Ya las vi." }], "end_turn"),
    ]);
    await responderDirector(db, id, opciones(falso, almacen));
    const resultados = (pedidos[1]?.messages as { content: unknown }[]).at(-1)?.content as {
      tool_use_id: string;
      is_error?: boolean;
      content: unknown;
    }[];
    expect(JSON.stringify(resultados[0]?.content)).toContain('"media_type":"image/jpeg","data":"/9j/"');
    expect(resultados[1]?.is_error).toBe(true);
    expect(JSON.stringify(resultados[1]?.content)).toContain("pesa demasiado");
  });

  it("sin presupuesto no se llama a la IA", async () => {
    const db = baseEnMemoria();
    await db.ejecutar("UPDATE ajustes SET valor = '0' WHERE clave = 'presupuesto_diario_usd'");
    const id = await crearEncargo(db);
    await db.ejecutar(
      "INSERT INTO director_mensajes (encargo_id, rol, texto) VALUES (?, 'richard', 'Hola')",
      [id],
    );
    const { pedidos, falso } = iaDeMentira([]);
    await expect(responderDirector(db, id, opciones(falso))).rejects.toBeInstanceOf(PresupuestoAgotado);
    expect(pedidos).toHaveLength(0);
  });

  it("un modelo que no está en la lista no corre, y sin mensaje nuevo no se responde", async () => {
    const db = baseEnMemoria();
    const id = await crearEncargo(db);
    const { falso } = iaDeMentira([]);
    await expect(
      responderDirector(db, id, { ...opciones(falso), modelo: "claude-opus-cara" }),
    ).rejects.toThrow("Modelo bloqueado");
    await expect(responderDirector(db, id, opciones(falso))).rejects.toThrow("ningún mensaje nuevo");
  });

  it("la memoria: Richard y los avisos hablan como usuario, lo seguido se junta y siempre empieza Richard", () => {
    const h = historialParaLaIA([
      { rol: "director", texto: "Hola" },
      { rol: "richard", texto: "Quiero un anuncio" },
      { rol: "richard", texto: "Del generador" },
      { rol: "director", texto: "Va la propuesta" },
      { rol: "aviso", texto: "Aprobaste la propuesta." },
    ]);
    expect(h).toEqual([
      { role: "user", content: "Quiero un anuncio\n\nDel generador" },
      { role: "assistant", content: "Va la propuesta" },
      { role: "user", content: "[Aviso del panel] Aprobaste la propuesta." },
    ]);
    const muchos = Array.from({ length: MENSAJES_EN_MEMORIA + 10 }, (_, i) => ({
      rol: i % 2 ? ("director" as const) : ("richard" as const),
      texto: `m${i}`,
    }));
    expect(historialParaLaIA(muchos).length).toBeLessThanOrEqual(MENSAJES_EN_MEMORIA);
  });

  it("lo que el Director tiene a mano: la carpeta del encargo, las fotos con su número y cómo van las propuestas", async () => {
    const db = baseEnMemoria();
    await conFotos(db);
    const id = await crearEncargo(db);
    const p = await guardarPropuesta(db, id, pedido());
    if (!p.ok) throw new Error(p.error);
    await aprobarPropuesta(db, p.id);
    const encargo = await db.uno<Parameters<typeof materialDelEncargo>[1]>(
      "SELECT * FROM director_encargos WHERE id = ?",
      [id],
    );
    if (!encargo) throw new Error("falta el encargo");
    const texto = contextoDelEncargo(await materialDelEncargo(db, encargo));
    expect(texto).toContain(`Carpeta «Encargo ${id}»: todavía vacía`);
    expect(texto).toMatch(/#\d+ generador-frente\.jpg/);
    expect(texto).toContain("en la fila");
  });

  it("los precios y la nota de las fotos se dicen en palabras", () => {
    expect(dinero(0)).toBe("0 centavos");
    expect(dinero(0.004)).toBe("menos de 1 centavo");
    expect(dinero(0.01)).toBe("1 centavo");
    expect(dinero(0.65)).toBe("65 centavos");
    expect(dinero(2.07)).toBe("$2.07");
    expect(notaDeFotos([], "Encargo 1")).toBe("");
    expect(notaDeFotos(["a.jpg", "b.png"], "Encargo 1")).toBe(
      "(Te subí estas 2 fotos a la carpeta «Encargo 1»: a.jpg, b.png)",
    );
  });
});

describe("Director: lo que aprendió en la primera prueba en vivo (C-DIRECTOR-2, 27 oct 2026)", () => {
  it("respeta lo que se pide de forma explícita, no inventa cualidades y habla de tú", () => {
    expect(SISTEMA).toContain("Lo que te piden de forma explícita se respeta");
    expect(SISTEMA).toContain("Del producto dices solo lo que te contaron o lo que se ve en las fotos");
    expect(SISTEMA).toContain("Le hablas de tú");
    expect(SISTEMA).toContain("casi siempre es una presentadora");
    expect(SISTEMA).not.toContain("solo Richard, con ese botón");
  });
});
