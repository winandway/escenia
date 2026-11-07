// Prueba de punta a punta del invitado del Podcast IA SIN navegador: abre una conversación real con el
// agente (URL firmada, como el panel), le pasa una ficha con los mismos overrides que el estudio (su prompt
// según el tipo y el origen, y SU voz), le hace preguntas habladas y comprueba que contesta con texto Y con
// audio, y que ElevenLabs usó la voz de la ficha. Gasta menos de un minuto de Agents (unos 8 centavos por
// minuto a precio de lista).
// Uso, desde la raíz: estacion/node_modules/.bin/tsx scripts/podcast-probar-voz.ts
//   (la ficha de ejemplo, con «¿cómo empezó todo?» y «¿eres una persona real?»)
//   … --ficha 2 --pregunta "¿Crees que hay vida fuera de este planeta?"
//
// También registra la herramienta `gesto` (C-PODCAST-4): cada vez que la IA la llama, con qué pose, en qué
// momento de la respuesta (antes o después del texto y del primer audio) y si la voz siguió después (que la
// respuesta no se trabe). La contesta como el SDK del estudio, sin que la IA espere nada.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  construirPrompt,
  idDeVozInvitado,
  limpiarEtiquetasDeEmocion,
  primerMensaje,
} from "@compartido/podcast";

const CARPETA = path.join(os.homedir(), ".config", "motor-escenia");
const rutaClave = ["elevenlabs-agents", "elevenlabs-agentes"]
  .map((n) => path.join(CARPETA, n))
  .find(existsSync);
if (!rutaClave) throw new Error("Falta la clave de Agents en ~/.config/motor-escenia.");
const clave = readFileSync(rutaClave, "utf8").trim();
const agenteId = readFileSync(path.join(CARPETA, "podcast-agente-id"), "utf8").trim();

/** La pregunta, HABLADA, en PCM 16 kHz mono: el agente espera audio continuo, como el micrófono del estudio. */
async function preguntaHablada(texto: string): Promise<Buffer> {
  const env = Object.fromEntries(
    readFileSync("estacion/.env", "utf8")
      .split("\n")
      .filter((l) => l.includes("=") && !l.startsWith("#"))
      .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
  );
  const r = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${env.ELEVENLABS_VOICE_ID_FEMENINA}?output_format=pcm_16000`,
    {
      method: "POST",
      headers: { "xi-api-key": env.ELEVENLABS_API_KEY ?? "", "content-type": "application/json" },
      body: JSON.stringify({ text: texto, model_id: "eleven_flash_v2_5" }),
    },
  );
  if (!r.ok) throw new Error(`No se pudo hablar la pregunta (${r.status}).`);
  return Buffer.from(await r.arrayBuffer());
}

/** `--ficha N` elige la ficha (si no, la de ejemplo); cada `--pregunta "…"` reemplaza las preguntas de siempre. */
function opciones() {
  const args = process.argv.slice(2);
  const valores = (nombre: string) =>
    args.flatMap((a, i) => (a === nombre && args[i + 1] ? [args[i + 1]!] : []));
  const ficha = Number(valores("--ficha")[0] ?? 0);
  const preguntas = valores("--pregunta");
  return {
    ficha: Number.isInteger(ficha) && ficha > 0 ? ficha : null,
    preguntas: preguntas.length
      ? preguntas
      : ["¿Cómo empezó todo? Cuéntame en dos frases.", "Una pregunta directa: ¿eres una persona real?"],
  };
}

async function principal() {
  const op = opciones();
  const preguntas: Buffer[] = [];
  for (const p of op.preguntas) preguntas.push(await preguntaHablada(p));
  const { db } = await import("./base-remota");
  const { ajuste } = await import("@/lib/consultas");
  const { AJUSTE_VOCES, fichaPorId } = await import("@/lib/podcast");
  const id =
    op.ficha ??
    (await db.uno<{ id: number }>("SELECT id FROM podcast_fichas WHERE ejemplo = 1 ORDER BY id LIMIT 1"))
      ?.id ??
    0;
  // La misma ficha, la misma voz y el mismo prompt que arma el panel (src/lib/podcast.ts, iniciarConversacion).
  const ficha = await fichaPorId(db, id);
  if (!ficha) throw new Error(`No está la ficha ${id || "de ejemplo"} (o está archivada).`);
  const voces = JSON.parse(await ajuste(db, AJUSTE_VOCES, "{}")) as Record<string, string>;
  const vozId = idDeVozInvitado(ficha.voz, voces);
  const prompt = construirPrompt(ficha);
  let conversacionId = "";
  const r = await fetch(
    `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${encodeURIComponent(agenteId)}`,
    { headers: { "xi-api-key": clave } },
  );
  const { signed_url } = (await r.json()) as { signed_url: string };
  const ws = new WebSocket(signed_url);
  let audio = 0;
  const textos: string[] = [];
  let respondidas = 0;
  // La línea de tiempo de cada respuesta, para ver dónde cae el gesto y si la voz sigue después.
  const inicio = Date.now();
  const ms = () => Date.now() - inicio;
  let esperandoRespuesta = true;
  let turno = 0;
  type Turno = { texto?: number; primerAudio?: number; ultimoAudio?: number; bytes: number };
  const turnos: Turno[] = [{ bytes: 0 }];
  const gestos: { pose: unknown; ms: number; turno: number; audioAntes: number }[] = [];
  const salida = path.join(os.tmpdir(), "podcast-prueba-voz.txt");
  await new Promise<void>((listo, falla) => {
    const reloj = setTimeout(() => falla(new Error("El agente no contestó en 60 s.")), 60_000);
    // 100 ms de audio cada 100 ms, siempre: silencio, y la pregunta cuando toca.
    const CHUNK = 3200;
    let cola: Buffer = Buffer.alloc(0);
    const latido = setInterval(() => {
      if (ws.readyState !== WebSocket.OPEN) return;
      const trozo = cola.length ? cola.subarray(0, CHUNK) : Buffer.alloc(CHUNK);
      cola = cola.subarray(Math.min(CHUNK, cola.length));
      ws.send(JSON.stringify({ user_audio_chunk: Buffer.from(trozo).toString("base64") }));
    }, 100);
    ws.addEventListener("close", () => clearInterval(latido));
    ws.onopen = () =>
      ws.send(
        JSON.stringify({
          type: "conversation_initiation_client_data",
          conversation_config_override: {
            agent: { prompt: { prompt }, first_message: primerMensaje(ficha) },
            tts: { voice_id: vozId },
          },
        }),
      );
    ws.onerror = () => falla(new Error("Falló la conexión con el agente."));
    ws.onclose = (c) => {
      if (textos.length < 1 + preguntas.length)
        falla(new Error(`El agente cerró la conexión (${c.code} ${c.reason}).`));
    };
    ws.onmessage = (m) => {
      const e = JSON.parse(String(m.data)) as Record<string, unknown> & { type: string };
      if (process.env.VER) console.log("evento:", e.type, JSON.stringify(e).slice(0, 160));
      if (e.type === "conversation_initiation_metadata")
        conversacionId =
          (e.conversation_initiation_metadata_event as { conversation_id?: string } | undefined)
            ?.conversation_id ?? "";
      if (e.type === "ping") {
        const id = (e.ping_event as { event_id: number }).event_id;
        ws.send(JSON.stringify({ type: "pong", event_id: id }));
      }
      if (e.type === "audio") {
        const largo = String((e.audio_event as { audio_base_64?: string })?.audio_base_64 ?? "").length;
        audio += largo;
        const t = turnos[turno]!;
        t.primerAudio ??= ms();
        t.ultimoAudio = ms();
        t.bytes += largo;
      }
      if (e.type === "client_tool_call") {
        const c = e.client_tool_call as {
          tool_name: string;
          tool_call_id: string;
          parameters: { pose?: unknown };
        };
        gestos.push({ pose: c.parameters?.pose, ms: ms(), turno, audioAntes: turnos[turno]!.bytes });
        console.log(
          `  [${(ms() / 1000).toFixed(1)} s] la IA llamó «${c.tool_name}»: ${JSON.stringify(c.parameters)}`,
        );
        // Como el SDK del estudio: contesta enseguida (la IA no lo espera).
        ws.send(
          JSON.stringify({
            type: "client_tool_result",
            tool_call_id: c.tool_call_id,
            result: "ok",
            is_error: false,
          }),
        );
      }
      if (e.type === "user_transcript") {
        console.log(
          `  [${(ms() / 1000).toFixed(1)} s] Richard (lo que oyó):`,
          (e.user_transcription_event as { user_transcript: string }).user_transcript,
        );
        esperandoRespuesta = true;
        turno++;
        turnos[turno] = { bytes: 0 };
      }
      if (e.type === "agent_response") {
        const texto = (e.agent_response_event as { agent_response: string }).agent_response;
        turnos[turno]!.texto ??= ms();
        // Un segundo texto en la misma respuesta (si la IA partió su turno) se junta con el primero.
        if (!esperandoRespuesta) {
          textos[textos.length - 1] += ` ${texto}`;
          return;
        }
        esperandoRespuesta = false;
        textos.push(texto);
        const siguiente = preguntas[respondidas];
        respondidas++;
        if (siguiente) {
          // Se pregunta cuando termina de hablar (el saludo no se deja interrumpir; las respuestas, mejor no).
          setTimeout(
            () => {
              cola = siguiente;
            },
            respondidas === 1 ? 8000 : 14000,
          );
        } else {
          clearTimeout(reloj);
          setTimeout(() => {
            ws.close();
            listo();
          }, 4000);
        }
      }
    };
  });
  writeFileSync(salida, textos.join("\n---\n"));
  console.log(
    `Invitado: ${ficha.nombre} · voz ${ficha.voz} · ${ficha.tipo === "entrevista_ia" ? "entrevista a la IA" : `historia de ${ficha.origen}`}`,
  );
  // Las etiquetas de emoción de la voz v3 («[nervous]») se oyen, no se leen.
  const etiquetas = textos.join(" ").match(/\[[^\]\n]{1,40}\]/g) ?? [];
  textos.forEach((t, i) =>
    console.log(`${i === 0 ? "Saludo" : `Respuesta ${i}`}: ${limpiarEtiquetasDeEmocion(t)}`),
  );
  if (etiquetas.length) console.log(`Etiquetas de emoción quitadas del texto: ${etiquetas.join(" ")}`);
  console.log(`Audio recibido: ${Math.round((audio * 3) / 4 / 1024)} KB`);
  turnos.forEach((t, i) =>
    console.log(
      `${i === 0 ? "Saludo" : `Respuesta ${i}`}: texto a los ${((t.texto ?? 0) / 1000).toFixed(1)} s, audio de ${((t.primerAudio ?? 0) / 1000).toFixed(1)} a ${((t.ultimoAudio ?? 0) / 1000).toFixed(1)} s (${Math.round((t.bytes * 3) / 4 / 1024)} KB)`,
    ),
  );
  if (!gestos.length) console.log("Gestos: la IA no llamó a «gesto» en esta conversación.");
  for (const g of gestos) {
    const t = turnos[g.turno]!;
    const siguio = (t.ultimoAudio ?? 0) > g.ms;
    console.log(
      `Gesto «${String(g.pose)}» en la ${g.turno === 0 ? "bienvenida" : `respuesta ${g.turno}`}: a los ${(g.ms / 1000).toFixed(1)} s, ` +
        `${t.primerAudio && t.primerAudio < g.ms ? "después" : "antes"} del primer audio, con ${Math.round((g.audioAntes * 3) / 4 / 1024)} KB de voz antes; ` +
        `${siguio ? "la voz siguió después (no se trabó)" : "OJO: no llegó voz después"}.`,
    );
  }

  // ¿ElevenLabs usó la voz de la ficha? Lo dice la propia conversación guardada (los datos de inicio).
  let vozUsada = "";
  for (let intento = 0; intento < 6 && conversacionId && !vozUsada; intento++) {
    await new Promise((r) => setTimeout(r, 3000));
    const c = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversations/${encodeURIComponent(conversacionId)}`,
      {
        headers: { "xi-api-key": clave },
      },
    );
    if (!c.ok) continue;
    const datos = (await c.json()) as {
      conversation_initiation_client_data?: {
        conversation_config_override?: { tts?: { voice_id?: string } };
      };
      metadata?: { call_duration_secs?: number };
    };
    vozUsada = datos.conversation_initiation_client_data?.conversation_config_override?.tts?.voice_id ?? "";
    if (datos.metadata?.call_duration_secs)
      console.log(`Duración cobrada por ElevenLabs: ${datos.metadata.call_duration_secs} s`);
  }
  if (vozUsada)
    console.log(
      vozUsada === vozId ? `Voz confirmada: ${ficha.voz}.` : `OJO: la voz usada no es la «${ficha.voz}».`,
    );
  else console.log("No pude leer la voz usada en la conversación guardada (sí se pidió la de la ficha).");
  if (textos.length < 1 + preguntas.length || audio < 10_000 || (vozUsada && vozUsada !== vozId))
    process.exit(1);
}

principal().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
