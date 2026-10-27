// El Director con el video del cliente (docs/DIRECTOR.md, C-DIRECTOR-3): la prueba en vivo y la
// locución. Nada le pega a la IA ni a un servicio de verdad: la base es SQLite en memoria con el
// esquema de producción y la respuesta de Anthropic es de mentira.
import { describe, expect, it } from "vitest";
import { seguirSubida } from "@/app/grabaciones/subida";
import {
  aprobarPropuesta,
  crearEncargo,
  guardarPropuestaConVideo,
  responderDirector,
  type AlmacenDeLectura,
} from "@/lib/director";
import {
  claveDeHoja,
  crearVideoDelEncargo,
  marcarVideoListo,
  marcarVideoSubido,
  otraVezTrabajo,
  tomarSiguienteTrabajo,
  tomarVideoPorMirar,
  videosDelEncargo,
} from "@/lib/director-videos";
import {
  costoDemostracionUsd,
  costoLocucionUsd,
  esquemaDemostracion,
  esquemaLocucion,
  primerasPalabras,
  problemaDeDemostracion,
  problemaDeLocucion,
} from "@compartido/director";
import {
  cuadrosDelVideo,
  hojasDe,
  horaDeCuadro,
  planDeDemostracion,
  planDeLocucion,
} from "../estacion/src/director-plan";
import { tiemposDeFrases } from "../estacion/src/publicidad-plan";
import { baseEnMemoria } from "./base-memoria";

type Base = ReturnType<typeof baseEnMemoria>;

const DEMO = {
  tipo: "demostracion",
  nombre: "Pro In Shop · ósmosis inversa",
  video_id: 1,
  desde_s: 0.5,
  partes: [
    { texto: "Te muestro una prueba real, sin cortes.", en_s: 0.5, titulo: "PRUEBA REAL" },
    { texto: "Mira: llenamos un vaso con agua del grifo.", en_s: 9, titulo: "AGUA DEL GRIFO" },
    { texto: "Rojo. Esa es el agua de tu casa.", en_s: 28.5, titulo: "ROJO" },
    { texto: "Ahora el agua del sistema: ¡verde!", en_s: 58.5, titulo: "¡VERDE!" },
    { texto: "Escríbenos a Pro In Shop y pide el tuyo.", en_s: 80, titulo: "" },
  ],
  idioma: "es",
  voz: "venezolana",
  portada: { lineas: ["PRUEBA EN VIVO", "SIN CORTES"], etiqueta: "ÓSMOSIS" },
  carpetas: [],
  avatar: "",
  sonido_video: 0.8,
  cierre: { lineas: ["@proinshop", "Venta al mayor y detal"], imagen: "" },
} as const;

const LOCUCION = {
  tipo: "locucion",
  nombre: "Quince años",
  video_id: 1,
  voz: "richard",
  idioma: "es",
  partes: [
    { texto: "Hoy celebramos tus quince años, con todo el cariño de tu familia." },
    { texto: "Gracias por llenar esta casa de risas.", en_s: 20 },
  ],
  musica: "piano",
} as const;

async function conVideoListo(db: Base, duracionSeg = 95): Promise<{ encargoId: number; videoId: number }> {
  const encargoId = await crearEncargo(db);
  const videoId = await crearVideoDelEncargo(db, {
    encargoId,
    nombre: "prueba-medidor.mp4",
    bytes: 50_000_000,
    clave: "director/encargos/1/x.mp4",
  });
  await marcarVideoSubido(db, videoId, 50_000_000);
  await marcarVideoListo(db, videoId, {
    duracionSeg,
    conSonido: true,
    vertical: true,
    hojas: 2,
    segundosPorCuadro: 2,
  });
  return { encargoId, videoId };
}

describe("Director con video: lo que se revisa antes de mostrar la tarjeta", () => {
  it("la prueba en vivo pide al menos cuatro frases (la última es el cierre)", () => {
    expect(() => esquemaDemostracion.parse({ ...DEMO, partes: DEMO.partes.slice(0, 3) })).toThrow(
      "cuatro frases",
    );
    expect(esquemaDemostracion.parse(DEMO).partes).toHaveLength(5);
  });

  it("las frases van en orden, dentro del video, y cada una alcanza a decirse antes de la siguiente", () => {
    const d = esquemaDemostracion.parse(DEMO);
    expect(problemaDeDemostracion(d, 95)).toBeNull();
    expect(problemaDeDemostracion(d, 60)).toContain("el video dura 1:00");
    const desordenada = { ...d, partes: [d.partes[0]!, d.partes[2]!, d.partes[1]!, d.partes[4]!] };
    expect(problemaDeDemostracion(desordenada, 95)).toContain("no van en orden");
    const larga = {
      ...d,
      partes: [
        {
          ...d.partes[0]!,
          texto:
            "Una frase larguísima que de ninguna manera se alcanza a decir en los ocho segundos y medio que hay hasta la siguiente, porque tiene demasiadas palabras.",
        },
        ...d.partes.slice(1),
      ],
    };
    expect(problemaDeDemostracion(larga, 95)).toContain("no alcanza a decirse antes de la 2");
    const eterna = { ...d, partes: [...d.partes.slice(0, 4), { ...d.partes[4]!, en_s: 130 }] };
    expect(problemaDeDemostracion(eterna, 200)).toContain("el tope es 120");
  });

  it("la locución cabe estirando el video hasta un 35 %; si no, se dice cuánto acortar", () => {
    const d = esquemaLocucion.parse(LOCUCION);
    expect(problemaDeLocucion(d, 30)).toBeNull();
    expect(problemaDeLocucion(d, 5)).toContain("acorta el texto");
    expect(problemaDeLocucion({ ...d, partes: [{ texto: "Hola", en_s: 40 }] }, 30)).toContain(
      "el video dura 0:30",
    );
  });

  it("el precio sale antes de gastar: la voz por letra y la persona por segundo", () => {
    const d = esquemaDemostracion.parse(DEMO);
    const sinPersona = costoDemostracionUsd(d);
    const conPersona = costoDemostracionUsd({ ...d, avatar: "chica.png" });
    expect(sinPersona).toBeGreaterThan(0.02);
    expect(sinPersona).toBeLessThan(0.1);
    expect(conPersona).toBeGreaterThan(sinPersona + 0.2);
    expect(costoLocucionUsd(esquemaLocucion.parse(LOCUCION))).toBeLessThan(0.05);
  });
});

describe("Director con video: la Mac mira los videos del chat", () => {
  it("un video recién subido se toma una sola vez, y uno colgado vuelve a la fila", async () => {
    const db = baseEnMemoria();
    const encargoId = await crearEncargo(db);
    const id = await crearVideoDelEncargo(db, {
      encargoId,
      nombre: "a.mov",
      bytes: 1e6,
      clave: "director/x.mov",
    });
    expect(await videosDelEncargo(db, encargoId)).toHaveLength(0); // a medio subir no se muestra
    expect(await tomarVideoPorMirar(db)).toBeNull();
    await marcarVideoSubido(db, id, 1e6);
    expect((await tomarVideoPorMirar(db))?.id).toBe(id);
    expect(await tomarVideoPorMirar(db)).toBeNull();
    await db.ejecutar(
      "UPDATE director_videos SET actualizado_en = datetime('now', '-11 minutes') WHERE id = ?",
      [id],
    );
    expect((await tomarVideoPorMirar(db))?.id).toBe(id);
  });

  it("los cuadros: uno por segundo en un video corto, más espaciados en uno largo, y nunca más de 60", () => {
    expect(cuadrosDelVideo(25)).toMatchObject({ paso: 1 });
    expect(cuadrosDelVideo(25).tiempos).toHaveLength(25);
    expect(cuadrosDelVideo(95)).toMatchObject({ paso: 2 });
    expect(cuadrosDelVideo(95).tiempos.at(-1)).toBe(94);
    expect(cuadrosDelVideo(140).paso).toBe(3);
    expect(cuadrosDelVideo(900).tiempos.length).toBeLessThanOrEqual(60);
    expect(hojasDe(cuadrosDelVideo(95).tiempos).map((h) => h.length)).toEqual([15, 15, 15, 3]);
    expect(horaDeCuadro(65)).toBe("1:05");
    expect(claveDeHoja(7, 2)).toBe("director/videos/7/hoja-2.jpg");
  });
});

describe("Director con video: de la tarjeta al plan de la Mac", () => {
  it("la prueba en vivo: el video entero una sola vez, cada frase a su hora y el cierre con la última", () => {
    const d = esquemaDemostracion.parse(DEMO);
    const plan = planDeDemostracion(d, { video: "/mac/original.mp4", musica: "/mac/musica.mp3" });
    expect(plan.diseno).toBe("pantalla");
    expect(plan.momentos.filter((m) => m.video)).toHaveLength(1);
    expect(plan.momentos[0]?.video).toEqual({
      archivo: "/mac/original.mp4",
      desde_s: 0.5,
      velocidad: 1,
      sonido: 0.8,
    });
    expect(plan.momentos[0]?.vista_persona?.modo).toBe("oculta");
    expect(plan.partes).toEqual(
      d.partes.map((p) => ({ texto: p.texto, desde_ms: Math.round((p.en_s - 0.5) * 1000) })),
    );
    // La última frase es el cierre; la primera lleva la portada encima, y su título entra a la mitad.
    expect(plan.momentos).toHaveLength(d.partes.length);
    expect(plan.momentos[0]?.texto).toBeUndefined();
    expect(plan.momentos[1]).toMatchObject({ frase: "prueba real, sin", texto: "PRUEBA REAL" });
    expect(plan.cierre.frase).toBe(primerasPalabras(d.partes[4]!.texto));
    expect(plan.musica_volumen).toBe(0.05);
    expect(plan.logo).toBe("");
  });

  it("todas las frases del plan se encuentran en la voz (la del cierre no se busca dos veces)", () => {
    const plan = planDeDemostracion(esquemaDemostracion.parse(DEMO), { video: "/mac/v.mp4" });
    const palabras = DEMO.partes
      .flatMap((p) => p.texto.split(/\s+/))
      .map((text, i) => ({ text, startMs: i * 300, endMs: i * 300 + 250 }));
    const frases = [...plan.momentos.map((m) => m.frase), plan.cierre.frase];
    expect(tiemposDeFrases(frases, palabras).every((t) => t !== null)).toBe(true);
  });

  it("con persona, narra en el círculo de abajo desde el principio", () => {
    const plan = planDeDemostracion(esquemaDemostracion.parse({ ...DEMO, avatar: "chica.png" }), {
      video: "/mac/v.mp4",
      avatar: "/mac/chica.png",
      producto: "/mac/producto.png",
    });
    expect(plan.momentos[0]?.vista_persona?.modo).toBe("cabeza");
    expect(plan.momentos[0]?.persona).toMatchObject({ imagen: "/mac/chica.png", encuadre: "medio" });
    expect(plan.cierre.imagen).toBe("/mac/producto.png");
  });

  it("la locución: el video tal cual, cada párrafo a su hora y el piano solo si se pidió", () => {
    const d = esquemaLocucion.parse(LOCUCION);
    const plan = planDeLocucion(d, { video: "/mac/v.mp4", musica: "/mac/piano.mp3", salida: "locucion.mp4" });
    expect(plan.partes).toEqual([
      { texto: d.partes[0]!.texto },
      { texto: d.partes[1]!.texto, desde_ms: 20_000 },
    ]);
    expect(plan.musica).toBe("/mac/piano.mp3");
    expect(plan.voz).toBe("richard");
    expect(
      planDeLocucion({ ...d, musica: "ninguna" }, { video: "/v.mp4", musica: "/p.mp3", salida: "x.mp4" })
        .musica,
    ).toBeUndefined();
  });
});

describe("Director con video: la tarjeta y el botón (C-DIRECTOR-1 y 3)", () => {
  it("el video tiene que ser de este encargo y estar mirado; si no calza, el error vuelve a la IA", async () => {
    const db = baseEnMemoria();
    const { encargoId, videoId } = await conVideoListo(db);
    const otro = await crearEncargo(db);
    const ajeno = await guardarPropuestaConVideo(db, otro, "demostracion", { ...DEMO, video_id: videoId });
    expect(ajeno.ok ? "" : ajeno.error).toContain("no es de este encargo");
    await db.ejecutar("UPDATE director_videos SET estado = 'mirando' WHERE id = ?", [videoId]);
    const sinMirar = await guardarPropuestaConVideo(db, encargoId, "locucion", {
      ...LOCUCION,
      video_id: videoId,
    });
    expect(sinMirar.ok ? "" : sinMirar.error).toContain("todavía no está listo");
    await db.ejecutar("UPDATE director_videos SET estado = 'listo' WHERE id = ?", [videoId]);
    const fuera = await guardarPropuestaConVideo(db, encargoId, "demostracion", {
      ...DEMO,
      video_id: videoId,
      partes: [...DEMO.partes.slice(0, 4), { ...DEMO.partes[4], en_s: 99 }],
    });
    expect(fuera.ok ? "" : fuera.error).toContain("el video dura 1:35");
    const sinCarpeta = await guardarPropuestaConVideo(db, encargoId, "demostracion", {
      ...DEMO,
      video_id: videoId,
      carpetas: ["No existe"],
    });
    expect(sinCarpeta.ok ? "" : sinCarpeta.error).toContain("«No existe» no existe");
    expect(await db.todos("SELECT id FROM director_propuestas")).toHaveLength(0);
  });

  it("aprobar una prueba en vivo crea UN trabajo para la Mac (nunca un anuncio de fotos), y se toma una vez", async () => {
    const db = baseEnMemoria();
    const { encargoId, videoId } = await conVideoListo(db);
    const p = await guardarPropuestaConVideo(db, encargoId, "demostracion", { ...DEMO, video_id: videoId });
    if (!p.ok) throw new Error(p.error);
    expect(p.precioUsd).toBe(costoDemostracionUsd(esquemaDemostracion.parse(DEMO)));
    const a = await aprobarPropuesta(db, p.id);
    const b = await aprobarPropuesta(db, p.id);
    expect(a.trabajoId).toBeDefined();
    expect(b.trabajoId).toBe(a.trabajoId);
    expect(await db.todos("SELECT id FROM director_trabajos")).toHaveLength(1);
    expect(await db.todos("SELECT id FROM publicidades")).toHaveLength(0);
    const t = await tomarSiguienteTrabajo(db);
    expect(t).toMatchObject({ id: a.trabajoId, tipo: "demostracion", estado: "tomada" });
    expect(JSON.parse(t!.datos)).toMatchObject({ video_id: videoId, desde_s: 0.5 });
    expect(await tomarSiguienteTrabajo(db)).toBeNull();
    // Se apagó la Mac a la mitad: a la hora vuelve a la fila. Y si falló, «Intentar otra vez».
    await db.ejecutar("UPDATE director_trabajos SET actualizado_en = datetime('now', '-61 minutes')");
    expect((await tomarSiguienteTrabajo(db))?.id).toBe(a.trabajoId);
    await db.ejecutar("UPDATE director_trabajos SET estado = 'error'");
    await otraVezTrabajo(db, a.trabajoId!);
    expect((await tomarSiguienteTrabajo(db))?.id).toBe(a.trabajoId);
  });

  it("la IA mira el video: le llegan sus hojas de cuadros; si la Mac no terminó, se le dice que espere", async () => {
    const db = baseEnMemoria();
    const { encargoId, videoId } = await conVideoListo(db);
    const pendiente = await crearVideoDelEncargo(db, {
      encargoId,
      nombre: "b.mp4",
      bytes: 1e6,
      clave: "director/b.mp4",
    });
    await marcarVideoSubido(db, pendiente, 1e6);
    await db.ejecutar(
      "INSERT INTO director_mensajes (encargo_id, rol, texto) VALUES (?, 'richard', 'Mira el video')",
      [encargoId],
    );
    const pedidas: string[] = [];
    const almacen: AlmacenDeLectura = {
      async get(clave) {
        pedidas.push(clave);
        return { size: 3, arrayBuffer: async () => new Uint8Array([255, 216, 255]).buffer };
      },
    };
    const pedidos: Record<string, unknown>[] = [];
    const respuestas = [
      {
        content: [
          { type: "tool_use", id: "toolu_v", name: "ver_video", input: { id: videoId } },
          { type: "tool_use", id: "toolu_p", name: "ver_video", input: { id: pendiente } },
        ],
        stop_reason: "tool_use",
      },
      { content: [{ type: "text", text: "Ya lo vi." }], stop_reason: "end_turn" },
    ];
    const falso: typeof fetch = async (_url, init) => {
      pedidos.push(JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>);
      const r = respuestas.shift()!;
      return new Response(
        JSON.stringify({
          id: "msg",
          type: "message",
          role: "assistant",
          model: "claude-sonnet-5",
          stop_sequence: null,
          usage: { input_tokens: 3000, output_tokens: 300 },
          ...r,
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    };
    await responderDirector(db, encargoId, { modelo: "claude-sonnet-5", apiKey: "x", almacen, fetch: falso });
    expect(JSON.stringify(pedidos[0]?.system)).toContain(`V${videoId} prueba-medidor.mp4: 1:35`);
    expect(pedidas).toEqual([claveDeHoja(videoId, 1), claveDeHoja(videoId, 2)]);
    const resultados = (pedidos[1]?.messages as { content: unknown }[]).at(-1)?.content as {
      is_error?: boolean;
      content: unknown;
    }[];
    expect(JSON.stringify(resultados[0]?.content)).toContain("dura 1:35");
    expect(JSON.stringify(resultados[0]?.content).match(/"type":"image"/g)).toHaveLength(2);
    expect(resultados[1]?.is_error).toBe(true);
    expect(JSON.stringify(resultados[1]?.content)).toContain("todavía no está listo");
  });

  it("la subida por partes del chat va a las rutas del Director, no a las de Grabaciones", async () => {
    const usadas: string[] = [];
    const pedir: typeof fetch = async (url) => {
      usadas.push(String(url).split("?")[0] ?? "");
      return new Response(JSON.stringify({ partNumber: 1, etag: "e" }), { status: 200 });
    };
    const archivo = new File([new Uint8Array(1000)], "v.mp4");
    await seguirSubida({ archivo, id: 3, uploadId: "u", partes: [] }, () => {}, {
      pedir,
      rutas: { parte: "/datos/director/9/videos/parte", terminar: "/datos/director/9/videos/terminar" },
    });
    expect(usadas).toEqual(["/datos/director/9/videos/parte", "/datos/director/9/videos/terminar"]);
  });
});
