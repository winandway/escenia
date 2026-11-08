// Fase 3 (C-YOUTUBE-1): subida a YouTube en privado, UTM y métricas. Todo simulado: ninguna prueba
// le pega a Google.
import { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { campanaDeGuion, enlaceConUtm, textoConUtm } from "@compartido/utm";
import {
  idDeEnlace,
  leerPieza,
  metadatosDeSubida,
  metricasDe,
  piezaParaSubir,
  recortarEtiquetas,
  subirVideo,
  tokenDeAcceso,
  type PiezaParaSubir,
} from "../estacion/src/youtube";

const MARCA = { campana: campanaDeGuion(20), contenido: "largo" };
const PIEZA: PiezaParaSubir = {
  titulo: "Le robaron 25 millones con una videollamada falsa",
  descripcion: "Pruébalo en https://qrbott.com. Y mira https://youtu.be/abcdefghijk",
  etiquetas: ["estafa", "deepfake"],
  idioma: "es",
  categoria: "28",
  utm: MARCA,
  sintetico: true,
};
const PUBLICACION = {
  titulo: "Le robaron 25 millones con una videollamada falsa",
  descripcion: "Descripción con https://losupe.com/nota",
  etiquetas: ["ia"],
  shorts: [{ indice: 2, titulo: "La videollamada era falsa" }],
};

describe("UTM en los enlaces de la descripción (C-YOUTUBE-1)", () => {
  it("marca nuestros enlaces y deja los de YouTube y los que ya traen UTM", () => {
    expect(enlaceConUtm("https://qrbott.com/precios", MARCA)).toBe(
      "https://qrbott.com/precios?utm_source=youtube&utm_medium=video&utm_campaign=escenia-g20&utm_content=largo",
    );
    expect(enlaceConUtm("https://youtu.be/abcdefghijk", MARCA)).toBe("https://youtu.be/abcdefghijk");
    expect(enlaceConUtm("https://x.com/?utm_source=ig", MARCA)).toBe("https://x.com/?utm_source=ig");
  });

  it("el punto final de la frase no se mete en el enlace", () => {
    const t = textoConUtm("Visita https://qrbott.com. Gracias", MARCA);
    expect(t).toContain("utm_content=largo. Gracias");
    expect(t.startsWith("Visita https://qrbott.com/?utm_source=youtube")).toBe(true);
  });
});

describe("subida a YouTube (C-YOUTUBE-1)", () => {
  it("SIEMPRE en privado, con la marca de contenido sintético y la descripción con UTM", () => {
    const m = metadatosDeSubida(PIEZA);
    expect(m.status).toEqual({
      privacyStatus: "private",
      selfDeclaredMadeForKids: false,
      containsSyntheticMedia: true,
    });
    expect(m.snippet.description).toContain("utm_campaign=escenia-g20");
    expect(m.snippet.description).toContain("https://youtu.be/abcdefghijk");
    expect(metadatosDeSubida({ ...PIEZA, titulo: "x".repeat(150) }).snippet.title).toHaveLength(100);
  });

  it("las etiquetas no pasan de 500 letras", () => {
    const muchas = Array.from({ length: 80 }, (_, i) => `etiqueta numero ${i}`);
    const r = recortarEtiquetas(muchas);
    expect(r.length).toBeLessThan(80);
    expect(r.reduce((n, e) => n + e.length + 3, 0)).toBeLessThanOrEqual(520);
  });

  it("un comercial no va a nuestros canales; un Short lleva su título y #Shorts", () => {
    expect(() =>
      piezaParaSubir({
        guionId: 3,
        tematicaId: "comercial",
        canal: null,
        publicacion: PUBLICACION,
        pieza: leerPieza("largo"),
      }),
    ).toThrow(/cliente/);
    const s = piezaParaSubir({
      guionId: 20,
      tematicaId: "novedades-ia",
      canal: "canal-ia",
      publicacion: PUBLICACION,
      pieza: leerPieza("short-2"),
    });
    expect(s.titulo).toBe("La videollamada era falsa #Shorts");
    expect(s.utm).toEqual({ campana: "escenia-g20", contenido: "short-2" });
    expect(s.categoria).toBe("28");
    expect(() => leerPieza("short-x")).toThrow();
  });

  it("sube por partes: primero los datos, después el archivo, y devuelve el id", async () => {
    const carpeta = await mkdtemp(path.join(os.tmpdir(), "yt-"));
    const mp4 = path.join(carpeta, "v.mp4");
    // eslint-disable-next-line security/detect-non-literal-fs-filename -- carpeta temporal de la prueba
    await writeFile(mp4, Buffer.alloc(1234));
    const llamadas: { url: string; init?: RequestInit }[] = [];
    const f = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      llamadas.push({ url: String(url), init });
      if (llamadas.length === 1)
        return new Response(null, { status: 200, headers: { location: "https://subida.test/sesion" } });
      return Response.json({ id: "abcdefghijk" });
    }) as unknown as typeof fetch;
    expect(await subirVideo("tok", mp4, PIEZA, f)).toBe("abcdefghijk");
    expect(llamadas[0]?.url).toContain("uploadType=resumable");
    expect(JSON.parse(String(llamadas[0]?.init?.body)).status.privacyStatus).toBe("private");
    expect(llamadas[1]?.url).toBe("https://subida.test/sesion");
    expect((llamadas[1]?.init?.headers as Record<string, string>)["content-length"]).toBe("1234");
  });

  it("un permiso vencido se dice en palabras", async () => {
    const f = (async () =>
      Response.json({ error: "invalid_grant" }, { status: 400 })) as unknown as typeof fetch;
    await expect(
      tokenDeAcceso(
        { client_id: "x".repeat(12), client_secret: "x".repeat(8), refresh_token: "x".repeat(12) },
        f,
      ),
    ).rejects.toThrow(/autorizar-youtube/);
  });
});

describe("métricas de YouTube", () => {
  it("lee vistas, me gusta y comentarios de los ids, en lotes de 50", async () => {
    const urls: string[] = [];
    const f = (async (url: string) => {
      urls.push(url);
      return Response.json({
        items: [
          {
            id: "abcdefghijk",
            snippet: { title: "Uno" },
            status: { privacyStatus: "public" },
            statistics: { viewCount: "1132", likeCount: "40", commentCount: "7" },
          },
        ],
      });
    }) as unknown as typeof fetch;
    const ids = Array.from({ length: 51 }, (_, i) => `id${String(i).padStart(9, "0")}`);
    const m = await metricasDe("tok", ids, f);
    expect(urls).toHaveLength(2);
    expect(m[0]).toEqual({
      id: "abcdefghijk",
      titulo: "Uno",
      privacidad: "public",
      vistas: 1132,
      meGusta: 40,
      comentarios: 7,
    });
  });

  it("saca el id de cualquier enlace de YouTube", () => {
    expect(idDeEnlace("https://youtu.be/abcdefghijk")).toBe("abcdefghijk");
    expect(idDeEnlace("https://www.youtube.com/watch?v=abcdefghijk&t=3")).toBe("abcdefghijk");
    expect(idDeEnlace("https://youtube.com/shorts/abcdefghijk")).toBe("abcdefghijk");
    expect(idDeEnlace("https://qrbott.com")).toBeNull();
  });
});
