// Conexión a la API de App Store Connect (docs/PUBLICAR-EN-APPLE.md), con la llave de la cuenta de
// Windoce LLC guardada fuera del repositorio en ~/.config/motor-escenia/apple-asc (AuthKey.p8, key-id,
// issuer-id, team-id). Uso como módulo: import { asc } from "./asc.mjs".
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import { join } from "node:path";

export const CARPETA_LLAVE = join(os.homedir(), ".config", "motor-escenia", "apple-asc");
const leerBytesDeLlave = (f) => fs.readFileSync(join(CARPETA_LLAVE, f));
export const leerLlave = (f) => leerBytesDeLlave(f).toString("utf8").trim();
const b64 = (x) => Buffer.from(JSON.stringify(x)).toString("base64url");

export function token() {
  const n = Math.floor(Date.now() / 1000);
  const h = b64({ alg: "ES256", kid: leerLlave("key-id"), typ: "JWT" });
  const p = b64({ iss: leerLlave("issuer-id"), iat: n, exp: n + 900, aud: "appstoreconnect-v1" });
  const s = crypto
    .sign("sha256", Buffer.from(`${h}.${p}`), {
      key: leerBytesDeLlave("AuthKey.p8"),
      dsaEncoding: "ieee-p1363",
    })
    .toString("base64url");
  return `${h}.${p}.${s}`;
}

export async function asc(metodo, ruta, cuerpo) {
  const r = await fetch(`https://api.appstoreconnect.apple.com${ruta}`, {
    method: metodo,
    headers: { authorization: `Bearer ${token()}`, "content-type": "application/json" },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  });
  const texto = await r.text();
  const j = texto ? JSON.parse(texto) : null;
  if (r.status >= 400)
    throw new Error(`${metodo} ${ruta} → ${r.status} ${JSON.stringify(j?.errors?.[0] ?? j)}`);
  return j;
}
