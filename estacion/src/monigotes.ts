// Videos de monigotes animados (docs/MONIGOTES.md), de punta a punta desde un plan:
//   voz      → la narración de cada parte, con un hueco de 5 s después de cada canción (para que
//              Richard pegue el pedacito en su editor), con los tiempos de cada palabra;
//   dibujos  → un dibujo por parte en el estilo fijo de monigote (3 ¢ cada uno);
//   animar   → cada dibujo animado con Kling 2.5 Turbo Pro, del largo que necesita su parte;
//   armar    → el video con Remotion: título arriba en rojo y blanco, subtítulos con la palabra
//              clave en caja roja, el nombre de la canción en cada hueco y la marca abajo.
// Uso (desde estacion/): npx tsx src/monigotes.ts ../monigotes/<proyecto>/plan.json --paso voz|dibujos|animar|armar
import { existsSync } from "node:fs";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

export const HUECO_CANCION_SEG = 5;

export const esquemaPlanMonigotes = z.object({
  titulo: z.tuple([z.string(), z.string()]),
  marca: z.string(),
  partes: z
    .array(
      z.object({
        texto: z.string().min(1),
        dibujo: z.string().min(1),
        brillo: z.string().default("red"),
        movimiento: z.string().min(1),
        dibujoExistente: z.string().optional(),
        cancion: z.object({ titulo: z.string(), artista: z.string() }).optional(),
      }),
    )
    .min(1),
});
export type PlanMonigotes = z.infer<typeof esquemaPlanMonigotes>;

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

/** Los clips de una escena: uno de 5 o 10 s, y si no alcanza, otro que sigue desde el último cuadro. */
export function clipsDeEscena(duracionMs: number): (5 | 10)[] {
  const seg = duracionMs / 1000;
  const clips: (5 | 10)[] = [];
  let resto = seg;
  while (resto > 0.25) {
    const c: 5 | 10 = resto <= 5.3 ? 5 : 10;
    clips.push(c);
    resto -= c;
    if (clips.length >= 3) break;
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
  const { imagenLibre } = await import("./imagenes");
  const { promptDeMonigote } = await import("./monigote");
  let gasto = 0;
  for (const [i, parte] of plan.partes.entries()) {
    const destino = path.join(carpeta, `dibujo-${i + 1}.png`);
    if (existsSync(destino)) continue;
    if (parte.dibujoExistente) {
      await copyFile(path.join(carpeta, parte.dibujoExistente), destino);
      console.log(`  dibujo ${i + 1}: el que ya existía`);
      continue;
    }
    gasto += await imagenLibre(promptDeMonigote(parte.dibujo, parte.brillo), destino);
    console.log(`  dibujo ${i + 1}: listo`);
  }
  console.log(`  dibujos: $${gasto.toFixed(2)}`);
}

async function pasoAnimar(plan: PlanMonigotes, carpeta: string) {
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
    const clips = [];
    for (const letra of "abc") {
      const origen = path.join(carpeta, `clip-${i + 1}-${letra}.mp4`);
      if (!existsSync(origen)) break;
      // Un poco antes del final de cada clip: ahí es donde los modelos pierden objetos.
      const nombre = `clip-${i + 1}-${letra}.mp4`;
      await copyFile(origen, path.join(publica, nombre));
      clips.push({ ruta: nombre, duracionMs: (await duracion(origen)) - 150 });
    }
    if (!clips.length) throw new Error(`La parte ${i + 1} no tiene clips: corre el paso animar.`);
    const parte = plan.partes[i];
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
