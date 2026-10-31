// La app de iPhone (docs/PUBLICAR-EN-APPLE.md): compila con EAS para la App Store y la envía a App Store
// Connect (TestFlight y revisión) sin la contraseña de Apple: usa la llave de la API guardada UNA vez en
// ~/.config/motor-escenia/apple-asc y el token de Expo de ~/.config/motor-escenia/expo-token.
// La primera compilación ya respondió las preguntas de credenciales (quedaron en Expo): esta corre sola.
// Uso (desde la raíz): node scripts/tiendas/compilar-ios.mjs [--solo-enviar]
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { CARPETA_LLAVE, leerLlave } from "./asc.mjs";

const soloEnviar = process.argv.includes("--solo-enviar");
const app = join(process.cwd(), "movil");
for (const f of ["AuthKey.p8", "key-id", "issuer-id", "team-id"])
  if (!existsSync(join(CARPETA_LLAVE, f))) {
    console.error(
      `Falta ${f} en ${CARPETA_LLAVE}: la llave de la API de App Store Connect no está guardada.`,
    );
    process.exit(2);
  }
const env = {
  ...process.env,
  EXPO_TOKEN: readFileSync(join(homedir(), ".config", "motor-escenia", "expo-token"), "utf8").trim(),
  // Solo la carpeta de la app viaja a Expo, no el repositorio entero.
  EAS_NO_VCS: "1",
  EXPO_ASC_API_KEY_PATH: join(CARPETA_LLAVE, "AuthKey.p8"),
  EXPO_ASC_KEY_ID: leerLlave("key-id"),
  EXPO_ASC_ISSUER_ID: leerLlave("issuer-id"),
  EXPO_APPLE_TEAM_ID: leerLlave("team-id"),
  EXPO_APPLE_TEAM_TYPE: "COMPANY_OR_ORGANIZATION",
  EXPO_NO_CAPABILITY_SYNC: "1",
};
if (!soloEnviar)
  execFileSync(
    "npx",
    ["eas-cli", "build", "--platform", "ios", "--profile", "production", "--non-interactive", "--wait"],
    { cwd: app, env, stdio: "inherit" },
  );
// La llave va en eas.json SOLO durante el envío y el archivo vuelve a quedar exactamente como estaba
// (los identificadores de la llave nunca entran al repositorio; el escáner de secretos lo bloquearía).
const ruta = join(app, "eas.json");
const original = readFileSync(ruta, "utf8");
const config = JSON.parse(original);
Object.assign(config.submit.production.ios, {
  ascApiKeyPath: join(CARPETA_LLAVE, "AuthKey.p8"),
  ascApiKeyIssuerId: leerLlave("issuer-id"),
  ascApiKeyId: leerLlave("key-id"),
});
try {
  writeFileSync(ruta, JSON.stringify(config, null, 2));
  execFileSync(
    "npx",
    ["eas-cli", "submit", "--platform", "ios", "--latest", "--profile", "production", "--non-interactive"],
    { cwd: app, env, stdio: "inherit" },
  );
} finally {
  writeFileSync(ruta, original);
}
console.log("\nListo: la compilación quedó en App Store Connect. Comprueba que Apple la aceptó:");
console.log("node scripts/tiendas/estado-ios.mjs");
