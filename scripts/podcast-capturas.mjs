// Las capturas del estudio del Podcast IA en sus cuatro estados (reposo, escuchando, pensando y hablando),
// SIN gastar: corre contra la vista previa LOCAL (http://localhost:8787, base local) y simula a ElevenLabs
// dentro del navegador. El pedido de la conversación y el WebSocket del agente se contestan aquí mismo: el
// estudio recibe una voz de prueba (un tono con sílabas), así la boca se mueve de verdad con el volumen.
// Sirve para revisar un avatar nuevo de cerca antes de publicarlo (docs/PODCAST.md, «Cómo se agrega un avatar»).
//
// Antes: la vista previa corriendo (launch «panel-empaquetado») y la base local con el esquema
// (npx wrangler d1 execute escenia-local --local -c wrangler.prueba.jsonc --file=schema.sql).
// Uso: node scripts/podcast-capturas.mjs <id de la ficha local> <carpeta de salida> [prefijo] [--poses]
//   --poses   además pasa por las siete poses de Mia (cada gesto lo pide la IA con la herramienta «gesto», como
//             en una conversación de verdad) y arma la hoja <prefijo>-poses.png con todas.
// Crea una sesión del panel SOLO en la base local (nunca en la de producción).
import { execFileSync } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const BASE = "http://localhost:8787";
const [fichaId = "1", salida = "capturas-podcast", prefijo = "podcast"] = process.argv
  .slice(2)
  .filter((a) => !a.startsWith("--"));
// La carpeta la elige quien corre el script (es una herramienta local).
// eslint-disable-next-line security/detect-non-literal-fs-filename
mkdirSync(salida, { recursive: true });

// La sesión, en la base LOCAL de la vista previa.
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

/**
 * Una «voz» de prueba: PCM 16 kHz con la forma de una voz (un tono de 190 Hz con sus armónicos, como las cuerdas
 * vocales) y sílabas de 180 ms que suben y bajan, con pausas cortas entre frases.
 */
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

// El Chrome de la Mac (sin ventana): no hace falta bajar el navegador de Playwright.
const navegador = await chromium.launch({
  channel: "chrome",
  args: [
    "--use-fake-ui-for-media-stream",
    "--use-fake-device-for-media-stream",
    "--autoplay-policy=no-user-gesture-required",
  ],
});
const contexto = await navegador.newContext({
  viewport: { width: 1920, height: 1080 },
  deviceScaleFactor: 2,
  permissions: ["microphone"],
});
await contexto.addCookies([{ name: "escenia_sesion", value: token, url: BASE }]);
const pagina = await contexto.newPage();
pagina.on("pageerror", (e) => console.log("error en la página:", e.message));
pagina.on("console", (m) => {
  if (m.type() === "error" || process.env.VER) console.log(`consola (${m.type()}):`, m.text().slice(0, 200));
});

// El panel simulado: la conversación se «abre» sin llamar a ElevenLabs y se cierra sin contar nada.
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

// El agente simulado.
let agente = null;
await pagina.routeWebSocket(/api\.elevenlabs\.io/, (ws) => {
  agente = ws;
  ws.onMessage((m) => {
    const datos = JSON.parse(String(m));
    if (process.env.VER && datos.type) console.log("el estudio mandó:", datos.type);
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
const decir = (texto) =>
  agente?.send(JSON.stringify({ type: "agent_response", agent_response_event: { agent_response: texto } }));
// Una respuesta larga (más de 6 s): con ella pasa a las manos en la silla. Una corta la deja con las manos juntas.
const LARGA =
  "Es una gran pregunta. Hasta hoy no tenemos ninguna prueba de vida fuera de la Tierra, pero sí miles de planetas donde podría haberla, y algunos están a la distancia justa de su estrella para tener agua líquida.";
let evento = 1;
const hablar = (segundos, texto = LARGA) => {
  const pcm = vozDePrueba(segundos);
  decir(texto);
  for (let i = 0; i < pcm.length; i += 3200)
    agente?.send(
      JSON.stringify({
        type: "audio",
        audio_event: { audio_base_64: pcm.subarray(i, i + 3200).toString("base64"), event_id: evento++ },
      }),
    );
};
/** La IA pide un gesto con su herramienta (C-PODCAST-4). */
const gesto = (pose) =>
  agente?.send(
    JSON.stringify({
      type: "client_tool_call",
      client_tool_call: {
        tool_name: "gesto",
        tool_call_id: `gesto-${evento}`,
        parameters: { pose },
        event_id: evento++,
      },
    }),
  );
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
const estado = () => pagina.getAttribute('[role="img"][aria-label^="El invitado"]', "data-estado");
const capturar = async (nombre) => {
  await pagina.mouse.move(5, 5);
  await esperar(2900); // los controles se esconden solos a los 2,5 s
  const archivo = path.join(salida, `${prefijo}-${nombre}.png`);
  await pagina.screenshot({ path: archivo });
  const panel = await pagina.locator('section[aria-label]:has([role="img"])').boundingBox();
  if (panel)
    await pagina.screenshot({ path: path.join(salida, `${prefijo}-${nombre}-cerca.png`), clip: panel });
  console.log(`${nombre}: ${archivo} (estado ${await estado()})`);
};

await pagina.goto(`${BASE}/podcast?ficha=${fichaId}`, { waitUntil: "networkidle" });
await esperar(800);
await capturar("reposo");

await pagina.getByRole("button", { name: "Empezar la conversación" }).click();
// Como el agente de verdad, el invitado saluda primero; cuando termina de hablar, escucha.
for (let i = 0; i < 50 && !agente; i++) await esperar(100);
await esperar(500);
hablar(2.5, "Hola, Richard.");
await pagina.waitForSelector('[data-estado="hablando"]', { timeout: 15_000 });
await pagina.waitForSelector('[data-estado="escuchando"]', { timeout: 20_000 });
await capturar("escuchando");

// Richard pregunta: mientras el agente prepara la respuesta, el invitado piensa.
agente?.send(
  JSON.stringify({
    type: "user_transcript",
    user_transcription_event: { user_transcript: "¿Hay vida fuera de la Tierra?" },
  }),
);
await pagina.waitForSelector('[data-estado="pensando"]', { timeout: 10_000 });
// La pose de pensar sale si tarda más de 1,2 s; capturar() ya espera 2,9 s.
await capturar("pensando");

hablar(16);
await pagina.waitForSelector('[data-estado="hablando"]', { timeout: 10_000 });
// Si pensó, la mano en la barbilla se sostiene sus 6 s: se espera a las manos en la silla.
await pagina.waitForSelector('[data-pose="hablando"][role="img"]', { timeout: 10_000 });
await esperar(900);
await pagina.screenshot({ path: path.join(salida, `${prefijo}-hablando.png`) });
const panel = await pagina.locator('section[aria-label]:has([role="img"])').boundingBox();
for (let i = 0; i < 6; i++) {
  await esperar(110);
  if (panel)
    await pagina.screenshot({
      path: path.join(salida, `${prefijo}-hablando-cerca-${i + 1}.png`),
      clip: panel,
    });
}
console.log(`hablando: ${path.join(salida, `${prefijo}-hablando.png`)} (estado ${await estado()})`);

if (process.argv.includes("--poses")) {
  // Las siete poses de Mia, de cerca. Cada gesto, en una conversación nueva (el motor deja 25 s entre gestos y
  // uno por respuesta): Richard pregunta, la IA pide el gesto con su herramienta y contesta.
  const { default: sharp } = await import("sharp");
  const pose = () => pagina.getAttribute('[role="img"][aria-label^="El invitado"]', "data-pose");
  const cerca = async (nombre) => {
    await esperar(1000);
    const archivo = path.join(salida, `${prefijo}-pose-${nombre}.png`);
    const caja = await pagina.locator('section[aria-label]:has([role="img"])').boundingBox();
    if (caja) await pagina.screenshot({ path: archivo, clip: caja });
    console.log(`pose ${nombre}: ${archivo} (se ve ${await pose()})`);
    return archivo;
  };
  const conversacionNueva = async () => {
    await pagina.reload({ waitUntil: "networkidle" });
    await esperar(800);
    agente = null;
    await pagina.getByRole("button", { name: "Empezar la conversación" }).click();
    for (let i = 0; i < 50 && !agente; i++) await esperar(100);
    await esperar(500);
    await pagina.mouse.move(5, 5);
  };
  const preguntar = () =>
    agente?.send(
      JSON.stringify({ type: "user_transcript", user_transcription_event: { user_transcript: "¿Y eso?" } }),
    );
  const hojas = [];
  await pagina.reload({ waitUntil: "networkidle" });
  await pagina.mouse.move(5, 5);
  await esperar(2900);
  hojas.push(["Tranquila (escucha)", await cerca("tranquila")]);
  await conversacionNueva();
  preguntar();
  await pagina.waitForSelector('[data-pose="pensando"][role="img"]', { timeout: 10_000 });
  hojas.push(["Pensando", await cerca("pensando")]);
  await conversacionNueva();
  hablar(20);
  await pagina.waitForSelector('[data-pose="hablando"][role="img"]', { timeout: 10_000 });
  hojas.push(["Hablando", await cerca("hablando")]);
  for (const [nombre, titulo] of [
    ["riendo", "Riéndose"],
    ["aplaudiendo", "Aplaudiendo"],
    ["idea", "Una idea"],
    ["notas", "Tomando notas"],
  ]) {
    await conversacionNueva();
    preguntar();
    await esperar(400);
    gesto(nombre);
    hablar(12);
    await pagina.waitForSelector(`[data-pose="${nombre}"][role="img"]`, { timeout: 10_000 });
    hojas.push([titulo, await cerca(nombre)]);
  }
  // La hoja: cuatro arriba y tres abajo, con su nombre.
  const ancho = 640;
  const { width = 1, height = 1 } = await sharp(hojas[0][1]).metadata();
  const alto = Math.round((ancho * height) / width);
  const capas = [];
  for (const [i, [titulo, archivo]] of hojas.entries()) {
    const x = (i % 4) * (ancho + 16) + (i >= 4 ? (ancho + 16) / 2 : 0);
    const y = Math.floor(i / 4) * (alto + 56) + 16;
    capas.push({ input: await sharp(archivo).resize(ancho, alto).png().toBuffer(), left: x + 16, top: y });
    const texto = `<svg xmlns="http://www.w3.org/2000/svg" width="${ancho}" height="40"><text x="${ancho / 2}" y="28" font-family="Helvetica, Arial" font-size="24" fill="#e5e7eb" text-anchor="middle">${titulo}</text></svg>`;
    capas.push({ input: Buffer.from(texto), left: x + 16, top: y + alto + 6 });
  }
  const hoja = path.join(salida, `${prefijo}-poses.png`);
  await sharp({
    create: {
      width: 4 * (ancho + 16) + 16,
      height: 2 * (alto + 56) + 16,
      channels: 3,
      background: "#0b1020",
    },
  })
    .composite(capas)
    .png()
    .toFile(hoja);
  console.log(`hoja de poses: ${hoja}`);
}

await navegador.close();
