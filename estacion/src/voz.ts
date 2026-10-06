// Voz: ElevenLabs con tiempos por letra (una llamada por escena), o la voz de
// prueba del sistema (macOS `say`) cuando no hay clave, para poder ver el
// video completo sin gastar. Devuelve un MP3 y las palabras con sus tiempos.
import { execFile } from "node:child_process";
import { mkdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import {
  alineacionAproximada,
  palabrasDesdeAlineacion,
  type Alineacion,
  type Palabra,
} from "@compartido/subtitulos";
import type { Voz } from "@compartido/guion";
import { emparejarConLetras, numerosEnLetras } from "@compartido/numeros";
import { cortesDePausas, tiempoTrasCortes, trozosQueQuedan, type Silencio } from "@compartido/pausas";
import { textoParaLaVoz } from "@compartido/pronunciacion";
import { escalarAlineacion, factorDeRitmo } from "@compartido/ritmo";
import { asegurarModeloVoz, costoVozUsd } from "@compartido/modelos";
import { elegirIdDeVoz } from "@compartido/voces";
import { config } from "./config";

const exec = promisify(execFile);
const PAUSA_ENTRE_ESCENAS_MS = 350;

export type ResultadoVoz = {
  rutaMp3: string;
  palabras: Palabra[];
  tramos: { indice: number; inicioMs: number; finMs: number }[];
  duracionMs: number;
  vozDePrueba: boolean;
  costoUsd: number;
};

/** Una escena a narrar; sin texto y con `silencioSeg` es un interludio (solo música). */
export type PiezaVoz = { texto: string; silencioSeg?: number };

export async function generarVoz(
  piezas: PiezaVoz[],
  carpeta: string,
  avisar: (paso: string, progreso: number) => Promise<unknown>,
  narrador: Voz = "richard",
  /** En inglés no se tocan las cifras ni la H: esos arreglos son del español (C-COMERCIAL-1). */
  idioma: "es" | "en" = "es",
): Promise<ResultadoVoz> {
  await mkdir(carpeta, { recursive: true });
  const usaElevenLabs = Boolean(config.ELEVENLABS_API_KEY);
  // Se resuelve ANTES de la primera llamada: si falta el id de la voz pedida,
  // el trabajo falla con mensaje claro y sin gastar (C-VOZ-1).
  const idVoz = usaElevenLabs
    ? elegirIdDeVoz(narrador, {
        richard: config.ELEVENLABS_VOICE_ID,
        femenina: config.ELEVENLABS_VOICE_ID_FEMENINA,
      })
    : "";
  const rutasPiezas: string[] = [];
  const palabras: Palabra[] = [];
  const tramos: ResultadoVoz["tramos"] = [];
  let cursorMs = 0;
  let costoUsd = 0;
  // Continuidad entre escenas: ElevenLabs recibe los ids de las últimas
  // generaciones (hasta 3) para que el tono no salte de una a otra.
  const idsAnteriores: string[] = [];
  // Cifras → letras antes de nada (la voz lee mal «1925»); vale para el texto
  // que se manda y para los subtítulos, que así muestran lo que se dice.
  const preparados = piezas.map((p) => textoParaLaVoz(p.texto, idioma, numerosEnLetras));
  const textos = preparados.map((t) => t.subtitulos);
  // Lo que se manda a la voz lleva además la ortografía «fonética» (sin H muda);
  // los subtítulos conservan la palabra tal cual (C-VOZ-3).
  const textosVoz = preparados.map((t) => t.voz);

  for (let i = 0; i < piezas.length; i++) {
    const pieza = piezas[i] ?? { texto: "" };
    const texto = textos[i] ?? "";
    const textoVoz = textosVoz[i] ?? "";
    await avisar(`voz: escena ${i + 1} de ${piezas.length}`, Math.round(5 + (i / piezas.length) * 25));
    const rutaPieza = path.join(carpeta, `escena-${i + 1}.mp3`);
    let alineacion: Alineacion;
    if (!texto) {
      // Interludio: silencio del largo pedido; la música lo llena en la plantilla.
      await silencio(rutaPieza, pieza.silencioSeg ?? 6);
      alineacion = { characters: [], character_start_times_seconds: [], character_end_times_seconds: [] };
    } else if (usaElevenLabs) {
      const r = await vozElevenLabs(textoVoz, rutaPieza, idVoz, {
        anterior: textosVoz.slice(0, i).filter(Boolean).slice(-1)[0] ?? "",
        siguiente: textosVoz.slice(i + 1).filter(Boolean)[0] ?? "",
        idsAnteriores,
      });
      alineacion = r.alineacion;
      if (r.requestId) idsAnteriores.push(r.requestId);
      while (idsAnteriores.length > 3) idsAnteriores.shift();
      costoUsd += costoVozUsd(asegurarModeloVoz(config.ELEVENLABS_MODELO), textoVoz.length);
    } else {
      alineacion = await vozDelSistema(textoVoz, rutaPieza, narrador);
    }
    if (texto) {
      // Mismo volumen en todas las escenas (C-VOZ-2): cada generación sale con
      // un nivel distinto y se notaba «la voz va y viene». Va primero, porque
      // los silencios se miden contra un nivel fijo.
      await nivelar(rutaPieza);
      // Pausas parejas (C-VOZ-6): la voz deja silencios de 0,3 s y otros de más
      // de un segundo; se recortan los largos y los tiempos se corren igual.
      const apretada = await apretarPausas(rutaPieza, alineacion);
      alineacion = apretada.alineacion;
      if (apretada.quitadoSeg > 0.05)
        console.log(`  pausas escena ${i + 1}: -${apretada.quitadoSeg.toFixed(1)} s`);
      // Ritmo parejo (C-VOZ-4): cada generación lee a su velocidad; se lleva
      // toda pieza al mismo ritmo (sin cambiar el tono) y se reescalan los tiempos.
      const factor = factorDeRitmo(textoVoz, (await duracionMs(rutaPieza)) / 1000);
      if (Math.abs(factor - 1) > 0.03) {
        await cambiarTempo(rutaPieza, factor);
        alineacion = escalarAlineacion(alineacion, factor);
        console.log(`  ritmo escena ${i + 1}: ×${factor}`);
      }
    }
    const r = texto ? palabrasDesdeAlineacion(alineacion, [textoVoz]) : { palabras: [] as Palabra[] };
    // Los subtítulos muestran la ortografía real (C-VOZ-3) y las cifras tal
    // como se escribieron (C-VOZ-5): «1985» en pantalla mientras la voz dice
    // «mil novecientos ochenta y cinco», con los tiempos de esas palabras.
    const escritas = pieza.texto.trim().split(/\s+/).filter(Boolean);
    const enLetras = texto.split(/\s+/).filter(Boolean);
    const grupos = enLetras.length === r.palabras.length ? emparejarConLetras(escritas, enLetras) : null;
    if (grupos) {
      let finPrevio = 0;
      r.palabras = grupos.map((g, k) => {
        const primera = g[0] === undefined ? undefined : r.palabras[g[0]];
        const ultima = g.length === 0 ? undefined : r.palabras[g[g.length - 1] ?? 0];
        const palabra: Palabra = {
          text: escritas[k] ?? "",
          startMs: primera?.startMs ?? finPrevio,
          endMs: ultima?.endMs ?? finPrevio,
          timestampMs: primera?.timestampMs ?? null,
          confidence: primera?.confidence ?? null,
        };
        finPrevio = palabra.endMs;
        return palabra;
      });
    } else if (enLetras.length === r.palabras.length) {
      r.palabras.forEach((p, k) => {
        const o = enLetras[k];
        if (o !== undefined) p.text = p.text.startsWith(" ") ? ` ${o}` : o;
      });
    }
    for (const p of r.palabras) {
      palabras.push({
        ...p,
        text: palabras.length === 0 ? p.text.trimStart() : p.text.startsWith(" ") ? p.text : ` ${p.text}`,
        startMs: p.startMs + cursorMs,
        endMs: p.endMs + cursorMs,
        timestampMs: p.timestampMs === null ? null : p.timestampMs + cursorMs,
      });
    }
    const duracionPieza = await duracionMs(rutaPieza);
    tramos.push({ indice: i, inicioMs: cursorMs, finMs: cursorMs + duracionPieza + PAUSA_ENTRE_ESCENAS_MS });
    cursorMs += duracionPieza + PAUSA_ENTRE_ESCENAS_MS;
    rutasPiezas.push(rutaPieza);
  }

  const rutaMp3 = path.join(carpeta, "voz.mp3");
  await unirConPausas(rutasPiezas, rutaMp3, PAUSA_ENTRE_ESCENAS_MS);
  const total = await duracionMs(rutaMp3);
  const ultimo = tramos[tramos.length - 1];
  if (ultimo) ultimo.finMs = total;
  return { rutaMp3, palabras, tramos, duracionMs: total, vozDePrueba: !usaElevenLabs, costoUsd };
}

async function vozElevenLabs(
  texto: string,
  destino: string,
  idVoz: string,
  contexto: { anterior: string; siguiente: string; idsAnteriores: string[] },
): Promise<{ alineacion: Alineacion; requestId: string | null }> {
  const modelo = asegurarModeloVoz(config.ELEVENLABS_MODELO);
  const r = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${idVoz}/with-timestamps?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: { "xi-api-key": config.ELEVENLABS_API_KEY ?? "", "content-type": "application/json" },
      body: JSON.stringify({
        text: texto,
        model_id: modelo,
        // La voz lee un poco rápido desde el origen: suena más natural que acelerarla después.
        voice_settings: { speed: config.ELEVENLABS_VELOCIDAD },
        // Contexto de las escenas vecinas: misma entonación al unir las piezas.
        previous_text: contexto.anterior || undefined,
        next_text: contexto.siguiente || undefined,
        previous_request_ids: contexto.idsAnteriores.length ? contexto.idsAnteriores : undefined,
      }),
    },
  );
  if (!r.ok) throw new Error(`ElevenLabs respondió ${r.status}: ${(await r.text()).slice(0, 300)}`);
  const datos = (await r.json()) as {
    audio_base64: string;
    alignment: Alineacion | null;
    normalized_alignment: Alineacion | null;
  };
  await writeFile(destino, Buffer.from(datos.audio_base64, "base64"));
  const alineacion = datos.alignment ?? datos.normalized_alignment;
  if (!alineacion) throw new Error("ElevenLabs no devolvió la alineación de letras.");
  return { alineacion, requestId: r.headers.get("request-id") };
}

/** Los silencios de una pieza ya nivelada (por debajo de -38 dB durante 0,25 s o más). */
export async function detectarSilencios(ruta: string): Promise<Silencio[]> {
  const r = await exec("ffmpeg", [
    "-hide_banner",
    "-nostats",
    "-i",
    ruta,
    "-af",
    "silencedetect=noise=-38dB:d=0.25",
    "-f",
    "null",
    "-",
  ]);
  const silencios: Silencio[] = [];
  let inicio: number | null = null;
  for (const linea of r.stderr.split("\n")) {
    const a = /silence_start: (-?[\d.]+)/.exec(linea);
    const b = /silence_end: (-?[\d.]+)/.exec(linea);
    if (a) inicio = Math.max(0, Number(a[1]));
    if (b && inicio !== null) {
      silencios.push({ inicioSeg: inicio, finSeg: Number(b[1]) });
      inicio = null;
    }
  }
  // Un silencio que llega hasta el final no trae «silence_end».
  if (inicio !== null) silencios.push({ inicioSeg: inicio, finSeg: (await duracionMs(ruta)) / 1000 });
  return silencios;
}

/**
 * Recorta los silencios largos de una pieza (C-VOZ-6) y corre los tiempos de
 * las letras lo mismo que el audio. Si no hay nada que recortar, no toca nada.
 */
export async function apretarPausas(
  ruta: string,
  alineacion: Alineacion,
): Promise<{ alineacion: Alineacion; quitadoSeg: number }> {
  const duracionSeg = (await duracionMs(ruta)) / 1000;
  const cortes = cortesDePausas(await detectarSilencios(ruta), duracionSeg);
  if (cortes.length === 0) return { alineacion, quitadoSeg: 0 };
  const trozos = trozosQueQuedan(cortes, duracionSeg);
  if (trozos.length === 0) return { alineacion, quitadoSeg: 0 };
  // Cada trozo entra y sale con una rampa de 5 ms: un corte seco en medio de un silencio hace «clic».
  const filtro =
    trozos
      .map((t, k) => {
        const largo = t.hastaSeg - t.desdeSeg;
        const rampa = Math.min(0.005, largo / 4);
        return (
          `[0:a]atrim=start=${t.desdeSeg.toFixed(4)}:end=${t.hastaSeg.toFixed(4)},asetpts=PTS-STARTPTS,` +
          `afade=t=in:st=0:d=${rampa.toFixed(4)},afade=t=out:st=${(largo - rampa).toFixed(4)}:d=${rampa.toFixed(4)}[t${k}]`
        );
      })
      .join(";") +
    ";" +
    trozos.map((_, k) => `[t${k}]`).join("") +
    `concat=n=${trozos.length}:v=0:a=1[out]`;
  const tmp = ruta.replace(/\.mp3$/, ".pausas.mp3");
  await exec("ffmpeg", [
    "-y",
    "-loglevel",
    "error",
    "-i",
    ruta,
    "-filter_complex",
    filtro,
    "-map",
    "[out]",
    "-ar",
    "44100",
    "-codec:a",
    "libmp3lame",
    "-b:a",
    "128k",
    tmp,
  ]);
  await rename(tmp, ruta);
  return {
    alineacion: {
      characters: alineacion.characters,
      character_start_times_seconds: alineacion.character_start_times_seconds.map((t) =>
        tiempoTrasCortes(t, cortes),
      ),
      character_end_times_seconds: alineacion.character_end_times_seconds.map((t) =>
        tiempoTrasCortes(t, cortes),
      ),
    },
    quitadoSeg: cortes.reduce((suma, c) => suma + (c.hastaSeg - c.desdeSeg), 0),
  };
}

/** Acelera o frena una pieza sin cambiar el tono (ffmpeg atempo). */
export async function cambiarTempo(ruta: string, factor: number): Promise<void> {
  const tmp = ruta.replace(/\.mp3$/, ".tempo.mp3");
  await exec("ffmpeg", [
    "-y",
    "-loglevel",
    "error",
    "-i",
    ruta,
    "-af",
    `atempo=${factor}`,
    "-ar",
    "44100",
    "-codec:a",
    "libmp3lame",
    "-b:a",
    "128k",
    tmp,
  ]);
  await rename(tmp, ruta);
}

/**
 * Nivela una pieza de voz a -16 LUFS en dos pasadas (medir y aplicar ganancia
 * lineal): no cambia los tiempos, solo el volumen. Si la pieza es silencio, no
 * hace nada.
 */
export async function nivelar(ruta: string, objetivoLufs = -16): Promise<void> {
  const base = `loudnorm=I=${objetivoLufs}:TP=-1.5:LRA=11`;
  const medida = await exec("ffmpeg", [
    "-hide_banner",
    "-nostats",
    "-i",
    ruta,
    "-af",
    `${base}:print_format=json`,
    "-f",
    "null",
    "-",
  ]);
  const inicio = medida.stderr.lastIndexOf("{");
  const fin = medida.stderr.lastIndexOf("}");
  if (inicio === -1 || fin < inicio) return;
  const m = JSON.parse(medida.stderr.slice(inicio, fin + 1)) as Record<string, string>;
  if (!Number.isFinite(Number(m.input_i))) return; // silencio: nada que nivelar
  const tmp = ruta.replace(/\.mp3$/, ".nivelada.mp3");
  await exec("ffmpeg", [
    "-y",
    "-loglevel",
    "error",
    "-i",
    ruta,
    "-af",
    `${base}:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`,
    "-ar",
    "44100",
    "-codec:a",
    "libmp3lame",
    "-b:a",
    "128k",
    tmp,
  ]);
  await rename(tmp, ruta);
}

async function silencio(destino: string, segundos: number): Promise<void> {
  await exec("ffmpeg", [
    "-y",
    "-loglevel",
    "error",
    "-f",
    "lavfi",
    "-i",
    "anullsrc=r=44100:cl=mono",
    "-t",
    String(segundos),
    "-codec:a",
    "libmp3lame",
    "-b:a",
    "128k",
    destino,
  ]);
}

async function vozDelSistema(texto: string, destino: string, narrador: Voz): Promise<Alineacion> {
  const aiff = destino.replace(/\.mp3$/, ".aiff");
  // Voz en español del sistema, masculina o femenina según el guion.
  // Si no existe, macOS usa la predeterminada.
  const nombre = narrador === "femenina" ? "Paulina" : "Eddy (Español (México))";
  await exec("say", ["-v", nombre, "-r", "175", "-o", aiff, texto]).catch(() =>
    exec("say", ["-r", "175", "-o", aiff, texto]),
  );
  await exec("ffmpeg", [
    "-y",
    "-loglevel",
    "error",
    "-i",
    aiff,
    "-codec:a",
    "libmp3lame",
    "-b:a",
    "128k",
    destino,
  ]);
  const dur = await duracionMs(destino);
  return alineacionAproximada(texto, dur / 1000);
}

async function unirConPausas(piezas: string[], destino: string, pausaMs: number): Promise<void> {
  // Concatena con un silencio corto entre escenas para que respire.
  const entradas = piezas.flatMap((p) => ["-i", p]);
  const n = piezas.length;
  const filtro =
    piezas.map((_, i) => `[${i}:a]apad=pad_dur=${pausaMs / 1000}[a${i}]`).join(";") +
    ";" +
    piezas.map((_, i) => `[a${i}]`).join("") +
    `concat=n=${n}:v=0:a=1[out]`;
  await exec("ffmpeg", [
    "-y",
    "-loglevel",
    "error",
    ...entradas,
    "-filter_complex",
    filtro,
    "-map",
    "[out]",
    "-codec:a",
    "libmp3lame",
    "-b:a",
    "128k",
    destino,
  ]);
}

export async function duracionMs(ruta: string): Promise<number> {
  const { stdout } = await exec("ffprobe", [
    "-v",
    "error",
    "-show_entries",
    "format=duration",
    "-of",
    "csv=p=0",
    ruta,
  ]);
  const seg = Number(stdout.trim());
  if (!Number.isFinite(seg)) throw new Error(`No se pudo leer la duración de ${ruta}`);
  return Math.round(seg * 1000);
}
