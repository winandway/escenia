// Videos de monigotes animados (docs/MONIGOTES.md), de punta a punta desde un plan:
//   voz      → la narración de cada parte, con un hueco de 5 s después de cada canción (para que
//              Richard pegue el pedacito en su editor), con los tiempos de cada palabra;
//   dibujos  → un dibujo por parte en el estilo fijo de monigote (3 ¢ cada uno);
//   animar   → cada dibujo animado con Kling 2.5 Turbo Pro, del largo que necesita su parte (unos
//              5 $ por video). Con `"animacion": "poses"` NO se paga animación: cada parte lleva su
//              dibujo y varias poses del mismo dibujo (3 ¢ cada una) y la plantilla las mueve gratis
//              (cámara lenta, línea que tiembla como dibujada a mano, brillo que respira). Unos 0,75 $;

//   armar    → el video con Remotion: título arriba en el color del canal y blanco, subtítulos con
//              la palabra clave en caja de ese color, el nombre de la canción en cada hueco y la marca.
// Uso (desde estacion/): npx tsx src/monigotes.ts ../monigotes/<proyecto>/plan.json --paso voz|dibujos|animar|armar
import { existsSync } from "node:fs";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

export const HUECO_CANCION_SEG = 5;
/** El color de cada canal en la plantilla: rojo para Caprichoso TV, el verde del logo para Full Código. */
export const COLOR_CAPRICHOSO = "#ff2a2a";
export const COLOR_FULL_CODIGO = "#10f08c";

export const esquemaPlanMonigotes = z
  .object({
    titulo: z.tuple([z.string(), z.string()]),
    marca: z.string(),
    acento: z
      .string()
      .regex(/^#[0-9a-f]{6}$/i)
      .default(COLOR_CAPRICHOSO),
    /**
     * «poses» (lo de siempre desde el 13 oct 2026): dibujos con varias poses y movimiento gratis (≈0,75 $).
     * «kling»: clips animados de pago (≈5 $); solo si Richard lo pide para un video en concreto.
     */
    animacion: z.enum(["kling", "poses"]).default("poses"),
    partes: z
      .array(
        z.object({
          texto: z.string().min(1),
          dibujo: z.string().min(1),
          brillo: z.string().default("red"),
          /** Solo con «kling»: cómo se mueve el clip. */
          movimiento: z.string().default(""),
          dibujoExistente: z.string().optional(),
          /** Solo con «poses»: cada cambio de postura del mismo dibujo, en orden (una imagen cada ~3 s). */
          poses: z.array(z.string().min(1)).default([]),
          cancion: z.object({ titulo: z.string(), artista: z.string() }).optional(),
        }),
      )
      .min(1),
  })
  .superRefine((plan, ctx) => {
    if (plan.animacion !== "kling") return;
    plan.partes.forEach((p, i) => {
      if (!p.movimiento.trim())
        ctx.addIssue({
          code: "custom",
          path: ["partes", i, "movimiento"],
          message: "Con Kling cada parte dice cómo se mueve.",
        });
    });
  });
export type PlanMonigotes = z.infer<typeof esquemaPlanMonigotes>;

/** Precio de cada dibujo (Seedream, base o pose). */
export const COSTO_DIBUJO_USD = 0.03;
/** Lo más que una imagen se queda quieta en pantalla (formato Escenia, regla 1). */
export const POSE_MAXIMA_MS = 5000;

/** Si el plan paga clips animados (Kling) o se arma gratis con poses. */
export function necesitaAnimacionDePago(plan: PlanMonigotes): boolean {
  return plan.animacion === "kling";
}

/** Lo que cuestan los dibujos del plan: la base de cada parte más sus poses. */
export function costoDibujosUsd(plan: PlanMonigotes): number {
  const imagenes = plan.partes.reduce((s, p) => s + 1 + (plan.animacion === "poses" ? p.poses.length : 0), 0);
  return Math.round(imagenes * COSTO_DIBUJO_USD * 100) / 100;
}

/** La escena repartida entre sus imágenes en partes iguales (la suma da justo lo que dura). */
export function repartoDePoses(duracionMs: number, imagenes: number): number[] {
  const n = Math.max(1, imagenes);
  const base = Math.floor(duracionMs / n);
  const sobra = duracionMs - base * n;
  return Array.from({ length: n }, (_, i) => base + (i < sobra ? 1 : 0));
}

/** Si con esas imágenes ninguna se queda más de 5 s en pantalla. */
export function posesCortas(duracionMs: number, imagenes: number): boolean {
  return Math.max(...repartoDePoses(duracionMs, imagenes)) <= POSE_MAXIMA_MS;
}

/**
 * La franja de la pantalla que no tapa ningún texto: debajo del título (470 px) y encima de los
 * subtítulos (1370 px), en fracción del alto de 1920.
 */
export const FRANJA_LIBRE = { arriba: 470 / 1920, abajo: 1370 / 1920 } as const;

type Caja = { arriba: number; abajo: number; izquierda: number; derecha: number };

/**
 * Cuánto subir y acercar un dibujo para que su contenido quede en la franja libre (13 oct 2026: en el
 * gancho el muñeco quedó en la mitad de abajo, con los subtítulos encima y media pantalla negra arriba).
 * `caja` es dónde está el dibujo dentro de la imagen (fracciones). El acercamiento es como mucho ×1,35 y
 * nunca saca el dibujo por los lados; la subida nunca lo mete debajo del título.
 */
export function encuadreDeDibujo(caja: Caja): { subir: number; zoom: number } {
  const alto = Math.max(0.01, caja.abajo - caja.arriba);
  const ancho = Math.max(0.01, caja.derecha - caja.izquierda);
  const zoom = Math.max(1, Math.min(1.35, 0.62 / alto, 0.98 / ancho));
  const centroLibre = (FRANJA_LIBRE.arriba + FRANJA_LIBRE.abajo) / 2;
  const centro = (caja.arriba + caja.abajo) / 2;
  let subir = 0.5 + (centro - 0.5) * zoom - centroLibre;
  const arribaNueva = 0.5 + (caja.arriba - 0.5) * zoom - subir;
  if (arribaNueva < FRANJA_LIBRE.arriba) subir -= FRANJA_LIBRE.arriba - arribaNueva;
  return { subir, zoom };
}

/** Dónde está el dibujo dentro de la imagen: filas y columnas con línea (lo que no es fondo negro). */
async function cajaDeContenido(ruta: string): Promise<Caja> {
  const { default: sharp } = await import("sharp");
  const { data, info } = await sharp(ruta).greyscale().raw().toBuffer({ resolveWithObject: true });
  const filas = new Array<number>(info.height).fill(0);
  const columnas = new Array<number>(info.width).fill(0);
  for (let y = 0; y < info.height; y++)
    for (let x = 0; x < info.width; x++)
      if ((data[y * info.width + x] ?? 0) > 60) {
        filas[y] = (filas[y] ?? 0) + 1;
        columnas[x] = (columnas[x] ?? 0) + 1;
      }
  const primero = (v: number[]) =>
    Math.max(
      0,
      v.findIndex((n) => n >= 4),
    );
  const ultimo = (v: number[]) => {
    for (let i = v.length - 1; i >= 0; i--) if ((v[i] ?? 0) >= 4) return i;
    return v.length - 1;
  };
  return {
    arriba: primero(filas) / info.height,
    abajo: (ultimo(filas) + 1) / info.height,
    izquierda: primero(columnas) / info.width,
    derecha: (ultimo(columnas) + 1) / info.width,
  };
}

/** Las piezas de voz: cada parte, y después de cada canción un silencio del largo del hueco. */
export function piezasDeVoz(plan: PlanMonigotes): { texto: string; silencioSeg?: number }[] {
  return plan.partes.flatMap((p) =>
    p.cancion ? [{ texto: p.texto }, { texto: "", silencioSeg: HUECO_CANCION_SEG }] : [{ texto: p.texto }],
  );
}

/**
 * Cuánto dura la escena de cada parte: su voz más el hueco de la canción que la sigue. Los tramos
 * vienen de la voz (uno por pieza, en orden: parte, [hueco], parte, …).
 */
export function escenasDePartes(
  plan: PlanMonigotes,
  tramos: { inicioMs: number; finMs: number }[],
  duracionTotalMs: number,
): { inicioMs: number; finMs: number; hueco: { inicioMs: number; finMs: number } | null }[] {
  const escenas: { inicioMs: number; finMs: number; hueco: { inicioMs: number; finMs: number } | null }[] =
    [];
  let t = 0;
  for (const parte of plan.partes) {
    const voz = tramos[t++];
    if (!voz) throw new Error("Faltan tramos de voz para el plan.");
    let fin = voz.finMs;
    let hueco: { inicioMs: number; finMs: number } | null = null;
    if (parte.cancion) {
      const h = tramos[t++];
      if (!h) throw new Error("Falta el hueco de una canción en los tramos de voz.");
      hueco = { inicioMs: h.inicioMs, finMs: h.finMs };
      fin = h.finMs;
    }
    escenas.push({ inicioMs: voz.inicioMs, finMs: fin, hueco });
  }
  // La primera arranca en 0 y cada una llega hasta donde empieza la siguiente (sin negro entre medio).
  return escenas.map((e, i) => ({
    ...e,
    inicioMs: i === 0 ? 0 : e.inicioMs,
    finMs: i === escenas.length - 1 ? duracionTotalMs : (escenas[i + 1]?.inicioMs ?? e.finMs),
  }));
}

/**
 * Los clips de una escena: de 5 o 10 s, encadenados (el siguiente arranca desde el último cuadro).
 * Si al final sobra poco, el último clip se estira hasta un 15 % (va un poco más lento) en vez de pagar
 * otro clip para un segundo y medio.
 */
export const ESTIRAMIENTO_MAXIMO = 1.15;
export function clipsDeEscena(duracionMs: number): (5 | 10)[] {
  let resto = duracionMs / 1000;
  const clips: (5 | 10)[] = [];
  while (resto > 0.25 && clips.length < 3) {
    const c: 5 | 10 = resto <= 5 * ESTIRAMIENTO_MAXIMO ? 5 : 10;
    clips.push(c);
    resto -= c * (resto <= c * ESTIRAMIENTO_MAXIMO ? ESTIRAMIENTO_MAXIMO : 1);
  }
  return clips.length ? clips : [5];
}

/**
 * Subtítulos en bloques de hasta 3 palabras (o 1,4 s), en mayúsculas, con la palabra más larga
 * resaltada en la caja roja (como el reel de referencia: «SE PONE NERVIOSA CUANDO»).
 */
export function bloquesDeSubtitulos(
  palabras: { text: string; startMs: number; endMs: number }[],
): { inicioMs: number; finMs: number; palabras: string[]; resaltada: number }[] {
  const bloques: { inicioMs: number; finMs: number; palabras: string[]; resaltada: number }[] = [];
  let actual: { text: string; startMs: number; endMs: number }[] = [];
  const cerrar = () => {
    if (!actual.length) return;
    const textos = actual.map((p) =>
      p.text
        .trim()
        .toUpperCase()
        .replace(/[.,;:!?¡¿«»"]/g, ""),
    );
    let resaltada = 0;
    textos.forEach((t, i) => {
      if (t.length > (textos[resaltada] ?? "").length) resaltada = i;
    });
    bloques.push({
      inicioMs: actual[0]?.startMs ?? 0,
      finMs: actual[actual.length - 1]?.endMs ?? 0,
      palabras: textos,
      resaltada,
    });
    actual = [];
  };
  for (const p of palabras) {
    if (!p.text.trim()) continue;
    const inicio = actual[0]?.startMs ?? p.startMs;
    if (actual.length >= 3 || p.endMs - inicio > 1400) cerrar();
    actual.push(p);
    if (/[.,;:!?]$/.test(p.text.trim())) cerrar();
  }
  cerrar();
  // Cada bloque se queda en pantalla hasta que empieza el siguiente (sin parpadeos), máximo 0,6 s más.
  return bloques.map((b, i) => ({
    ...b,
    finMs: Math.min(bloques[i + 1]?.inicioMs ?? b.finMs + 400, b.finMs + 600),
  }));
}

const opcion = (nombre: string): string | null => {
  const i = process.argv.indexOf(nombre);
  return i === -1 ? null : (process.argv[i + 1] ?? null);
};

async function pasoVoz(plan: PlanMonigotes, carpeta: string) {
  const { generarVoz } = await import("./voz");
  const r = await generarVoz(piezasDeVoz(plan), path.join(carpeta, "voz"), async (paso) =>
    console.log(`  ${paso}`),
  );
  await writeFile(path.join(carpeta, "voz.json"), JSON.stringify(r, null, 2));
  const escenas = escenasDePartes(plan, r.tramos, r.duracionMs);
  escenas.forEach((e, i) =>
    console.log(
      `  parte ${i + 1}: ${(e.inicioMs / 1000).toFixed(1)}–${(e.finMs / 1000).toFixed(1)} s (${((e.finMs - e.inicioMs) / 1000).toFixed(1)} s)` +
        (e.hueco
          ? ` · hueco de canción ${(e.hueco.inicioMs / 1000).toFixed(1)}–${(e.hueco.finMs / 1000).toFixed(1)} s`
          : ""),
    ),
  );
  console.log(`  voz total ${(r.duracionMs / 1000).toFixed(1)} s · $${r.costoUsd.toFixed(3)}`);
}

type VozGuardada = {
  rutaMp3: string;
  palabras: { text: string; startMs: number; endMs: number }[];
  tramos: { inicioMs: number; finMs: number }[];
  duracionMs: number;
};

async function pasoDibujos(plan: PlanMonigotes, carpeta: string) {
  const { imagenConReferencias, imagenLibre } = await import("./imagenes");
  const { promptDeMonigote, promptDePose } = await import("./monigote");
  const solo = opcion("--parte");
  let gasto = 0;
  for (const [i, parte] of plan.partes.entries()) {
    if (solo && Number(solo) !== i + 1) continue;
    const destino = path.join(carpeta, `dibujo-${i + 1}.png`);
    if (!existsSync(destino)) {
      if (parte.dibujoExistente) {
        await copyFile(path.join(carpeta, parte.dibujoExistente), destino);
        console.log(`  dibujo ${i + 1}: el que ya existía`);
      } else {
        gasto += await imagenLibre(promptDeMonigote(parte.dibujo, parte.brillo), destino);
        console.log(`  dibujo ${i + 1}: listo`);
      }
    }
    if (plan.animacion !== "poses") continue;
    // Cada pose sale del dibujo base (no de la pose anterior): así no se deforma de pose en pose.
    for (const [k, pose] of parte.poses.entries()) {
      const salida = rutaDePose(carpeta, i, k);
      if (existsSync(salida)) continue;
      gasto += await imagenConReferencias(promptDePose(pose, parte.brillo), [destino], salida);
      console.log(`  dibujo ${i + 1}, pose ${k + 1}: listo`);
    }
  }
  console.log(`  dibujos: $${gasto.toFixed(2)}`);
}

const rutaDePose = (carpeta: string, parte: number, pose: number) =>
  path.join(carpeta, `dibujo-${parte + 1}-pose-${pose + 1}.png`);

async function pasoAnimar(plan: PlanMonigotes, carpeta: string) {
  if (!necesitaAnimacionDePago(plan)) {
    console.log("  Este plan va con poses: no se paga animación. Sigue con --paso armar.");
    return;
  }
  const { animarImagen } = await import("./animar-imagen");
  const { execFile } = await import("node:child_process");
  const { promisify } = await import("node:util");
  const exec = promisify(execFile);
  const voz = JSON.parse(await readFile(path.join(carpeta, "voz.json"), "utf8")) as VozGuardada;
  const escenas = escenasDePartes(plan, voz.tramos, voz.duracionMs);
  const solo = opcion("--parte");
  let gasto = 0;
  for (const [i, parte] of plan.partes.entries()) {
    if (solo && Number(solo) !== i + 1) continue;
    const escena = escenas[i];
    if (!escena) continue;
    const clips = clipsDeEscena(escena.finMs - escena.inicioMs);
    let imagen = path.join(carpeta, `dibujo-${i + 1}.png`);
    for (const [k, segundos] of clips.entries()) {
      const salida = path.join(carpeta, `clip-${i + 1}-${"abc"[k]}.mp4`);
      if (!existsSync(salida)) {
        const prompt =
          (k === 0 ? "" : "Continue the same scene smoothly from this frame. ") +
          `Keep the exact white line drawing style on a pure black background; simple smooth 2D animation, static camera. ${parte.movimiento}`;
        const r = await animarImagen({
          imagen,
          prompt,
          salida,
          modelo: "kling",
          segundos,
          avisar: (t) => console.log(`  parte ${i + 1}${"abc"[k]}: ${t}`),
        });
        gasto += r.costoUsd;
      }
      // El clip siguiente arranca desde el último cuadro de este (continuidad).
      const ultimo = path.join(carpeta, `ultimo-${i + 1}-${"abc"[k]}.png`);
      await exec("ffmpeg", ["-v", "error", "-y", "-sseof", "-0.1", "-i", salida, "-frames:v", "1", ultimo]);
      imagen = ultimo;
    }
  }
  console.log(`  animación: $${gasto.toFixed(2)}`);
}

async function pasoArmar(plan: PlanMonigotes, carpeta: string) {
  const { execFile } = await import("node:child_process");
  const { promisify } = await import("node:util");
  const exec = promisify(execFile);
  const voz = JSON.parse(await readFile(path.join(carpeta, "voz.json"), "utf8")) as VozGuardada;
  const escenas = escenasDePartes(plan, voz.tramos, voz.duracionMs);
  const publica = path.join(carpeta, "publico");
  await mkdir(publica, { recursive: true });
  await copyFile(voz.rutaMp3, path.join(publica, "voz.mp3"));
  const duracion = async (ruta: string) =>
    Math.round(
      Number(
        (
          await exec("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", ruta])
        ).stdout.trim(),
      ) * 1000,
    );
  const escenasProps = [];
  for (const [i, e] of escenas.entries()) {
    const clips: {
      ruta: string;
      duracionMs: number;
      tipo: "video" | "imagen";
      encuadre?: { subir: number; zoom: number };
    }[] = [];
    const parte = plan.partes[i];
    if (plan.animacion === "poses" && parte) {
      const imagenes = [
        path.join(carpeta, `dibujo-${i + 1}.png`),
        ...parte.poses.map((_, k) => rutaDePose(carpeta, i, k)),
      ];
      const falta = imagenes.find((r) => !existsSync(r));
      if (falta) throw new Error(`Falta ${path.basename(falta)}: corre el paso dibujos.`);
      const largo = e.finMs - e.inicioMs;
      if (!posesCortas(largo, imagenes.length))
        throw new Error(
          `La parte ${i + 1} dura ${(largo / 1000).toFixed(1)} s y con ${imagenes.length} imágenes alguna pasa de 5 s: agrégale poses.`,
        );
      const reparto = repartoDePoses(largo, imagenes.length);
      // Un solo encuadre para toda la escena (la caja que junta el dibujo y sus poses): así las poses
      // no saltan de sitio entre una y otra.
      const cajas = await Promise.all(imagenes.map((r) => cajaDeContenido(r)));
      const encuadre = encuadreDeDibujo({
        arriba: Math.min(...cajas.map((c) => c.arriba)),
        abajo: Math.max(...cajas.map((c) => c.abajo)),
        izquierda: Math.min(...cajas.map((c) => c.izquierda)),
        derecha: Math.max(...cajas.map((c) => c.derecha)),
      });
      console.log(
        `  parte ${i + 1}: subir ${(encuadre.subir * 100).toFixed(0)} % · acercar ×${encuadre.zoom.toFixed(2)}`,
      );
      for (const [k, origen] of imagenes.entries()) {
        const nombre = path.basename(origen);
        await copyFile(origen, path.join(publica, nombre));
        clips.push({ ruta: nombre, duracionMs: reparto[k] ?? 0, tipo: "imagen", encuadre });
      }
    }
    for (const letra of plan.animacion === "poses" ? "" : "abc") {
      const origen = path.join(carpeta, `clip-${i + 1}-${letra}.mp4`);
      if (!existsSync(origen)) break;
      // Un poco antes del final de cada clip: ahí es donde los modelos pierden objetos.
      const nombre = `clip-${i + 1}-${letra}.mp4`;
      await copyFile(origen, path.join(publica, nombre));
      clips.push({ ruta: nombre, duracionMs: (await duracion(origen)) - 150, tipo: "video" });
    }
    if (!clips.length) throw new Error(`La parte ${i + 1} no tiene clips: corre el paso animar.`);
    escenasProps.push({
      inicioMs: e.inicioMs,
      finMs: e.finMs,
      clips,
      hueco:
        e.hueco && parte?.cancion
          ? { ...e.hueco, cancion: parte.cancion.titulo, artista: parte.cancion.artista }
          : null,
    });
  }
  const props = {
    titulo: plan.titulo,
    marca: plan.marca,
    acento: plan.acento,
    audio: "voz.mp3",
    duracionMs: voz.duracionMs,
    escenas: escenasProps,
    subtitulos: bloquesDeSubtitulos(voz.palabras),
  };
  await writeFile(path.join(carpeta, "props.json"), JSON.stringify(props, null, 2));
  const { empaquetar } = await import("./render");
  const { renderMedia, selectComposition } = await import("@remotion/renderer");
  const serveUrl = await empaquetar(publica);
  const comp = await selectComposition({ serveUrl, id: "Monigotes", inputProps: props });
  const salida = path.join(carpeta, "video-final.mp4");
  await renderMedia({
    composition: comp,
    serveUrl,
    codec: "h264",
    outputLocation: salida,
    inputProps: props,
    onProgress: ({ progress }) => {
      if (Math.round(progress * 100) % 20 === 0)
        process.stdout.write(`\r  armando ${Math.round(progress * 100)} %`);
    },
  });
  console.log(`\nListo: ${salida}`);
}

async function principal() {
  const rutaPlan = process.argv[2];
  if (!rutaPlan) throw new Error("Uso: monigotes.ts plan.json --paso voz|dibujos|animar|armar");
  const plan = esquemaPlanMonigotes.parse(JSON.parse(await readFile(path.resolve(rutaPlan), "utf8")));
  const carpeta = path.dirname(path.resolve(rutaPlan));
  const paso = opcion("--paso") ?? "voz";
  if (paso === "voz") return pasoVoz(plan, carpeta);
  if (paso === "dibujos") return pasoDibujos(plan, carpeta);
  if (paso === "animar") return pasoAnimar(plan, carpeta);
  if (paso === "armar") return pasoArmar(plan, carpeta);
  throw new Error(`Paso desconocido: ${paso}`);
}

if (process.argv[1] && /^monigotes\.(ts|js|mjs)$/.test(path.basename(process.argv[1]))) {
  principal().catch((e: unknown) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
