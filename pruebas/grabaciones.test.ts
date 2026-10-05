import { beforeEach, describe, expect, it } from "vitest";
import { baseEnMemoria } from "./base-memoria";
import {
  avisoDeGrabacion,
  esquemaGrabacionNueva,
  extensionDeVideo,
  MAX_BYTES_GRABACION,
  partesDe,
  TAMANO_PARTE,
} from "@compartido/grabaciones";
import { esquemaGuion } from "@compartido/guion";
import { buscarTematica, TEMATICAS } from "@compartido/tematicas";
import {
  anotarError,
  claveDeGrabacion,
  crearGrabacion,
  grabacionDeGuion,
  grabacionesAtascadas,
  grabacionesVisibles,
  grabacionPorId,
  marcarSubida,
  NOTA_DE_GRABACION,
  otraVersion,
  planDeGrabacion,
  quitarGrabacion,
  registrarPlan,
  reintentarGrabacion,
  TEMATICA_DE_GRABACION,
  tomarSiguiente,
} from "@/lib/grabaciones";
import { FalloDeSubida, seguirSubida, type SubidaEnCurso } from "@/app/grabaciones/subida";

const NUEVA = {
  tema: "Cómo se arma un video con diagramas",
  formato: "neon",
  canal: "canal-ia",
  archivo: "IMG_0042.MOV",
  bytes: 250_000_000,
} as const;

const PLAN = esquemaGuion.parse({
  titulo: "Así se arma un video con diagramas",
  gancho: "Te muestro cómo se arma.",
  escenas: [
    {
      parte: "gancho",
      narracion: "Hoy te muestro cómo se arma un video con diagramas, paso a paso.",
      visual: { tipo: "texto", titular: "Paso a paso" },
    },
    {
      parte: "contexto",
      narracion: "Primero se graba, después se sube y la Mac hace el resto.",
      visual: { tipo: "texto", titular: "Grabar y subir" },
    },
    {
      parte: "cierre",
      narracion: "Y eso es todo lo que hace falta para empezar.",
      visual: { tipo: "texto", titular: "Para empezar" },
    },
  ],
});

describe("grabaciones de Richard: subir, planear y producir (C-GRABACIONES-1)", () => {
  let db: ReturnType<typeof baseEnMemoria>;
  beforeEach(() => {
    db = baseEnMemoria();
  });

  const subida = async (datos: Partial<typeof NUEVA> = {}) => {
    const d = esquemaGrabacionNueva.parse({ ...NUEVA, ...datos });
    const id = await crearGrabacion(db, d, claveDeGrabacion(d.archivo));
    await marcarSubida(db, id, d.bytes);
    return id;
  };

  it("solo entra un video de verdad, con su tema, y el archivo se parte en trozos que el almacén acepta", () => {
    expect(esquemaGrabacionNueva.safeParse(NUEVA).success).toBe(true);
    expect(esquemaGrabacionNueva.safeParse({ ...NUEVA, tema: "" }).success).toBe(false);
    expect(esquemaGrabacionNueva.safeParse({ ...NUEVA, formato: "otro" }).success).toBe(false);
    expect(esquemaGrabacionNueva.safeParse({ ...NUEVA, bytes: 10 }).success).toBe(false);
    expect(esquemaGrabacionNueva.safeParse({ ...NUEVA, bytes: MAX_BYTES_GRABACION + 1 }).success).toBe(false);
    expect(extensionDeVideo("IMG_0042.MOV")).toBe("mov");
    expect(extensionDeVideo("clip.final.mp4")).toBe("mp4");
    expect(extensionDeVideo("cancion.mp3")).toBeNull();
    expect(extensionDeVideo("programa.exe")).toBeNull();

    // El almacén exige al menos 5 MB por trozo (menos el último) y el panel acepta hasta 10.
    expect(TAMANO_PARTE).toBeGreaterThanOrEqual(5 * 1024 * 1024);
    expect(TAMANO_PARTE).toBeLessThanOrEqual(10 * 1024 * 1024);
    const partes = partesDe(TAMANO_PARTE * 2 + 100);
    expect(partes.map((p) => p.n)).toEqual([1, 2, 3]);
    expect(partes[0]).toEqual({ n: 1, desde: 0, hasta: TAMANO_PARTE });
    expect(partes[2]).toEqual({ n: 3, desde: TAMANO_PARTE * 2, hasta: TAMANO_PARTE * 2 + 100 });
    expect(partesDe(TAMANO_PARTE)).toHaveLength(1);
  });

  it("la dirección en el almacén no depende del nombre que traiga el archivo", () => {
    expect(claveDeGrabacion("../../guiones/1/video.mp4")).toMatch(/^grabaciones\/\d+-[a-z0-9]+\.mp4$/);
    expect(claveDeGrabacion("Mi Video Final.MOV")).toMatch(/^grabaciones\/\d+-[a-z0-9]+\.mov$/);
  });

  it("una subida a medias no se le entrega a la Estación; una terminada sí, y una sola vez", async () => {
    const d = esquemaGrabacionNueva.parse(NUEVA);
    const id = await crearGrabacion(db, d, claveDeGrabacion(d.archivo));
    expect(await tomarSiguiente(db)).toBeNull();
    expect(await marcarSubida(db, id, 249_999_000)).toBe(true);
    const tomada = await tomarSiguiente(db);
    expect(tomada?.id).toBe(id);
    expect(tomada?.bytes).toBe(249_999_000);
    expect(await tomarSiguiente(db)).toBeNull();
    // Cerrar dos veces la misma subida no la devuelve a la fila.
    expect(await marcarSubida(db, id, 1)).toBe(false);
  });

  it("una grabación tomada que quedó colgada vuelve a la fila sola", async () => {
    const id = await subida();
    await tomarSiguiente(db);
    db.cruda
      .prepare("UPDATE grabaciones SET actualizado_en = datetime('now', '-41 minutes') WHERE id = ?")
      .run(id);
    expect((await tomarSiguiente(db))?.id).toBe(id);
  });

  it("con el plan nace un guion aprobado y su trabajo, sin inventarle una opinión a Richard", async () => {
    const id = await subida();
    const tomada = await tomarSiguiente(db);
    const r = await registrarPlan(db, tomada!, PLAN, { modelo: "claude-sonnet-4-6", costoUsd: 0.05 });
    const guion = await db.uno<{
      estado: string;
      tematica_id: string;
      opinion_richard: string;
      contenido: string;
    }>("SELECT * FROM guiones WHERE id = ?", [r.guionId]);
    expect(guion?.estado).toBe("aprobado");
    expect(guion?.tematica_id).toBe("presentador");
    expect(guion?.opinion_richard).toBe(NOTA_DE_GRABACION);
    // La narración que se guarda es la del plan, palabra por palabra.
    expect(esquemaGuion.parse(JSON.parse(guion!.contenido)).escenas[0]?.narracion).toBe(
      PLAN.escenas[0]?.narracion,
    );
    const trabajo = await db.uno<{ estado: string; tipo: string; guion_id: number }>(
      "SELECT * FROM trabajos WHERE id = ?",
      [r.trabajoId],
    );
    expect(trabajo).toMatchObject({ estado: "pendiente", tipo: "producir", guion_id: r.guionId });
    expect((await grabacionPorId(db, id))?.estado).toBe("planeada");
    // La Estación sabe, por el guion, que ese trabajo lleva a Richard en cámara y con qué formato.
    expect(await grabacionDeGuion(db, r.guionId)).toMatchObject({ id, formato: "neon" });
    expect(await grabacionDeGuion(db, 9999)).toBeNull();
  });

  it("si el pedido del plan llega dos veces, no se crea un segundo guion ni un segundo trabajo", async () => {
    const id = await subida();
    const tomada = await tomarSiguiente(db);
    const uno = await registrarPlan(db, tomada!, PLAN, { modelo: "m", costoUsd: 0 });
    // El segundo pedido trae la fila vieja (todavía «tomada», sin guion): es el caso del reintento.
    const dos = await registrarPlan(db, tomada!, PLAN, { modelo: "m", costoUsd: 0 });
    expect(dos).toEqual(uno);
    expect(await planDeGrabacion(db, id)).toEqual(uno);
    expect((await db.uno<{ n: number }>("SELECT COUNT(id) AS n FROM guiones"))?.n).toBe(1);
    expect((await db.uno<{ n: number }>("SELECT COUNT(id) AS n FROM trabajos"))?.n).toBe(1);
  });

  it("las temáticas del Presentador existen, una por canal, y no se ofrecen en «Nuevo video»", () => {
    for (const [canal, id] of Object.entries(TEMATICA_DE_GRABACION)) {
      const t = buscarTematica(id);
      expect(t?.canal).toBe(canal);
      expect(t?.activa).toBe(false);
    }
    expect(TEMATICAS.filter((t) => t.activa).some((t) => t.id.startsWith("presentador"))).toBe(false);
  });

  it("probar con otro formato reusa el mismo archivo y vuelve a la fila", async () => {
    const id = await subida();
    const original = await grabacionPorId(db, id);
    const nuevo = await otraVersion(db, id, "ilustrado");
    const copia = await grabacionPorId(db, nuevo!);
    expect(copia).toMatchObject({
      formato: "ilustrado",
      estado: "subida",
      clave: original?.clave,
      bytes: original?.bytes,
      tema: original?.tema,
      guion_id: null,
    });
    // De una subida que no terminó no se puede sacar otra versión.
    const d = esquemaGrabacionNueva.parse(NUEVA);
    const aMedias = await crearGrabacion(db, d, claveDeGrabacion(d.archivo));
    expect(await otraVersion(db, aMedias, "clasico")).toBeNull();
  });

  it("un fallo queda a la vista, se puede reintentar, y «Quitar» no borra nada", async () => {
    const id = await subida();
    await tomarSiguiente(db);
    await anotarError(db, id, "La transcripción salió vacía: ¿la grabación tiene voz?");
    let [fila] = await grabacionesVisibles(db);
    expect(avisoDeGrabacion(fila!)).toMatchObject({ tono: "error", enCurso: false });
    expect(avisoDeGrabacion(fila!).texto).toContain("tiene voz");
    await reintentarGrabacion(db, id);
    expect((await tomarSiguiente(db))?.id).toBe(id);

    // Mientras la Mac la tiene tomada no se puede quitar; después sí, y el registro se conserva.
    await quitarGrabacion(db, id);
    expect((await grabacionPorId(db, id))?.estado).toBe("tomada");
    await anotarError(db, id, "x");
    await quitarGrabacion(db, id);
    expect(await grabacionesVisibles(db)).toHaveLength(0);
    expect((await grabacionPorId(db, id))?.estado).toBe("quitada");
    [fila] = await grabacionesVisibles(db);
    expect(fila).toBeUndefined();
  });

  it("a Richard se le dice cómo va, también el video que salió de la grabación", async () => {
    const id = await subida();
    let [fila] = await grabacionesVisibles(db);
    expect(avisoDeGrabacion(fila!)).toMatchObject({ tono: "espera", enCurso: true });
    // Con la Mac apagada no se le promete «menos de un minuto».
    expect(avisoDeGrabacion(fila!).texto).toContain("menos de un minuto");
    expect(avisoDeGrabacion(fila!, false).texto).not.toContain("menos de un minuto");
    expect(avisoDeGrabacion(fila!, false).texto).toContain("hasta que la Mac vuelva");
    const tomada = await tomarSiguiente(db);
    [fila] = await grabacionesVisibles(db);
    expect(avisoDeGrabacion(fila!)).toMatchObject({ tono: "trabajando", enCurso: true });
    const r = await registrarPlan(db, tomada!, PLAN, { modelo: "m", costoUsd: 0 });
    [fila] = await grabacionesVisibles(db);
    expect(avisoDeGrabacion(fila!).texto).toContain("en la fila");
    db.cruda
      .prepare("UPDATE trabajos SET estado = 'tomado', progreso = 45, paso = 'armando' WHERE id = ?")
      .run(r.trabajoId);
    [fila] = await grabacionesVisibles(db);
    expect(avisoDeGrabacion(fila!).texto).toContain("45%");
    db.cruda.prepare("UPDATE trabajos SET estado = 'hecho' WHERE id = ?").run(r.trabajoId);
    [fila] = await grabacionesVisibles(db);
    expect(avisoDeGrabacion(fila!)).toMatchObject({ tono: "listo", enCurso: false });
    db.cruda
      .prepare("UPDATE trabajos SET estado = 'error', error = 'sin croma' WHERE id = ?")
      .run(r.trabajoId);
    [fila] = await grabacionesVisibles(db);
    expect(avisoDeGrabacion(fila!)).toMatchObject({ tono: "error", enCurso: false });
    expect(fila?.id).toBe(id);
  });

  it("el canario ve una grabación que lleva horas esperando", async () => {
    const id = await subida();
    expect(await grabacionesAtascadas(db)).toBe(0);
    db.cruda
      .prepare("UPDATE grabaciones SET actualizado_en = datetime('now', '-4 hours') WHERE id = ?")
      .run(id);
    expect(await grabacionesAtascadas(db)).toBe(1);
  });
});

describe("la subida desde el navegador aguanta un corte de internet", () => {
  const archivo = (bytes: number) => new File([new Uint8Array(bytes)], "video.mp4");
  const respuesta = (cuerpo: unknown, status = 200) =>
    new Response(JSON.stringify(cuerpo), { status, headers: { "content-type": "application/json" } });
  const nuevaSubida = (bytes: number): SubidaEnCurso => ({
    archivo: archivo(bytes),
    id: 7,
    uploadId: "abc",
    partes: [],
  });
  const sinEsperar = async () => {};

  it("un trozo que falla se repite y la subida termina con todos los trozos en orden", async () => {
    const s = nuevaSubida(TAMANO_PARTE * 2 + 5);
    const pedidos: string[] = [];
    let fallos = 2;
    const pedir = (async (url: string | URL | Request, opciones?: RequestInit) => {
      const u = String(url);
      pedidos.push(u);
      if (u.includes("/parte")) {
        const n = Number(new URL(u, "http://x").searchParams.get("n"));
        if (n === 2 && fallos-- > 0) throw new TypeError("fetch failed");
        return respuesta({ partNumber: n, etag: `e${n}` });
      }
      const cuerpo = JSON.parse(String(opciones?.body)) as { partes: { partNumber: number }[] };
      expect(cuerpo.partes.map((p) => p.partNumber)).toEqual([1, 2, 3]);
      return respuesta({ ok: true });
    }) as typeof fetch;
    const avances: number[] = [];
    await seguirSubida(s, (subidos) => avances.push(subidos), { pedir, dormir: sinEsperar });
    expect(pedidos.filter((u) => u.includes("n=2"))).toHaveLength(3);
    expect(avances.at(-1)).toBe(TAMANO_PARTE * 2 + 5);
    expect(pedidos.at(-1)).toContain("/terminar");
  });

  it("si la red no vuelve, se pausa sin perder lo subido, y al seguir no repite los trozos que ya llegaron", async () => {
    const s = nuevaSubida(TAMANO_PARTE * 3);
    let caida = true;
    const pedidos: string[] = [];
    const pedir = (async (url: string | URL | Request) => {
      const u = String(url);
      pedidos.push(u);
      if (u.includes("/parte")) {
        const n = Number(new URL(u, "http://x").searchParams.get("n"));
        if (n >= 2 && caida) throw new TypeError("fetch failed");
        return respuesta({ partNumber: n, etag: `e${n}` });
      }
      return respuesta({ ok: true });
    }) as typeof fetch;
    const fallo = await seguirSubida(s, () => {}, { pedir, dormir: sinEsperar }).catch((e: unknown) => e);
    expect(fallo).toBeInstanceOf(FalloDeSubida);
    expect((fallo as FalloDeSubida).sePuedeSeguir).toBe(true);
    expect(s.partes.map((p) => p.partNumber)).toEqual([1]);

    caida = false;
    pedidos.length = 0;
    await seguirSubida(s, () => {}, { pedir, dormir: sinEsperar });
    expect(pedidos.some((u) => u.includes("n=1"))).toBe(false);
    expect(s.partes.map((p) => p.partNumber)).toEqual([1, 2, 3]);
  });

  it("si la sesión se cerró, no insiste: lo dice y no deja seguir una subida que el panel rechazó", async () => {
    const s = nuevaSubida(100);
    let veces = 0;
    const pedir = (async () => {
      veces++;
      return respuesta({ error: "Tu sesión se cerró. Entra otra vez y vuelve a subir el video." }, 401);
    }) as typeof fetch;
    const fallo = await seguirSubida(s, () => {}, { pedir, dormir: sinEsperar }).catch((e: unknown) => e);
    expect((fallo as FalloDeSubida).message).toContain("sesión se cerró");
    expect((fallo as FalloDeSubida).sePuedeSeguir).toBe(false);
    expect(veces).toBe(1);
  });
});
