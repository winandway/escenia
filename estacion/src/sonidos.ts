// Biblioteca de sonidos (C-SONIDOS-1): antes de producir, la Estación baja a la
// Mac la música y los efectos que Richard subió desde el panel. Lo que él quitó
// de la biblioteca se aparta (no se borra) para que deje de usarse.
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { panel, type SonidoDelPanel } from "./panel";

const exec = promisify(execFile);
const aqui = path.dirname(fileURLToPath(import.meta.url));
const CARPETA: Record<SonidoDelPanel["tipo"], string> = {
  musica: path.resolve(aqui, "../recursos/musica-panel"),
  efecto: path.resolve(aqui, "../recursos/sfx-panel"),
};
const ES_AUDIO = /\.(mp3|m4a|wav|aac|ogg)$/i;

/** Deja las dos carpetas iguales a la biblioteca del panel. Devuelve qué cambió. */
export async function sincronizarSonidos(): Promise<{ bajados: string[]; apartados: string[] }> {
  const biblioteca = await panel.sonidos();
  const bajados: string[] = [];
  const apartados: string[] = [];
  for (const tipo of ["musica", "efecto"] as const) {
    const carpeta = CARPETA[tipo];
    await mkdir(carpeta, { recursive: true });
    const esperados = biblioteca.filter((s) => s.tipo === tipo);
    // En orden de subida: si dos efectos ocupan el mismo lugar (un solo «golpe»), queda el último.
    for (const s of [...esperados].sort((a, b) => a.id - b.id)) {
      const destino = path.join(carpeta, s.archivo);
      const marca = path.join(carpeta, `.${s.id}.bajado`);
      if (existsSync(destino) && existsSync(marca)) continue;
      const datos = await panel.bajarSonido(s.id);
      if (tipo === "efecto") {
        // Los efectos van siempre en MP3 (es lo que carga la plantilla), al mismo volumen de pico.
        const crudo = path.join(carpeta, `.${s.id}.crudo`);
        await writeFile(crudo, datos);
        await exec("ffmpeg", [
          "-y",
          "-loglevel",
          "error",
          "-i",
          crudo,
          "-af",
          "loudnorm=I=-14:TP=-1.5:LRA=11",
          "-ar",
          "44100",
          "-codec:a",
          "libmp3lame",
          "-b:a",
          "160k",
          destino,
        ]);
      } else {
        await writeFile(destino, datos);
      }
      await writeFile(marca, new Date().toISOString());
      bajados.push(s.archivo);
    }
    // Lo que ya no está en la biblioteca se aparta a «quitados» (por si vuelve).
    const vigentes = new Set(esperados.map((s) => s.archivo));
    const enDisco = (await readdir(carpeta)).filter((a) => ES_AUDIO.test(a));
    for (const archivo of enDisco) {
      if (vigentes.has(archivo)) continue;
      await mkdir(path.join(carpeta, "quitados"), { recursive: true });
      await rename(path.join(carpeta, archivo), path.join(carpeta, "quitados", archivo));
      apartados.push(archivo);
    }
  }
  return { bajados, apartados };
}
