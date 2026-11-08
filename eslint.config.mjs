import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import security from "eslint-plugin-security";
import prettier from "eslint-config-prettier";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  security.configs.recommended,
  prettier,
  {
    rules: {
      // Leemos claves de objetos que ya pasaron por zod: esta regla da falsos positivos en cada una.
      "security/detect-object-injection": "off",
    },
  },
  {
    // Los guiones de Apple leen la llave y las capturas desde carpetas fijas de la Mac y del repositorio.
    files: ["scripts/tiendas/**"],
    rules: { "security/detect-non-literal-fs-filename": "off" },
  },
  {
    // El guion del agente del podcast lee y guarda la clave en una carpeta fija de la Mac (~/.config).
    // Lo mismo los de YouTube (la llave en ~/.config/motor-escenia y los videos en estacion/out).
    files: [
      "scripts/podcast-agente.ts",
      "scripts/podcast-probar-voz.ts",
      "scripts/subir-youtube.ts",
      "scripts/metricas-youtube.ts",
      "scripts/autorizar-youtube.ts",
    ],
    rules: { "security/detect-non-literal-fs-filename": "off" },
  },
  {
    // La Estación trabaja con sus propias carpetas en la Mac: las rutas armadas son suyas.
    files: ["estacion/**"],
    rules: { "security/detect-non-literal-fs-filename": "off" },
  },
  globalIgnores([
    // Las copias de trabajo de otras sesiones (git worktree) viven aquí dentro: no son de esta revisión.
    ".claude/**",
    ".next/**",
    ".open-next/**",
    ".wrangler/**",
    "coverage/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "cloudflare-env.d.ts",
    "estacion/node_modules/**",
    "estacion/out/**",
    "estacion/cache/**",
    "out-deploy/**",
    ".dist-worker/**",
    // La app de iPhone (Expo) tiene su propio lint y sus tipos dentro de movil/.
    "movil/**",
    // Los worklets de audio del invitado del podcast son copias exactas de sus paquetes (C-PODCAST-1).
    "public/podcast/worklets/**",
  ]),
]);
