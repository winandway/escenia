// Genera la huella de la contraseña del panel. Uso: npm run clave
// Pide la contraseña sin mostrarla (dos veces, para evitar errores de tecleo)
// y devuelve el valor para PANEL_CLAVE_HUELLA.
import { webcrypto as crypto } from "node:crypto";

const MINIMO = 12;

function leerOculto(mensaje) {
  return new Promise((resolver, rechazar) => {
    process.stdout.write(mensaje);
    const entrada = process.stdin;
    if (!entrada.isTTY) {
      // Sin terminal (por ejemplo, viene por tubería): se lee una línea normal.
      let datos = "";
      entrada.setEncoding("utf8");
      entrada.on("data", (t) => (datos += t));
      entrada.on("end", () => resolver(datos.split(/\r?\n/)[0] ?? ""));
      return;
    }
    let clave = "";
    entrada.setRawMode(true);
    entrada.resume();
    entrada.setEncoding("utf8");
    const alTeclear = (t) => {
      for (const c of t) {
        if (c === "\r" || c === "\n") {
          entrada.setRawMode(false);
          entrada.pause();
          entrada.removeListener("data", alTeclear);
          process.stdout.write("\n");
          resolver(clave);
          return;
        }
        if (c === "\u0003") {
          entrada.setRawMode(false);
          process.stdout.write("\n");
          rechazar(new Error("Cancelado."));
          return;
        }
        if (c === "\u007f" || c === "\b") {
          clave = clave.slice(0, -1);
          continue;
        }
        clave += c;
      }
    };
    entrada.on("data", alTeclear);
  });
}

const clave = await leerOculto(
  "Contraseña nueva del panel (no se muestra mientras escribes; termina con Enter): ",
);
if (clave.length < MINIMO) {
  console.error(`Usa una contraseña de al menos ${MINIMO} letras.`);
  process.exit(1);
}
if (process.stdin.isTTY) {
  const otraVez = await leerOculto("Escríbela otra vez para confirmar: ");
  if (otraVez !== clave) {
    console.error("No coinciden. Vuelve a correr el comando.");
    process.exit(1);
  }
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
console.log("\nListo. Pega este valor en la casilla PANEL_CLAVE_HUELLA del panel:\n");
console.log(`pbkdf2$100000$${b64(sal)}$${b64(bits)}\n`);
process.exit(0);
