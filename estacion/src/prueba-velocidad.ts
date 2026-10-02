// Mide cuántas letras por segundo lee la voz con cada valor de `speed` de
// ElevenLabs (una frase corta: cuesta centavos). Sirve para decidir cuánta
// velocidad pedirle a la voz misma, en vez de acelerarla después con ffmpeg.
// Uso (desde estacion/):  npx tsx src/prueba-velocidad.ts 1 1.1 1.2
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { letrasHabladas } from "@compartido/ritmo";
import { config } from "./config";
import { duracionMs } from "./voz";

const TEXTO =
  "El disco debutó en el número uno de Tropical Albums con veintitrés mil unidades, llegó al número dos de Top Latin Albums y al número treinta y dos del Billboard doscientos, la lista general de todo Estados Unidos.";

async function principal() {
  const velocidades = process.argv
    .slice(2)
    .map(Number)
    .filter((n) => n > 0);
  for (const speed of velocidades.length ? velocidades : [1]) {
    const r = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${config.ELEVENLABS_VOICE_ID}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: { "xi-api-key": config.ELEVENLABS_API_KEY ?? "", "content-type": "application/json" },
        body: JSON.stringify({ text: TEXTO, model_id: config.ELEVENLABS_MODELO, voice_settings: { speed } }),
      },
    );
    if (!r.ok) {
      console.log(`speed ${speed}: ElevenLabs respondió ${r.status} ${(await r.text()).slice(0, 200)}`);
      continue;
    }
    const ruta = path.join(config.CARPETA_SALIDA, "prueba-velocidad", `velocidad-${speed}.mp3`);
    await writeFile(ruta, Buffer.from(await r.arrayBuffer()));
    const seg = (await duracionMs(ruta)) / 1000;
    console.log(
      `speed ${speed}: ${seg.toFixed(2)} s → ${(letrasHabladas(TEXTO) / seg).toFixed(1)} letras por segundo`,
    );
  }
}

principal().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
