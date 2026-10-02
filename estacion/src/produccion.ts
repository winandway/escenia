// Produce UN video de punta a punta: voz → subtítulos → clips → render.
import { cp, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DURACION_INTERLUDIO, limpiarRotulo, type Guion } from "@compartido/guion";
import { busquedasDeFoto } from "@compartido/fotosweb";
import type { Marca } from "@compartido/marcas";
import { anioDe, elegirReferencia, ES_INFANCIA } from "@compartido/referencias";
import { config } from "./config";
import type { PropsVideo } from "./remotion/props";
import { empaquetar, renderizar, renderizarMiniatura } from "./render";
import { planificarShorts, type EscenaParaShort } from "@compartido/shorts";
import { buscarFoto, buscarReferencias, type FotoReferencia } from "./fotos";
import { generarImagen, imagenesActivas } from "./imagenes";
import { buscarClip, RESERVA_DOCUMENTAL, RESERVA_POR_PARTE } from "./visuales";
import { enfoquesDe } from "./enfoque";
import { rellenarPlanos, resolverPlanos } from "./planos";
import { tramosQuietos } from "@compartido/planos";
import { prepararMusica } from "./musica";
import { generarVoz } from "./voz";

export type Avisar = (paso: string, progreso: number) => Promise<unknown>;
export type Gastar = (servicio: string, detalle: string, costoUsd: number) => Promise<unknown>;

export type ShortProducido = {
  ruta: string;
  bytes: number;
  duracionSeg: number;
  titulo: string;
  indice: number;
  escenaInicio: number;
  escenaFin: number;
};

export type ResultadoProduccion = {
  rutaMp4: string;
  rutaMiniatura: string | null;
  shorts: ShortProducido[];
  bytes: number;
  duracionSeg: number;
  vozDePrueba: boolean;
  rutaVoz: string;
  rutaSubtitulos: string;
  costoVozUsd: number;
  creditos: string[];
};

const aqui = path.dirname(fileURLToPath(import.meta.url));
// `sfx` va en el repositorio (sonidos generados, sin licencia de terceros).
// `sfx-local` vive solo en la Mac (los sonidos de Richard) y, si trae un
// archivo con el mismo nombre, gana.
// `sfx-panel` trae los efectos que Richard subió desde el panel (C-SONIDOS-1), y manda sobre los dos.
const CARPETAS_SFX = [
  path.resolve(aqui, "../recursos/sfx"),
  path.resolve(aqui, "../recursos/sfx-local"),
  path.resolve(aqui, "../recursos/sfx-panel"),
];

/** Copia los efectos de sonido a la carpeta pública del trabajo. */
async function prepararSfx(carpetaPublica: string): Promise<PropsVideo["sfx"]> {
  const destino = path.join(carpetaPublica, "sfx");
  await mkdir(destino, { recursive: true });
  const archivos = new Set<string>();
  for (const carpeta of CARPETAS_SFX) {
    const lista = (await readdir(carpeta).catch(() => [] as string[])).filter((a) => a.endsWith(".mp3"));
    for (const a of lista) {
      await cp(path.join(carpeta, a), path.join(destino, a));
      archivos.add(a);
    }
  }
  const tiene = (n: string) => (archivos.has(n) ? `sfx/${n}` : null);
  return {
    whoosh: [...archivos]
      .filter((a) => a.startsWith("whoosh-"))
      .sort()
      .map((a) => `sfx/${a}`),
    pop: tiene("pop.mp3"),
    riser: tiene("riser.mp3"),
    ding: tiene("ding.mp3"),
    boom: tiene("boom.mp3"),
    // Un sonido corto por cada cambio de imagen: los «corte-N.mp3» (C-RITMO-1).
    corte: [...archivos]
      .filter((a) => a.startsWith("corte-"))
      .sort()
      .map((a) => `sfx/${a}`),
  };
}

export type Plantilla = "TechExplainer" | "MiniDocumental";

const CARPETA_MARCAS = path.resolve(aqui, "../recursos/marcas");

/**
 * Copia el logo del canal a la carpeta pública del trabajo y arma la marca del
 * video. Si el logo no está, el video sale sin marca y se avisa: un canal con
 * marca nunca sale con un hueco donde iba el logo.
 */
async function prepararMarca(
  marca: Marca | null,
  canal: { nombre: string; usuario: string } | null,
  carpetaPublica: string,
): Promise<PropsVideo["marca"]> {
  if (!marca) return null;
  const origen = path.join(CARPETA_MARCAS, marca.carpeta, "logo.png");
  try {
    await mkdir(path.join(carpetaPublica, "marca"), { recursive: true });
    await cp(origen, path.join(carpetaPublica, "marca", "logo.png"));
  } catch (err) {
    console.error(
      `MARCA: falta el logo de «${marca.id}» en ${origen}; el video sale sin marca. ${err instanceof Error ? err.message : err}`,
    );
    return null;
  }
  return {
    id: marca.id,
    logo: "marca/logo.png",
    nombre: canal?.nombre ?? "",
    usuario: canal?.usuario ?? "",
    lema: marca.lema,
    acento: marca.acento,
    secundario: marca.secundario,
  };
}

export async function producir(
  clave: string,
  guion: Guion,
  producto: { nombre: string; url: string } | null,
  avisar: Avisar,
  plantilla: Plantilla = "TechExplainer",
  gastar: Gastar = async () => {},
  canal: { nombre: string; usuario: string } | null = null,
  marca: Marca | null = null,
): Promise<ResultadoProduccion> {
  const carpetaTrabajo = path.join(config.CARPETA_SALIDA, clave);
  // Carpeta pública SOLO de este trabajo: voz + clips + sfx que usa. Se empaqueta con ella.
  const carpetaPublica = path.join(config.CARPETA_PUBLICA, clave);
  await mkdir(carpetaTrabajo, { recursive: true });
  await mkdir(carpetaPublica, { recursive: true });

  const voz = await generarVoz(
    guion.escenas.map((e) => ({
      texto: e.parte === "interludio" ? "" : e.narracion,
      silencioSeg: e.parte === "interludio" ? (e.duracion_seg ?? DURACION_INTERLUDIO.porDefecto) : undefined,
    })),
    carpetaTrabajo,
    avisar,
    guion.voz,
  );
  await cp(voz.rutaMp3, path.join(carpetaPublica, "voz.mp3"));
  const rutaSubtitulos = path.join(carpetaTrabajo, "subtitulos.json");
  await writeFile(rutaSubtitulos, JSON.stringify({ palabras: voz.palabras, tramos: voz.tramos }, null, 2));
  const sfx = await prepararSfx(carpetaPublica);
  const marcaVideo = await prepararMarca(marca, canal, carpetaPublica);
  if (marca)
    await avisar(
      marcaVideo ? `marca del canal: ${marcaVideo.nombre || marca.id}` : "marca del canal: FALTA EL LOGO",
      33,
    );

  await avisar("eligiendo la música de fondo", 34);
  const creditos: string[] = [];
  const musica = await prepararMusica(guion.musica, carpetaPublica);
  if (musica) creditos.push(musica.credito);
  await avisar(
    musica
      ? `música: ${musica.archivo}`
      : "música: ninguna (no hay pista que encaje en estacion/recursos/musica-local)",
    34,
  );

  await avisar("buscando clips de fondo", 35);
  // Biografías: una foto real (libre) de la persona sirve de referencia para
  // que las imágenes generadas se parezcan a ella (C-IMAGEN-2).
  const personaDelTitulo = (guion.titulo.split(/[:—-]/)[0] ?? "").trim();
  let referencias: FotoReferencia[] = [];
  const documental = plantilla === "MiniDocumental";
  const reservas = documental ? RESERVA_DOCUMENTAL : RESERVA_POR_PARTE;
  if (documental && personaDelTitulo && imagenesActivas()) {
    const textos = guion.escenas.map(
      (e) =>
        `${e.visual.fecha ?? ""} ${e.narracion} ${(e.visual.cuadros ?? []).map((c) => c.prompt_imagen).join(" ")}`,
    );
    const anios = textos.map((t) => anioDe(t)).filter((a): a is number => a !== null);
    const infancia = textos.some((t) => ES_INFANCIA.test(t));
    referencias = await buscarReferencias(personaDelTitulo, 5, { anios, infancia });
    await avisar(
      referencias.length
        ? `fotos de referencia de ${personaDelTitulo}: ${referencias.length} (${referencias.map((f) => f.anio ?? "sin año").join(", ")})`
        : `fotos de referencia de ${personaDelTitulo}: no hay en Wikimedia Commons; las imágenes van sin referencia`,
      35,
    );
  }
  const creditosReferencia = new Set<string>();
  const paraShorts: EscenaParaShort[] = [];
  // Las biografías avanzan en el tiempo: una escena sin año hereda el de la anterior.
  let ultimoAnio: number | null = null;
  const escenas: PropsVideo["escenas"] = [];
  for (const [i, e] of guion.escenas.entries()) {
    const tramo = voz.tramos[i];
    if (!tramo) continue;
    // Toda escena lleva clip: primero la búsqueda de la IA, luego las de reserva por parte.
    const busquedas = [e.visual.busqueda ?? "", ...(reservas[e.parte] ?? reservas.contexto ?? [])];
    let foto: PropsVideo["escenas"][number]["foto"] = null;
    if (e.visual.tipo === "foto" && e.visual.busqueda) {
      // Una foto de lugar no cae de reserva en el nombre del artista ni exige una cara.
      const deLugar = e.visual.foto_de === "lugar";
      // La reserva con el nombre del título solo vale en biografías (C-IMAGEN-5).
      const f = await buscarFoto(
        busquedasDeFoto(e.visual.busqueda, guion.titulo, { documental, deLugar }),
        carpetaPublica,
        { persona: !deLugar },
      );
      if (f) {
        foto = { ruta: f.ruta, ancho: f.ancho, alto: f.alto, enfoque: null };
        creditos.push(f.credito);
      }
    }
    // Imágenes generadas con IA: un cuadro por frase de la narración (o una sola
    // si la IA solo dio `prompt_imagen`). Solo con FAL_KEY; si falla, va clip.
    const fotos: PropsVideo["escenas"][number]["fotos"] = [];
    const anioEscena: number | null =
      anioDe(`${e.visual.fecha ?? ""} ${e.visual.texto_en_pantalla ?? ""} ${e.narracion}`) ?? ultimoAnio;
    if (anioEscena !== null) ultimoAnio = anioEscena;
    if (e.visual.tipo === "ia" && imagenesActivas()) {
      const persona = (guion.titulo.split(/[:—-]/)[0] ?? "").trim();
      const prompts = (e.visual.cuadros?.map((c) => c.prompt_imagen) ?? [])
        .concat(e.visual.cuadros?.length ? [] : e.visual.prompt_imagen ? [e.visual.prompt_imagen] : [])
        .filter(Boolean);
      const epoca = /\b19[0-6]\d(s)?\b/.test(`${prompts.join(" ")} ${e.visual.texto_en_pantalla ?? ""}`);
      // La persona del video tiene que estar en cada imagen: si la IA no la nombró, se antepone.
      const conPersona = prompts.map((pr) => {
        const nombra = persona && pr.toLowerCase().includes(persona.toLowerCase().split(" ")[0] ?? "");
        return nombra || !persona ? pr : `${persona}, ${pr}`;
      });
      // De a tres a la vez, para no tardar.
      for (let k = 0; k < conPersona.length; k += 3) {
        const lote = conPersona.slice(k, k + 3);
        const resultados = await Promise.all(
          lote.map((pr) => {
            const ref = elegirReferencia(referencias, anioDe(pr) ?? anioEscena, pr);
            const credito = referencias.find((f) => f.ruta === ref?.ruta)?.credito;
            if (credito) creditosReferencia.add(credito);
            return generarImagen(pr, carpetaPublica, { blancoYNegro: epoca, referencia: ref?.ruta }).catch(
              (err) => {
                console.warn(`Imagen IA falló: ${err instanceof Error ? err.message : err}`);
                return null;
              },
            );
          }),
        );
        for (const img of resultados) {
          if (!img) continue;
          fotos.push({ ruta: img.ruta, ancho: img.ancho, alto: img.alto, enfoque: null });
          creditos.push(img.credito);
          if (img.costoUsd > 0) await gastar("fal.ai", `imagen escena ${i + 1}`, img.costoUsd);
        }
        void avisar(
          `imágenes con IA: escena ${i + 1}, ${Math.min(k + 3, conPersona.length)} de ${conPersona.length}`,
          36,
        );
      }
      if (fotos[0]) foto = fotos[0];
    }
    const esRecorte = e.visual.tipo === "periodico" || e.visual.tipo === "red" || e.visual.tipo === "titular";
    const recorte: PropsVideo["escenas"][number]["recorte"] = esRecorte
      ? {
          tipo: e.visual.tipo as "periodico" | "red" | "titular",
          titular: limpiarRotulo(e.visual.titular) || limpiarRotulo(e.visual.texto_en_pantalla),
          fecha: e.visual.fecha ?? "",
          cuerpo: e.visual.cuerpo ?? "",
        }
      : null;
    const esFrase = e.visual.tipo === "texto" || e.visual.tipo === "titulo";
    // Fondo: en biografías, detrás de las fotos, los titulares y los recortes va
    // una foto de la PERSONA difuminada (nunca un clip ajeno tipo «pantallas de
    // trading»); solo las escenas «stock» llevan clip de ambiente. C-FONDO-1.
    const fondoDePersona = documental && (foto || esFrase || esRecorte || e.parte === "interludio");
    let fondoFoto: string | null = null;
    if (fondoDePersona) {
      const propia = foto ?? fotos[0] ?? null;
      fondoFoto = propia ? propia.ruta : await fotoDeFondo(referencias, carpetaPublica);
    }
    const c = fondoFoto
      ? null
      : await buscarClip(foto ? busquedas.slice(1) : busquedas, false, carpetaPublica);
    if (c) creditos.push(c.credito);
    const estilo: PropsVideo["escenas"][number]["estilo"] = foto
      ? "foto"
      : recorte
        ? recorte.tipo === "titular"
          ? "titular"
          : "recorte"
        : esFrase
          ? "frase"
          : "clip";
    escenas.push({
      parte: e.parte,
      inicioMs: tramo.inicioMs,
      finMs: tramo.finMs,
      textoEnPantalla: limpiarRotulo(e.visual.texto_en_pantalla),
      estilo,
      clip: c ? { ruta: c.ruta, duracionSeg: c.duracionSeg } : null,
      foto,
      fotos,
      recorte,
      interludio: e.parte === "interludio",
      fondoFoto,
      planos: [],
    });
    // Planos del guion: cada uno entra con la frase que se dice (C-RITMO-1).
    const escenaLista = escenas[escenas.length - 1];
    if (escenaLista && e.visual.planos?.length) {
      const r = await resolverPlanos({
        planos: e.visual.planos,
        palabras: voz.palabras.filter((p) => p.startMs >= tramo.inicioMs && p.startMs < tramo.finMs),
        inicioMs: tramo.inicioMs,
        finMs: tramo.finMs,
        carpetaPublica,
        alCredito: (credito) => creditos.push(credito),
      });
      escenaLista.planos = r.planos;
      if (r.sinFrase || r.sinImagen)
        console.warn(
          `  planos escena ${i + 1}: ${r.planos.length} de ${e.visual.planos.length}` +
            (r.sinFrase ? ` · ${r.sinFrase} sin su frase en la narración (se repartieron)` : "") +
            (r.sinImagen ? ` · ${r.sinImagen} sin imagen (se quitaron)` : ""),
        );
    }
    paraShorts.push({
      inicioMs: tramo.inicioMs,
      finMs: tramo.finMs,
      parte: e.parte,
      narracion: e.narracion,
      textoEnPantalla: e.visual.texto_en_pantalla,
      titular: e.visual.titular,
    });
    void avisar(
      `clips de fondo: escena ${i + 1} de ${guion.escenas.length}`,
      35 + Math.round((i / guion.escenas.length) * 5),
    );
  }

  // Relleno (C-RITMO-1): donde una escena se quedaría quieta, entran fotos del
  // propio video o clips de ambiente. Así también mejoran los guiones sin planos.
  await avisar("revisando que ninguna imagen se quede quieta", 37);
  const fotosDelVideo = [
    ...new Map(
      escenas
        .flatMap((e) => [
          ...(e.foto ? [e.foto] : []),
          ...e.fotos,
          ...e.planos.flatMap((p) => (p.foto ? [p.foto] : [])),
        ])
        .map((f) => [f.ruta, f] as const),
    ).values(),
  ];
  const turno = { n: 0 };
  for (const [i, escena] of escenas.entries()) {
    const delGuion = guion.escenas.filter((_, k) => voz.tramos[k])[i];
    escena.planos = await rellenarPlanos({
      escena,
      fotosDelVideo,
      preferirFotos: documental,
      busquedasDeClip: [
        delGuion?.visual.busqueda ?? "",
        ...(reservas[escena.parte] ?? reservas.contexto ?? []),
      ],
      carpetaPublica,
      alCredito: (credito) => creditos.push(credito),
      turno,
    });
  }
  const totalPlanos = escenas.reduce((n, e) => n + e.planos.length, 0);
  const quietos = tramosQuietos(
    escenas.map((e) => ({ inicioMs: e.inicioMs, finMs: e.finMs, cambios: e.planos.map((p) => p.inicioMs) })),
  );
  await avisar(
    `ritmo visual: ${totalPlanos + escenas.length} imágenes en ${Math.round(voz.duracionMs / 1000)} s` +
      (quietos.length ? ` · OJO: ${quietos.length} tramo(s) quietos de más de 6 s` : ""),
    37,
  );
  if (quietos.length)
    console.warn(
      `  RITMO: tramos quietos → ${quietos.map((q) => `escena ${q.escena + 1} (${Math.round((q.hastaMs - q.desdeMs) / 1000)} s)`).join(", ")}`,
    );

  // Dónde está la persona en cada foto (para el recorte vertical de los shorts).
  await avisar("buscando las caras para el recorte vertical", 38);
  const todasLasFotos = escenas.flatMap((e) => [
    ...(e.foto ? [e.foto] : []),
    ...e.fotos,
    ...e.planos.flatMap((p) => (p.foto ? [p.foto] : [])),
  ]);
  const enfoques = await enfoquesDe([
    ...new Set(todasLasFotos.map((f) => path.join(carpetaPublica, f.ruta))),
  ]);
  for (const f of todasLasFotos) f.enfoque = enfoques.get(path.join(carpetaPublica, f.ruta)) ?? null;

  const props: PropsVideo = {
    titulo: guion.titulo,
    audio: "voz.mp3",
    duracionMs: voz.duracionMs,
    palabras: voz.palabras,
    escenas,
    producto,
    vozDePrueba: voz.vozDePrueba,
    tema: plantilla === "MiniDocumental" ? "documental" : "tech",
    sfx,
    musica: musica ? { ruta: musica.ruta, duracionSeg: musica.duracionSeg, nivel: 1 } : null,
    marca: marcaVideo,
    ventana: null,
    // El canal queda guardado con las props (la miniatura se agrega después, en memoria):
    // así rearmar.ts puede volver a armar el cierre sin preguntarle nada al panel.
    cierre: { canalNombre: canal?.nombre ?? "", canalUsuario: canal?.usuario ?? "", miniatura: null },
  };
  await writeFile(path.join(carpetaTrabajo, "props.json"), JSON.stringify(props, null, 2));

  await avisar("armando la miniatura y el video (16:9)", 40);
  const serveUrl = await empaquetar(carpetaPublica);
  // Miniatura del largo: se usa en el cierre de los shorts (y luego en YouTube).
  let rutaMiniatura: string | null = path.join(carpetaTrabajo, "miniatura.png");
  try {
    await renderizarMiniatura(props, serveUrl, rutaMiniatura);
    const png = await readFile(rutaMiniatura);
    props.cierre = {
      canalNombre: canal?.nombre ?? "",
      canalUsuario: canal?.usuario ?? "",
      miniatura: `data:image/png;base64,${png.toString("base64")}`,
    };
  } catch (err) {
    console.warn(`Miniatura falló: ${err instanceof Error ? err.message : err}`);
    rutaMiniatura = null;
    props.cierre = { canalNombre: canal?.nombre ?? "", canalUsuario: canal?.usuario ?? "", miniatura: null };
  }
  const rutaMp4 = path.join(carpetaTrabajo, "video-16x9.mp4");
  let ultimo = 40;
  const r = await renderizar(
    plantilla,
    props,
    carpetaPublica,
    rutaMp4,
    (p) => {
      const pct = 40 + Math.round(p * 40);
      if (pct >= ultimo + 5) {
        ultimo = pct;
        void avisar(`armando el video (16:9) ${Math.round(p * 100)}%`, pct);
      }
    },
    serveUrl,
  );

  // Shorts 9:16: el mismo video en trozos, cada uno con su título y su cierre.
  const plan = planificarShorts(paraShorts);
  const shorts: ShortProducido[] = [];
  for (const [k, ventana] of plan.entries()) {
    const base = 80 + Math.round((k / plan.length) * 17);
    await avisar(`armando el short ${k + 1} de ${plan.length} (9:16): «${ventana.titulo}»`, base);
    const salida = path.join(carpetaTrabajo, `short-${k + 1}.mp4`);
    const rs = await renderizar(
      "TechExplainerShort",
      { ...props, ventana },
      carpetaPublica,
      salida,
      () => {},
      serveUrl,
    );
    shorts.push({
      ruta: salida,
      bytes: rs.bytes,
      duracionSeg: rs.duracionSeg,
      titulo: ventana.titulo,
      indice: ventana.indice,
      escenaInicio: ventana.escenaInicio,
      escenaFin: ventana.escenaFin,
    });
  }

  creditos.push(...creditosReferencia);
  if (creditos.length)
    await writeFile(path.join(carpetaTrabajo, "creditos.txt"), [...new Set(creditos)].join("\n"));

  return {
    rutaMp4,
    rutaMiniatura,
    shorts,
    bytes: r.bytes,
    duracionSeg: r.duracionSeg,
    vozDePrueba: voz.vozDePrueba,
    rutaVoz: voz.rutaMp3,
    rutaSubtitulos,
    costoVozUsd: voz.costoUsd,
    creditos: [...new Set(creditos)],
  };
}

/** Copia la primera foto de referencia a la carpeta pública para usarla de fondo difuminado. */
async function fotoDeFondo(referencias: FotoReferencia[], carpetaPublica: string): Promise<string | null> {
  const ref = referencias.find((r) => !r.infancia) ?? referencias[0];
  if (!ref) return null;
  const nombre = `fondo-${path.basename(ref.ruta)}`;
  await mkdir(path.join(carpetaPublica, "fotos"), { recursive: true });
  const destino = path.join(carpetaPublica, "fotos", nombre);
  await cp(ref.ruta, destino).catch(() => {});
  return `fotos/${nombre}`;
}
