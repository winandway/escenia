// Prueba de punta a punta del invitado del Podcast IA SIN navegador: abre una conversación real con el
// agente (URL firmada, como el panel), le pasa la ficha de ejemplo con los mismos overrides que el
// estudio, le hace una pregunta por texto y comprueba que contesta con texto Y con audio.
// Gasta unos segundos de minutos de Agents. Uso, desde la raíz: estacion/node_modules/.bin/tsx scripts/podcast-probar-voz.ts
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { construirPrompt, idDeVozInvitado, primerMensaje } from "@compartido/podcast";

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

async function principal() {
  const pregunta = await preguntaHablada("¿Cómo empezó todo? Cuéntame en dos frases.");
  const { db } = await import("./base-remota");
  const { ajuste } = await import("@/lib/consultas");
  const { AJUSTE_VOCES } = await import("@/lib/podcast");
  const ficha = await db.uno<{
    nombre: string;
    personalidad: string;
    historia: string;
    voz: string;
    primer_mensaje: string;
  }>(
    "SELECT nombre, personalidad, historia, voz, primer_mensaje FROM podcast_fichas WHERE ejemplo = 1 ORDER BY id LIMIT 1",
  );
  if (!ficha) throw new Error("No está la ficha de ejemplo.");
  const voces = JSON.parse(await ajuste(db, AJUSTE_VOCES, "{}")) as Record<string, string>;
  const r = await fetch(
    `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${encodeURIComponent(agenteId)}`,
    { headers: { "xi-api-key": clave } },
  );
  const { signed_url } = (await r.json()) as { signed_url: string };
  const ws = new WebSocket(signed_url);
  let audio = 0;
  const textos: string[] = [];
  let preguntado = false;
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
            agent: { prompt: { prompt: construirPrompt(ficha) }, first_message: primerMensaje(ficha) },
            tts: { voice_id: idDeVozInvitado(ficha.voz, voces) },
          },
        }),
      );
    ws.onerror = () => falla(new Error("Falló la conexión con el agente."));
    ws.onclose = (c) => {
      if (textos.length < 2) falla(new Error(`El agente cerró la conexión (${c.code} ${c.reason}).`));
    };
    ws.onmessage = (m) => {
      const e = JSON.parse(String(m.data)) as Record<string, unknown> & { type: string };
      if (process.env.VER) console.log("evento:", e.type, JSON.stringify(e).slice(0, 160));
      if (e.type === "ping") {
        const id = (e.ping_event as { event_id: number }).event_id;
        ws.send(JSON.stringify({ type: "pong", event_id: id }));
      }
      if (e.type === "audio")
        audio += String((e.audio_event as { audio_base_64?: string })?.audio_base_64 ?? "").length;
      if (e.type === "user_transcript")
        console.log(
          "Richard (lo que oyó):",
          (e.user_transcription_event as { user_transcript: string }).user_transcript,
        );
      if (e.type === "agent_response") {
        textos.push((e.agent_response_event as { agent_response: string }).agent_response);
        if (!preguntado) {
          preguntado = true;
          // El saludo no se deja interrumpir (disable_first_message_interruptions): se pregunta cuando termina.
          setTimeout(() => {
            cola = pregunta;
          }, 8000);
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
  console.log(`Invitado: ${ficha.nombre} · voz ${ficha.voz}`);
  textos.forEach((t, i) => console.log(`${i === 0 ? "Saludo" : "Respuesta"}: ${t}`));
  console.log(`Audio recibido: ${Math.round((audio * 3) / 4 / 1024)} KB`);
  if (textos.length < 2 || audio < 10_000) process.exit(1);
}

principal().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
