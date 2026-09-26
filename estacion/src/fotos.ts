// Fotos reales con licencia libre desde Wikimedia Commons (para biografías).
// Solo se aceptan licencias que permiten uso comercial y obras derivadas
// (CC BY, CC BY-SA, CC0, dominio público). El crédito del autor y la licencia
// quedan en creditos.txt para ponerlos en la descripción del video.
import { existsSync } from "node:fs";
import { copyFile, link, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { licenciaLibre } from "@compartido/licencias";
import { config } from "./config";

export type Foto = { ruta: string; ancho: number; alto: number; credito: string };

const AGENTE = "Escenia/0.1 (https://windoce.com; escenia@windoce.com)";
const usadas = new Set<string>();

type PaginaCommons = {
  title: string;
  imageinfo?: {
    width: number;
    height: number;
    thumburl?: string;
    url: string;
    extmetadata?: Record<string, { value: string }>;
  }[];
};

function sinHtml(t: string): string {
  return t
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export async function buscarFoto(busquedas: string[], carpetaPublica: string): Promise<Foto | null> {
  for (const b of busquedas.map((x) => x.trim()).filter(Boolean)) {
    const foto = await buscarUna(b, carpetaPublica).catch((e) => {
      console.warn(`Commons falló con «${b}»: ${e instanceof Error ? e.message : e}`);
      return null;
    });
    if (foto) return foto;
  }
  return null;
}

async function buscarUna(busqueda: string, carpetaPublica: string): Promise<Foto | null> {
  const q = new URLSearchParams({
    action: "query",
    format: "json",
    generator: "search",
    gsrsearch: `filetype:bitmap ${busqueda}`,
    gsrnamespace: "6",
    gsrlimit: "30",
    prop: "imageinfo",
    iiprop: "url|extmetadata|size",
    iiurlwidth: "1920",
  });
  const r = await fetch(`https://commons.wikimedia.org/w/api.php?${q}`, {
    headers: { "user-agent": AGENTE },
  });
  if (!r.ok) {
    console.warn(`Commons respondió ${r.status} para «${busqueda}».`);
    return null;
  }
  const datos = (await r.json()) as { query?: { pages?: Record<string, PaginaCommons> } };
  const paginas = Object.values(datos.query?.pages ?? {});
  const candidatas = paginas
    .map((p) => ({ p, ii: p.imageinfo?.[0] }))
    .filter(({ p, ii }) => {
      if (!ii || usadas.has(p.title)) return false;
      const meta = ii.extmetadata ?? {};
      const licencia = meta.LicenseShortName?.value ?? "";
      const esFoto = !/\.(svg|gif|pdf|tif|tiff)$/i.test(p.title);
      return esFoto && ii.width >= 900 && licenciaLibre(licencia);
    })
    // Primero las más grandes y con proporción de foto (ni tiras ni logos).
    .sort((a, b) => (b.ii?.width ?? 0) * (b.ii?.height ?? 0) - (a.ii?.width ?? 0) * (a.ii?.height ?? 0));
  const elegida = candidatas.find(({ ii }) => {
    const prop = (ii?.width ?? 1) / (ii?.height ?? 1);
    return prop > 0.5 && prop < 2.2;
  });
  if (!elegida?.ii) return null;
  const { p, ii } = elegida;
  const meta = ii.extmetadata ?? {};
  const autor = sinHtml(meta.Artist?.value ?? meta.Credit?.value ?? "autor desconocido");
  const licencia = meta.LicenseShortName?.value ?? "";
  const origen = ii.thumburl ?? ii.url;

  const carpeta = path.join(config.CARPETA_CLIPS, "fotos");
  await mkdir(carpeta, { recursive: true });
  const extension = /\.png$/i.test(origen) ? "png" : "jpg";
  const nombre = `commons-${Buffer.from(p.title).toString("base64url").slice(0, 40)}.${extension}`;
  const destino = path.join(carpeta, nombre);
  if (!existsSync(destino)) {
    const d = await fetch(origen, { headers: { "user-agent": AGENTE } });
    if (!d.ok) return null;
    await writeFile(destino, Buffer.from(await d.arrayBuffer()));
  }
  usadas.add(p.title);
  await mkdir(path.join(carpetaPublica, "fotos"), { recursive: true });
  await link(destino, path.join(carpetaPublica, "fotos", nombre)).catch(() =>
    copyFile(destino, path.join(carpetaPublica, "fotos", nombre)),
  );
  const pagina = `https://commons.wikimedia.org/wiki/${encodeURIComponent(p.title.replace(/ /g, "_"))}`;
  return {
    ruta: `fotos/${nombre}`,
    ancho: ii.width,
    alto: ii.height,
    credito: `Foto: ${autor} · ${licencia} · ${pagina}`,
  };
}
