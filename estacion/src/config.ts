// Variables de la Estación, validadas al arrancar.
import { existsSync } from "node:fs";
import path from "node:path";
import { z } from "zod";

const rutaEnv = path.resolve(process.cwd(), ".env");
if (existsSync(rutaEnv)) process.loadEnvFile(rutaEnv);

const esquema = z.object({
  PANEL_URL: z.string().url(),
  ESTACION_SECRETO: z.string().min(24),
  ELEVENLABS_API_KEY: z.string().optional(),
  ELEVENLABS_VOICE_ID: z.string().optional(),
  ELEVENLABS_VOICE_ID_FEMENINA: z.string().optional(),
  ELEVENLABS_MODELO: z.string().default("eleven_multilingual_v2"),
  // Velocidad que se le pide a la voz misma (0.7 a 1.2, lo que admite ElevenLabs). Con 1.1 lee
  // cerca del ritmo objetivo y casi no hay que acelerarla después con ffmpeg (C-VOZ-6).
  ELEVENLABS_VELOCIDAD: z.coerce.number().min(0.7).max(1.2).default(1.1),
  PEXELS_API_KEY: z.string().optional(),
  FAL_KEY: z.string().optional(),
  SERPER_API_KEY: z.string().optional(),
  CARPETA_SALIDA: z.string().default("./out"),
});

const parseo = esquema.safeParse(process.env);
if (!parseo.success) {
  console.error(
    "Faltan variables en estacion/.env:",
    parseo.error.issues.map((i) => i.path.join(".")).join(", "),
  );
  process.exit(1);
}

export const config = {
  ...parseo.data,
  PANEL_URL: parseo.data.PANEL_URL.replace(/\/$/, ""),
  CARPETA_SALIDA: path.resolve(process.cwd(), parseo.data.CARPETA_SALIDA),
  CARPETA_PUBLICA: path.resolve(process.cwd(), "cache/public"),
  CARPETA_CLIPS: path.resolve(process.cwd(), "cache/clips"),
  // Las grabaciones que Richard sube desde el panel (formato Presentador) se bajan aquí.
  CARPETA_GRABACIONES: path.resolve(process.cwd(), "cache/grabaciones"),
  // La biblioteca de imágenes del panel (logos, capturas, PDF de los clientes), por carpetas.
  CARPETA_IMAGENES: path.resolve(process.cwd(), "cache/imagenes"),
  VERSION: "0.1.0",
};
