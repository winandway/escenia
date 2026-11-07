// El video de cómo se mueve Mia (docs/PODCAST.md, «Cómo se mueve Mia»; C-PODCAST-4), SIN gastar: corre contra la
// vista previa LOCAL (http://localhost:8787, base local) y simula a ElevenLabs dentro del navegador, como
// scripts/podcast-capturas.mjs. Graba unos 60 s de una conversación normal:
//   saluda (corto: no cambia de pose) → Richard pregunta → Mia piensa (tarda más de 1,2 s) → contesta y, cuando
//   arranca a explicar algo nuevo, la IA pide el gesto «idea» con su herramienta → Richard vuelve a hablar.
// Lo que dice Richard sale como un subtítulo en su panel (solo en este video de prueba). Al final cuenta los
// cambios de pose que hubo y deja el video en mp4 H.264 de 1280 × 720.
//
// Antes: la vista previa corriendo (launch «panel-empaquetado») y una ficha local con Mia.
// Uso: node scripts/podcast-video-movimiento.mjs <id de la ficha local> <archivo .mp4>
// Crea una sesión del panel SOLO en la base local (nunca en la de producción).
import { execFileSync } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { mkdtempSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { chromium } from "playwright";

const BASE = "http://localhost:8787";
const [fichaId = "2", salida = "docs/capturas/podcast-mia-movimiento.mp4"] = process.argv.slice(2);
const DURACION_MS = 60_000;

const token = randomBytes(32).toString("base64url");
const huella = createHash("sha256").update(token).digest("hex");
execFileSync(
  "npx",
  [
    "wrangler",
    "d1",
    "execute",
    "escenia-local",
    "--local",
    "-c",
    "wrangler.prueba.jsonc",
    "--command",
    `INSERT INTO sesiones (id, expira_en) VALUES ('${huella}', datetime('now', '+1 hour'))`,
  ],
  { stdio: "ignore" },
);

/** Una «voz» de prueba (la misma de podcast-capturas.mjs): un tono de voz con sílabas y pausas entre frases. */
function vozDePrueba(segundos) {
  const n = Math.floor(16000 * segundos);
  const pcm = Buffer.alloc(n * 2);
  for (let i = 0; i < n; i++) {
    const t = i / 16000;
    const frase = t % 2.4 < 2.1 ? 1 : 0;
    const silaba =
      Math.max(0, Math.sin(Math.PI * ((t % 0.18) / 0.18))) * (0.5 + 0.5 * Math.sin(t * 2.1)) * frase;
    let tono = 0;
    for (let k = 1; k <= 16; k++) tono += Math.sin(2 * Math.PI * 190 * k * t) / k;
    pcm.writeInt16LE(Math.round(Math.max(-1, Math.min(1, tono * 0.45)) * silaba * 22000), i * 2);
  }
  return pcm;
}

const carpetaVideo = mkdtempSync(path.join(os.tmpdir(), "podcast-video-"));
const navegador = await chromium.launch({
  channel: "chrome",
  args: [
    "--use-fake-ui-for-media-stream",
    "--use-fake-device-for-media-stream",
    "--autoplay-policy=no-user-gesture-required",
  ],
});
const contexto = await navegador.newContext({
  viewport: { width: 1280, height: 720 },
  deviceScaleFactor: 1,
  permissions: ["microphone"],
  recordVideo: { dir: carpetaVideo, size: { width: 1280, height: 720 } },
});
const inicioDelVideo = Date.now();
await contexto.addCookies([{ name: "escenia_sesion", value: token, url: BASE }]);
const pagina = await contexto.newPage();
pagina.on("pageerror", (e) => console.log("error en la página:", e.message));

await pagina.route("**/datos/podcast/conversaciones", (r) =>
  r.fulfill({
    json: {
      conversacionId: 1,
      signedUrl: "wss://api.elevenlabs.io/v1/convai/conversation?agent_id=local&conversation_signature=local",
      maxSegundos: 600,
      overrides: { agent: { prompt: { prompt: "local" }, firstMessage: "Hola" }, tts: { voiceId: "local" } },
    },
  }),
);
await pagina.route("**/datos/podcast/conversaciones/*/fin", (r) => r.fulfill({ json: { segundos: 0 } }));

let agente = null;
let herramientas = 0;
await pagina.routeWebSocket(/api\.elevenlabs\.io/, (ws) => {
  agente = ws;
  ws.onMessage((m) => {
    const datos = JSON.parse(String(m));
    // El estudio contesta la herramienta (el SDK siempre lo hace); la IA de verdad no lo espera.
    if (datos.type === "client_tool_result")
      console.log(`  el estudio atendió la herramienta: ${datos.result}`);
    if (datos.type === "conversation_initiation_client_data")
      ws.send(
        JSON.stringify({
          type: "conversation_initiation_metadata",
          conversation_initiation_metadata_event: {
            conversation_id: "local",
            agent_output_audio_format: "pcm_16000",
            user_input_audio_format: "pcm_16000",
          },
        }),
      );
  });
});
let evento = 1;
const decir = (texto) =>
  agente?.send(JSON.stringify({ type: "agent_response", agent_response_event: { agent_response: texto } }));
const sonar = (segundos) => {
  const pcm = vozDePrueba(segundos);
  for (let i = 0; i < pcm.length; i += 3200)
    agente?.send(
      JSON.stringify({
        type: "audio",
        audio_event: { audio_base_64: pcm.subarray(i, i + 3200).toString("base64"), event_id: evento++ },
      }),
    );
};
const gesto = (pose) => {
  herramientas++;
  agente?.send(
    JSON.stringify({
      type: "client_tool_call",
      client_tool_call: {
        tool_name: "gesto",
        tool_call_id: `gesto-${herramientas}`,
        parameters: { pose },
        event_id: evento++,
      },
    }),
  );
};
const richardDijo = (texto) =>
  agente?.send(
    JSON.stringify({ type: "user_transcript", user_transcription_event: { user_transcript: texto } }),
  );
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

await pagina.goto(`${BASE}/podcast?ficha=${fichaId}`, { waitUntil: "networkidle" });
// El registro de poses (con su hora) y el subtítulo de Richard (solo para este video).
await pagina.evaluate(() => {
  const w = /** @type {any} */ (window);
  w.__poses = [];
  const svg = document.querySelector('[role="img"][aria-label^="El invitado"]');
  new MutationObserver(() => w.__poses.push([performance.now(), svg.getAttribute("data-pose")])).observe(
    svg,
    {
      attributes: true,
      attributeFilter: ["data-pose"],
    },
  );
  const panel = document.querySelector('section[aria-label="Richard"]');
  const sub = document.createElement("div");
  sub.id = "subtitulo-richard";
  sub.style.cssText =
    "position:absolute;left:6%;right:6%;top:38%;padding:1.2cqw 1.6cqw;border-radius:1cqw;background:rgba(0,0,0,.55);color:#fff;font:600 1.5cqw/1.35 system-ui;text-align:center;opacity:0;transition:opacity .4s";
  panel.appendChild(sub);
});
const subtitulo = (texto) =>
  pagina.evaluate((t) => {
    const s = document.getElementById("subtitulo-richard");
    s.textContent = t ? `Richard: «${t}»` : "";
    s.style.opacity = t ? "1" : "0";
  }, texto);

await pagina.mouse.move(640, 700);
await esperar(1200);
await pagina.getByRole("button", { name: "Empezar la conversación" }).click();
const T = await pagina.evaluate(() => performance.now());
const msDelClic = Date.now() - inicioDelVideo;
const en = async (ms) => {
  const ahora = await pagina.evaluate(() => performance.now());
  if (T + ms > ahora) await esperar(T + ms - ahora);
};
await pagina.mouse.move(5, 5);
for (let i = 0; i < 50 && !agente; i++) await esperar(100);

// 1. El saludo: corto (menos de 6 s), así que no la saca de las manos juntas.
await en(1000);
decir("Hola, Richard. Gracias por invitarme. Soy Mia IA.");
sonar(3.4);
// 2. Richard pregunta.
await en(5500);
await subtitulo("Mia, una pregunta grande: ¿crees que hay vida en otros planetas?");
await en(13_000);
richardDijo("Mia, una pregunta grande: ¿crees que hay vida en otros planetas?");
await subtitulo("");
// 3. Mia piensa (tarda 2,8 s): a los 1,2 s aparece la mano en la barbilla. Cuando la respuesta arranca a
// explicar algo nuevo, la IA pide «idea».
await en(15_400);
gesto("idea");
decir(
  "Mmm… déjame pensarlo bien, porque es de las preguntas más grandes que existen. ¿Sabes qué? Te cuento algo curioso: hasta hoy no tenemos ninguna prueba de vida fuera de la Tierra, pero sí miles de planetas donde podría haberla. Algunos están a la distancia justa de su estrella para tener agua líquida. Así que mi respuesta honesta es: todavía no lo sabemos, y eso es lo emocionante.",
);
await en(15_800);
sonar(22);
// 4. Richard vuelve a hablar hasta el final.
await en(38_600);
await subtitulo("¡Qué interesante! Y si existieran, ¿crees que se parecerían a nosotros?");
await en(DURACION_MS + 1000);

const poses = await pagina.evaluate(() => /** @type {any} */ (window).__poses);
const video = pagina.video();
await contexto.close();
await navegador.close();
const crudo = await video.path();

const cambios = poses.filter(([t]) => t >= T && t <= T + DURACION_MS + 1000);
console.log(`Cambios de pose en los ${DURACION_MS / 1000} s de la conversación: ${cambios.length}`);
for (const [t, pose] of cambios) console.log(`  ${((t - T) / 1000).toFixed(1).padStart(5)} s  ${pose}`);
console.log(`Herramientas pedidas: ${herramientas}`);

// A mp4 H.264 de 1280 × 720, desde un segundo antes del clic.
const desde = Math.max(0, msDelClic / 1000 - 1);
execFileSync(
  "ffmpeg",
  [
    "-y",
    "-loglevel",
    "error",
    "-ss",
    desde.toFixed(2),
    "-i",
    crudo,
    "-t",
    String(DURACION_MS / 1000 + 1.5),
    "-vf",
    "scale=1280:720,fps=30",
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-crf",
    "20",
    "-preset",
    "slow",
    "-movflags",
    "+faststart",
    salida,
  ],
  { stdio: "inherit" },
);
console.log(`Video: ${salida}`);
