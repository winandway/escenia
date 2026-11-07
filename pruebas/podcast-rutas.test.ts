// Las rutas del Podcast IA (C-PODCAST-1): sin sesión no se abre nada; sin la clave de Agents se dice
// «Falta conectar la voz del invitado»; con la clave, el navegador recibe la URL firmada y el prompt de la
// ficha, pero JAMÁS la clave. ElevenLabs va simulado con msw: ninguna prueba le pega al servicio real.
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { baseEnMemoria } from "./base-memoria";
import { COOKIE_SESION, crearSesion } from "@/lib/sesion";

let galleta: string | undefined;
let db: ReturnType<typeof baseEnMemoria>;
let env: Record<string, string | undefined>;

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (nombre: string) => (nombre === COOKIE_SESION && galleta ? { value: galleta } : undefined),
  }),
}));
vi.mock("@/lib/entorno", () => ({ contexto: async () => ({ env, db, bucket: null }) }));

import { POST as abrir } from "@/app/datos/podcast/conversaciones/route";
import { POST as cerrar } from "@/app/datos/podcast/conversaciones/[id]/fin/route";
import { AJUSTE_AGENTE_ID, AJUSTE_VOCES, estadoDelPodcast, guardarFicha } from "@/lib/podcast";
import { guardarAjuste } from "@/lib/consultas";
import { AJUSTE_TOPE_MINUTOS } from "@compartido/podcast";

// Una clave de mentira, distinta en cada corrida: en el repo no se escribe nada que parezca una clave.
const CLAVE = `sk_prueba_${crypto.randomUUID().replaceAll("-", "")}`;
const URL_FIRMADA =
  "wss://api.elevenlabs.io/v1/convai/conversation?agent_id=agent_prueba&conversation_signature=x";
let respuestaElevenLabs: () => Response = () => HttpResponse.json({ signed_url: URL_FIRMADA });
const pedidosAElevenLabs: { url: string }[] = [];

const servidor = setupServer(
  http.get("https://api.elevenlabs.io/v1/convai/conversation/get-signed-url", ({ request }) => {
    pedidosAElevenLabs.push({ url: request.url });
    if (request.headers.get("xi-api-key") !== CLAVE) return HttpResponse.json({}, { status: 401 });
    return respuestaElevenLabs();
  }),
);
beforeAll(() => servidor.listen({ onUnhandledRequest: "error" }));
afterEach(() => servidor.resetHandlers());
afterAll(() => servidor.close());

const pedido = (cuerpo: unknown, cabeceras: Record<string, string> = {}) =>
  new Request("https://escenia.sitios.dev/datos/podcast/conversaciones", {
    method: "POST",
    headers: { "content-type": "application/json", ...cabeceras },
    body: JSON.stringify(cuerpo),
  });
const pedidoFin = (id: number) =>
  new Request(`https://escenia.sitios.dev/datos/podcast/conversaciones/${id}/fin`, { method: "POST" });
const ctxFin = (id: number) => ({ params: Promise.resolve({ id: String(id) }) });

let fichaId: number;
beforeEach(async () => {
  db = baseEnMemoria();
  env = {};
  galleta = undefined;
  pedidosAElevenLabs.length = 0;
  respuestaElevenLabs = () => HttpResponse.json({ signed_url: URL_FIRMADA });
  fichaId = await guardarFicha(db, null, {
    nombre: "Invitada de prueba",
    etiqueta: "Invitada especial",
    tema: "Tejer",
    personalidad: "Tranquila.",
    voz: "neutra",
    avatar: "robot",
    origen: "real",
    tipo: "historia",
    historia: "Aprendí a tejer con mi tía.",
    primer_mensaje: "",
    permiso: true,
  });
});

async function conectar() {
  galleta = (await crearSesion(db)).token;
  env.ELEVENLABS_AGENTES_KEY = CLAVE;
  await guardarAjuste(db, AJUSTE_AGENTE_ID, "agent_prueba");
  await guardarAjuste(db, AJUSTE_VOCES, JSON.stringify({ neutra: "voz-neutra-prueba" }));
}

describe("abrir una conversación del podcast", () => {
  it("sin sesión responde 401 y no le pide nada a ElevenLabs", async () => {
    env.ELEVENLABS_AGENTES_KEY = CLAVE;
    const r = await abrir(pedido({ fichaId }));
    expect(r.status).toBe(401);
    expect(pedidosAElevenLabs).toHaveLength(0);
  });

  it("desde otro sitio responde 403", async () => {
    await conectar();
    const r = await abrir(pedido({ fichaId }, { origin: "https://otro-sitio.example" }));
    expect(r.status).toBe(403);
  });

  it("sin la clave de Agents dice con claridad que falta conectar la voz", async () => {
    galleta = (await crearSesion(db)).token;
    const r = await abrir(pedido({ fichaId }));
    expect(r.status).toBe(503);
    expect(((await r.json()) as { error: string }).error).toBe("Falta conectar la voz del invitado.");
    expect(pedidosAElevenLabs).toHaveLength(0);
  });

  it("con la clave devuelve la URL firmada y el prompt de la ficha, pero nunca la clave", async () => {
    await conectar();
    const r = await abrir(pedido({ fichaId }));
    expect(r.status).toBe(200);
    const texto = await r.text();
    expect(texto).not.toContain(CLAVE);
    const datos = JSON.parse(texto) as {
      conversacionId: number;
      signedUrl: string;
      overrides: { agent: { prompt: { prompt: string }; firstMessage: string }; tts: { voiceId: string } };
    };
    expect(datos.signedUrl).toBe(URL_FIRMADA);
    expect(datos.overrides.agent.prompt.prompt).toContain("Aprendí a tejer con mi tía.");
    expect(datos.overrides.agent.prompt.prompt).toMatch(/No inventes nada/);
    expect(datos.overrides.tts.voiceId).toBe("voz-neutra-prueba");
    expect(pedidosAElevenLabs[0]?.url).toContain("agent_id=agent_prueba");
    expect(r.headers.get("cache-control")).toBe("no-store");
  });

  it("una historia real sin el permiso confirmado no entra al estudio", async () => {
    await conectar();
    await db.ejecutar("UPDATE podcast_fichas SET permiso = 0 WHERE id = ?", [fichaId]);
    const r = await abrir(pedido({ fichaId }));
    expect(r.status).toBe(409);
    expect(pedidosAElevenLabs).toHaveLength(0);
  });

  it("una historia de ficción (la escribimos nosotros) entra sin permiso, y el invitado no dice que es real", async () => {
    await conectar();
    await db.ejecutar("UPDATE podcast_fichas SET permiso = 0, origen = 'ficcion' WHERE id = ?", [fichaId]);
    const r = await abrir(pedido({ fichaId }));
    expect(r.status).toBe(200);
    const datos = (await r.json()) as { overrides: { agent: { prompt: { prompt: string } } } };
    expect(datos.overrides.agent.prompt.prompt).toMatch(/personaje creado para el podcast/);
    expect(datos.overrides.agent.prompt.prompt).not.toMatch(/historia real/i);
  });

  it("una entrevista a la IA entra sin historia ni permiso, y el invitado habla como IA", async () => {
    await conectar();
    await db.ejecutar(
      "UPDATE podcast_fichas SET permiso = 0, historia = '', tipo = 'entrevista_ia' WHERE id = ?",
      [fichaId],
    );
    const r = await abrir(pedido({ fichaId }));
    expect(r.status).toBe(200);
    const datos = (await r.json()) as { overrides: { agent: { prompt: { prompt: string } } } };
    expect(datos.overrides.agent.prompt.prompt).toMatch(/una inteligencia artificial invitada/);
    expect(datos.overrides.agent.prompt.prompt).not.toContain("HISTORIA");
  });

  it("si ElevenLabs rechaza la clave: lo dice, no gasta minutos y el canario se pone en rojo", async () => {
    await conectar();
    respuestaElevenLabs = () => HttpResponse.json({}, { status: 401 });
    const r = await abrir(pedido({ fichaId }));
    expect(r.status).toBe(502);
    expect(((await r.json()) as { error: string }).error).toMatch(/permiso de Agents/);
    expect(await db.todos("SELECT segundos FROM podcast_conversaciones")).toEqual([{ segundos: 0 }]);
    expect((await estadoDelPodcast(db, env)).estado).toBe("error");
    // La siguiente que sale bien apaga la alarma.
    respuestaElevenLabs = () => HttpResponse.json({ signed_url: URL_FIRMADA });
    expect((await abrir(pedido({ fichaId }))).status).toBe(200);
    expect((await estadoDelPodcast(db, env)).estado).toBe("ok");
  });

  it("por encima del tope de minutos no abre ni le pide nada a ElevenLabs", async () => {
    await conectar();
    await guardarAjuste(db, AJUSTE_TOPE_MINUTOS, "5");
    const r = await abrir(pedido({ fichaId }));
    expect(r.status).toBe(429);
    expect(((await r.json()) as { error: string }).error).toMatch(/tope de minutos/);
    expect(pedidosAElevenLabs).toHaveLength(0);
  });
});

describe("cerrar una conversación", () => {
  it("cuenta los segundos con el reloj del panel y un segundo cierre no cobra otra vez", async () => {
    await conectar();
    const { conversacionId } = (await (await abrir(pedido({ fichaId }))).json()) as {
      conversacionId: number;
    };
    const r1 = await cerrar(pedidoFin(conversacionId), ctxFin(conversacionId));
    expect(r1.status).toBe(200);
    expect(await r1.json()).toMatchObject({ ok: true, yaCerrada: false });
    const r2 = await cerrar(pedidoFin(conversacionId), ctxFin(conversacionId));
    expect(await r2.json()).toMatchObject({ ok: true, yaCerrada: true });
    expect(await db.todos("SELECT id FROM gastos WHERE detalle LIKE 'podcast:%'")).toHaveLength(1);
  });

  it("sin sesión no cierra nada", async () => {
    const r = await cerrar(pedidoFin(1), ctxFin(1));
    expect(r.status).toBe(401);
  });
});
