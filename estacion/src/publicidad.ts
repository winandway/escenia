// Publicidad en Short (prototipo, 17 oct 2026): arma un anuncio vertical de 30 a 40 segundos con las
// fotos, el logo y el avatar de la carpeta del cliente (publicidad/<cliente>/: logo/, productos/,
// avatar/) y un plan.json con lo que dice la voz y cuándo entra cada imagen.
//   voz    → la narración con la voz elegida (femenina por defecto), con los tiempos de cada palabra;
//   avatar → la chica hablando con FlashTalk (2 ¢ por segundo) sobre verde, y el verde quitado;
//   armar  → el video con la plantilla «Publicidad».
// Uso (desde estacion/): npx tsx src/publicidad.ts ../publicidad/proinshop/plan-generador.json --paso voz|avatar|armar
// Los mismos pasos los usa `publicidades.ts` para los anuncios pedidos desde el panel (rutas absolutas).
import { existsSync } from "node:fs";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { bloquesDeSubtitulos } from "./monigotes-plan";
import {
  costoPublicidadUsd,
  esquemaPlanPublicidad,
  type PlanPublicidad,
  SEGUNDOS_MAXIMOS,
  tiemposDeFrases,
} from "./publicidad-plan";

const opcion = (nombre: string): string | null => {
  const i = process.argv.indexOf(nombre);
  return i === -1 ? null : (process.argv[i + 1] ?? null);
};

export type VozGuardada = {
  texto: string;
  voz: string;
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

/** La voz con sus tiempos. Si ya se hizo con el mismo texto y la misma voz, no se paga otra vez. */
export async function pasoVoz(
  plan: PlanPublicidad,
  trabajo: string,
  avisar: (t: string) => unknown = (t) => console.log(`  ${t}`),
  maximoSeg = SEGUNDOS_MAXIMOS,
): Promise<VozGuardada & { nueva: boolean }> {
  const archivo = path.join(trabajo, "voz.json");
  if (existsSync(archivo)) {
    const ya = JSON.parse(await readFile(archivo, "utf8")) as VozGuardada;
    if (ya.texto === plan.texto && ya.voz === plan.voz && existsSync(ya.rutaMp3))
      return { ...ya, nueva: false };
  }
  const { generarVoz } = await import("./voz");
  const r = await generarVoz(
    [{ texto: plan.texto }],
    path.join(trabajo, "voz"),
    async (paso) => {
      await avisar(paso);
    },
    plan.voz,
    plan.idioma,
  );
  const seg = r.duracionMs / 1000;
  const guardada: VozGuardada = {
    texto: plan.texto,
    voz: plan.voz,
    rutaMp3: r.rutaMp3,
    palabras: r.palabras,
    duracionMs: r.duracionMs,
    costoUsd: r.costoUsd,
  };
  // Se guarda antes de mirar el largo: la voz ya se pagó y no se vuelve a pedir.
  await writeFile(archivo, JSON.stringify(guardada, null, 2));
  if (seg > maximoSeg)
    throw new Error(`La voz dura ${seg.toFixed(1)} s: un anuncio no pasa de ${maximoSeg}. Acorta el texto.`);
  console.log(`  voz: ${seg.toFixed(1)} s · $${r.costoUsd.toFixed(3)}`);
  return { ...guardada, nueva: true };
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
  await copiar(voz.rutaMp3, "voz.mp3");
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

  const inicios = tiemposDeFrases([...plan.momentos.map((m) => m.frase), plan.cierre.frase], voz.palabras);
  const faltan = [...plan.momentos.map((m) => m.frase), plan.cierre.frase].filter(
    (_, i) => inicios[i] === null,
  );
  if (faltan.length)
    throw new Error(`Estas frases no están en la voz (tienen que ser literales): ${faltan.join(" · ")}`);
  const cierreMs = inicios[plan.momentos.length] ?? voz.duracionMs;
  const tramos = [];
  for (const [i, m] of plan.momentos.entries()) {
    const inicioMs = i === 0 ? 0 : (inicios[i] ?? 0);
    const finMs = inicios[i + 1] ?? cierreMs;
    const chipsInicio = m.chips
      ? tiemposDeFrases(
          m.chips.map((c) => c.palabra),
          voz.palabras.filter((p) => p.startMs >= inicioMs),
        )
      : [];
    tramos.push({
      inicioMs,
      finMs,
      imagen: m.imagen
        ? await copiar(path.resolve(carpeta, m.imagen), `img-${i + 1}${path.extname(m.imagen)}`)
        : null,
      texto: m.texto ?? null,
      chips: (m.chips ?? []).map((c, k) => ({ texto: c.texto, inicioMs: chipsInicio[k] ?? inicioMs })),
    });
  }
  const duracionMs = voz.duracionMs + 1200;
  const props = {
    marca: plan.marca,
    acento: plan.acento,
    logo,
    avatar: avatarProps,
    audio: "voz.mp3",
    musica,
    duracionMs,
    tramos,
    subtitulos: bloquesDeSubtitulos(voz.palabras),
    cierre: { inicioMs: cierreMs, lineas: plan.cierre.lineas },
    sfx: { cortes, final },
  };
  await writeFile(path.join(trabajo, "props.json"), JSON.stringify(props, null, 2));
  const { empaquetar } = await import("./render");
  const { renderMedia, selectComposition } = await import("@remotion/renderer");
  const serveUrl = await empaquetar(publica);
  const comp = await selectComposition({ serveUrl, id: "Publicidad", inputProps: props });
  const salida = path.join(trabajo, "anuncio.mp4");
  await renderMedia({
    composition: comp,
    serveUrl,
    codec: "h264",
    outputLocation: salida,
    inputProps: props,
  });
  const costo = costoPublicidadUsd(voz.duracionMs / 1000, Boolean(avatar), voz.costoUsd);
  console.log(
    `Listo: ${salida} · ${(duracionMs / 1000).toFixed(1)} s · costo calculado $${costo.toFixed(2)}`,
  );
  return { salida, duracionMs, costoUsd: costo };
}

async function principal() {
  const rutaPlan = process.argv[2];
  if (!rutaPlan) throw new Error("Uso: publicidad.ts plan.json --paso voz|avatar|armar");
  const plan = esquemaPlanPublicidad.parse(JSON.parse(await readFile(path.resolve(rutaPlan), "utf8")));
  const carpeta = path.dirname(path.resolve(rutaPlan));
  const trabajo = path.join(carpeta, "trabajo", path.basename(rutaPlan, ".json"));
  await mkdir(trabajo, { recursive: true });
  const paso = opcion("--paso") ?? "voz";
  if (paso === "voz") return void (await pasoVoz(plan, trabajo));
  if (paso === "avatar") return void (await pasoAvatar(plan, carpeta, trabajo));
  if (paso === "armar") return void (await pasoArmar(plan, carpeta, trabajo));
  throw new Error(`Paso desconocido: ${paso}`);
}

if (process.argv[1] && /^publicidad\.(ts|js|mjs)$/.test(path.basename(process.argv[1]))) {
  principal().catch((e: unknown) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
