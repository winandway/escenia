// Los casos de ayuda (C-AYUDA-1) y la puerta del gerente de correo (C-GERENTE-1). Base SQLite en memoria
// con el esquema de producción; ni el correo ni Apple se tocan de verdad.
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { baseEnMemoria } from "./base-memoria";
import {
  AJUSTE_CORREO_DOMINIO,
  AJUSTE_CORREO_ERROR,
  AJUSTE_HUELLA_GERENTE,
  avisosDeAyudaAtascados,
  avisosDeAyudaPendientes,
  casoPorCodigo,
  casosPorCodigos,
  crearCaso,
  enlaceDelCaso,
  escribirComoCliente,
  estadoDelCorreo,
  marcarAvisoDeAyuda,
  numeroDeCaso,
  pasaLimite,
  responderComoSoporte,
  secretoDelGerenteValido,
  ticketsParaElGerente,
  type CasoNuevo,
} from "@/lib/ayuda";
import { sha256Hex } from "@/lib/clave";
import { tocarLatido } from "@/lib/estacion-estado";
import { CORREO_SOPORTE } from "@/app/legal/textos";
import { TEXTOS_AYUDA } from "@/app/legal/textos-ayuda";
import { rutasDeIdioma } from "@/app/legal/SelectorIdioma";
import { buscarGuias, GUIAS, TEXTOS_DOCS } from "@/app/docs/guias";
import { proxy } from "@/proxy";

type Base = ReturnType<typeof baseEnMemoria>;

// Valores de mentira, distintos en cada corrida.
const SECRETO = `${crypto.randomUUID()}${crypto.randomUUID()}`;
const IPHONE = "ab12".repeat(16);
const SIN_CORREO = { token: undefined };

const nuevo = (extra: Partial<CasoNuevo> = {}): CasoNuevo => ({
  origen: "web",
  nombre: "Persona Prueba",
  correo: "Persona@Ejemplo.com",
  idioma: "en",
  asunto: "My video didn't arrive",
  mensaje: "I approved the card an hour ago.",
  ...extra,
});

async function conAjuste(db: Base, clave: string, valor: string) {
  await db.ejecutar("INSERT INTO ajustes (clave, valor) VALUES (?, ?)", [clave, valor]);
}

describe("los casos de ayuda de la persona (C-AYUDA-1)", () => {
  it("abrir un caso da su número y su enlace secreto; el chat no muestra el correo", async () => {
    const db = baseEnMemoria();
    const c = await crearCaso(db, nuevo());
    expect(c.numero).toBe(numeroDeCaso(c.id));
    expect(c.numero).toMatch(/^ESC-\d{4,}$/);
    expect(c.codigo).toMatch(/^[A-Za-z0-9_-]{43}$/);
    const chat = await casoPorCodigo(db, c.codigo);
    expect(chat).toMatchObject({ numero: c.numero, estado: "abierto", asunto: "My video didn't arrive" });
    expect(chat?.mensajes).toEqual([
      { de: "cliente", texto: "I approved the card an hour ago.", fecha: expect.stringMatching(/Z$/) },
    ]);
    expect(JSON.stringify(chat)).not.toContain("ejemplo.com");
    expect(await casoPorCodigo(db, "corto")).toBeNull();
    expect(await casoPorCodigo(db, "x".repeat(43))).toBeNull();
    expect(enlaceDelCaso(c.codigo, "es")).toBe(`https://escenia.sitios.dev/es/support/case/${c.codigo}`);
  });

  it("«Mis casos» trae solo los enlaces que guardó ese teléfono, y escribir otra vez reabre el caso", async () => {
    const db = baseEnMemoria();
    const mio = await crearCaso(db, nuevo());
    await crearCaso(db, nuevo({ asunto: "De otra persona" }));
    const lista = await casosPorCodigos(db, [mio.codigo, "inventado", mio.codigo]);
    expect(lista).toHaveLength(1);
    expect(lista[0]).toMatchObject({ codigo: mio.codigo, numero: mio.numero, estado: "abierto" });
    await responderComoSoporte(db, mio.id, { texto: "Ya lo revisamos.", cerrar: true }, SIN_CORREO);
    expect((await casosPorCodigos(db, [mio.codigo]))[0]).toMatchObject({
      estado: "cerrado",
      ultimo: { de: "soporte", texto: "Ya lo revisamos." },
    });
    expect(await escribirComoCliente(db, mio.codigo, "Sigue sin llegar.", IPHONE)).toBe(true);
    expect((await casoPorCodigo(db, mio.codigo))?.estado).toBe("abierto");
    const fila = await db.uno<{ aviso_token: string }>("SELECT aviso_token FROM ayuda_casos WHERE id = ?", [
      mio.id,
    ]);
    expect(fila?.aviso_token).toBe(IPHONE);
    // Escribir sin iPhone no le borra el iPhone que ya tenía.
    await escribirComoCliente(db, mio.codigo, "Otra cosa.");
    expect(
      (await db.uno<{ aviso_token: string }>("SELECT aviso_token FROM ayuda_casos WHERE id = ?", [mio.id]))
        ?.aviso_token,
    ).toBe(IPHONE);
    expect(await escribirComoCliente(db, "y".repeat(43), "hola")).toBe(false);
  });

  it("el límite deja pasar hasta el máximo por llave", async () => {
    const db = baseEnMemoria();
    for (let i = 0; i < 3; i++) expect(await pasaLimite(db, "ayuda-crear:1.2.3.4", 3, 3600)).toBe(true);
    expect(await pasaLimite(db, "ayuda-crear:1.2.3.4", 3, 3600)).toBe(false);
    expect(await pasaLimite(db, "ayuda-crear:5.6.7.8", 3, 3600)).toBe(true);
  });
});

describe("la puerta del gerente (C-GERENTE-1)", () => {
  it("sin el secreto, con uno malo o sin nada configurado da no; con la huella de la base o la variable, sí", async () => {
    const db = baseEnMemoria();
    expect(await secretoDelGerenteValido(db, `Bearer ${SECRETO}`, undefined)).toBe(false);
    await conAjuste(db, AJUSTE_HUELLA_GERENTE, await sha256Hex(SECRETO));
    expect(await secretoDelGerenteValido(db, null, undefined)).toBe(false);
    expect(await secretoDelGerenteValido(db, SECRETO, undefined)).toBe(false);
    expect(await secretoDelGerenteValido(db, `Bearer ${SECRETO.slice(1)}x`, undefined)).toBe(false);
    expect(await secretoDelGerenteValido(db, `Bearer ${SECRETO}`, undefined)).toBe(true);
    // La variable del panel manda sobre la huella de la base.
    const otro = `${crypto.randomUUID()}${crypto.randomUUID()}`;
    expect(await secretoDelGerenteValido(db, `Bearer ${otro}`, otro)).toBe(true);
    expect(await secretoDelGerenteValido(db, `Bearer ${SECRETO}`, otro)).toBe(false);
  });

  it("lista los abiertos (o todos) con el contrato de Divoox, sin correo", async () => {
    const db = baseEnMemoria();
    const a = await crearCaso(db, nuevo({ idioma: "es", asunto: "No me deja entrar" }));
    const b = await crearCaso(db, nuevo());
    await responderComoSoporte(db, b.id, { texto: "Listo.", cerrar: false }, SIN_CORREO);
    const abiertos = await ticketsParaElGerente(db, false);
    expect(abiertos).toEqual([
      {
        id: String(a.id),
        numero: a.numero,
        app: "escenia",
        cliente_nombre: "Persona Prueba",
        idioma: "es",
        asunto: "No me deja entrar",
        estado: "abierto",
        creado: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/),
        mensajes: [{ de: "cliente", texto: "I approved the card an hour ago.", fecha: expect.any(String) }],
      },
    ]);
    const todos = await ticketsParaElGerente(db, true);
    expect(todos.map((t) => t.numero).sort()).toEqual([a.numero, b.numero].sort());
    expect(todos.find((t) => t.id === String(b.id))?.mensajes.map((m) => m.de)).toEqual([
      "cliente",
      "soporte",
    ]);
    expect(JSON.stringify(todos)).not.toContain("ejemplo.com");
  });

  it("responder deja el mensaje de soporte con su plantilla, cambia el estado y dice por qué no salió el correo", async () => {
    const db = baseEnMemoria();
    const c = await crearCaso(db, nuevo());
    const r = await responderComoSoporte(
      db,
      c.id,
      { texto: "Ya salió tu video.", plantilla: "P3", cerrar: true },
      SIN_CORREO,
    );
    expect(r).toMatchObject({
      ok: true,
      numero: c.numero,
      plantilla: "P3",
      aviso: "sin_app",
      correo: "error",
    });
    expect(r?.correo_motivo).toContain("dominio");
    const m = await db.uno<{ de: string; plantilla: string; aviso: string }>(
      "SELECT de, plantilla, aviso FROM ayuda_mensajes WHERE caso_id = ? AND de = 'soporte'",
      [c.id],
    );
    expect(m).toEqual({ de: "soporte", plantilla: "P3", aviso: "" });
    expect((await casoPorCodigo(db, c.codigo))?.estado).toBe("cerrado");
    expect(await responderComoSoporte(db, 999, { texto: "x", cerrar: false }, SIN_CORREO)).toBeNull();
    // Sin dominio el correo sale apagado en el canario, no en rojo.
    expect((await estadoDelCorreo(db)).estado).toBe("apagado");
  });

  it("con iPhone el aviso queda en cola para la Mac: «ok» si está encendida, «error» si no", async () => {
    const db = baseEnMemoria();
    const c = await crearCaso(db, nuevo({ origen: "app", avisoToken: IPHONE }));
    const apagada = await responderComoSoporte(db, c.id, { texto: "Uno.", cerrar: false }, SIN_CORREO);
    expect(apagada?.aviso).toBe("error");
    await tocarLatido(db);
    const encendida = await responderComoSoporte(db, c.id, { texto: "Dos.", cerrar: false }, SIN_CORREO);
    expect(encendida?.aviso).toBe("ok");
    const pendientes = await avisosDeAyudaPendientes(db);
    expect(pendientes.map((p) => p.texto)).toEqual(["Uno.", "Dos."]);
    expect(pendientes[0]).toMatchObject({ token: IPHONE, idioma: "en", numero: c.numero, codigo: c.codigo });
  });

  it("con dominio conectado manda el correo desde soporte, con respuesta al buzón de Windoce; si falla, queda en el canario", async () => {
    const db = baseEnMemoria();
    await conAjuste(db, AJUSTE_CORREO_DOMINIO, "escenia.ejemplo.com");
    const c = await crearCaso(db, nuevo({ idioma: "es" }));
    const pedidos: { url: string; cuerpo: Record<string, unknown> }[] = [];
    const bien = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      pedidos.push({ url: String(url), cuerpo: JSON.parse(String(init?.body)) as Record<string, unknown> });
      return Response.json({ success: true, message_id: "m1", rebotados: [] });
    }) as unknown as typeof fetch;
    const r = await responderComoSoporte(
      db,
      c.id,
      { texto: "Hola.", cerrar: false },
      { token: "t".repeat(20), enviar: bien },
    );
    expect(r?.correo).toBe("ok");
    expect(pedidos[0]?.url).toBe("https://yapanel.yadominios.com/api/hosting/correo/enviar");
    expect(pedidos[0]?.cuerpo).toMatchObject({
      sitio: "escenia",
      from: { address: "support@escenia.ejemplo.com", name: "Escenia Support" },
      to: [{ address: "persona@ejemplo.com" }],
      reply_to: CORREO_SOPORTE,
      subject: `Te respondimos tu caso ${c.numero}`,
    });
    expect(String(pedidos[0]?.cuerpo.text)).toContain(`/es/support/case/${c.codigo}`);
    expect((await estadoDelCorreo(db)).estado).toBe("ok");

    const mal = (async () =>
      Response.json({ error: "Sin cupo hoy." }, { status: 429 })) as unknown as typeof fetch;
    const r2 = await responderComoSoporte(
      db,
      c.id,
      { texto: "Otra.", cerrar: false },
      { token: "t".repeat(20), enviar: mal },
    );
    expect(r2).toMatchObject({ correo: "error", correo_motivo: "Sin cupo hoy." });
    expect(await estadoDelCorreo(db)).toMatchObject({ estado: "error" });
    expect(
      (await db.uno<{ valor: string }>("SELECT valor FROM ajustes WHERE clave = ?", [AJUSTE_CORREO_ERROR]))
        ?.valor,
    ).toContain("Sin cupo hoy.");
    // El primer envío bueno apaga la alarma.
    await responderComoSoporte(
      db,
      c.id,
      { texto: "Ya.", cerrar: false },
      { token: "t".repeat(20), enviar: bien },
    );
    expect((await estadoDelCorreo(db)).estado).toBe("ok");
  });
});

describe("los avisos de ayuda que manda la Mac (C-AYUDA-1)", () => {
  it("enviado sale de la cola; una dirección muerta deja el caso sin iPhone y no se reintenta", async () => {
    const db = baseEnMemoria();
    const c = await crearCaso(db, nuevo({ origen: "app", avisoToken: IPHONE }));
    for (const texto of ["Uno.", "Dos.", "Tres."])
      await responderComoSoporte(db, c.id, { texto, cerrar: false }, SIN_CORREO);
    const [uno, dos] = await avisosDeAyudaPendientes(db);
    await marcarAvisoDeAyuda(db, uno!.mensajeId, "enviado", false);
    expect((await avisosDeAyudaPendientes(db)).map((p) => p.texto)).toEqual(["Dos.", "Tres."]);
    await marcarAvisoDeAyuda(db, dos!.mensajeId, "fallo", true);
    expect(await avisosDeAyudaPendientes(db)).toEqual([]);
    const fila = await db.uno<{ aviso_token: string }>("SELECT aviso_token FROM ayuda_casos WHERE id = ?", [
      c.id,
    ]);
    expect(fila?.aviso_token).toBe("");
    const r = await responderComoSoporte(db, c.id, { texto: "Cuatro.", cerrar: false }, SIN_CORREO);
    expect(r?.aviso).toBe("sin_app");
  });

  it("un aviso que lleva más de 10 minutos sin salir cuenta como atascado", async () => {
    const db = baseEnMemoria();
    const c = await crearCaso(db, nuevo({ origen: "app", avisoToken: IPHONE }));
    await responderComoSoporte(db, c.id, { texto: "Hola.", cerrar: false }, SIN_CORREO);
    expect(await avisosDeAyudaAtascados(db)).toBe(0);
    await db.ejecutar(
      "UPDATE ayuda_mensajes SET creado_en = datetime('now', '-11 minutes') WHERE aviso = 'pendiente'",
    );
    expect(await avisosDeAyudaAtascados(db)).toBe(1);
  });

  it("el aviso dice el número del caso en su idioma y lleva el caso donde la app lo lee", async () => {
    const { textoDelAvisoDeAyuda } = await import("../estacion/src/avisos");
    expect(textoDelAvisoDeAyuda("en", "ESC-1001", "Done.")).toEqual({
      title: "We replied to your case ESC-1001",
      body: "Done.",
    });
    expect(textoDelAvisoDeAyuda("es", "ESC-1001", "Listo.").title).toBe("Te respondimos tu caso ESC-1001");
  });

  it("la Mac manda los pendientes, marca los buenos y deja pendiente un fallo pasajero", async () => {
    vi.resetModules();
    vi.doMock("../estacion/src/config", () => ({
      config: { PANEL_URL: "https://panel.prueba", ESTACION_SECRETO: "s".repeat(30) },
    }));
    const marcas: unknown[] = [];
    const fetchFalso = vi.fn(async (url: string, init?: RequestInit) => {
      if (init?.method === "POST") {
        marcas.push(JSON.parse(String(init.body)));
        return Response.json({ ok: true });
      }
      return Response.json({
        avisos: [
          { mensajeId: 1, token: IPHONE, idioma: "es", numero: "ESC-1001", codigo: "c1", texto: "Uno." },
          { mensajeId: 2, token: IPHONE, idioma: "es", numero: "ESC-1001", codigo: "c1", texto: "Dos." },
          {
            mensajeId: 3,
            token: "cd".repeat(32),
            idioma: "en",
            numero: "ESC-1002",
            codigo: "c2",
            texto: "Tres.",
          },
        ],
      });
    });
    vi.stubGlobal("fetch", fetchFalso);
    try {
      const { avisarRespuestasDeAyuda } = await import("../estacion/src/avisos");
      const cargas: unknown[] = [];
      const respuestas = [
        { estado: 200, motivo: "" },
        { estado: 0, motivo: "sin red" },
        { estado: 410, motivo: "Unregistered" },
      ];
      const enviar = vi.fn(async (_t: string, carga: object) => {
        cargas.push(carga);
        return respuestas.shift()!;
      });
      expect(await avisarRespuestasDeAyuda(enviar)).toBe(1);
      expect(cargas[0]).toEqual({
        aps: { alert: { title: "Te respondimos tu caso ESC-1001", body: "Uno." }, sound: "default" },
        body: { caso: "c1" },
      });
      expect(marcas).toEqual([
        { mensajeId: 1, resultado: "enviado", direccionMuerta: false },
        { mensajeId: 3, resultado: "fallo", direccionMuerta: true },
      ]);
      expect(fetchFalso.mock.calls[0]?.[0]).toBe("https://panel.prueba/datos/estacion/ayuda");
    } finally {
      vi.unstubAllGlobals();
      vi.doUnmock("../estacion/src/config");
    }
  });
});

describe("lo público de la ayuda se abre sin sesión y está en los dos idiomas", () => {
  it("Docs, los casos por su enlace, las capturas y el mapa del sitio son públicos; el panel no", () => {
    const pedir = (ruta: string) => proxy(new NextRequest(`https://escenia.sitios.dev${ruta}`));
    for (const ruta of [
      "/docs",
      "/es/docs",
      "/docs/help/support-cases",
      "/es/docs/help/support-cases",
      `/support/case/${"a".repeat(43)}`,
      `/es/support/case/${"a".repeat(43)}`,
      "/capturas/ayuda-caso-en.png",
      "/sitemap.xml",
      "/datos/gerente/tickets",
    ])
      expect(pedir(ruta).headers.get("location"), ruta).toBeNull();
    for (const ruta of ["/gastos", "/docsx", "/support/casex", "/capturasecreta"])
      expect(pedir(ruta).headers.get("location"), ruta).toContain("/entrar");
  });

  it("el selector de idioma lleva a la misma página en el otro idioma", () => {
    expect(rutasDeIdioma("/docs/help/support-cases")).toEqual({
      en: "/docs/help/support-cases",
      es: "/es/docs/help/support-cases",
    });
    expect(rutasDeIdioma("/es/support/case/abc")).toEqual({
      en: "/support/case/abc",
      es: "/es/support/case/abc",
    });
    expect(rutasDeIdioma("/es")).toEqual({ en: "/", es: "/es" });
  });

  it("los textos de la ayuda y de Docs tienen las mismas llaves en inglés y en español, ninguna vacía", () => {
    for (const textos of [TEXTOS_AYUDA, TEXTOS_DOCS]) {
      expect(Object.keys(textos.es).sort()).toEqual(Object.keys(textos.en).sort());
      for (const v of [...Object.values(textos.en), ...Object.values(textos.es)])
        expect(v.trim()).not.toBe("");
    }
  });

  it("cada guía está completa en los dos idiomas, con los mismos bloques, y el buscador la encuentra sin tildes", () => {
    expect(GUIAS.some((g) => g.slug === "support-cases")).toBe(true);
    for (const g of GUIAS) {
      expect(g.es.bloques.map((b) => b.tipo)).toEqual(g.en.bloques.map((b) => b.tipo));
      for (const c of [g.en, g.es]) {
        expect(c.titulo.trim()).not.toBe("");
        expect(c.resumen.trim()).not.toBe("");
      }
      // Lo público no lleva rutas internas ni nombres técnicos.
      expect(JSON.stringify(g)).not.toMatch(/\/datos\/|gerente|ESTACION|YaDominios|fal\.ai|ElevenLabs/i);
    }
    expect(buscarGuias("es", "numero de caso").map((g) => g.slug)).toEqual(["support-cases"]);
    expect(buscarGuias("en", "case number").map((g) => g.slug)).toEqual(["support-cases"]);
    expect(buscarGuias("en", "zzzz")).toEqual([]);
  });
});

describe("la ayuda en la app de iPhone (C-AYUDA-1)", () => {
  it("«Tus casos» pone el último primero, sin repetir y hasta 30; el correo se revisa antes de mandar", async () => {
    const { agregarCaso, correoValido } = await import("../movil/src/logica");
    expect(agregarCaso(["b", "a"], "a")).toEqual(["a", "b"]);
    expect(agregarCaso([], "c")).toEqual(["c"]);
    const muchos = Array.from({ length: 30 }, (_, i) => `c${i}`);
    expect(agregarCaso(muchos, "nuevo")).toHaveLength(30);
    expect(agregarCaso(muchos, "nuevo")[0]).toBe("nuevo");
    expect(correoValido("correo@ejemplo.com")).toBe(true);
    expect(correoValido("sin-arroba")).toBe(false);
    expect(correoValido("a@b")).toBe(false);
  });

  it("la app abre la ayuda sin cuenta (entrar) y con cuenta (menú), y el aviso tocado abre el caso", () => {
    const raiz = path.resolve(__dirname, "..");
    const entrar = readFileSync(path.join(raiz, "movil/app/entrar.tsx"), "utf8");
    const proyectos = readFileSync(path.join(raiz, "movil/app/proyectos.tsx"), "utf8");
    const raizApp = readFileSync(path.join(raiz, "movil/app/_layout.tsx"), "utf8");
    const ayuda = readFileSync(path.join(raiz, "movil/app/ayuda/index.tsx"), "utf8");
    const chat = readFileSync(path.join(raiz, "movil/app/ayuda/[codigo].tsx"), "utf8");
    expect(entrar).toContain('router.push("/ayuda")');
    expect(proyectos).toContain('router.push("/ayuda")');
    expect(raizApp).toMatch(/casoDelAviso\(r\)[\s\S]*\/ayuda\/\[codigo\]/);
    // Ningún formulario pierde lo escrito: las dos pantallas usan el borrador.
    expect(ayuda).toContain('useBorrador("ayuda-mensaje"');
    expect(chat).toContain("useBorrador(`ayuda-caso-${codigo}`");
  });
});
