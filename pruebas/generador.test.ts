// C-GUION-2: el guion se le pide a la IA por streaming. Con el tope de salida
// que hace falta para un guion con planos, el SDK se niega a pedirlo de una
// sola vez, y desde el panel no se podía escribir NINGÚN guion (5 oct 2026).
import { describe, expect, it } from "vitest";
import { generarGuion, MAX_TOKENS_GUION } from "@/lib/generador";
import { conEstadoIA, problemaAbiertoDeIA, problemaDeCuenta } from "@/lib/ia-estado";
import type { EntradaGuion } from "@/lib/prompt";
import { TEMATICAS } from "@compartido/tematicas";
import { baseEnMemoria } from "./base-memoria";

/** Lo que responde la API cuando se le pide por streaming: el guion llega en eventos. */
function respuestaPorEventos(texto: string): Response {
  const eventos: [string, object][] = [
    [
      "message_start",
      {
        type: "message_start",
        message: {
          id: "msg_prueba",
          type: "message",
          role: "assistant",
          model: "claude-sonnet-5",
          content: [],
          stop_reason: null,
          stop_sequence: null,
          usage: { input_tokens: 1200, output_tokens: 1 },
        },
      },
    ],
    [
      "content_block_start",
      { type: "content_block_start", index: 0, content_block: { type: "text", text: "" } },
    ],
    [
      "content_block_delta",
      { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: texto.slice(0, 40) } },
    ],
    [
      "content_block_delta",
      { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: texto.slice(40) } },
    ],
    ["content_block_stop", { type: "content_block_stop", index: 0 }],
    [
      "message_delta",
      {
        type: "message_delta",
        delta: { stop_reason: "end_turn", stop_sequence: null },
        usage: { output_tokens: 300 },
      },
    ],
    ["message_stop", { type: "message_stop" }],
  ];
  return new Response(eventos.map(([e, d]) => `event: ${e}\ndata: ${JSON.stringify(d)}\n\n`).join(""), {
    status: 200,
    headers: { "content-type": "text/event-stream" },
  });
}

// Lo que devuelve la IA: TODOS los campos, y el que no aplica, vacío (C-GUION-3).
const escena = (parte: string, narracion: string) => ({
  parte,
  narracion,
  duracion_seg: 0,
  visual: {
    tipo: "stock",
    busqueda: "server room lights",
    url: "",
    prompt_imagen: "",
    cuadros: [],
    titular: "",
    fecha: "",
    cuerpo: "",
    texto_en_pantalla: "",
    foto_de: "persona",
    planos: [],
    diagrama: { seccion: "", nodos: [], flechas: [], formula: "" },
  },
});
const GUION = {
  titulo: "Un guion de prueba para el generador",
  gancho: "Una frase que engancha desde el primer segundo.",
  escenas: [
    escena("gancho", "Esto pasó ayer y cambia cómo trabajas."),
    escena("dato", "El dato central de la noticia, dicho sin rodeos."),
    escena("cierre", "Y por eso conviene mirarlo con calma."),
  ],
  hechos_a_verificar: [],
  descripcion_youtube: "",
  etiquetas: [],
  musica: "driving kick and bass beat",
};

describe("generador de guiones (C-GUION-2)", () => {
  it("pide el guion por streaming, con el tope alto, y lo devuelve validado", async () => {
    const db = baseEnMemoria();
    const tematica = TEMATICAS.find((t) => t.id === "novedades-ia");
    if (!tematica) throw new Error("falta la temática de prueba");
    const entrada: EntradaGuion = {
      tematica,
      tema: { titulo: "Una noticia de prueba", contexto: "Contexto de prueba.", urlFuente: "" },
      producto: null,
      estructura: ["gancho", "dato", "cierre"],
      recientes: [],
      instruccionesExtra: "",
    };
    const pedidos: Record<string, unknown>[] = [];
    const falso: typeof fetch = async (_url, init) => {
      pedidos.push(JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>);
      return respuestaPorEventos(JSON.stringify(GUION));
    };
    const r = await generarGuion(db, entrada, {
      modelo: "claude-sonnet-5",
      apiKey: "clave-de-prueba",
      fetch: falso,
    });
    expect(r.guion.escenas).toHaveLength(3);
    // Lo vacío no llega al guion guardado.
    expect(r.guion.escenas[0]?.visual.diagrama).toBeUndefined();
    expect(r.guion.escenas[0]?.visual.planos).toBeUndefined();
    expect(r.guion.titulo).toBe(GUION.titulo);
    expect(r.costoUsd).toBeGreaterThan(0);
    // El pedido salió una sola vez, por streaming y con el tope que necesita un guion con planos.
    expect(pedidos).toHaveLength(1);
    expect(pedidos[0]?.stream).toBe(true);
    expect(pedidos[0]?.max_tokens).toBe(MAX_TOKENS_GUION);
    // Con este tope, pedirlo sin streaming es justo lo que el SDK rechaza.
    expect(MAX_TOKENS_GUION).toBeGreaterThan(21_333);
    // Y el gasto quedó anotado.
    const gasto = await db.uno<{ n: number }>("SELECT count(*) n FROM gastos");
    expect(gasto?.n).toBe(1);
  });
});

// C-IA-SALDO-1: la cuenta de la IA se quedó sin saldo y el canario seguía diciendo «ok».
const SIN_SALDO =
  '400 {"type":"error","error":{"type":"invalid_request_error","message":"Your credit balance is too low to access the Anthropic API. Please go to Plans & Billing to upgrade or purchase credits."}}';

describe("estado de la cuenta de la IA (C-IA-SALDO-1)", () => {
  it("un fallo de la cuenta se dice en claro; un tropiezo pasajero no es un problema de cuenta", () => {
    expect(problemaDeCuenta(new Error(SIN_SALDO))).toContain("sin saldo");
    expect(problemaDeCuenta(new Error("401 authentication_error: invalid x-api-key"))).toContain("clave");
    expect(problemaDeCuenta(new Error("529 overloaded_error"))).toBeNull();
    expect(problemaDeCuenta(new Error("fetch failed"))).toBeNull();
  });

  it("el problema queda anotado para el canario y se borra cuando la IA vuelve a responder", async () => {
    const db = baseEnMemoria();
    expect(await problemaAbiertoDeIA(db)).toBeNull();
    await expect(
      conEstadoIA(db, async () => {
        throw new Error(SIN_SALDO);
      }),
    ).rejects.toThrow("sin saldo");
    expect((await problemaAbiertoDeIA(db))?.mensaje).toContain("sin saldo");
    // Un error pasajero no borra ni pisa lo anotado.
    await expect(
      conEstadoIA(db, async () => {
        throw new Error("529 overloaded_error");
      }),
    ).rejects.toThrow("529");
    expect((await problemaAbiertoDeIA(db))?.mensaje).toContain("sin saldo");
    expect(await conEstadoIA(db, async () => "listo")).toBe("listo");
    expect(await problemaAbiertoDeIA(db)).toBeNull();
  });

  it("al pedir un guion sin saldo, el panel recibe la frase clara y no el error crudo de la API", async () => {
    const db = baseEnMemoria();
    const tematica = TEMATICAS.find((t) => t.id === "explicador");
    if (!tematica) throw new Error("falta la temática de prueba");
    const sinSaldo: typeof fetch = async () =>
      new Response(
        JSON.stringify({
          type: "error",
          error: {
            type: "invalid_request_error",
            message:
              "Your credit balance is too low to access the Anthropic API. Please go to Plans & Billing to upgrade or purchase credits.",
          },
        }),
        { status: 400, headers: { "content-type": "application/json" } },
      );
    await expect(
      generarGuion(
        db,
        {
          tematica,
          tema: { titulo: "Un proceso de prueba", contexto: "Contexto.", urlFuente: "" },
          producto: null,
          estructura: ["gancho", "demo", "cierre"],
          recientes: [],
          instruccionesExtra: "",
        },
        { modelo: "claude-sonnet-5", apiKey: "clave-de-prueba", fetch: sinSaldo },
      ),
    ).rejects.toThrow("La cuenta de Anthropic se quedó sin saldo");
    expect(await problemaAbiertoDeIA(db)).not.toBeNull();
  });
});
