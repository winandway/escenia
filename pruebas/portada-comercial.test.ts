// C-COMERCIAL-4: elegir la miniatura del comercial desde el panel.
import { beforeEach, describe, expect, it } from "vitest";
import { baseEnMemoria } from "./base-memoria";
import { esquemaComercialNuevo, leerPortada, mismaPortada } from "@compartido/comerciales";
import { esquemaGuion } from "@compartido/guion";
import {
  comercialParaPortada,
  crearComercial,
  imagenesDelVideo,
  pedirPortada,
  registrarPlanComercial,
  terminarPortada,
  tomarSiguienteComercial,
  tomarSiguientePortada,
} from "@/lib/comerciales";
import { contenidoMiniatura } from "../estacion/src/remotion/miniatura-contenido";
import { propsConPortada } from "../estacion/src/portada-elegida";

const PEDIDO = esquemaComercialNuevo.parse({
  nombre: "Andreea: logos que se recuerdan",
  narracion:
    "Your logo is the first thing your customers see. Let's make it count. I'm Andreea, a brand designer, and here on Fiverr I create clean, modern logos for small businesses, startups and online stores. Every concept is original.",
  idioma: "en",
  voz: "femenina",
  instrucciones: "",
  carpetas: ["Logos Andreea"],
});

const PLAN = esquemaGuion.parse({
  titulo: "Andreea",
  gancho: "Your logo is the first thing your customers see.",
  escenas: [
    {
      parte: "gancho",
      narracion: "Your logo is the first thing your customers see. Let's make it count.",
      visual: {
        tipo: "stock",
        titular: "Your logo",
        planos: [
          { frase: "Your logo is", tipo: "imagen", archivo: "01 Dame Mexico.png", texto: "" },
          { frase: "make it count", tipo: "imagen", archivo: "02 Musso.png", texto: "" },
          { frase: "customers", tipo: "imagen", archivo: "01 Dame Mexico.png", texto: "" },
        ],
      },
    },
    {
      parte: "contexto",
      narracion: "I'm Andreea, a brand designer, and here on Fiverr I create clean, modern logos.",
      visual: { tipo: "texto", titular: "Clean, modern logos" },
    },
    {
      parte: "cierre",
      narracion: "Every concept is original.",
      visual: { tipo: "texto", titular: "Original" },
    },
  ],
});

describe("miniatura elegida del comercial (C-COMERCIAL-4)", () => {
  let db: ReturnType<typeof baseEnMemoria>;
  let id: number;
  beforeEach(async () => {
    db = baseEnMemoria();
    id = await crearComercial(db, PEDIDO);
    const tomado = await tomarSiguienteComercial(db);
    const r = await registrarPlanComercial(db, tomado!, PLAN, { modelo: "m", costoUsd: 0 });
    db.cruda.exec(`UPDATE trabajos SET estado = 'hecho' WHERE id = ${r.trabajoId}`);
  });

  it("ofrece solo las imágenes que salen en el video, en orden y sin repetir", () => {
    expect(imagenesDelVideo(PLAN)).toEqual(["01 Dame Mexico.png", "02 Musso.png"]);
  });

  it("sin el video terminado no se puede elegir", async () => {
    db.cruda.exec("UPDATE trabajos SET estado = 'tomado'");
    expect(await comercialParaPortada(db, id)).toBeNull();
    expect(
      await pedirPortada(db, id, { archivo: "02 Musso.png", titulo: "Andreea", frase: "" }),
    ).toMatchObject({ ok: false });
  });

  it("no acepta una imagen que no sale en el video ni un título vacío", async () => {
    expect(await pedirPortada(db, id, { archivo: "otra.png", titulo: "Andreea", frase: "" })).toMatchObject({
      ok: false,
    });
    expect(await pedirPortada(db, id, { archivo: "02 Musso.png", titulo: "  ", frase: "" })).toMatchObject({
      ok: false,
    });
    expect((await comercialParaPortada(db, id))?.portada).toBeNull();
  });

  it("pedida → la Mac la toma una vez → hecha; pedir lo mismo otra vez no escribe nada", async () => {
    const elegida = { archivo: "02 Musso.png", titulo: "Logos que venden", frase: "Hechos a mano" };
    expect(await pedirPortada(db, id, elegida)).toEqual({ ok: true, cambio: true });
    const p = await tomarSiguientePortada(db);
    expect(p).toMatchObject({ comercial_id: id, carpetas: ["Logos Andreea"], ...elegida });
    expect(await tomarSiguientePortada(db)).toBeNull();
    expect(await terminarPortada(db, id, null)).toBe(true);
    expect((await comercialParaPortada(db, id))?.portada?.estado).toBe("hecha");
    // Repetir lo mismo: ni se escribe ni vuelve a la fila.
    const antes = (await db.uno<{ portada: string }>("SELECT portada FROM comerciales WHERE id = ?", [id]))!;
    expect(await pedirPortada(db, id, elegida)).toEqual({ ok: true, cambio: false });
    const despues = (await db.uno<{ portada: string }>("SELECT portada FROM comerciales WHERE id = ?", [
      id,
    ]))!;
    expect(despues.portada).toBe(antes.portada);
    expect(await tomarSiguientePortada(db)).toBeNull();
  });

  it("si falla, el error queda a la vista y se puede pedir otra vez la misma", async () => {
    const elegida = { archivo: "01 Dame Mexico.png", titulo: "Andreea", frase: "" };
    await pedirPortada(db, id, elegida);
    await tomarSiguientePortada(db);
    await terminarPortada(db, id, "La imagen ya no está");
    const p = (await comercialParaPortada(db, id))?.portada;
    expect(p).toMatchObject({ estado: "error", error: "La imagen ya no está" });
    expect(mismaPortada(elegida, p!)).toBe(false);
    expect(await pedirPortada(db, id, elegida)).toEqual({ ok: true, cambio: true });
  });

  it("una tomada hace más de 20 minutos (la Mac se apagó) vuelve a la fila", async () => {
    await pedirPortada(db, id, { archivo: "02 Musso.png", titulo: "Andreea", frase: "" });
    await tomarSiguientePortada(db);
    db.cruda.exec(`UPDATE comerciales SET actualizado_en = datetime('now', '-30 minutes') WHERE id = ${id}`);
    expect((await tomarSiguientePortada(db))?.comercial_id).toBe(id);
  });

  it("una portada rota en la base se lee como que no hay ninguna", () => {
    expect(leerPortada("{roto")).toBeNull();
    expect(leerPortada("")).toBeNull();
  });

  it("la plantilla usa la imagen y los textos elegidos, no la primera foto ni el título", () => {
    // Solo lo que mira la miniatura: el título, las fotos de las escenas y la portada elegida.
    const conFoto = {
      titulo: "Andreea: logos que se recuerdan",
      portada: null,
      escenas: [{ foto: { ruta: "imagenes/primera.png", ancho: 10, alto: 10, enfoque: null }, fotos: [] }],
    };
    const elegida = propsConPortada(
      conFoto as never,
      { ruta: "/cache/imagenes/x/7-02 Musso.png", ancho: 800, alto: 600 },
      {
        titulo: " Logos que venden ",
        frase: "Hechos a mano",
      },
    );
    expect(contenidoMiniatura(elegida)).toEqual({
      foto: { ruta: "imagenes/7-02 Musso.png", ancho: 800, alto: 600, enfoque: null },
      nombre: "Logos que venden",
      gancho: "Hechos a mano",
    });
    // Sin elegir nada, sigue como siempre: la primera foto y los textos del título.
    expect(contenidoMiniatura(conFoto as never)).toMatchObject({
      foto: { ruta: "imagenes/primera.png" },
      nombre: "Andreea",
      gancho: "logos que se recuerdan",
    });
  });
});
