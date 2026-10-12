// Anima una imagen quieta (docs/MONIGOTES.md): un dibujo de monigote pasa a moverse unos segundos con
// Wan 2.2 (5B) en fal.ai, 15 centavos por clip, con su candado en compartido/modelos.ts. Vertical
// 9:16, 720p, 5 segundos. Cada pedido se anota en pedidos-fal.jsonl y su costo en gastos.txt.
// Uso (desde estacion/):
//   npx tsx src/animar-imagen.ts --imagen dibujo.png --prompt "…" --salida clip.mp4 [--modelo wan|kling] [--segundos 5|10]
import { appendFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { asegurarModeloAnimacion, costoAnimacionUsd } from "@compartido/modelos";
import { PEDIDOS_FAL, subirAFal, urlDeFal } from "./avatar";
import { config } from "./config";

export const MODELOS_ANIMACION: Record<string, string> = {
  wan: "fal-ai/wan/v2.2-5b/image-to-video",
  kling: "fal-ai/kling-video/v2.5-turbo/pro/image-to-video",
};
const ESPERA_MAXIMA_MS = 30 * 60_000;

export async function animarImagen(entrada: {
  imagen: string;
  prompt: string;
  salida: string;
  /** «wan» (por defecto) o «kling». */
  modelo?: string;
  /** Kling: 5 o 10 segundos. */
  segundos?: 5 | 10;
  avisar?: (t: string) => void;
}): Promise<{ ruta: string; costoUsd: number }> {
  if (!config.FAL_KEY) throw new Error("Falta FAL_KEY en estacion/.env.");
  const modelo = asegurarModeloAnimacion(MODELOS_ANIMACION[entrada.modelo ?? "wan"] ?? "");
  const segundos = entrada.segundos ?? 5;
  const costoUsd = costoAnimacionUsd(modelo, 1, segundos);
  const avisar = entrada.avisar ?? (() => {});
  avisar(`animando con ${modelo}: $${costoUsd.toFixed(2)}`);
  const cabeceras = { authorization: `Key ${config.FAL_KEY}`, "content-type": "application/json" };
  const envio = await fetch(`https://queue.fal.run/${modelo}`, {
    method: "POST",
    headers: cabeceras,
    body: JSON.stringify(
      modelo === "fal-ai/kling-video/v2.5-turbo/pro/image-to-video"
        ? {
            image_url: await subirAFal(entrada.imagen, config.FAL_KEY),
            prompt: entrada.prompt,
            negative_prompt:
              "text, letters, watermark, color photo, realistic, 3d render, extra limbs, objects disappearing, blur, distort, low quality",
            duration: String(segundos),
            cfg_scale: 0.6,
          }
        : {
            image_url: await subirAFal(entrada.imagen, config.FAL_KEY),
            prompt: entrada.prompt,
            negative_prompt:
              "text, letters, watermark, color photo, realistic, 3d render, extra limbs, blurry",
            aspect_ratio: "9:16",
            resolution: "720p",
            num_frames: 121, // 5 s a 24 cuadros por segundo
            frames_per_second: 24,
          },
    ),
  });
  if (!envio.ok)
    throw new Error(`fal.ai respondió ${envio.status} al encolar: ${(await envio.text()).slice(0, 300)}`);
  const cola = (await envio.json()) as { request_id: string; status_url: string; response_url: string };
  await mkdir(path.dirname(entrada.salida), { recursive: true });
  await appendFile(
    path.join(path.dirname(entrada.salida), PEDIDOS_FAL),
    `${JSON.stringify({ ...cola, salida: entrada.salida, modelo, costoUsd, fecha: new Date().toISOString() })}\n`,
  );
  const inicio = Date.now();
  let ultimo = "";
  for (;;) {
    if (Date.now() - inicio > ESPERA_MAXIMA_MS)
      throw new Error(
        `fal.ai tardó más de 30 minutos. El pedido ${cola.request_id} sigue allá: recógelo con avatar-recoger.ts.`,
      );
    const estado = (await (await fetch(urlDeFal(cola.status_url), { headers: cabeceras })).json()) as {
      status: string;
    };
    if (estado.status !== ultimo) {
      avisar(`fal.ai: ${estado.status}`);
      ultimo = estado.status;
    }
    if (estado.status === "COMPLETED") break;
    if (estado.status === "FAILED") throw new Error("fal.ai no pudo animar la imagen.");
    await new Promise((r) => setTimeout(r, 5000));
  }
  const r = (await (await fetch(urlDeFal(cola.response_url), { headers: cabeceras })).json()) as {
    video?: { url: string };
  };
  if (!r.video?.url)
    throw new Error(`fal.ai devolvió una respuesta sin video: ${JSON.stringify(r).slice(0, 200)}`);
  await writeFile(entrada.salida, Buffer.from(await (await fetch(r.video.url)).arrayBuffer()));
  await appendFile(
    path.join(path.dirname(entrada.salida), "gastos.txt"),
    `${new Date().toISOString()}\t${modelo}\t${segundos} s\t$${costoUsd.toFixed(2)}\t${path.basename(entrada.salida)}\n`,
  );
  return { ruta: entrada.salida, costoUsd };
}

const opcion = (nombre: string): string | null => {
  const i = process.argv.indexOf(nombre);
  return i === -1 ? null : (process.argv[i + 1] ?? null);
};

if (process.argv[1] && path.basename(process.argv[1]).startsWith("animar-imagen")) {
  const imagen = opcion("--imagen");
  const prompt = opcion("--prompt");
  const salida = opcion("--salida");
  if (!imagen || !prompt || !salida) {
    console.error('Uso: animar-imagen.ts --imagen dibujo.png --prompt "…" --salida clip.mp4');
    process.exit(1);
  }
  animarImagen({
    imagen: path.resolve(imagen),
    prompt,
    salida: path.resolve(salida),
    avisar: (t) => console.log(`  ${t}`),
  })
    .then((r) => console.log(`Listo: ${r.ruta} ($${r.costoUsd.toFixed(2)})`))
    .catch((e: unknown) => {
      console.error(e instanceof Error ? e.message : e);
      process.exit(1);
    });
}
