// La app de iPhone (docs/APP-IPHONE.md, C-APP-IOS-1): entra con su token, y la cuenta del revisor de
// Apple solo ve lo suyo, no gasta y no ve carpetas de clientes. Base SQLite en memoria con el esquema
// de producción; nada le pega a un servicio de verdad.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { baseEnMemoria } from "./base-memoria";

vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));

import { encargoParaLaApp, estadoParaLaApp } from "@/lib/app-encargo";
import {
  AJUSTE_HUELLA_DEMO,
  anotarEncargoDemo,
  aprobarEnDemo,
  carpetaDeEncargoDemo,
  crearSesionApp,
  cuentaDeLaClave,
  encargosDeLaCuenta,
  mensajesDemoHoy,
  puedeVerEncargo,
  sesionDeLaApp,
  tokenDeLaApp,
} from "@/lib/app-sesion";
import { huellaDeClave } from "@/lib/clave";
import {
  anotarMensaje,
  crearEncargo,
  encargoPorId,
  guardarPropuesta,
  materialDelEncargo,
} from "@/lib/director";
import { puedeSubir } from "@/lib/permiso-subida";
import { NextRequest } from "next/server";
import { proxy, RUTAS_PUBLICAS } from "@/proxy";

type Base = ReturnType<typeof baseEnMemoria>;

// Valores de mentira, distintos en cada corrida: en el repo no queda nada que parezca una clave.
const SECRETO = `${crypto.randomUUID()}${crypto.randomUUID()}`;
const CLAVE_PANEL = `panel-${crypto.randomUUID()}`;
const CLAVE_DEMO = `demo-${crypto.randomUUID()}`;
const TEXTO =
  "¿Se te va la luz y se te para todo? Mira esto. El generador a gasolina de 1200 vatios de Pro In Shop. Con él prendes las luces, el ventilador y la nevera sin miedo. Es fácil de mover y arranca rápido. Escríbenos por Instagram y pídelo hoy mismo.";

const pedido = (token?: string) =>
  new Request("https://escenia.sitios.dev/datos/director/1", {
    method: "POST",
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });

async function conFotos(db: Base, carpetas: string[]) {
  for (const carpeta of carpetas)
    await db.ejecutar(
      "INSERT INTO imagenes (carpeta, nombre, clave, tipo, bytes) VALUES (?, ?, ?, 'imagen', 2000)",
      [carpeta, `foto-${carpeta}.jpg`, `imagenes/${carpeta}.jpg`],
    );
}

describe("la app de iPhone entra con su propio token (C-APP-IOS-1)", () => {
  let db: Base;
  let huellaPanel: string;
  beforeEach(async () => {
    db = baseEnMemoria();
    huellaPanel = await huellaDeClave(CLAVE_PANEL);
    await db.ejecutar("INSERT INTO ajustes (clave, valor) VALUES (?, ?)", [
      AJUSTE_HUELLA_DEMO,
      await huellaDeClave(CLAVE_DEMO),
    ]);
  });

  it("la contraseña del panel abre la cuenta de Richard; la del revisor, la de demostración; otra, nada", async () => {
    expect(await cuentaDeLaClave(db, CLAVE_PANEL, huellaPanel)).toBe("richard");
    expect(await cuentaDeLaClave(db, CLAVE_DEMO, huellaPanel)).toBe("demo");
    expect(await cuentaDeLaClave(db, "inventada", huellaPanel)).toBeNull();
    expect(await cuentaDeLaClave(db, CLAVE_PANEL, undefined)).toBeNull();
  });

  it("el token vale hasta que se cierra o vence, y el secreto de la Estación no pasa por token de la app", async () => {
    const token = await crearSesionApp(db, "richard");
    expect(token.startsWith("esc_")).toBe(true);
    expect(await sesionDeLaApp(db, `Bearer ${token}`)).toMatchObject({ tipo: "richard" });
    expect(tokenDeLaApp(`Bearer ${SECRETO}`)).toBeNull();
    expect(await sesionDeLaApp(db, `Bearer esc_${crypto.randomUUID()}`)).toBeNull();
    await db.ejecutar("UPDATE app_sesiones SET expira_en = datetime('now', '-1 minute')");
    expect(await sesionDeLaApp(db, `Bearer ${token}`)).toBeNull();
  });

  it("la cuenta del revisor no entra a lo que gasta (anuncios, grabaciones) y sí al chat del Director", async () => {
    const richard = await crearSesionApp(db, "richard");
    const demo = await crearSesionApp(db, "demo");
    expect(await puedeSubir(pedido(richard), db, SECRETO)).toMatchObject({
      ok: true,
      app: { tipo: "richard" },
    });
    const bloqueada = await puedeSubir(pedido(demo), db, SECRETO);
    expect(bloqueada.ok).toBe(false);
    if (!bloqueada.ok) expect(bloqueada.respuesta.status).toBe(403);
    expect(await puedeSubir(pedido(demo), db, SECRETO, { cuentaDemo: true })).toMatchObject({
      ok: true,
      app: { tipo: "demo" },
    });
    const vencida = await puedeSubir(pedido(`esc_${crypto.randomUUID()}`), db, SECRETO);
    expect(vencida.ok).toBe(false);
    if (!vencida.ok) expect(vencida.respuesta.status).toBe(401);
  });
});

describe("la cuenta del revisor de Apple solo ve lo suyo (C-APP-IOS-1)", () => {
  let db: Base;
  beforeEach(() => {
    db = baseEnMemoria();
  });

  it("ni la lista ni el encargo de Richard se ven desde la demostración, y al revés la lista no se mezcla", async () => {
    const deRichard = await crearEncargo(db);
    const deDemo = await crearEncargo(db);
    await anotarEncargoDemo(db, deDemo);
    const demo = { tipo: "demo" as const, token: "x" };
    expect(await puedeVerEncargo(db, demo, deRichard)).toBe(false);
    expect(await puedeVerEncargo(db, demo, deDemo)).toBe(true);
    expect(await puedeVerEncargo(db, { tipo: "richard", token: "x" }, deRichard)).toBe(true);
    expect((await encargosDeLaCuenta(db, "demo")).map((e) => e.id)).toEqual([deDemo]);
    expect((await encargosDeLaCuenta(db, "richard")).map((e) => e.id)).toEqual([deRichard]);
    expect(await carpetaDeEncargoDemo(db, `Encargo ${deDemo}`)).toBe(true);
    expect(await carpetaDeEncargoDemo(db, `Encargo ${deRichard}`)).toBe(false);
  });

  it("el Director de la demostración no ve las carpetas de los clientes", async () => {
    await conFotos(db, ["Pro In Shop", "Maggie"]);
    const id = await crearEncargo(db);
    const encargo = await encargoPorId(db, id);
    if (!encargo) throw new Error("sin encargo");
    const todas = await materialDelEncargo(db, encargo);
    expect(todas.carpetas.map((c) => c.carpeta).sort()).toEqual(["Maggie", "Pro In Shop"]);
    const demo = await materialDelEncargo(db, encargo, [encargo.carpeta, "Maggie"]);
    expect(demo.carpetas.map((c) => c.carpeta)).toEqual(["Maggie"]);
  });

  it("aprobar en la demostración no anota ningún anuncio ni trabajo para la Mac: muestra un ejemplo", async () => {
    await conFotos(db, ["Maggie"]);
    const id = await crearEncargo(db);
    await anotarEncargoDemo(db, id);
    const p = await guardarPropuesta(db, id, {
      nombre: "Cafetería · prueba",
      narracion: TEXTO,
      idioma: "es",
      voz: "venezolana",
      carpetas: ["Maggie"],
      avatar: "foto-Maggie.jpg",
      instrucciones: "",
    });
    if (!p.ok) throw new Error(p.error);
    await aprobarEnDemo(db, p.id);
    await aprobarEnDemo(db, p.id); // un doble toque no hace nada más
    expect((await db.uno<{ n: number }>("SELECT COUNT(*) AS n FROM publicidades"))?.n).toBe(0);
    expect((await db.uno<{ n: number }>("SELECT COUNT(*) AS n FROM director_trabajos"))?.n).toBe(0);
    const encargo = await encargoPorId(db, id);
    if (!encargo) throw new Error("sin encargo");
    const vista = await encargoParaLaApp(db, encargo);
    expect(vista.propuestas[0]?.resultado).toMatchObject({
      estado: "listo",
      muestra: true,
      costoUsd: 0,
      video: "",
    });
    expect(vista.propuestas[0]?.persona).toBe("foto-Maggie");
    const avisos = vista.mensajes.filter((m) => m.rol === "aviso");
    expect(avisos).toHaveLength(1);
    // Sin mensajes en inglés, el aviso sale en español.
    expect(avisos[0]?.texto).toMatch(/^Cuenta de demostración/);
    expect(vista.enMarcha).toBe(false);
  });

  it("una propuesta de Richard no se puede aprobar «en demostración»", async () => {
    await conFotos(db, ["Maggie"]);
    const id = await crearEncargo(db);
    const p = await guardarPropuesta(db, id, {
      nombre: "Cliente · producto",
      narracion: TEXTO,
      idioma: "es",
      voz: "venezolana",
      carpetas: ["Maggie"],
      avatar: "",
      instrucciones: "",
    });
    if (!p.ok) throw new Error(p.error);
    await expect(aprobarEnDemo(db, p.id)).rejects.toThrow("no existe");
  });

  it("los mensajes del día de la demostración se cuentan para el tope", async () => {
    const deDemo = await crearEncargo(db);
    await anotarEncargoDemo(db, deDemo);
    const deRichard = await crearEncargo(db);
    await anotarMensaje(db, deDemo, "richard", "hola");
    await anotarMensaje(db, deDemo, "director", "hola, ¿qué vendes?");
    await anotarMensaje(db, deRichard, "richard", "otro");
    expect(await mensajesDemoHoy(db)).toBe(1);
  });

  it("los estados de los videos se traducen a cuatro que entiende la app", () => {
    expect(estadoParaLaApp("subida")).toBe("en-fila");
    expect(estadoParaLaApp("tomada")).toBe("armando");
    expect(estadoParaLaApp("lista")).toBe("listo");
    expect(estadoParaLaApp("error")).toBe("error");
    expect(estadoParaLaApp("quitada")).toBe("error");
  });
});

describe("las páginas que pide Apple se abren sin sesión (C-APP-IOS-1)", () => {
  it("privacidad y soporte, en inglés y en español, sin mandar a entrar; el panel sigue cerrado", () => {
    const pedir = (ruta: string) => proxy(new NextRequest(`https://escenia.sitios.dev${ruta}`));
    expect(RUTAS_PUBLICAS).toEqual(["/privacy", "/es/privacy", "/support", "/es/support"]);
    for (const ruta of [...RUTAS_PUBLICAS, "/muestras/escenia-muestra.mp4"])
      expect(pedir(ruta).headers.get("location"), ruta).toBeNull();
    for (const ruta of ["/director", "/es", "/privacy/otra"])
      expect(pedir(ruta).headers.get("location"), ruta).toContain("/entrar");
  });
});

describe("el Director de la app habla el idioma de quien le escribe y conoce a Maggie (C-APP-IOS-1)", () => {
  it("sus reglas lo dicen, y la del idioma va al final (en la prueba en vivo comentó en español a quien escribía en inglés)", async () => {
    const { SISTEMA } = await import("@/lib/director-prompt");
    const lineas = SISTEMA.split("\n").filter(Boolean);
    expect(lineas.at(-1)).toMatch(
      /^El idioma: TODO lo que le escribes .* el comentario después de la tarjeta/,
    );
    expect(SISTEMA).toContain("Maggie es la presentadora de la casa (la carpeta «Maggie»)");
  });
});

describe("el panel le dice al Director en qué idioma contestar (C-APP-IOS-1)", () => {
  it("detecta el inglés y el español de quien escribe, sin contar las notas de lo subido", async () => {
    const { idiomaDeEscritura, avisoDeIdioma, notaDeFotos } = await import("@/lib/director-prompt");
    expect(
      idiomaDeEscritura("I want an ad with Maggie for my coffee shop. People order ahead on WhatsApp."),
    ).toBe("en");
    expect(idiomaDeEscritura("Quiero un anuncio con Maggie para mi panadería, se pide por WhatsApp.")).toBe(
      "es",
    );
    const conNota = `I want an ad for my shoes, people buy on Instagram.\n\n${notaDeFotos(["a.jpg", "b.jpg"], "Encargo 5")}`;
    expect(idiomaDeEscritura(conNota)).toBe("en");
    expect(avisoDeIdioma("en")).toContain("English only");
  });
});

describe("el Director mira las fotos con su tipo de verdad (C-APP-IOS-1)", () => {
  it("una «.png» que por dentro es JPG se manda como JPG (las fotos de Maggie: la IA las rechazaba)", async () => {
    const { tipoPorFirma } = await import("@/lib/director");
    expect(tipoPorFirma(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
    expect(tipoPorFirma(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d]))).toBe("image/png");
    expect(tipoPorFirma(new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]))).toBe(
      "image/webp",
    );
    expect(tipoPorFirma(new Uint8Array([1, 2, 3]))).toBeNull();
  });
});

describe("ver_imagen usa el tipo de verdad al mandarle la foto a la IA (C-APP-IOS-1)", () => {
  it("la foto «maggie.png» con bytes de JPG viaja como image/jpeg", async () => {
    const { responderDirector } = await import("@/lib/director");
    const db = baseEnMemoria();
    const id = await crearEncargo(db);
    const r = await db.ejecutar(
      "INSERT INTO imagenes (carpeta, nombre, clave, tipo, bytes) VALUES ('Maggie', 'maggie.png', 'imagenes/maggie.png', 'imagen', 2000)",
    );
    await anotarMensaje(db, id, "richard", "Mira la foto de Maggie");
    const pedidos: Record<string, unknown>[] = [];
    const respuestas = [
      {
        content: [{ type: "tool_use", id: "toolu_a", name: "ver_imagen", input: { id: r.ultimoId } }],
        stop_reason: "tool_use",
      },
      { content: [{ type: "text", text: "La vi." }], stop_reason: "end_turn" },
    ];
    const falso: typeof fetch = async (_u, init) => {
      pedidos.push(JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>);
      const siguiente = respuestas.shift();
      return new Response(
        JSON.stringify({
          id: "msg",
          type: "message",
          role: "assistant",
          model: "claude-sonnet-5",
          stop_sequence: null,
          usage: { input_tokens: 10, output_tokens: 5 },
          ...siguiente,
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    };
    const almacen = {
      async get() {
        return { size: 4, arrayBuffer: async () => new Uint8Array([0xff, 0xd8, 0xff, 0xe0]).buffer };
      },
    };
    await responderDirector(db, id, { modelo: "claude-sonnet-5", apiKey: "x", almacen, fetch: falso });
    const ultimo = (pedidos[1]?.messages as { content: unknown }[]).at(-1)?.content;
    expect(JSON.stringify(ultimo)).toContain('"media_type":"image/jpeg"');
  });
});

describe("los avisos al iPhone cuando un video está listo (C-APP-IOS-4)", () => {
  it("solo los iPhone de la cuenta de Richard reciben avisos, y una dirección se guarda una sola vez", async () => {
    const { guardarTokenDeAvisos, telefonosParaAvisar, borrarTokenDeAvisos, esTokenDeAvisos } =
      await import("@/lib/app-sesion");
    const db = baseEnMemoria();
    const uno = "a".repeat(64);
    await guardarTokenDeAvisos(db, uno, "richard", "es");
    await guardarTokenDeAvisos(db, uno.toUpperCase(), "richard", "en");
    await guardarTokenDeAvisos(db, "b".repeat(64), "demo", "en");
    expect(await telefonosParaAvisar(db)).toEqual([{ token: uno, idioma: "en" }]);
    await borrarTokenDeAvisos(db, uno);
    expect(await telefonosParaAvisar(db)).toEqual([]);
    expect(esTokenDeAvisos("z".repeat(64))).toBe(false);
    expect(esTokenDeAvisos("0123abcd".repeat(8))).toBe(true);
  });

  it("el aviso sale en el idioma del teléfono y lleva el proyecto donde la app lo lee", async () => {
    const { textoDelAviso, cargaDelAviso } = await import("../estacion/src/avisos");
    expect(textoDelAviso("en", "Encargo 7")).toEqual({
      title: "Your video is ready",
      body: "Project 7: open it to watch, save or share.",
    });
    expect(textoDelAviso("es", "Panadería · pan dulce").title).toBe("Tu video está listo");
    expect(textoDelAviso("es", "Panadería · pan dulce").body).toContain("Panadería · pan dulce");
    const carga = cargaDelAviso({ title: "t", body: "b" }, 9);
    // En un aviso remoto la app de Expo lee los datos de «body»: si van en otro lado, tocar el aviso no abre nada.
    expect(carga).toEqual({
      aps: { alert: { title: "t", body: "b" }, sound: "default" },
      body: { encargoId: 9 },
    });
  });

  it("la firma para Apple es un ES256 válido con la llave, el equipo y la hora", async () => {
    const { firmaApns } = await import("../estacion/src/avisos");
    const { generateKeyPairSync, verify } = await import("node:crypto");
    const { privateKey, publicKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
    const pem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
    const jwt = firmaApns(pem, "KEYID12345", "TEAM123456", 1_800_000_000);
    const [cabeza, cuerpo, firma] = jwt.split(".");
    expect(JSON.parse(Buffer.from(cabeza ?? "", "base64url").toString())).toEqual({
      alg: "ES256",
      kid: "KEYID12345",
    });
    expect(JSON.parse(Buffer.from(cuerpo ?? "", "base64url").toString())).toEqual({
      iss: "TEAM123456",
      iat: 1_800_000_000,
    });
    expect(
      verify(
        "sha256",
        Buffer.from(`${cabeza}.${cuerpo}`),
        { key: publicKey, dsaEncoding: "ieee-p1363" },
        Buffer.from(firma ?? "", "base64url"),
      ),
    ).toBe(true);
  });
});
