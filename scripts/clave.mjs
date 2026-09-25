// Genera la huella de la contraseña del panel. Uso: npm run clave
// Pide la contraseña sin mostrarla y devuelve el valor para PANEL_CLAVE_HUELLA.
import { createInterface } from "node:readline";
import { webcrypto as crypto } from "node:crypto";

const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
const pregunta = (t) => new Promise((res) => rl.question(t, res));
process.stdout.write("Contraseña nueva del panel (no se muestra): ");
if (process.stdin.isTTY) process.stdin.setRawMode(true);
const clave = await pregunta("");
if (process.stdin.isTTY) process.stdin.setRawMode(false);
rl.close();
process.stdout.write("\n");
if (!clave || clave.length < 12) {
  console.error("Usa una contraseña de al menos 12 letras.");
  process.exit(1);
}
const enc = new TextEncoder();
const sal = crypto.getRandomValues(new Uint8Array(16));
const llave = await crypto.subtle.importKey("raw", enc.encode(clave), "PBKDF2", false, ["deriveBits"]);
const bits = new Uint8Array(
  await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: sal, iterations: 100000 },
    llave,
    256,
  ),
);
const b64 = (b) => Buffer.from(b).toString("base64url");
console.log(`\nPANEL_CLAVE_HUELLA=pbkdf2$100000$${b64(sal)}$${b64(bits)}\n`);
