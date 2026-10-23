// Publicidad en Short (prototipo, 17 oct 2026): arma un anuncio vertical de 30 a 40 segundos con las
// fotos, el logo y el avatar de la carpeta del cliente (publicidad/<cliente>/: logo/, productos/,
// avatar/) y un plan.json con lo que dice la voz y cuándo entra cada imagen.
//   voz    → la narración con la voz elegida (femenina por defecto), con los tiempos de cada palabra;
//   avatar → la chica hablando con FlashTalk (2 ¢ por segundo) sobre verde, y el verde quitado;
//   armar  → el video con la plantilla «Publicidad».
// Uso (desde estacion/): npx tsx src/publicidad.ts ../publicidad/proinshop/plan-generador.json --paso voz|avatar|armar
// Los mismos pasos los usa `publicidades.ts` para los anuncios pedidos desde el panel (rutas absolutas).
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { bloquesDeSubtitulos } from "./monigotes-plan";
import {
  aparicionesDelPlan,
  costoPublicidadUsd,
  esquemaPlanPublicidad,
  type PlanPublicidad,
  puntaDelDedo,
  recorteDeEncuadre,
  textoDelPlan,
  tiemposDeFrases,
  vaVolteada,
} from "./publicidad-plan";

const exec = promisify(execFile);
const huella = (dato: string | Buffer) => createHash("sha1").update(dato).digest("hex").slice(0, 12);

const opcion = (nombre: string): string | null => {
  const i = process.argv.indexOf(nombre);
  return i === -1 ? null : (process.argv[i + 1] ?? null);
};

export type VozGuardada = {
  texto: string;
  voz: string;
  /** La voz entera (MP3, o WAV cuando se hizo por partes). */
  rutaMp3: string;
  palabras: { text: string; startMs: number; endMs: number }[];
  duracionMs: number;
  costoUsd: number;
};
/** `recuadro`: la foto traía su fondo y va en un marco redondeado; sin fondo, va recortada de cuerpo entero. */
export type AvatarGuardado = {
  ruta: string;
  ancho: number;
  alto: number;
  costoUsd: number;
  recuadro: boolean;
};

const RECURSOS = path.resolve("recursos");
const VERDE = "#00b140";

/** Duración exacta de un audio, en milisegundos. */
async function duracionAudioMs(ruta: string): Promise<number> {
  const { stdout } = await exec("ffprobe", [
    "-v",
    "error",
    "-show_entries",
    "format=duration",
    "-of",
    "csv=p=0",
    ruta,
  ]);
  return Math.round(Number(stdout.trim()) * 1000);
}

/**
 * La voz con sus tiempos. Si ya se hizo con el mismo texto y la misma voz, no se paga otra vez. Con
 * `partes`, cada parte se hace y se guarda aparte (rehacer una sola no cambia las demás) y se juntan en
 * un WAV con una pausa corta entre ellas.
 */
export async function pasoVoz(
  plan: PlanPublicidad,
  trabajo: string,
  avisar: (t: string) => unknown = (t) => console.log(`  ${t}`),
  maximoSeg = plan.maximo_seg,
): Promise<VozGuardada & { nueva: boolean }> {
  const texto = textoDelPlan(plan);
  const archivo = path.join(trabajo, "voz.json");
  if (existsSync(archivo)) {
    const ya = JSON.parse(await readFile(archivo, "utf8")) as VozGuardada;
    if (ya.texto === texto && ya.voz === plan.voz && existsSync(ya.rutaMp3)) return { ...ya, nueva: false };
  }
  const { generarVoz } = await import("./voz");
  const aviso = async (paso: string) => {
    await avisar(paso);
  };
  let guardada: VozGuardada;
  let nueva = 0;
  if (!plan.partes) {
    const r = await generarVoz(
      [{ texto }],
      path.join(trabajo, "voz"),
      aviso,
      plan.voz,
      plan.idioma,
      plan.letras_por_segundo,
    );
    nueva = r.costoUsd;
    guardada = {
      texto,
      voz: plan.voz,
      rutaMp3: r.rutaMp3,
      palabras: r.palabras,
      duracionMs: r.duracionMs,
      costoUsd: r.costoUsd,
    };
  } else {
    const partes: { wav: string; palabras: VozGuardada["palabras"]; duracionMs: number; costoUsd: number }[] =
      [];
    for (const [k, parte] of plan.partes.entries()) {
      const carpetaParte = path.join(
        trabajo,
        "voz-partes",
        `${k + 1}-${huella(`${plan.voz}|${plan.idioma}|${parte}${plan.letras_por_segundo ? `|${plan.letras_por_segundo}` : ""}`)}`,
      );
      const json = path.join(carpetaParte, "parte.json");
      if (!existsSync(json)) {
        await avisar(`voz: parte ${k + 1} de ${plan.partes.length}`);
        const r = await generarVoz(
          [{ texto: parte }],
          carpetaParte,
          aviso,
          plan.voz,
          plan.idioma,
          plan.letras_por_segundo,
        );
        const wav = path.join(carpetaParte, "parte.wav");
        await exec("ffmpeg", [
          "-y",
          "-v",
          "error",
          "-i",
          r.rutaMp3,
          "-ar",
          "44100",
          "-ac",
          "1",
          "-c:a",
          "pcm_s16le",
          wav,
        ]);
        await writeFile(
          json,
          JSON.stringify(
            { wav, palabras: r.palabras, duracionMs: await duracionAudioMs(wav), costoUsd: r.costoUsd },
            null,
            2,
          ),
        );
        nueva += r.costoUsd;
      }
      partes.push(JSON.parse(await readFile(json, "utf8")) as (typeof partes)[number]);
    }
    // Se juntan en un solo WAV, con una pausa igual entre parte y parte.
    const silencio = path.join(trabajo, "voz-partes", "pausa.wav");
    await exec("ffmpeg", [
      "-y",
      "-v",
      "error",
      "-f",
      "lavfi",
      "-i",
      "anullsrc=r=44100:cl=mono",
      "-t",
      String(Math.max(0.01, plan.pausa_ms / 1000)),
      "-c:a",
      "pcm_s16le",
      silencio,
    ]);
    const lista = path.join(trabajo, "voz-partes", "lista.txt");
    await writeFile(
      lista,
      partes
        .flatMap((p, k) => [`file '${p.wav}'`, ...(k < partes.length - 1 ? [`file '${silencio}'`] : [])])
        .join("\n"),
    );
    const wav = path.join(trabajo, "voz.wav");
    await exec("ffmpeg", [
      "-y",
      "-v",
      "error",
      "-f",
      "concat",
      "-safe",
      "0",
      "-i",
      lista,
      "-c:a",
      "pcm_s16le",
      wav,
    ]);
    const palabras: VozGuardada["palabras"] = [];
    let desde = 0;
    for (const p of partes) {
      for (const w of p.palabras) palabras.push({ ...w, startMs: w.startMs + desde, endMs: w.endMs + desde });
      desde += p.duracionMs + plan.pausa_ms;
    }
    guardada = {
      texto,
      voz: plan.voz,
      rutaMp3: wav,
      palabras,
      duracionMs: await duracionAudioMs(wav),
      costoUsd: partes.reduce((t, p) => t + p.costoUsd, 0),
    };
  }
  // Se guarda antes de mirar el largo: la voz ya se pagó y no se vuelve a pedir.
  await writeFile(archivo, JSON.stringify(guardada, null, 2));
  const seg = guardada.duracionMs / 1000;
  if (seg > maximoSeg)
    throw new Error(`La voz dura ${seg.toFixed(1)} s: un anuncio no pasa de ${maximoSeg}. Acorta el texto.`);
  console.log(`  voz: ${seg.toFixed(1)} s · $${nueva.toFixed(4)} nuevos`);
  return { ...guardada, costoUsd: nueva, nueva: nueva > 0 };
}

/** Dónde entra cada momento y el cierre en la voz; revienta si una frase no está tal cual. */
export function tiemposDelPlan(
  plan: PlanPublicidad,
  voz: Pick<VozGuardada, "palabras" | "duracionMs">,
): { inicios: number[]; cierreMs: number } {
  const frases = [...plan.momentos.map((m) => m.frase), plan.cierre.frase];
  const encontrados = tiemposDeFrases(frases, voz.palabras);
  const faltan = frases.filter((_, i) => encontrados[i] === null);
  if (faltan.length)
    throw new Error(`Estas frases no están en la voz (tienen que ser literales): ${faltan.join(" · ")}`);
  const inicios = plan.momentos.map((_, i) => (i === 0 ? 0 : (encontrados[i] ?? 0)));
  return { inicios, cierreMs: encontrados[plan.momentos.length] ?? voz.duracionMs };
}

/** La persona por tramos, ya hecha: un video transparente por aparición. */
export type AparicionGuardada = {
  inicioMs: number;
  finMs: number;
  ruta: string;
  ancho: number;
  alto: number;
  encuadre: "medio" | "cuerpo";
  /** Dónde está su cara en el video (fracciones), para mostrar solo la cabecita. */
  cara: { x: number; y: number; ancho: number; alto: number } | null;
  /** Diseño «pizarra»: su lado, si va volteada y si es una foto quieta (de espaldas). */
  lado?: "izquierda" | "derecha";
  espejo?: boolean;
  quieta?: boolean;
  /** La punta del dedo en la figura (fracciones, sin voltear). */
  dedo?: { x: number; y: number } | null;
  costoUsd: number;
};

/** El recuadro que ocupa la figura (lo que no es transparente) en un PNG sin fondo. */
async function cajaDeFigura(ruta: string): Promise<{ x: number; y: number; ancho: number; alto: number }> {
  const { default: sharp } = await import("sharp");
  const { data, info } = await sharp(ruta)
    .ensureAlpha()
    .extractChannel(3)
    .raw()
    .toBuffer({ resolveWithObject: true });
  let x1 = info.width;
  let y1 = info.height;
  let x2 = -1;
  let y2 = -1;
  for (let y = 0; y < info.height; y++)
    for (let x = 0; x < info.width; x++)
      if ((data[y * info.width + x] ?? 0) > 40) {
        if (x < x1) x1 = x;
        if (x > x2) x2 = x;
        if (y < y1) y1 = y;
        if (y > y2) y2 = y;
      }
  if (x2 < 0) throw new Error(`No hay ninguna figura en ${path.basename(ruta)}.`);
  return { x: x1, y: y1, ancho: x2 - x1 + 1, alto: y2 - y1 + 1 };
}

/**
 * La persona por tramos (momentos con `persona`): cada aparición es su propio video de FlashTalk con
 * la voz de ese tramo, sobre verde, y el verde quitado. Si la foto trae fondo, se le quita antes con
 * la Mac (gratis). Lo ya hecho (misma figura y mismo pedazo de voz) no se vuelve a pagar.
 */
export async function pasoPersonas(
  plan: PlanPublicidad,
  carpeta: string,
  trabajo: string,
  avisar: (t: string) => unknown = (t) => console.log(`  ${t}`),
  /** Solo deja las figuras sobre verde (para revisarlas antes de pagar el avatar). */
  soloPreparar = false,
): Promise<AparicionGuardada[]> {
  const voz = JSON.parse(await readFile(path.join(trabajo, "voz.json"), "utf8")) as VozGuardada;
  const { inicios, cierreMs } = tiemposDelPlan(plan, voz);
  const apariciones = aparicionesDelPlan(
    plan.momentos.map((m, i) => ({ inicioMs: inicios[i] ?? 0, persona: m.persona })),
    cierreMs,
  );
  const { default: sharp } = await import("sharp");
  const { generarAvatar } = await import("./avatar");
  const { quitarCroma, detectarCroma, medidasDeVideo } = await import("./croma");
  const { figuraSinFondo, detectarCara } = await import("./quitar-fondo");
  const dir = path.join(trabajo, "personas");
  await mkdir(dir, { recursive: true });
  const salida: AparicionGuardada[] = [];
  for (const [k, a] of apariciones.entries()) {
    const sinFondo = await figuraSinFondo(path.resolve(carpeta, a.imagen), dir);
    const r = recorteDeEncuadre(await cajaDeFigura(sinFondo), a.encuadre, a.corte);
    const lado = a.lado ?? "izquierda";
    const espejo = vaVolteada(a);
    if (a.quieta) {
      // De espaldas y señalando: una foto quieta, sin voz que poner en la boca (gratis).
      const recorte = await sharp(sinFondo)
        .extract({ left: r.x, top: r.y, width: r.ancho, height: r.alto })
        .resize({ height: 1500, fit: "inside" })
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      // El borde del recorte de Vision sale en escalones: se suaviza un poco el canal alfa.
      const { width: w, height: h } = recorte.info;
      const alfaSuave = await sharp(recorte.data, { raw: { width: w, height: h, channels: 4 } })
        .extractChannel(3)
        .blur(1.2)
        .raw()
        .toBuffer();
      const rgba = Buffer.from(recorte.data);
      for (let i = 0; i < w * h; i++) rgba[i * 4 + 3] = alfaSuave[i] ?? 0;
      const png = await sharp(rgba, { raw: { width: w, height: h, channels: 4 } })
        .png()
        .toBuffer();
      const ruta = path.join(dir, `${huella(png)}-quieta.png`);
      if (!existsSync(ruta)) await writeFile(ruta, png);
      const { data, info } = await sharp(png).ensureAlpha().extractChannel(3).raw().toBuffer({
        resolveWithObject: true,
      });
      const dedo = puntaDelDedo(new Uint8Array(data), info.width, info.height, a.apunta ?? "derecha");
      console.log(
        `  ${k + 1}. quieta ${a.encuadre} ${(a.inicioMs / 1000).toFixed(1)}–${(a.finMs / 1000).toFixed(1)} s → ${ruta}`,
      );
      salida.push({
        inicioMs: a.inicioMs,
        finMs: a.finMs,
        ruta,
        ancho: info.width,
        alto: info.height,
        encuadre: a.encuadre,
        cara: null,
        lado,
        espejo,
        quieta: true,
        dedo,
        costoUsd: 0,
      });
      continue;
    }
    const figura = await sharp(sinFondo)
      .extract({ left: r.x, top: r.y, width: r.ancho, height: r.alto })
      .resize({ width: 856, height: 1496, fit: "inside" })
      .png()
      .toBuffer();
    const meta = await sharp(figura).metadata();
    const anchoFigura = meta.width ?? 0;
    const altoFigura = meta.height ?? 0;
    const izquierdaFigura = Math.round((896 - anchoFigura) / 2);
    const arribaFigura = 1536 - altoFigura;
    // Sobre verde parejo, centrada y apoyada abajo: el medio cuerpo sigue fuera de cuadro.
    const verde = await sharp({ create: { width: 896, height: 1536, channels: 3, background: VERDE } })
      .composite([
        {
          input: figura,
          left: izquierdaFigura,
          top: arribaFigura,
        },
      ])
      .png()
      .toBuffer();
    // El pedazo de voz de esta aparición.
    const pedazoWav = path.join(dir, `pedazo-${k + 1}.wav`);
    await exec("ffmpeg", [
      "-y",
      "-v",
      "error",
      "-i",
      voz.rutaMp3,
      "-ss",
      String(a.inicioMs / 1000),
      "-to",
      String(a.finMs / 1000),
      "-ar",
      "44100",
      "-ac",
      "1",
      "-c:a",
      "pcm_s16le",
      pedazoWav,
    ]);
    const clave = huella(Buffer.concat([verde, await readFile(pedazoWav)]));
    const rutaVerde = path.join(dir, `${clave}-verde.png`);
    if (!existsSync(rutaVerde)) await writeFile(rutaVerde, verde);
    // La cara, en fracciones de la figura (el video sin fondo queda recortado a la figura).
    const caraJson = path.join(dir, `${clave}-cara.json`);
    if (!existsSync(caraJson)) {
      const c = await detectarCara(rutaVerde);
      const enFigura = c
        ? {
            x: (c.x * 896 - izquierdaFigura) / anchoFigura,
            y: (c.y * 1536 - arribaFigura) / altoFigura,
            ancho: (c.ancho * 896) / anchoFigura,
            alto: (c.alto * 1536) / altoFigura,
          }
        : null;
      await writeFile(caraJson, JSON.stringify(enFigura));
    }
    const cara = JSON.parse(await readFile(caraJson, "utf8")) as AparicionGuardada["cara"];
    if (soloPreparar) {
      console.log(
        `  ${k + 1}. ${a.encuadre} ${(a.inicioMs / 1000).toFixed(1)}–${(a.finMs / 1000).toFixed(1)} s → ${rutaVerde}`,
      );
      continue;
    }
    const clip = path.join(dir, `${clave}.mp4`);
    let costoUsd = 0;
    if (!existsSync(clip)) {
      const pedazoMp3 = path.join(dir, `${clave}.mp3`);
      await exec("ffmpeg", [
        "-y",
        "-v",
        "error",
        "-i",
        pedazoWav,
        "-c:a",
        "libmp3lame",
        "-b:a",
        "192k",
        pedazoMp3,
      ]);
      await avisar(
        `persona ${k + 1} de ${apariciones.length} (${a.encuadre}, ${((a.finMs - a.inicioMs) / 1000).toFixed(1)} s)`,
      );
      const res = await generarAvatar({
        imagen: rutaVerde,
        audio: pedazoMp3,
        modelo: "fal-ai/flashtalk",
        salida: clip,
        avisar: (t) => void avisar(t),
      });
      costoUsd = res.costoUsd;
    }
    const webm = path.join(dir, `${clave}.webm`);
    let medidas: { ancho: number; alto: number };
    const medidasJson = path.join(dir, `${clave}.json`);
    if (existsSync(webm) && existsSync(medidasJson)) {
      medidas = JSON.parse(await readFile(medidasJson, "utf8")) as { ancho: number; alto: number };
    } else {
      const m = await medidasDeVideo(clip);
      const croma = await detectarCroma(clip, m.duracionSeg);
      medidas = await quitarCroma(clip, webm, croma?.color ?? VERDE, {
        alto: a.encuadre === "cuerpo" ? 1500 : 900,
      });
      await writeFile(medidasJson, JSON.stringify(medidas));
    }
    salida.push({
      inicioMs: a.inicioMs,
      finMs: a.finMs,
      ruta: webm,
      ...medidas,
      encuadre: a.encuadre,
      cara,
      lado,
      espejo,
      quieta: false,
      dedo: null,
      costoUsd,
    });
  }
  if (soloPreparar) return salida;
  await writeFile(path.join(trabajo, "personas.json"), JSON.stringify(salida, null, 2));
  const total = salida.reduce((t, x) => t + x.costoUsd, 0);
  console.log(`  personas: ${salida.length} apariciones · $${total.toFixed(3)} nuevos`);
  return salida;
}

/**
 * La persona hablando (FlashTalk, 2 ¢ por segundo). Si su foto no tiene fondo, se pone sobre verde y el
 * verde se quita: queda recortada. Si trae fondo, se anima tal cual y va en un recuadro. El clip ya
 * hecho no se vuelve a pagar.
 */
export async function pasoAvatar(
  plan: PlanPublicidad,
  carpeta: string,
  trabajo: string,
  avisar: (t: string) => unknown = (t) => console.log(`  ${t}`),
): Promise<AvatarGuardado | null> {
  if (!plan.avatar) {
    console.log("  Este anuncio va sin avatar.");
    return null;
  }
  const voz = JSON.parse(await readFile(path.join(trabajo, "voz.json"), "utf8")) as VozGuardada;
  const { default: sharp } = await import("sharp");
  const { generarAvatar } = await import("./avatar");
  const { quitarCroma, detectarCroma, medidasDeVideo } = await import("./croma");
  const foto = path.resolve(carpeta, plan.avatar);
  const { isOpaque } = await sharp(foto).stats();
  if (isOpaque) {
    // La foto trae su fondo: se anima tal cual (centrada en vertical 9:16) y va en un recuadro.
    const vertical = path.join(trabajo, "avatar-foto.png");
    await sharp(foto)
      .resize({ width: 896, height: 1536, fit: "cover", position: "attention" })
      .png()
      .toFile(vertical);
    const clip = path.join(trabajo, "avatar-foto.mp4");
    let costoUsd = 0;
    if (!existsSync(clip)) {
      const r = await generarAvatar({
        imagen: vertical,
        audio: voz.rutaMp3,
        modelo: "fal-ai/flashtalk",
        salida: clip,
        avisar: (t) => void avisar(t),
      });
      costoUsd = r.costoUsd;
    }
    const medidas = await medidasDeVideo(clip);
    const guardado: AvatarGuardado = {
      ruta: clip,
      ancho: medidas.ancho,
      alto: medidas.alto,
      costoUsd,
      recuadro: true,
    };
    await writeFile(path.join(trabajo, "avatar.json"), JSON.stringify(guardado, null, 2));
    console.log(`  avatar: ${medidas.ancho}×${medidas.alto} en recuadro · $${costoUsd.toFixed(2)}`);
    return guardado;
  }
  // La persona (PNG sin fondo) sobre verde parejo, de cuerpo entero hasta la cintura: FlashTalk
  // anima la cara y los hombros, y el verde se quita después.
  const lienzo = { ancho: 896, alto: 1536 };
  const figura = await sharp(foto)
    .resize({ width: lienzo.ancho - 40, height: lienzo.alto - 40, fit: "inside" })
    .png()
    .toBuffer();
  const meta = await sharp(figura).metadata();
  const verde = path.join(trabajo, "avatar-verde.png");
  await sharp({ create: { width: lienzo.ancho, height: lienzo.alto, channels: 3, background: VERDE } })
    .composite([
      {
        input: figura,
        left: Math.round((lienzo.ancho - (meta.width ?? 0)) / 2),
        top: lienzo.alto - (meta.height ?? 0),
      },
    ])
    .png()
    .toFile(verde);
  const clip = path.join(trabajo, "avatar-verde.mp4");
  let costoUsd = 0;
  if (!existsSync(clip)) {
    const r = await generarAvatar({
      imagen: verde,
      audio: voz.rutaMp3,
      modelo: "fal-ai/flashtalk",
      salida: clip,
      avisar: (t) => void avisar(t),
    });
    costoUsd = r.costoUsd;
  }
  const medidas = await medidasDeVideo(clip);
  const croma = await detectarCroma(clip, medidas.duracionSeg);
  const transparente = path.join(trabajo, "avatar.webm");
  const { ancho, alto } = await quitarCroma(clip, transparente, croma?.color ?? VERDE, { alto: 1000 });
  const guardado: AvatarGuardado = { ruta: transparente, ancho, alto, costoUsd, recuadro: false };
  await writeFile(path.join(trabajo, "avatar.json"), JSON.stringify(guardado, null, 2));
  console.log(`  avatar: ${ancho}×${alto} sin fondo · $${costoUsd.toFixed(2)}`);
  return guardado;
}

/** Arma el video con la plantilla «Publicidad». Devuelve dónde quedó, cuánto dura y lo que costó. */
export async function pasoArmar(
  plan: PlanPublicidad,
  carpeta: string,
  trabajo: string,
  /** El nombre del video (otra versión del mismo anuncio no pisa a la primera). */
  nombre = "anuncio",
  /** Solo estos cuadros sueltos (PNG), para revisar el diseño antes de armar el video entero. */
  cuadros?: number[],
): Promise<{ salida: string; duracionMs: number; costoUsd: number }> {
  const voz = JSON.parse(await readFile(path.join(trabajo, "voz.json"), "utf8")) as VozGuardada;
  const avatar =
    plan.avatar && existsSync(path.join(trabajo, "avatar.json"))
      ? (JSON.parse(await readFile(path.join(trabajo, "avatar.json"), "utf8")) as AvatarGuardado)
      : null;
  const publica = path.join(trabajo, "publico");
  await mkdir(publica, { recursive: true });
  const copiar = async (origen: string, nombre: string) => {
    await copyFile(origen, path.join(publica, nombre));
    return nombre;
  };
  const logo = await copiar(path.resolve(carpeta, plan.logo), `logo${path.extname(plan.logo)}`);
  const audio = await copiar(voz.rutaMp3, `voz${path.extname(voz.rutaMp3)}`);
  const musica = plan.musica ? await copiar(path.resolve(carpeta, plan.musica), "musica.mp3") : null;
  const cortes: string[] = [];
  for (const n of ["whoosh-1.mp3", "corte-2.mp3", "whoosh-2.mp3", "corte-4.mp3"]) {
    const origen = path.join(RECURSOS, "sfx", n);
    if (existsSync(origen)) cortes.push(await copiar(origen, `sfx-${n}`));
  }
  const final = existsSync(path.join(RECURSOS, "sfx", "ding.mp3"))
    ? await copiar(path.join(RECURSOS, "sfx", "ding.mp3"), "sfx-ding.mp3")
    : null;
  const avatarProps = avatar
    ? {
        ruta: await copiar(avatar.ruta, `avatar${path.extname(avatar.ruta)}`),
        video: true,
        ancho: avatar.ancho,
        alto: avatar.alto,
        recuadro: Boolean(avatar.recuadro),
      }
    : null;

  const { inicios, cierreMs } = tiemposDelPlan(plan, voz);
  const conPersonas = plan.momentos.some((m) => m.persona);
  const apariciones = conPersonas
    ? await Promise.all(
        (JSON.parse(await readFile(path.join(trabajo, "personas.json"), "utf8")) as AparicionGuardada[]).map(
          async (a, k) => ({
            inicioMs: a.inicioMs,
            finMs: a.finMs,
            ruta: await copiar(a.ruta, `persona-${k + 1}${path.extname(a.ruta)}`),
            ancho: a.ancho,
            alto: a.alto,
            encuadre: a.encuadre,
            cara: a.cara ?? null,
            lado: a.lado ?? "izquierda",
            espejo: a.espejo ?? false,
            quieta: a.quieta ?? false,
            dedo: a.dedo ?? null,
          }),
        ),
      )
    : [];
  const { default: sharp } = await import("sharp");
  // La misma imagen va con el mismo nombre: así la tarjeta viaja de una zona a otra sin cortar.
  const imagenEnPublico = async (relativa: string) => {
    const origen = path.resolve(carpeta, relativa);
    const nombre = `img-${huella(origen)}${path.extname(origen)}`;
    if (!existsSync(path.join(publica, nombre))) await copiar(origen, nombre);
    const m = await sharp(origen).metadata();
    return { nombre, ancho: m.width ?? 0, alto: m.height ?? 0 };
  };
  const sonidoEnPublico = async (nombre: string) => {
    const opciones = [
      path.resolve(carpeta, nombre),
      ...["sfx", "sfx-local", "sfx-panel"].map((c) => path.join(RECURSOS, c, nombre)),
    ];
    const origen = opciones.find((o) => existsSync(o));
    if (!origen) throw new Error(`No encuentro el efecto «${nombre}».`);
    return copiar(origen, `sfx-m-${path.basename(origen)}`);
  };
  const tramos = [];
  for (const [i, m] of plan.momentos.entries()) {
    const inicioMs = inicios[i] ?? 0;
    const finMs = inicios[i + 1] ?? cierreMs;
    const chipsInicio = m.chips
      ? tiemposDeFrases(
          m.chips.map((c) => c.palabra),
          voz.palabras.filter((p) => p.startMs >= inicioMs),
        )
      : [];
    const img = m.imagen ? await imagenEnPublico(m.imagen) : null;
    tramos.push({
      inicioMs,
      finMs,
      imagen: img?.nombre ?? null,
      imagenAncho: img?.ancho ?? 0,
      imagenAlto: img?.alto ?? 0,
      enfoque: m.enfoque ?? null,
      sinTarjeta: Boolean(m.sin_tarjeta),
      sonido: m.sonido ? await sonidoEnPublico(m.sonido) : null,
      cifra: m.cifra
        ? {
            valor: m.cifra.valor,
            prefijo: m.cifra.prefijo ?? "",
            sufijo: m.cifra.sufijo ?? "",
            decimales: m.cifra.decimales ?? 0,
          }
        : null,
      oscurecer: Boolean(m.oscurecer),
      entrada: m.entrada ?? "golpe",
      vistaPersona: m.vista_persona ?? null,
      texto: m.texto ?? null,
      chips: (m.chips ?? []).map((c, k) => ({ texto: c.texto, inicioMs: chipsInicio[k] ?? inicioMs })),
    });
  }
  const duracionMs = voz.duracionMs + plan.cola_ms;
  const props = {
    marca: plan.marca,
    acento: plan.acento,
    logo,
    tema: plan.tema,
    diseno: plan.diseno,
    paleta: plan.paleta ?? null,
    portada: plan.portada
      ? { lineas: plan.portada.lineas, etiqueta: plan.portada.etiqueta, hastaMs: plan.portada.hasta_ms }
      : null,
    avatar: conPersonas ? null : avatarProps,
    apariciones,
    audio,
    musica,
    duracionMs,
    tramos,
    subtitulos: bloquesDeSubtitulos(voz.palabras),
    cierre: { inicioMs: cierreMs, lineas: plan.cierre.lineas },
    sfx: { cortes, final },
  };
  await writeFile(
    path.join(trabajo, nombre === "anuncio" ? "props.json" : `props-${nombre}.json`),
    JSON.stringify(props, null, 2),
  );
  const { empaquetar } = await import("./render");
  const { renderMedia, selectComposition } = await import("@remotion/renderer");
  const serveUrl = await empaquetar(publica);
  const comp = await selectComposition({ serveUrl, id: "Publicidad", inputProps: props });
  if (cuadros) {
    const { renderStill } = await import("@remotion/renderer");
    const dir = path.join(trabajo, `cuadros-${nombre}`);
    await mkdir(dir, { recursive: true });
    for (const c of cuadros) {
      const salida = path.join(dir, `${String(c).padStart(5, "0")}.png`);
      await renderStill({ composition: comp, serveUrl, output: salida, frame: c, inputProps: props });
    }
    console.log(`Cuadros en ${dir}`);
    return { salida: dir, duracionMs, costoUsd: 0 };
  }
  const salida = path.join(trabajo, `${nombre}.mp4`);
  await renderMedia({
    composition: comp,
    serveUrl,
    codec: "h264",
    outputLocation: salida,
    inputProps: props,
  });
  const costo = costoPublicidadUsd(voz.duracionMs / 1000, Boolean(avatar) || conPersonas, voz.costoUsd);
  console.log(
    `Listo: ${salida} · ${(duracionMs / 1000).toFixed(1)} s · costo calculado $${costo.toFixed(2)}`,
  );
  return { salida, duracionMs, costoUsd: costo };
}

async function principal() {
  const rutaPlan = process.argv[2];
  if (!rutaPlan) throw new Error("Uso: publicidad.ts plan.json --paso voz|verdes|avatar|armar|cuadros");
  const plan = esquemaPlanPublicidad.parse(JSON.parse(await readFile(path.resolve(rutaPlan), "utf8")));
  const carpeta = path.dirname(path.resolve(rutaPlan));
  const nombre = path.basename(rutaPlan, ".json");
  // Otra versión del mismo anuncio trabaja en la carpeta del primero: misma voz, misma persona.
  const trabajo = path.join(carpeta, "trabajo", plan.trabajo_de ?? nombre);
  await mkdir(trabajo, { recursive: true });
  const paso = opcion("--paso") ?? "voz";
  if (paso === "voz") return void (await pasoVoz(plan, trabajo));
  if (paso === "verdes") return void (await pasoPersonas(plan, carpeta, trabajo, undefined, true));
  if (paso === "avatar")
    return void (plan.momentos.some((m) => m.persona)
      ? await pasoPersonas(plan, carpeta, trabajo)
      : await pasoAvatar(plan, carpeta, trabajo));
  if (paso === "armar")
    return void (await pasoArmar(plan, carpeta, trabajo, plan.trabajo_de ? nombre : "anuncio"));
  if (paso === "cuadros") {
    // Cuadros sueltos para revisar el diseño: --en 0,60,300 (números de cuadro, a 30 por segundo).
    const en = (opcion("--en") ?? "0")
      .split(",")
      .map(Number)
      .filter((n) => Number.isFinite(n));
    return void (await pasoArmar(plan, carpeta, trabajo, plan.trabajo_de ? nombre : "anuncio", en));
  }
  throw new Error(`Paso desconocido: ${paso}`);
}

if (process.argv[1] && /^publicidad\.(ts|js|mjs)$/.test(path.basename(process.argv[1]))) {
  principal().catch((e: unknown) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
