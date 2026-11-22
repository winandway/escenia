// Arma un «Tutorial en bloques» (docs/TUTORIAL-BLOQUES.md) desde la carpeta de un encargo que tenga:
//   plan.json  (PlanTutorialBloques, lo escribe el armador del encargo con los tiempos de la voz)
//   mezcla.json {"nombre", "titulo", "musica", "musicaDesde", "marcas"}  (cómo suena y cómo se llama la entrega)
//   public/    (escenas, capturas, marca y voz.mp3)
// Órdenes (desde estacion/):
//   npx tsx src/tutorial-bloques.ts <carpeta> ritmo                 → revisa el ritmo del plan (ninguna imagen > 5 s)
//   npx tsx src/tutorial-bloques.ts <carpeta> cuadros 0,3.5,…       → revision/cuadro-<n>.png
//   npx tsx src/tutorial-bloques.ts <carpeta> zona                  → candado de la zona segura (debe decir «bien»)
//   npx tsx src/tutorial-bloques.ts <carpeta> video                 → salida/mudo.mp4
//   npx tsx src/tutorial-bloques.ts <carpeta> mezclar               → voz + música + un efecto por cambio → las dos entregas
//   npx tsx src/tutorial-bloques.ts <carpeta> hoja <video> [cada]   → revision/hoja-final.png (un cuadro cada N s)
//   npx tsx src/tutorial-bloques.ts <carpeta> control <video>       → transcribe el video terminado y lo compara con el guion
import { execFile } from "node:child_process";
import { appendFile, mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { bundle } from "@remotion/bundler";
import { openBrowser, renderMedia, renderStill, selectComposition } from "@remotion/renderer";
import {
  cambiosDelPlan,
  efectosDelPlan,
  revisarRitmo,
  ZONA_SEGURA,
  type PlanTutorialBloques,
} from "@compartido/bloques";

const exec = promisify(execFile);
const aqui = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(aqui, "../..");
const SFX = [path.join(RAIZ, "estacion/recursos/sfx"), path.join(RAIZ, "estacion/recursos/sfx-local")];
const FPS = 30;

type Mezcla = { nombre: string; titulo: string; musica: string; musicaDesde: number; marcas: number[] };

async function leerPlan(carpeta: string): Promise<PlanTutorialBloques> {
  return JSON.parse(await readFile(path.join(carpeta, "plan.json"), "utf8")) as PlanTutorialBloques;
}

async function empaquetar(carpeta: string) {
  const serveUrl = await bundle({
    entryPoint: path.join(aqui, "remotion/index.ts"),
    publicDir: path.join(carpeta, "public"),
    onProgress: () => {},
  });
  return serveUrl;
}

async function cuadros(carpeta: string, segs: number[], medir: boolean, dir: string): Promise<string[]> {
  const plan = await leerPlan(carpeta);
  const serveUrl = await empaquetar(carpeta);
  const props = { plan, medir };
  const comp = await selectComposition({ serveUrl, id: "TutorialBloques", inputProps: props });
  await mkdir(dir, { recursive: true });
  const navegador = await openBrowser("chrome", { chromiumOptions: { gl: "angle" } });
  const rutas: string[] = [];
  for (const s of segs) {
    const frame = Math.min(comp.durationInFrames - 1, Math.max(0, Math.round(s * FPS)));
    const out = path.join(dir, `cuadro-${String(frame).padStart(4, "0")}.png`);
    await renderStill({
      composition: comp,
      serveUrl,
      output: out,
      frame,
      imageFormat: "png",
      inputProps: props,
      puppeteerInstance: navegador,
      chromiumOptions: { gl: "angle" },
    });
    rutas.push(out);
  }
  await navegador.close({ silent: true });
  return rutas;
}

async function video(carpeta: string) {
  const plan = await leerPlan(carpeta);
  const serveUrl = await empaquetar(carpeta);
  const props = { plan, medir: false };
  const comp = await selectComposition({ serveUrl, id: "TutorialBloques", inputProps: props });
  await mkdir(path.join(carpeta, "salida"), { recursive: true });
  const out = path.join(carpeta, "salida", "mudo.mp4");
  let ultimo = -1;
  await renderMedia({
    composition: comp,
    serveUrl,
    codec: "h264",
    crf: 16,
    pixelFormat: "yuv420p",
    muted: true,
    outputLocation: out,
    inputProps: props,
    chromiumOptions: { gl: "angle" },
    onProgress: ({ progress }) => {
      const p = Math.floor(progress * 10);
      if (p !== ultimo) {
        ultimo = p;
        console.log(`  ${p * 10} %`);
      }
    },
  });
  console.log(`${out} · ${comp.durationInFrames} cuadros (${(comp.durationInFrames / FPS).toFixed(1)} s)`);
}

/** Candado de la zona segura: dibuja solo lo que se lee y revienta si algo se sale (C-BLOQUES-1). */
async function zona(carpeta: string) {
  const plan = await leerPlan(carpeta);
  const cortes = plan.escenas.map((e) => e.inicio).sort((a, b) => a - b);
  const segs = new Set<number>();
  for (const c of cambiosDelPlan(plan)) {
    const s = c + 0.6;
    const sig = Math.min(...cortes.filter((x) => x > c), plan.duracion);
    if (s < sig - 0.05) segs.add(Math.round(s * 100) / 100);
  }
  for (const w of plan.palabras) segs.add(Math.round((w.startMs / 1000 + 0.25) * 100) / 100);
  for (let k = 1; k < cortes.length; k++) segs.add(Math.round(((cortes[k] as number) - 0.4) * 100) / 100);
  segs.add(Math.round((plan.duracion - 0.1) * 100) / 100);
  const lista = [...segs].filter((s) => s >= 0 && s < plan.duracion).sort((a, b) => a - b);
  const dir = path.join(carpeta, "revision", "medir");
  if (existsSync(dir)) await rename(dir, `${dir}-${Date.now()}.viejo`); // no se borra: se aparta
  const rutas = await cuadros(carpeta, lista, true, dir);
  const { default: sharp } = await import("sharp");
  const malos: string[] = [];
  const peor = [9999, 0, 9999, 0];
  for (const r of rutas) {
    const { data, info } = await sharp(r)
      .ensureAlpha()
      .extractChannel(3)
      .raw()
      .toBuffer({ resolveWithObject: true });
    let x0 = 9999;
    let y0 = 9999;
    let x1 = -1;
    let y1 = -1;
    for (let y = 0; y < info.height; y++)
      for (let x = 0; x < info.width; x++)
        if ((data[y * info.width + x] ?? 0) >= 160) {
          if (x < x0) x0 = x;
          if (x > x1) x1 = x;
          if (y < y0) y0 = y;
          if (y > y1) y1 = y;
        }
    if (x1 < 0) continue;
    peor[0] = Math.min(peor[0] as number, x0);
    peor[1] = Math.max(peor[1] as number, x1);
    peor[2] = Math.min(peor[2] as number, y0);
    peor[3] = Math.max(peor[3] as number, y1);
    if (x0 < ZONA_SEGURA.x0 || x1 > ZONA_SEGURA.x1 || y0 < ZONA_SEGURA.arriba || y1 > ZONA_SEGURA.abajo) {
      const frame = Number(path.basename(r).slice(7, 11));
      malos.push(`${(frame / FPS).toFixed(2)} s: x ${x0}–${x1}, y ${y0}–${y1}`);
    }
  }
  console.log(
    `${rutas.length} cuadros medidos. Más a la izquierda x ${peor[0]} (tope ${ZONA_SEGURA.x0}); más a la derecha x ${peor[1]} (tope ${ZONA_SEGURA.x1}); ` +
      `más arriba y ${peor[2]} (tope ${ZONA_SEGURA.arriba}); más abajo y ${peor[3]} (tope ${ZONA_SEGURA.abajo}).`,
  );
  if (malos.length) {
    console.log(`FUERA DE LA ZONA SEGURA:\n  ${malos.slice(0, 40).join("\n  ")}`);
    process.exitCode = 1;
    return;
  }
  console.log("Zona segura: bien.");
}

async function ffprobeDur(p: string) {
  const { stdout } = await exec("ffprobe", [
    "-v",
    "error",
    "-show_entries",
    "format=duration",
    "-of",
    "csv=p=0",
    p,
  ]);
  return Number(stdout.trim());
}
async function lufs(p: string, extra: string[] = []) {
  const { stderr } = await exec(
    "ffmpeg",
    ["-hide_banner", "-nostats", ...extra, "-i", p, "-af", "ebur128=peak=true", "-f", "null", "-"],
    { maxBuffer: 64 * 1024 * 1024 },
  );
  const i = [...stderr.matchAll(/I:\s+([-0-9.]+) LUFS/g)].pop()?.[1];
  const tp = [...stderr.matchAll(/Peak:\s+([-0-9.]+) dBFS/g)].pop()?.[1];
  return { i: Number(i), tp: Number(tp) };
}
async function pico(p: string) {
  const { stderr } = await exec("ffmpeg", [
    "-hide_banner",
    "-nostats",
    "-i",
    p,
    "-af",
    "volumedetect",
    "-f",
    "null",
    "-",
  ]);
  return Number(/max_volume: ([-0-9.]+) dB/.exec(stderr)?.[1] ?? "0");
}

/** Voz a −14 LUFS, música por debajo (−13 dB de la voz; sube cuando la voz se calla), un efecto en cada cambio. */
async function mezclar(carpeta: string) {
  const plan = await leerPlan(carpeta);
  const m = JSON.parse(await readFile(path.join(carpeta, "mezcla.json"), "utf8")) as Mezcla;
  const voz = path.join(carpeta, "public", "voz.mp3");
  const mudo = path.join(carpeta, "salida", "mudo.mp4");
  const DUR = plan.duracion;
  const finVoz = Math.max(...plan.palabras.map((w) => w.endMs / 1000));
  const vi = await lufs(voz);
  const ganVoz = Math.round((-14 - vi.i) * 100) / 100;
  const mi = await lufs(m.musica, ["-ss", String(m.musicaDesde), "-t", String(DUR)]);
  const ganMus = Math.round((-14 - mi.i) * 100) / 100;
  console.log(`voz ${vi.i} LUFS → ${ganVoz} dB · música ${mi.i} LUFS → ${ganMus} dB`);
  const efectos = efectosDelPlan(plan, m.marcas);
  const entradas = ["-i", mudo, "-i", voz, "-ss", String(m.musicaDesde), "-t", String(DUR), "-i", m.musica];
  const filtros = [
    `[1:a]aresample=48000,aformat=channel_layouts=stereo,volume=${ganVoz}dB:precision=double,apad=whole_dur=${DUR}[voz]`,
    `[2:a]aresample=48000,aformat=channel_layouts=stereo,volume=${ganMus}dB:precision=double,` +
      `volume='if(lt(t,${finVoz.toFixed(2)}),0.2239,0.2239+(0.4467-0.2239)*min(1,(t-${finVoz.toFixed(2)})/0.6))':eval=frame,` +
      (m.marcas.length
        ? `volume='if(${m.marcas.map((x) => `between(t,${(x - 0.12).toFixed(2)},${(x + 0.75).toFixed(2)})`).join("+")},0.63,1)':eval=frame,`
        : "") +
      `afade=t=in:d=0.3,afade=t=out:st=${(DUR - 1.6).toFixed(2)}:d=1.6[mus]`,
  ];
  const etiquetas = ["[voz]", "[mus]"];
  let n = 3;
  for (const ef of efectos) {
    const ruta = SFX.map((d) => path.join(d, `${ef.sfx}.mp3`)).find((p) => existsSync(p));
    if (!ruta) throw new Error(`Falta el efecto ${ef.sfx}`);
    // Los soplidos entran 0,1 s antes y 2 dB más bajos, para que no tapen la voz.
    const t = ef.sfx.startsWith("whoosh") ? ef.t - 0.1 : ef.t;
    const g =
      Math.round(((ef.sfx.startsWith("whoosh") ? ef.db - 2 : ef.db) - (await pico(ruta))) * 100) / 100;
    const ms = Math.max(0, Math.round(t * 1000));
    entradas.push("-i", ruta);
    filtros.push(
      `[${n}:a]aresample=48000,aformat=channel_layouts=stereo,volume=${g}dB,adelay=${ms}|${ms}[e${n}]`,
    );
    etiquetas.push(`[e${n}]`);
    n++;
  }
  filtros.push(
    `${etiquetas.join("")}amix=inputs=${etiquetas.length}:normalize=0:duration=first,alimiter=limit=0.84:attack=3:release=60:level=disabled,atrim=0:${DUR}[mezcla]`,
  );
  const wav = path.join(carpeta, "salida", "mezcla.wav");
  await exec(
    "ffmpeg",
    [
      "-hide_banner",
      "-loglevel",
      "error",
      "-y",
      ...entradas,
      "-filter_complex",
      filtros.join(";"),
      "-map",
      "[mezcla]",
      "-c:a",
      "pcm_s24le",
      wav,
    ],
    { maxBuffer: 64 * 1024 * 1024 },
  );
  const r = await lufs(wav);
  console.log(`mezcla: ${r.i} LUFS, pico ${r.tp} dBFS · ${efectos.length} efectos`);
  await writeFile(path.join(carpeta, "salida", "efectos.json"), JSON.stringify(efectos, null, 1));
  const pub = path.join(carpeta, "salida", `${m.nombre}.mp4`);
  const wa = path.join(carpeta, "salida", `${m.nombre} (WhatsApp).mp4`);
  const comun = [
    "-hide_banner",
    "-loglevel",
    "error",
    "-y",
    "-i",
    mudo,
    "-i",
    wav,
    "-map",
    "0:v:0",
    "-map",
    "1:a:0",
  ];
  await exec("ffmpeg", [
    ...comun,
    "-vf",
    "scale=in_range=full:out_range=tv,format=yuv420p",
    "-c:v",
    "libx264",
    "-preset",
    "slow",
    "-crf",
    "17",
    "-profile:v",
    "high",
    "-level",
    "4.1",
    "-r",
    "30",
    "-c:a",
    "aac_at",
    "-b:a",
    "192k",
    "-ar",
    "48000",
    "-ac",
    "2",
    "-t",
    String(DUR),
    "-movflags",
    "+faststart",
    "-metadata",
    `title=${m.titulo}`,
    pub,
  ]);
  await exec("ffmpeg", [
    ...comun,
    "-vf",
    "scale=720:1280:flags=lanczos:in_range=full:out_range=tv,format=yuv420p",
    "-c:v",
    "libx264",
    "-preset",
    "slow",
    "-crf",
    "21",
    "-maxrate",
    "2200k",
    "-bufsize",
    "4400k",
    "-profile:v",
    "high",
    "-level",
    "3.1",
    "-r",
    "30",
    "-c:a",
    "aac_at",
    "-b:a",
    "128k",
    "-ar",
    "44100",
    "-ac",
    "2",
    "-t",
    String(DUR),
    "-movflags",
    "+faststart",
    "-metadata",
    `title=${m.titulo}`,
    wa,
  ]);
  for (const f of [pub, wa])
    console.log(
      `${f} · ${((await stat(f)).size / 1e6).toFixed(1)} MB · ${(await ffprobeDur(f)).toFixed(2)} s`,
    );
}

/** Hoja de cuadros del video terminado, con la zona segura marcada. */
async function hoja(carpeta: string, videoMp4: string, cada: number) {
  const dur = await ffprobeDur(videoMp4);
  const segs: number[] = [];
  for (let s = 0; s < dur - 0.05; s += cada) segs.push(Math.round(s * 100) / 100);
  const salida = path.join(carpeta, "revision", "hoja-final.png");
  await exec("python3", [
    "-I",
    path.join(RAIZ, "estacion/herramientas/hoja-cuadros.py"),
    salida,
    "--video",
    videoMp4,
    segs.join(","),
  ]);
  console.log(salida);
}

/** Transcribe lo que se oye en el video terminado y mide cuántas palabras del guion se dicen, en orden. */
async function control(carpeta: string, videoMp4: string) {
  const { transcribir } = await import("./transcribir");
  const plan = await leerPlan(carpeta);
  const mp3 = path.join(carpeta, "revision", "transcripcion-final.mp3");
  await mkdir(path.dirname(mp3), { recursive: true });
  await exec("ffmpeg", [
    "-y",
    "-v",
    "error",
    "-i",
    videoMp4,
    "-vn",
    "-ac",
    "1",
    "-ar",
    "44100",
    "-c:a",
    "libmp3lame",
    "-b:a",
    "128k",
    mp3,
  ]);
  const r = await transcribir(mp3, await ffprobeDur(mp3));
  if (r.costoUsd > 0)
    await appendFile(
      path.join(carpeta, "trabajo", "gastos.txt"),
      `${new Date().toISOString()}\televenlabs\t${r.costoUsd.toFixed(4)}\ttranscripción de control del video terminado\n`,
    );
  await writeFile(path.join(carpeta, "revision", "transcripcion-final.json"), JSON.stringify(r, null, 2));
  const limpia = (s: string) =>
    s
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .toLowerCase()
      .replace(/[^a-z0-9ñ]/g, "");
  const guion = plan.palabras.map((w) => limpia(w.text)).filter(Boolean);
  const oido = r.texto.split(/\s+/).map(limpia).filter(Boolean);
  let j = 0;
  let encontradas = 0;
  const faltan: string[] = [];
  for (const g of guion) {
    const k = oido.indexOf(g, j);
    if (k >= 0 && k - j < 6) {
      encontradas++;
      j = k + 1;
    } else faltan.push(g);
  }
  console.log(
    `transcripción: ${r.costoUsd.toFixed(4)} $ · ${encontradas} de ${guion.length} palabras del guion, en orden`,
  );
  if (faltan.length) console.log(`no se oyen igual: ${faltan.join(", ")}`);
  console.log(r.texto);
}

async function main() {
  const [carpetaArg, orden, ...resto] = process.argv.slice(2);
  if (!carpetaArg || !orden)
    throw new Error("Uso: tutorial-bloques.ts <carpeta> ritmo|cuadros|zona|video|mezclar|hoja|control …");
  const carpeta = path.resolve(carpetaArg);
  if (orden === "ritmo") {
    const plan = await leerPlan(carpeta);
    const r = revisarRitmo(cambiosDelPlan(plan), plan.duracion);
    console.log(
      `ritmo: un cambio cada ${r.promedio} s en promedio; el tramo más largo sin cambio dura ${r.maximo} s`,
    );
    if (r.tramosLargos.length) {
      console.log(
        `OJO: tramos quietos de más de 5 s: ${r.tramosLargos.map(([a, b]) => `${a}–${b}`).join(", ")}`,
      );
      process.exitCode = 1;
    }
  } else if (orden === "cuadros") {
    const segs = (resto[0] ?? "0").split(",").map(Number);
    for (const r of await cuadros(carpeta, segs, false, path.join(carpeta, "revision"))) console.log(r);
  } else if (orden === "zona") await zona(carpeta);
  else if (orden === "video") await video(carpeta);
  else if (orden === "mezclar") await mezclar(carpeta);
  else if (orden === "hoja") await hoja(carpeta, path.resolve(resto[0] ?? ""), Number(resto[1] ?? 2));
  else if (orden === "control") await control(carpeta, path.resolve(resto[0] ?? ""));
  else throw new Error(`Orden desconocida: ${orden}`);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
