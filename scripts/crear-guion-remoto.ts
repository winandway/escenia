// Lo mismo que «Nuevo video» en el panel, desde la Mac: crea un tema y le pide el
// guion a la IA. Queda en BORRADOR: Richard lo lee, escribe su opinión y lo aprueba.
// Cuesta lo que un guion (unos 10 centavos) y respeta el tope de gasto del día.
// Uso (desde la raíz):
//   estacion/node_modules/.bin/tsx scripts/crear-guion-remoto.ts < tema.json
// El tema entra por la entrada estándar, en JSON:
//   { "titulo", "contexto", "tematica_id", "url_fuente"?, "producto_id"?, "voz"? }
import { readFileSync } from "node:fs";
import { text } from "node:stream/consumers";

// Las claves de la Estación (el secreto y la dirección del panel) viven en estacion/.env.
const entorno = Object.fromEntries(
  readFileSync("estacion/.env", "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
);
const config = {
  PANEL_URL: String(entorno.PANEL_URL ?? "").replace(/\/$/, ""),
  ESTACION_SECRETO: String(entorno.ESTACION_SECRETO ?? ""),
};

async function principal() {
  const crudo = (await text(process.stdin)).trim();
  if (!crudo) throw new Error("Uso: crear-guion-remoto.ts < tema.json");
  if (!config.PANEL_URL || !config.ESTACION_SECRETO)
    throw new Error("Faltan PANEL_URL o ESTACION_SECRETO en estacion/.env.");
  const tema = JSON.parse(crudo) as Record<string, unknown>;
  const r = await fetch(`${config.PANEL_URL}/datos/estacion/guiones`, {
    method: "POST",
    headers: { authorization: `Bearer ${config.ESTACION_SECRETO}`, "content-type": "application/json" },
    body: JSON.stringify(tema),
    signal: AbortSignal.timeout(240_000),
  });
  const texto = await r.text();
  if (!r.ok) throw new Error(`El panel respondió ${r.status}: ${texto.slice(0, 400)}`);
  const datos = JSON.parse(texto) as { guion_id: number };
  console.log(`Guion ${datos.guion_id} creado (borrador).`);
}

principal().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
