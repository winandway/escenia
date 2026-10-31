// ¿Apple aceptó la compilación? Expo dice «subida» aunque Apple la rechace después: la verdad está en
// /v1/apps/<id>/buildUploads (COMPLETE o FAILED con su error) y en el estado de cada compilación.
// Uso (desde la raíz): node scripts/tiendas/estado-ios.mjs
import { asc } from "./asc.mjs";

export const APP_ID = "6829275493";

const subidas = (await asc("GET", `/v1/apps/${APP_ID}/buildUploads?limit=5`).catch(() => ({ data: [] })))
  .data;
for (const s of subidas) {
  const a = s.attributes;
  const errores = (a.state?.errors ?? []).map((e) => `${e.code}: ${e.description}`).join(" | ");
  console.log(
    `subida ${a.cfBundleShortVersionString} (${a.cfBundleVersion}): ${a.state?.state ?? "?"} ${errores}`,
  );
}
const builds = (await asc("GET", `/v1/builds?filter[app]=${APP_ID}&sort=-uploadedDate&limit=5`)).data;
for (const b of builds)
  console.log(
    `compilación ${b.attributes.version}: ${b.attributes.processingState} (subida ${b.attributes.uploadedDate})`,
  );
if (!subidas.length && !builds.length) console.log("Apple todavía no muestra ninguna compilación.");
