// La cuenta del revisor de Apple (docs/APP-IPHONE.md, C-APP-IOS-1): crea su contraseña UNA vez, la
// guarda fuera del repositorio en ~/.config/motor-escenia/revisor-apple (archivo 600) y carga en la base
// en vivo solo su huella (ajuste «app_demo_huella»). Si ya existe, reutiliza la misma.
// Uso (desde la raíz): estacion/node_modules/.bin/tsx scripts/tiendas/clave-revisor.ts
import { chmodSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { AJUSTE_HUELLA_DEMO } from "@/lib/app-sesion";
import { huellaDeClave } from "@/lib/clave";
import { db } from "../base-remota";

const ARCHIVO = join(homedir(), ".config", "motor-escenia", "revisor-apple");

async function principal() {
  let clave = existsSync(ARCHIVO) ? readFileSync(ARCHIVO, "utf8").trim() : "";
  if (!clave) {
    const letras = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
    const azar = crypto.getRandomValues(new Uint8Array(14));
    clave = "Review-" + Array.from(azar, (b) => letras[b % letras.length]).join("");
    writeFileSync(ARCHIVO, clave + "\n", { mode: 0o600 });
    chmodSync(ARCHIVO, 0o600);
  }
  // «ajustes» no tiene columna id: se pide RETURNING clave (la base remota agrega «RETURNING id» a los INSERT).
  await db.todos(
    "INSERT INTO ajustes (clave, valor) VALUES (?, ?) ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor RETURNING clave",
    [AJUSTE_HUELLA_DEMO, await huellaDeClave(clave)],
  );
  console.log(`Listo: la huella del revisor quedó en la base. La contraseña está en ${ARCHIVO}.`);
}

principal().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
