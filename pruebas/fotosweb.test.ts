import { describe, expect, it } from "vitest";
import {
  busquedasDeFoto,
  candidatasDeSerper,
  consultaWeb,
  elegirCandidata,
  esDeAgencia,
  esDeSegunda,
  mencionesDe,
  nombreBuscado,
  esImagen,
} from "@compartido/fotosweb";

describe("fotos reales de internet (C-IMAGEN-3)", () => {
  it("arma la consulta con la persona y la época, o la infancia", () => {
    expect(consultaWeb("Luis Miguel", 1987)).toBe("Luis Miguel 1987");
    expect(consultaWeb("Luis Miguel", null)).toBe("Luis Miguel");
    expect(consultaWeb("Luis Miguel", 1985, true)).toBe("Luis Miguel niño");
  });

  it("lee la respuesta de Serper: solo imágenes http(s) y grandes, con la página de origen", () => {
    const candidatas = candidatasDeSerper({
      images: [
        { imageUrl: "https://a.com/1.jpg", imageWidth: 1200, imageHeight: 800, link: "https://a.com/nota" },
        { imageUrl: "https://b.com/chica.jpg", imageWidth: 300, imageHeight: 200, link: "https://b.com" },
        { imageUrl: "data:image/png;base64,xx", link: "https://c.com" },
        { imageUrl: "https://d.com/sin-tamano.jpg", source: "d.com" },
      ],
    });
    expect(candidatas).toEqual([
      { url: "https://a.com/1.jpg", origen: "https://a.com/nota" },
      { url: "https://d.com/sin-tamano.jpg", origen: "d.com" },
    ]);
    expect(candidatasDeSerper(null)).toEqual([]);
    expect(candidatasDeSerper({ message: "Unauthorized" })).toEqual([]);
  });

  it("distingue una foto de una página HTML disfrazada de foto", () => {
    const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1]);
    const html = new TextEncoder().encode("<!DOCTYPE html><html>");
    expect(esImagen("image/jpeg", html)).toBe(true);
    expect(esImagen(null, jpeg)).toBe(true);
    expect(esImagen("text/html; charset=utf-8", html)).toBe(false);
    expect(esImagen(null, html)).toBe(false);
    expect(esImagen("application/octet-stream", new Uint8Array(3))).toBe(false);
  });

  it("elige una foto con cara y grande; descarta portadas, logos y fotos chicas", () => {
    const mejor = elegirCandidata([
      { url: "a", ancho: 1200, alto: 800, origen: "x", cara: null },
      { url: "b", ancho: 400, alto: 300, origen: "x", cara: 0.05 },
      { url: "c", ancho: 900, alto: 1200, origen: "x", cara: 0.03 },
      { url: "d", ancho: 1600, alto: 1000, origen: "x", cara: 0.012 },
    ]);
    expect(mejor?.url).toBe("c");
    expect(elegirCandidata([{ url: "a", ancho: 1200, alto: 800, origen: "x", cara: null }])).toBeNull();
    expect(elegirCandidata([])).toBeNull();
  });

  it("descarta las fotos de agencias, que vienen con marca de agua encima (C-IMAGEN-4)", () => {
    expect(esDeAgencia("https://www.gettyimages.com/photos/un-artista-2010")).toBe(true);
    expect(esDeAgencia("https://media.istockphoto.com/id/1/photo.jpg")).toBe(true);
    expect(esDeAgencia("https://c8.alamy.com/comp/ABC/foto.jpg")).toBe(true);
    expect(esDeAgencia("https://www.nytimes.com/2025/12/19/arts/music/nota.html")).toBe(false);
    const candidatas = candidatasDeSerper({
      images: [
        {
          imageUrl: "https://media.gettyimages.com/id/1/photo/x.jpg",
          imageWidth: 1024,
          link: "https://www.gettyimages.com/photos/x",
        },
        {
          imageUrl: "https://un-medio.com/foto.jpg",
          imageWidth: 1024,
          link: "https://www.shutterstock.com/editorial/x",
        },
        { imageUrl: "https://un-medio.com/buena.jpg", imageWidth: 1024, link: "https://un-medio.com/nota" },
      ],
    });
    expect(candidatas).toEqual([
      { url: "https://un-medio.com/buena.jpg", origen: "https://un-medio.com/nota" },
    ]);
  });

  it("para la foto de un lugar no exige cara y evita a la persona en primer plano", () => {
    const candidatas = [
      { url: "alfombra", ancho: 1600, alto: 1000, origen: "x", cara: 0.09 },
      { url: "arena", ancho: 1400, alto: 900, origen: "x", cara: null },
      { url: "publico-lejos", ancho: 1200, alto: 800, origen: "x", cara: 0.005 },
      { url: "chica", ancho: 300, alto: 200, origen: "x", cara: null },
    ];
    expect(elegirCandidata(candidatas, 600, false)?.url).toBe("arena");
    // Si todas traen una cara en primer plano, igual se entrega la más grande antes que nada.
    expect(elegirCandidata([candidatas[0]!], 600, false)?.url).toBe("alfombra");
    // Y para una persona, lo de siempre: la cara manda.
    expect(elegirCandidata(candidatas)?.url).toBe("alfombra");
  });
});

describe("la reserva de una foto es el nombre del título solo en biografías (C-IMAGEN-5)", () => {
  it("en una biografía, si la búsqueda del guion no da nada, se busca a la persona del título", () => {
    expect(
      busquedasDeFoto("Celia Cruz 1990s", "Celia Cruz: la niña que gritaba azúcar", {
        documental: true,
        deLugar: false,
      }),
    ).toEqual(["Celia Cruz 1990s", "Celia Cruz"]);
  });

  it("en un video de tecnología no hay reserva: «GPT» no es una persona", () => {
    expect(
      busquedasDeFoto("Sam Altman OpenAI", "GPT-6.1 Astra: el modelo que OpenAI frenó", {
        documental: false,
        deLugar: false,
      }),
    ).toEqual(["Sam Altman OpenAI"]);
  });

  it("una foto de lugar nunca cae en el nombre de la persona", () => {
    expect(
      busquedasDeFoto("MGM Grand Garden Arena Las Vegas", "Prince Royce: la carta", {
        documental: true,
        deLugar: true,
      }),
    ).toEqual(["MGM Grand Garden Arena Las Vegas"]);
  });
});

describe("miniaturas de YouTube y arte de fans solo si no hay nada mejor (C-IMAGEN-6)", () => {
  const miniatura = {
    url: "https://i.ytimg.com/vi/abc/maxresdefault.jpg",
    origen: "https://www.youtube.com/watch?v=abc",
    ancho: 1280,
    alto: 720,
    cara: 0.2,
  };
  const dibujo = {
    url: "https://i.pinimg.com/736x/7b/3f/a3/dibujo.jpg",
    origen: "https://www.pinterest.com/pin/1/",
    ancho: 736,
    alto: 900,
    cara: 0.3,
  };
  const prensa = {
    url: "https://www.billboard.com/wp-content/uploads/foto.jpg",
    origen: "https://www.billboard.com/music/latin/nota",
    ancho: 1200,
    alto: 800,
    cara: 0.05,
  };

  it("reconoce las fuentes de segunda", () => {
    expect(esDeSegunda(miniatura.url)).toBe(true);
    expect(esDeSegunda(dibujo.origen)).toBe(true);
    expect(esDeSegunda(prensa.url)).toBe(false);
  });

  it("con una foto de prensa disponible, gana la de prensa aunque la cara sea más chica", () => {
    expect(elegirCandidata([miniatura, dibujo, prensa])?.url).toBe(prensa.url);
    expect(elegirCandidata([miniatura, prensa], 600, false)?.url).toBe(prensa.url);
  });

  it("si solo hay miniaturas, se usa la mejor de ellas (mejor eso que nada)", () => {
    expect(elegirCandidata([miniatura, dibujo])?.url).toBe(dibujo.url);
  });

  it("si la de prensa no sirve (sin cara), se cae en la de segunda", () => {
    expect(elegirCandidata([miniatura, { ...prensa, cara: null }])?.url).toBe(miniatura.url);
  });
});

describe("gana la foto cuya dirección nombra a la persona que se busca (C-IMAGEN-6)", () => {
  const galeria = {
    url: "https://peopleenespanol.com/thmb/abc/452307126-228a3e0a.jpg",
    origen: "https://peopleenespanol.com/gallery/premios-juventud-2014-ellos-en-la-alfombra-fotos/",
    ancho: 1500,
    alto: 2000,
    cara: 0.25,
  };
  const conNombre = {
    url: "https://galaxymusicpromo.com/wp-content/uploads/2019/04/romeo-santos.jpeg",
    origen: "https://galaxymusicpromo.com/artista/romeo-santos/",
    ancho: 900,
    alto: 900,
    cara: 0.06,
  };
  const pinterest = {
    url: "https://i.pinimg.com/736x/67/2d/80/672d.jpg",
    origen: "https://www.pinterest.com/pin/romeo-santos-333--1618549839038006/",
    ancho: 736,
    alto: 1000,
    cara: 0.3,
  };

  it("saca el nombre de la búsqueda: las dos primeras palabras, sin años ni letras sueltas", () => {
    expect(nombreBuscado("Romeo Santos premios alfombra roja")).toEqual(["romeo", "santos"]);
    expect(nombreBuscado("Karol G 2026")).toEqual(["karol"]);
    expect(nombreBuscado("Álvaro Díaz cantante")).toEqual(["alvaro", "diaz"]);
    expect(nombreBuscado("")).toEqual([]);
  });

  it("cuenta el nombre en la dirección aunque venga codificada o con acentos", () => {
    expect(mencionesDe(["romeo", "santos"], conNombre)).toBe(2);
    expect(mencionesDe(["romeo", "santos"], galeria)).toBe(0);
    expect(
      mencionesDe(["alvaro", "diaz"], { url: "https://x.com/%C3%81lvaro_D%C3%ADaz.jpg", origen: "" }),
    ).toBe(2);
  });

  it("una galería de famosos no le gana a la foto que nombra a la persona", () => {
    const consulta = "Romeo Santos premios alfombra roja";
    expect(elegirCandidata([galeria, conNombre], 600, true, consulta)?.url).toBe(conNombre.url);
    // Y la de prensa con nombre le gana a la de Pinterest con nombre.
    expect(elegirCandidata([pinterest, conNombre, galeria], 600, true, consulta)?.url).toBe(conNombre.url);
    // Si ninguna de primera nombra a la persona, vale la de segunda que sí la nombra.
    expect(elegirCandidata([pinterest, galeria], 600, true, consulta)?.url).toBe(pinterest.url);
  });

  it("sin consulta se comporta como antes", () => {
    expect(elegirCandidata([galeria, conNombre])?.url).toBe(galeria.url);
  });
});
