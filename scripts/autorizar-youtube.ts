// Fase 3 (docs/YOUTUBE.md): el permiso de la Mac para subir a YouTube, a mano. La Estación ya lo hace
// sola cuando aparece el archivo en Descargas (C-YOUTUBE-2, estacion/src/youtube-autorizar.ts); esto
// queda para forzarlo con un archivo concreto.
// Uso (desde la raíz):
//   estacion/node_modules/.bin/tsx scripts/autorizar-youtube.ts ~/Downloads/client_secret_XXXX.json
import { autorizarYouTube, buscarClienteGuardadoODescargado } from "../estacion/src/youtube-autorizar";

async function principal() {
  const archivo = process.argv[2] ?? (await buscarClienteGuardadoODescargado());
  if (!archivo) throw new Error("No hay cliente OAuth de Google en Descargas ni guardado en la Mac.");
  await autorizarYouTube(archivo);
}

principal().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
