// Fotos reales con licencia libre desde Wikimedia Commons (para biografías).
// Solo se aceptan licencias que permiten uso comercial y obras derivadas
// (CC BY, CC BY-SA, CC0, dominio público). El crédito del autor y la licencia
// quedan en creditos.txt para ponerlos en la descripción del video.
import { existsSync } from "node:fs";
import { copyFile, link, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { licenciaLibre } from "@compartido/licencias";
import { consultaWeb } from "@compartido/fotosweb";
import { buscarFotoWeb, fotosWebActivas } from "./fotosweb";
import { config } from "./config";

export type Foto = { ruta: string; ancho: number; alto: number; credito: string };
/** Foto real de la persona, en el caché de la Mac, con el año en que fue tomada (si se sabe). */
export type FotoReferencia = {
  ruta: string;
  anio: number | null;
  credito: string;
  titulo: string;
  infancia?: boolean;
};

type Candidata = {
  p: PaginaCommons;
  ii: NonNullable<PaginaCommons["imageinfo"]>[number] | undefined;
  puntaje: number;
  conNombre: boolean;
  anio: number | null;
};

/**
 * Año de la foto SOLO si está en el título («Celia Cruz, 1957.jpg»). La fecha
 * de la cámara no sirve: suele ser la del escaneo o la subida, y con ella una
 * estatua de 2014 pasó por «foto de Celia en 2014».
 */
function anioDeCandidata(p: PaginaCommons): number | null {
  const ahora = new Date().getFullYear();
  const enTitulo = /\b(18[5-9]\d|19\d\d|20\d\d)\b/.exec(p.title)?.[1];
  return enTitulo && Number(enTitulo) <= ahora ? Number(enTitulo) : null;
}

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

export async function buscarFoto(
  busquedas: string[],
  carpetaPublica: string,
  opciones: { persona?: boolean } = {},
): Promise<Foto | null> {
  const lista = busquedas.map((x) => x.trim()).filter(Boolean);
  // Primero internet (foto real de la persona en esa época), si Richard puso la clave de Google.
  if (fotosWebActivas()) {
    for (const b of lista) {
      const web = await buscarFotoWeb(b, opciones).catch((e) => {
        console.warn(`Internet falló con «${b}»: ${e instanceof Error ? e.message : e}`);
        return null;
      });
      if (web && !usadas.has(web.url)) {
        usadas.add(web.url);
        const nombre = path.basename(web.rutaCache);
        await mkdir(path.join(carpetaPublica, "fotos"), { recursive: true });
        await link(web.rutaCache, path.join(carpetaPublica, "fotos", nombre)).catch(() =>
          copyFile(web.rutaCache, path.join(carpetaPublica, "fotos", nombre)),
        );
        return {
          ruta: `fotos/${nombre}`,
          ancho: web.ancho,
          alto: web.alto,
          credito: `Foto de internet (uso editorial): ${web.origen}`,
        };
      }
    }
  }
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

async function candidatasCommons(busqueda: string, anchoMinimo = 900): Promise<Candidata[]> {
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
    return [];
  }
  const datos = (await r.json()) as { query?: { pages?: Record<string, PaginaCommons> } };
  const paginas = Object.values(datos.query?.pages ?? {});
  return (
    paginas
      .map((p) => ({ p, ii: p.imageinfo?.[0] }))
      .filter(({ p, ii }) => {
        if (!ii) return false;
        const meta = ii.extmetadata ?? {};
        const licencia = meta.LicenseShortName?.value ?? "";
        const esFoto = !/\.(svg|gif|pdf|tif|tiff)$/i.test(p.title);
        return esFoto && ii.width >= anchoMinimo && licenciaLibre(licencia);
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
        return { ...c, puntaje, conNombre: enCategoria, anio: anioDeCandidata(c.p) };
      })
      .sort((a, b) => b.puntaje - a.puntaje)
  );
}

async function buscarUna(busqueda: string, carpetaPublica: string): Promise<Foto | null> {
  const candidatas = (await candidatasCommons(busqueda)).filter((c) => !usadas.has(c.p.title));
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

/**
 * Hasta `maximo` fotos reales de la persona, de épocas distintas (una por
 * década cuando se puede), para usarlas de referencia al generar imágenes.
 * Quedan solo en el caché de la Mac; no cuentan como «usadas» para las escenas.
 */
export async function buscarReferencias(
  persona: string,
  maximo = 5,
  epocas: { anios?: number[]; infancia?: boolean } = {},
): Promise<FotoReferencia[]> {
  const salida: FotoReferencia[] = [];
  // Internet primero: una foto real por década del guion, y una de niño si hace falta.
  if (fotosWebActivas()) {
    const decadas = [...new Set((epocas.anios ?? []).map((a) => Math.floor(a / 10) * 10 + 5))].sort();
    const consultas: { consulta: string; anio: number | null; infancia: boolean }[] = decadas.map((a) => ({
      consulta: consultaWeb(persona, a),
      anio: a,
      infancia: false,
    }));
    if (epocas.infancia)
      consultas.unshift({ consulta: consultaWeb(persona, null, true), anio: null, infancia: true });
    if (consultas.length === 0)
      consultas.push({ consulta: consultaWeb(persona, null), anio: null, infancia: false });
    for (const c of consultas.slice(0, maximo)) {
      const web = await buscarFotoWeb(c.consulta).catch(() => null);
      if (web)
        salida.push({
          ruta: web.rutaCache,
          anio: c.anio,
          titulo: c.consulta,
          infancia: c.infancia,
          credito: `Foto de referencia (internet, uso editorial): ${web.origen}`,
        });
    }
    if (salida.length) return salida;
  }
  // Para la cara basta una foto de 500 px; las de escena completa siguen exigiendo 900.
  const candidatas = (await candidatasCommons(persona, 500).catch(() => [] as Candidata[])).filter(
    ({ ii, puntaje, conNombre }) => {
      const prop = (ii?.width ?? 1) / (ii?.height ?? 1);
      return conNombre && puntaje > 0 && prop > 0.4 && prop < 2.2;
    },
  );
  // Una por década (la mejor puntuada), y las sin año al final como reserva.
  const porDecada = new Map<string, Candidata>();
  for (const c of candidatas) {
    const clave = c.anio === null ? "sin-anio" : String(Math.floor(c.anio / 10) * 10);
    if (!porDecada.has(clave)) porDecada.set(clave, c);
  }
  const elegidas = [...porDecada.values()]
    .sort((a, b) => (a.anio ?? 9999) - (b.anio ?? 9999))
    .slice(0, maximo);

  const carpeta = path.join(config.CARPETA_CLIPS, "fotos");
  await mkdir(carpeta, { recursive: true });
  for (const { p, ii, anio } of elegidas) {
    if (!ii) continue;
    const origen = ii.thumburl ?? ii.url;
    const extension = /\.png$/i.test(origen) ? "png" : "jpg";
    const nombre = `commons-${Buffer.from(p.title).toString("base64url").slice(0, 40)}.${extension}`;
    const destino = path.join(carpeta, nombre);
    if (!existsSync(destino)) {
      const d = await fetch(origen, { headers: { "user-agent": AGENTE } }).catch(() => null);
      if (!d?.ok) continue;
      await writeFile(destino, Buffer.from(await d.arrayBuffer()));
    }
    const meta = ii.extmetadata ?? {};
    const autor = sinHtml(meta.Artist?.value ?? meta.Credit?.value ?? "autor desconocido");
    const licencia = meta.LicenseShortName?.value ?? "";
    const pagina = `https://commons.wikimedia.org/wiki/${encodeURIComponent(p.title.replace(/ /g, "_"))}`;
    salida.push({
      ruta: destino,
      anio,
      titulo: p.title,
      credito: `Foto de referencia: ${autor} · ${licencia} · ${pagina}`,
    });
  }
  return salida;
}
