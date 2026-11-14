// El taller en la nube (Cloudflare Containers, `escenia-taller`; propuesta aprobada por Gerencia el
// 8 nov 2026, planes/TALLER-NUBE.md). Es lo que corre DENTRO del contenedor: un servidor chico en el
// puerto 8080 que el trabajador de Cloudflare despierta. No lee secretos ni habla con el panel todavía.
//   GET  /salud   → { ok: true }
//   POST /prueba  → arma un video vertical SINTÉTICO de 62 s (solo textos, sin gastar nada) y dice
//                   cuántos segundos tardó: así se mide el armado real en la nube.
import { execFile } from "node:child_process";
import { createServer } from "node:http";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { esquemaPropsVideo, type PropsVideo } from "./remotion/props";
import { renderizar } from "./render";

const PUERTO = Number(process.env.PORT ?? 8080);

/** Un video de prueba sin material: 62 s en escenas de texto (lo mismo que dura el comercial t40). */
export function propsDePrueba(segundos = 62, audio = "silencio.wav"): PropsVideo {
  const porEscena = 3100;
  const n = Math.ceil((segundos * 1000) / porEscena);
  return esquemaPropsVideo.parse({
    titulo: "Prueba del taller",
    // La plantilla siempre suena: con audio vacío pedía la carpeta entera y fallaba (C-TALLER-3).
    audio,
    duracionMs: n * porEscena,
    palabras: [],
    producto: null,
    escenas: Array.from({ length: n }, (_, k) => ({
      parte: k === 0 ? "gancho" : "contexto",
      inicioMs: k * porEscena,
      finMs: (k + 1) * porEscena,
      textoEnPantalla: `Escena ${k + 1} de ${n}`,
      estilo: k % 2 ? "frase" : "titular",
      clip: null,
    })),
  });
}

let ocupado = false;

async function prueba(): Promise<{ segundos: number; bytes: number; duracionSeg: number }> {
  const carpeta = await mkdtemp(path.join(tmpdir(), "taller-"));
  const inicio = Date.now();
  // 62 s de silencio como voz (gratis): la plantilla necesita un audio de verdad.
  await promisify(execFile)("ffmpeg", [
    "-y",
    "-v",
    "error",
    "-f",
    "lavfi",
    "-i",
    "anullsrc=r=44100:cl=mono",
    "-t",
    "62",
    "-c:a",
    "pcm_s16le",
    path.join(carpeta, "silencio.wav"),
  ]);
  const r = await renderizar(
    "TechExplainerShort",
    propsDePrueba(),
    carpeta,
    path.join(carpeta, "prueba.mp4"),
    () => {},
  );
  return { segundos: Math.round((Date.now() - inicio) / 1000), bytes: r.bytes, duracionSeg: r.duracionSeg };
}

if (process.argv[1]?.endsWith("taller.ts"))
  createServer((req, res) => {
    const responder = (estado: number, cuerpo: unknown) => {
      res.writeHead(estado, { "content-type": "application/json" });
      res.end(JSON.stringify(cuerpo));
    };
    if (req.method === "GET" && req.url === "/salud") return responder(200, { ok: true });
    if (req.method === "POST" && req.url === "/prueba") {
      // Una cosa a la vez: la máquina es una sola y no se reparte.
      if (ocupado) return responder(409, { error: "El taller ya está armando algo." });
      ocupado = true;
      prueba()
        .then((r) => responder(200, r))
        .catch((e: unknown) => responder(500, { error: e instanceof Error ? e.message : String(e) }))
        .finally(() => {
          ocupado = false;
        });
      return;
    }
    responder(404, { error: "No existe." });
  }).listen(PUERTO, () => console.log(`Taller escuchando en el puerto ${PUERTO}`));
