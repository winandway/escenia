import { beforeEach, describe, expect, it } from "vitest";
import { baseEnMemoria } from "./base-memoria";
import {
  cuando,
  etiquetaDia,
  hora12,
  hoyEn,
  huecosDelDia,
  leerHoras,
  lunesDe,
  normalizarHora,
  piezasPorAgendar,
  proximoHueco,
  REGLAS_POR_DEFECTO,
  repartir,
  revisarHueco,
  sumarDias,
  type EntradaCalendario,
} from "@compartido/calendario";
import {
  agendar,
  agendarEnProximoHueco,
  cambiarEstado,
  descartar,
  entradasEntre,
  guardarReglas,
  mover,
  pendientes,
  quitar,
  reglasCalendario,
} from "@/lib/calendario";

const reglas = REGLAS_POR_DEFECTO; // Shorts 12:00 y 19:00 · largo 16:00 · 3 horas de separación
const ahora = { fecha: "2026-10-01", hora: "09:00" };
let n = 0;
const entrada = (p: Partial<EntradaCalendario>): EntradaCalendario => ({
  id: ++n,
  guion_id: null,
  pieza: "short",
  indice: 1,
  titulo: "Un Short",
  canal: "caprichoso-tv",
  plataforma: "youtube",
  fecha: "2026-10-01",
  hora: "12:00",
  estado: "agendado",
  nota: "",
  enlace: "",
  ...p,
});
const pedido = { canal: "caprichoso-tv", plataforma: "youtube", pieza: "short" } as const;

describe("calendario: horas y fechas", () => {
  it("entiende las horas como las escribe una persona", () => {
    expect(normalizarHora("7 pm")).toBe("19:00");
    expect(normalizarHora("7:30 p. m.")).toBe("19:30");
    expect(normalizarHora("12 am")).toBe("00:00");
    expect(normalizarHora("12 pm")).toBe("12:00");
    expect(normalizarHora("19:00")).toBe("19:00");
    expect(normalizarHora("9:05")).toBe("09:05");
    expect(normalizarHora("25:00")).toBeNull();
    expect(normalizarHora("13 pm")).toBeNull();
    expect(normalizarHora("mañana")).toBeNull();
    expect(leerHoras("7 pm, 12:00; 12:00")).toEqual(["12:00", "19:00"]);
    expect(hora12("19:00")).toBe("7:00 p. m.");
    expect(hora12("00:15")).toBe("12:15 a. m.");
  });

  it("suma días, encuentra el lunes y nombra el día", () => {
    expect(sumarDias("2026-09-30", 1)).toBe("2026-10-01");
    expect(sumarDias("2026-12-31", 1)).toBe("2027-01-01");
    expect(lunesDe("2026-10-01")).toBe("2026-09-28");
    expect(lunesDe("2026-09-28")).toBe("2026-09-28");
    expect(etiquetaDia("2026-10-01", "2026-10-01")).toBe("Hoy");
    expect(etiquetaDia("2026-10-02", "2026-10-01")).toBe("Mañana");
    expect(cuando("2026-10-01", "19:00")).toBe("jue 1 oct · 7:00 p. m.");
    expect(cuando("2026-10-01", "")).toBe("jue 1 oct · falta la hora");
  });

  it("sabe qué día y qué hora es en la zona de Richard", () => {
    // Las 02:30 UTC del 2 de octubre son las 22:30 del 1 de octubre en el este de EE. UU.
    expect(hoyEn("America/New_York", new Date("2026-10-02T02:30:00Z"))).toEqual({
      fecha: "2026-10-01",
      hora: "22:30",
    });
  });
});

describe("calendario: choques (C-CALENDARIO-1)", () => {
  it("no deja dos publicaciones a la misma hora en el mismo canal y plataforma", () => {
    const choque = revisarHueco(
      [entrada({ titulo: "El día que la madre subió al avión" })],
      { ...pedido, fecha: "2026-10-01", hora: "12:00" },
      reglas,
    );
    expect(choque?.motivo).toBe("misma-hora");
    expect(choque?.mensaje).toContain("El día que la madre subió al avión");
    expect(choque?.mensaje).toContain("Caprichoso TV (YouTube)");
  });

  it("exige la separación mínima, también de un día para otro", () => {
    const ocupadas = [entrada({ hora: "12:00" }), entrada({ fecha: "2026-09-30", hora: "23:00" })];
    expect(revisarHueco(ocupadas, { ...pedido, fecha: "2026-10-01", hora: "14:00" }, reglas)?.motivo).toBe(
      "muy-cerca",
    );
    expect(revisarHueco(ocupadas, { ...pedido, fecha: "2026-10-01", hora: "01:00" }, reglas)?.motivo).toBe(
      "muy-cerca",
    );
    expect(revisarHueco(ocupadas, { ...pedido, fecha: "2026-10-01", hora: "19:00" }, reglas)).toBeNull();
  });

  it("respeta el máximo por día: tantos Shorts como horas tienen las reglas", () => {
    const lleno = [entrada({ hora: "08:00" }), entrada({ hora: "12:00" })];
    const choque = revisarHueco(lleno, { ...pedido, fecha: "2026-10-01", hora: "19:00" }, reglas);
    expect(choque?.motivo).toBe("dia-lleno");
    expect(choque?.mensaje).toContain("El máximo por día es 2");
    // Una entrada sin hora también cuenta para el máximo del día.
    const sinHora = [entrada({ hora: "" }), entrada({ hora: "" })];
    expect(revisarHueco(sinHora, { ...pedido, fecha: "2026-10-01", hora: "19:00" }, reglas)?.motivo).toBe(
      "dia-lleno",
    );
  });

  it("otro canal u otra plataforma no chocan, y una entrada no choca consigo misma", () => {
    const ocupadas = [entrada({ id: 77 })];
    expect(
      revisarHueco(ocupadas, { ...pedido, canal: "canal-ia", fecha: "2026-10-01", hora: "12:00" }, reglas),
    ).toBeNull();
    expect(
      revisarHueco(
        ocupadas,
        { ...pedido, plataforma: "facebook", fecha: "2026-10-01", hora: "12:00" },
        reglas,
      ),
    ).toBeNull();
    expect(
      revisarHueco(ocupadas, { ...pedido, id: 77, fecha: "2026-10-01", hora: "12:00" }, reglas),
    ).toBeNull();
    expect(
      revisarHueco(
        [entrada({ estado: "descartado" })],
        { ...pedido, fecha: "2026-10-01", hora: "12:00" },
        reglas,
      ),
    ).toBeNull();
  });

  it("un Short no sale antes que su video completo", () => {
    const largo = entrada({ guion_id: 5, pieza: "largo", indice: 0, hora: "16:00", titulo: "El largo" });
    expect(
      revisarHueco([largo], { ...pedido, guion_id: 5, fecha: "2026-10-01", hora: "12:00" }, reglas)?.motivo,
    ).toBe("antes-del-largo");
    expect(
      revisarHueco([largo], { ...pedido, guion_id: 5, fecha: "2026-10-01", hora: "19:00" }, reglas),
    ).toBeNull();
    expect(
      revisarHueco([largo], { ...pedido, guion_id: 9, fecha: "2026-10-01", hora: "12:00" }, reglas),
    ).toBeNull();
  });
});

describe("calendario: huecos libres y reparto", () => {
  it("marca cada hora del día como libre, pasada u ocupada, y dice por qué", () => {
    const huecos = huecosDelDia(
      [entrada({ hora: "19:00", titulo: "Ocupante" })],
      pedido,
      "2026-10-01",
      reglas,
      {
        fecha: "2026-10-01",
        hora: "12:30",
      },
    );
    expect(huecos).toEqual([
      { hora: "12:00", libre: false, motivo: "Esa hora ya pasó." },
      { hora: "19:00", libre: false, motivo: expect.stringContaining("Ocupante") as string },
    ]);
  });

  it("encuentra el primer hueco libre saltando lo ocupado y lo que ya pasó", () => {
    expect(proximoHueco([], pedido, reglas, ahora)).toEqual({ fecha: "2026-10-01", hora: "12:00" });
    expect(proximoHueco([entrada({ hora: "12:00" })], pedido, reglas, ahora)).toEqual({
      fecha: "2026-10-01",
      hora: "19:00",
    });
    expect(proximoHueco([], pedido, reglas, { fecha: "2026-10-01", hora: "20:00" })).toEqual({
      fecha: "2026-10-02",
      hora: "12:00",
    });
    const lleno = [entrada({ hora: "12:00" }), entrada({ hora: "19:00" })];
    expect(proximoHueco(lleno, pedido, reglas, ahora)).toEqual({ fecha: "2026-10-02", hora: "12:00" });
  });

  it("lista lo producido que falta por agendar: el largo primero y solo en YouTube", () => {
    const guiones = [
      {
        id: 5,
        canal: "caprichoso-tv" as const,
        titulo: "Título del guion",
        tieneLargo: true,
        publicacion: {
          titulo: "Título para YouTube",
          shorts: [
            { indice: 1, titulo: "Short uno" },
            { indice: 2, titulo: "Short dos" },
          ],
        },
      },
      {
        id: 1,
        canal: "canal-ia" as const,
        titulo: "Sin textos todavía",
        tieneLargo: true,
        publicacion: null,
      },
    ];
    const ya = [{ guion_id: 5, pieza: "short" as const, indice: 1, plataforma: "youtube" as const }];
    expect(
      piezasPorAgendar(guiones, ya, "youtube").map((p) => `${p.guion_id}:${p.pieza}:${p.indice}:${p.titulo}`),
    ).toEqual(["5:largo:0:Título para YouTube", "5:short:2:Short dos", "1:largo:0:Sin textos todavía"]);
    expect(piezasPorAgendar(guiones, ya, "facebook").map((p) => `${p.pieza}:${p.indice}`)).toEqual([
      "short:1",
      "short:2",
    ]);
  });

  it("reparte varias piezas sin que se pisen y con los Shorts después de su largo", () => {
    const piezas = [
      { guion_id: 5, pieza: "largo" as const, indice: 0, titulo: "Largo", canal: "caprichoso-tv" as const },
      { guion_id: 5, pieza: "short" as const, indice: 1, titulo: "S1", canal: "caprichoso-tv" as const },
      { guion_id: 5, pieza: "short" as const, indice: 2, titulo: "S2", canal: "caprichoso-tv" as const },
      { guion_id: 5, pieza: "short" as const, indice: 3, titulo: "S3", canal: "caprichoso-tv" as const },
    ];
    const plan = repartir([], piezas, "youtube", reglas, ahora);
    expect(plan.map((p) => `${p.titulo} ${p.hueco?.fecha} ${p.hueco?.hora}`)).toEqual([
      "Largo 2026-10-01 16:00",
      "S1 2026-10-01 19:00",
      "S2 2026-10-02 12:00",
      "S3 2026-10-02 19:00",
    ]);
  });
});

describe("calendario: en la base", () => {
  let db: ReturnType<typeof baseEnMemoria>;
  const ya = new Date("2026-10-01T13:00:00Z"); // 09:00 en el este de EE. UU.
  const short = (p: Record<string, unknown> = {}) => ({
    guion_id: "",
    pieza: "short",
    indice: 1,
    titulo: "Un Short de prueba",
    canal: "caprichoso-tv",
    plataforma: "youtube",
    fecha: "2026-10-01",
    hora: "12:00",
    ...p,
  });
  beforeEach(() => {
    db = baseEnMemoria();
  });

  it("guarda una publicación y rechaza la que choca, diciendo el próximo hueco libre", async () => {
    const primera = await agendar(db, short(), ya);
    expect(primera.ok).toBe(true);
    const segunda = await agendar(db, short({ titulo: "Otro Short" }), ya);
    expect(segunda).toEqual({
      ok: false,
      error: expect.stringMatching(
        /ya sale «Un Short de prueba».*El próximo hueco libre es jue 1 oct · 7:00 p\. m\./,
      ) as string,
    });
    expect((await entradasEntre(db, "2026-10-01", "2026-10-01")).length).toBe(1);
  });

  it("la base misma impide dos publicaciones a la misma hora (índice único)", async () => {
    await agendar(db, short(), ya);
    await expect(
      db.ejecutar(
        `INSERT INTO calendario (pieza, titulo, canal, plataforma, fecha, hora) VALUES ('short', 'Colado', 'caprichoso-tv', 'youtube', '2026-10-01', '12:00')`,
      ),
    ).rejects.toThrow(/UNIQUE/i);
  });

  it("no agenda en el pasado, salvo lo que ya salió", async () => {
    expect(await agendar(db, short({ fecha: "2026-09-29" }), ya)).toEqual({
      ok: false,
      error: expect.stringContaining("ya pasó") as string,
    });
    expect(await agendar(db, short({ hora: "08:00" }), ya)).toEqual({
      ok: false,
      error: expect.stringContaining("Esa hora ya pasó") as string,
    });
    expect((await agendar(db, short({ fecha: "2026-09-29", estado: "publicado" }), ya)).ok).toBe(true);
  });

  it("lo que ya salió se anota tal como pasó; lo que falta por salir sí respeta las reglas frente a eso", async () => {
    const salio = (p: Record<string, unknown>) => short({ fecha: "2026-09-28", estado: "publicado", ...p });
    expect((await agendar(db, salio({ hora: "09:00", titulo: "Salió a las nueve" }), ya)).ok).toBe(true);
    expect((await agendar(db, salio({ hora: "11:00", titulo: "Salió a las once" }), ya)).ok).toBe(true);
    // Un largo y su Short que salieron al mismo minuto: es historia, se anota.
    expect((await agendar(db, salio({ hora: "11:00", titulo: "Salió junto con otro" }), ya)).ok).toBe(true);
    expect((await agendar(db, salio({ hora: "12:00", titulo: "Salió pegado" }), ya)).ok).toBe(true);
    expect((await entradasEntre(db, "2026-09-28", "2026-09-28")).length).toBe(4);
    // Lo nuevo no puede caer encima de algo que ya salió hoy.
    expect(
      (await agendar(db, short({ hora: "10:00", estado: "publicado", titulo: "Salió hoy" }), ya)).ok,
    ).toBe(true);
    expect(await agendar(db, short({ hora: "12:00", titulo: "Nuevo" }), ya)).toEqual({
      ok: false,
      error: expect.stringContaining("Queda a menos de 3 horas de «Salió hoy»") as string,
    });
  });

  it("pide los datos que faltan con palabras claras", async () => {
    expect(await agendar(db, short({ titulo: "" }), ya)).toEqual({
      ok: false,
      error: "Escribe el título del video.",
    });
    expect(await agendar(db, short({ hora: "" }), ya)).toEqual({
      ok: false,
      error: "Elige la hora (por ejemplo 12:00 o 7 pm).",
    });
    expect(await agendar(db, short({ fecha: "2026-02-30" }), ya)).toEqual({
      ok: false,
      error: "Elige el día.",
    });
  });

  it("mueve, cambia de estado y quita", async () => {
    const r = await agendar(db, short(), ya);
    if (!r.ok) throw new Error(r.error);
    await agendar(db, short({ titulo: "Vecino", hora: "19:00" }), ya);
    expect(await mover(db, r.id, "2026-10-01", "19:00", ya)).toEqual({
      ok: false,
      error: expect.stringContaining("Vecino") as string,
    });
    expect((await mover(db, r.id, "2026-10-02", "12:00", ya)).ok).toBe(true);
    await cambiarEstado(db, r.id, "programado");
    const [movida] = await entradasEntre(db, "2026-10-02", "2026-10-02");
    expect(movida).toMatchObject({ id: r.id, fecha: "2026-10-02", hora: "12:00", estado: "programado" });
    await quitar(db, r.id);
    expect(await entradasEntre(db, "2026-10-02", "2026-10-02")).toEqual([]);
    expect(await mover(db, r.id, "2026-10-03", "12:00", ya)).toEqual({
      ok: false,
      error: "Esa publicación ya no está en el calendario.",
    });
  });

  it("reparte lo producido en los próximos huecos, y quitar de la lista se puede deshacer", async () => {
    await db.ejecutar(`INSERT INTO temas (id, tematica_id, titulo) VALUES (1, 'biografias', 'Un artista')`);
    const contenido = JSON.stringify({
      publicacion: {
        titulo: "El largo para YouTube",
        descripcion: "Una descripción suficientemente larga para pasar el esquema de publicación.",
        etiquetas: Array.from({ length: 30 }, (_, i) => `etiqueta ${i + 1}`),
        shorts: [
          { indice: 1, titulo: "Primer Short del video", titulo_original: "S1" },
          { indice: 2, titulo: "Segundo Short del video", titulo_original: "S2" },
        ],
      },
    });
    await db.ejecutar(
      `INSERT INTO guiones (id, tema_id, tematica_id, titulo, contenido, estado) VALUES (5, 1, 'biografias', 'Guion', ?, 'aprobado')`,
      [contenido],
    );
    await db.ejecutar(`INSERT INTO videos (guion_id, formato, clave) VALUES (5, '16x9', 'v/5/largo.mp4')`);
    const lista = await pendientes(db, "youtube");
    expect(lista.map((p) => `${p.pieza}:${p.indice}:${p.canal}`)).toEqual([
      "largo:0:caprichoso-tv",
      "short:1:caprichoso-tv",
      "short:2:caprichoso-tv",
    ]);
    const huecos: string[] = [];
    for (const p of lista) {
      const r = await agendarEnProximoHueco(db, { ...p, plataforma: "youtube" }, ya);
      if (!r.ok) throw new Error(r.error);
      huecos.push(`${r.fecha} ${r.hora}`);
    }
    expect(huecos).toEqual(["2026-10-01 16:00", "2026-10-01 19:00", "2026-10-02 12:00"]);
    expect(await pendientes(db, "youtube")).toEqual([]);

    // Agendar otra vez la misma pieza la mueve, no la duplica.
    const otra = await agendar(
      db,
      { ...lista[1], plataforma: "youtube", fecha: "2026-10-03", hora: "12:00" },
      ya,
    );
    expect(otra.ok).toBe(true);
    expect((await entradasEntre(db, "2026-10-01", "2026-10-31")).length).toBe(3);

    // Quitar de la lista (ya salió o no va) y deshacerlo.
    const facebook = await pendientes(db, "facebook");
    expect(facebook.length).toBe(2);
    const primera = facebook[0];
    if (!primera) throw new Error("sin pendientes");
    expect((await descartar(db, { ...primera, plataforma: "facebook" })).ok).toBe(true);
    expect((await pendientes(db, "facebook")).length).toBe(1);
    const fila = await db.uno<{ id: number }>("SELECT id FROM calendario WHERE estado = 'descartado'");
    await quitar(db, fila?.id ?? 0);
    expect((await pendientes(db, "facebook")).length).toBe(2);
  });

  it("guarda las reglas y rechaza horas que no se entienden", async () => {
    expect(await reglasCalendario(db)).toEqual(REGLAS_POR_DEFECTO);
    expect(
      await guardarReglas(db, {
        horas_short: "10 am, 3 pm, 8 pm",
        horas_largo: "17:00",
        separacion_horas: "2",
        zona: "America/Bogota",
      }),
    ).toEqual({ ok: true });
    expect(await reglasCalendario(db)).toEqual({
      horasShort: ["10:00", "15:00", "20:00"],
      horasLargo: ["17:00"],
      separacionMin: 120,
      zona: "America/Bogota",
    });
    expect(
      await guardarReglas(db, {
        horas_short: "10 am, tarde",
        horas_largo: "17:00",
        separacion_horas: "2",
        zona: "America/Bogota",
      }),
    ).toEqual({ ok: false, error: "Hay una hora de Shorts que no se entiende. Usa 12:00 o 7 pm." });
    expect(
      await guardarReglas(db, {
        horas_short: "10 am",
        horas_largo: "17:00",
        separacion_horas: "2",
        zona: "Marte",
      }),
    ).toEqual({ ok: false, error: "Elige una zona horaria de la lista." });
  });
});

describe("calendario: frases", () => {
  it("no deja dos puntos seguidos cuando la frase termina en «p. m.»", async () => {
    const { conPunto } = await import("@compartido/calendario");
    expect(conPunto("Agendado: jue 1 oct · 7:00 p. m.")).toBe("Agendado: jue 1 oct · 7:00 p. m.");
    expect(conPunto("Reglas guardadas")).toBe("Reglas guardadas.");
  });
});

describe("calendario: enlace y miniatura", () => {
  it("saca el código del video de cualquier enlace de YouTube", async () => {
    const { idDeYouTube, miniaturaDeEnlace } = await import("@compartido/calendario");
    const id = "abcDEF12_-3";
    for (const enlace of [
      `https://youtu.be/${id}?si=xyz`,
      `https://www.youtube.com/watch?v=${id}&t=10s`,
      `https://youtube.com/shorts/${id}`,
      `https://m.youtube.com/live/${id}`,
      `https://studio.youtube.com/video/${id}/edit`,
    ])
      expect(idDeYouTube(enlace)).toBe(id);
    expect(idDeYouTube("https://www.youtube.com/@caprichosotv")).toBeNull();
    expect(idDeYouTube("https://youtu.be/corto")).toBeNull();
    expect(idDeYouTube(`http://youtu.be/${id}`)).toBeNull();
    expect(idDeYouTube(`https://noesyoutube.com/watch?v=${id}`)).toBeNull();
    expect(idDeYouTube("no es un enlace")).toBeNull();
    expect(miniaturaDeEnlace(`https://youtu.be/${id}`)).toBe(`https://i.ytimg.com/vi/${id}/mqdefault.jpg`);
    expect(miniaturaDeEnlace("https://www.tiktok.com/@alguien/video/123")).toBeNull();
  });

  it("solo acepta enlaces https de la plataforma de esa publicación, y limpia los de YouTube", async () => {
    const { revisarEnlace } = await import("@compartido/calendario");
    const id = "abcDEF12_-3";
    expect(revisarEnlace(`https://studio.youtube.com/video/${id}/edit`, "youtube", "short")).toEqual({
      ok: true,
      enlace: `https://www.youtube.com/shorts/${id}`,
    });
    expect(revisarEnlace(`https://www.youtube.com/watch?v=${id}&si=abc`, "youtube", "largo")).toEqual({
      ok: true,
      enlace: `https://youtu.be/${id}`,
    });
    expect(revisarEnlace("  ", "youtube", "largo")).toEqual({ ok: true, enlace: "" });
    expect(revisarEnlace(`https://youtu.be/${id}`, "facebook", "short")).toEqual({
      ok: false,
      error: "Ese enlace no es de Facebook. Esta publicación sale en Facebook.",
    });
    expect(revisarEnlace("https://www.facebook.com/reel/1234567890", "facebook", "short")).toEqual({
      ok: true,
      enlace: "https://www.facebook.com/reel/1234567890",
    });
    expect(revisarEnlace("youtu.be/abc", "youtube", "short")).toEqual({
      ok: false,
      error: "Pega el enlace completo, empezando por https://",
    });
    expect(revisarEnlace("https://www.youtube.com/@caprichosotv", "youtube", "short").ok).toBe(false);
    expect(revisarEnlace("javascript:alert(1)", "youtube", "short").ok).toBe(false);
  });

  it("guarda el enlace, pasa de «agendado» a «programado» y encuentra la miniatura de Escenia", async () => {
    const { guardarEnlace, miniaturasDeGuiones } = await import("@/lib/calendario");
    const db = baseEnMemoria();
    const ya = new Date("2026-10-01T13:00:00Z");
    const r = await agendar(
      db,
      {
        guion_id: "",
        pieza: "short",
        indice: 1,
        titulo: "Un Short de prueba",
        canal: "caprichoso-tv",
        plataforma: "youtube",
        fecha: "2026-10-01",
        hora: "12:00",
      },
      ya,
    );
    if (!r.ok) throw new Error(r.error);
    expect(await guardarEnlace(db, r.id, "https://www.tiktok.com/@alguien/video/1")).toEqual({
      ok: false,
      error: "Ese enlace no es de YouTube. Esta publicación sale en YouTube.",
    });
    expect(await guardarEnlace(db, r.id, "https://youtu.be/abcDEF12_-3?si=x")).toEqual({
      ok: true,
      enlace: "https://www.youtube.com/shorts/abcDEF12_-3",
      estado: "programado",
    });
    const [fila] = await entradasEntre(db, "2026-10-01", "2026-10-01");
    expect(fila).toMatchObject({
      enlace: "https://www.youtube.com/shorts/abcDEF12_-3",
      estado: "programado",
    });
    // Mover la publicación no le borra el enlace.
    expect((await mover(db, r.id, "2026-10-02", "12:00", ya)).ok).toBe(true);
    const [movida] = await entradasEntre(db, "2026-10-02", "2026-10-02");
    expect(movida?.enlace).toBe("https://www.youtube.com/shorts/abcDEF12_-3");
    expect(await guardarEnlace(db, r.id, "")).toEqual({ ok: true, enlace: "", estado: "programado" });
    expect(await guardarEnlace(db, 9999, "https://youtu.be/abcDEF12_-3")).toEqual({
      ok: false,
      error: "Esa publicación ya no está en el calendario.",
    });

    await db.ejecutar(`INSERT INTO temas (id, tematica_id, titulo) VALUES (1, 'biografias', 'Un artista')`);
    await db.ejecutar(
      `INSERT INTO guiones (id, tema_id, tematica_id, titulo, contenido, estado) VALUES (5, 1, 'biografias', 'Guion', '{}', 'aprobado')`,
    );
    await db.ejecutar(
      `INSERT INTO archivos (guion_id, tipo, clave) VALUES (5, 'miniatura', 'guiones/5/miniatura-1.png')`,
    );
    await db.ejecutar(
      `INSERT INTO archivos (guion_id, tipo, clave) VALUES (5, 'miniatura', 'guiones/5/miniatura-2.png')`,
    );
    expect(await miniaturasDeGuiones(db, [5, 5, 7])).toEqual(
      new Map([[5, "/datos/archivos/guiones/5/miniatura-2.png"]]),
    );
    expect(await miniaturasDeGuiones(db, [])).toEqual(new Map());
  });
});
