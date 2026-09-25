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
  ELEVENLABS_MODELO: z.string().default("eleven_multilingual_v2"),
  PEXELS_API_KEY: z.string().optional(),
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
  VERSION: "0.1.0",
};
