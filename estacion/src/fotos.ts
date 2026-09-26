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

// Títulos de archivo que casi nunca son un retrato: vestidos de museo, estatuas, tumbas, sellos…
const NO_ES_RETRATO =
  /\b(dress|costume|statue|sculpture|grave|tomb|mausoleum|memorial|plaque|mural|stamp|star|sign|poster|album|cover|logo|map|building|street|way|avenue|boulevard|plaza|square|park|school|museum|exhibit|festival|carnaval|carnival|parade|tribute|impersonator|cosplay|quarter|coin|medal|banknote|collage|montage|drawing|painting|caricature|museo|estatua|escultura|tumba|mausoleo|parque|calle|avenida|plaza|escuela|placa|sello|moneda|disco|portada|dibujo|pintura|caricatura|homenaje|exposici[oó]n|vestido)\b/i;

/** Palabras del nombre de la persona (sin años ni contexto), para valorar los títulos. */
function nombreBase(busqueda: string): string[] {
  return busqueda
    .split(/\s+/)
    .filter((w) => !/^\d/.test(w))
    .slice(0, 2)
    .map((w) => w.toLowerCase());
}

export async function buscarFoto(busquedas: string[], carpetaPublica: string): Promise<Foto | null> {
  const lista = busquedas.map((x) => x.trim()).filter(Boolean);
  // Reserva: solo el nombre (sin época) por si la búsqueda con contexto no da nada.
  for (const b of [...lista]) {
    const base = nombreBase(b).join(" ");
    if (base && !lista.includes(base)) lista.push(base);
  }
  for (const b of lista) {
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
    // Puntaje: el título trae el nombre de la persona (+), no parece objeto/lugar (−), y es grande (+).
    .map((c) => {
      // «9.7.14CeliaCruzParkByLuigiNovi.jpg» → «9 7 14 celia cruz park by luigi novi jpg»
      const titulo = c.p.title
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .replace(/[_.()-]+/g, " ")
        .toLowerCase();
      const nombre = nombreBase(busqueda);
      // El nombre COMPLETO tiene que estar en el título o en las categorías del archivo
      // («Santa Cruz» no es «Celia Cruz»).
      const categorias = (c.ii?.extmetadata?.Categories?.value ?? "")
        .toLowerCase()
        .split("|")
        .map((x) => x.trim());
      const nombreCompleto = nombre.join(" ");
      // El nombre va como frase seguida («pedro knight»), no palabras sueltas («Pedro Ramos … Knight Foundation»).
      const enTitulo = titulo.includes(nombreCompleto);
      const enCategoria = categorias.some((cat) => cat === nombreCompleto);
      const pixeles = (c.ii?.width ?? 0) * (c.ii?.height ?? 0);
      const puntaje =
        (enTitulo ? 4 : 0) +
        (enCategoria ? 3 : 0) -
        (NO_ES_RETRATO.test(titulo) ? 10 : 0) +
        Math.min(2, pixeles / 3_000_000);
      // Sin la categoría de la persona, un homónimo se cuela («Celia Cruz» funcionaria de la FDA).
      // Los artistas conocidos siempre tienen su categoría en Commons.
      return { ...c, puntaje, conNombre: enCategoria };
    })
    .sort((a, b) => b.puntaje - a.puntaje);
  const elegida = candidatas.find(({ ii, puntaje, conNombre }) => {
    const prop = (ii?.width ?? 1) / (ii?.height ?? 1);
    return conNombre && puntaje > 0 && prop > 0.5 && prop < 2.2;
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
