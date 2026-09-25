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
    // La Estación trabaja con sus propias carpetas en la Mac: las rutas armadas son suyas.
    files: ["estacion/**"],
    rules: { "security/detect-non-literal-fs-filename": "off" },
  },
  globalIgnores([
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
  ]),
]);
