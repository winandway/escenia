// Crea (o pone al día) el agente de ElevenLabs del invitado del Podcast IA y deja el estudio conectado
// (docs/PODCAST.md, C-PODCAST-1). Se corre UNA vez cuando exista la clave con permiso de Agents, y otra vez
// si cambia la configuración. Nunca imprime la clave.
//
// Uso (desde la raíz): estacion/node_modules/.bin/tsx scripts/podcast-agente.ts
//   --prueba            solo muestra la configuración que mandaría, sin tocar nada
//   --sin-clave-en-base no guarda la clave en la base del panel (entonces va como variable
//                       ELEVENLABS_AGENTES_KEY en el panel de YaDominios)
//
// Lee la clave de ~/.config/motor-escenia/elevenlabs-agentes (carpeta 700, archivo 600), las voces del
// banco de estacion/.env (nunca la de Richard) y guarda en la base del panel, por la API de YaDominios: el id
// del agente, las voces y la clave (ajustes podcast_agente_id, podcast_voces, podcast_elevenlabs_clave).
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { configuracionDelAgente, TOPE_MINUTOS_MAXIMO, MAX_SEGUNDOS_CONVERSACION } from "@compartido/podcast";
import { VARIABLE_DE_VOZ } from "@compartido/voces";

const CARPETA = path.join(os.homedir(), ".config", "motor-escenia");
// Gerencia la guardó como «elevenlabs-agents» (7 nov 2026); se acepta también el nombre de la guía.
const RUTA_CLAVE =
  ["elevenlabs-agents", "elevenlabs-agentes"].map((n) => path.join(CARPETA, n)).find((r) => existsSync(r)) ??
  path.join(CARPETA, "elevenlabs-agents");
const RUTA_AGENTE = path.join(CARPETA, "podcast-agente-id");
const API = "https://api.elevenlabs.io";
const prueba = process.argv.includes("--prueba");
const sinClaveEnBase = process.argv.includes("--sin-clave-en-base");

const entorno = Object.fromEntries(
  readFileSync("estacion/.env", "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
);

/** Las voces del banco que puede usar el invitado. La de Richard (su clon) no entra nunca. */
function vocesDelInvitado(): Record<string, string> {
  const richard = entorno[VARIABLE_DE_VOZ.richard] ?? "";
  const voces: Record<string, string> = {};
  for (const voz of ["neutra", "femenina", "venezolana", "paisa"] as const) {
    const id = (entorno[VARIABLE_DE_VOZ[voz]] ?? "").trim();
    if (!id) continue;
    if (richard && id === richard) throw new Error(`La voz «${voz}» es la misma de Richard: no se usa.`);
    voces[voz] = id;
  }
  if (!voces.neutra) throw new Error(`Falta ${VARIABLE_DE_VOZ.neutra} en estacion/.env.`);
  return voces;
}

async function llamar(metodo: string, ruta: string, clave: string, cuerpo?: unknown) {
  const r = await fetch(`${API}${ruta}`, {
    method: metodo,
    headers: { "xi-api-key": clave, "content-type": "application/json" },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  });
  const texto = await r.text();
  let datos: unknown = null;
  try {
    datos = JSON.parse(texto);
  } catch {
    datos = texto;
  }
  return { estado: r.status, ok: r.ok, datos };
}

const guardarPrivado = (ruta: string, valor: string) => {
  mkdirSync(path.dirname(ruta), { recursive: true, mode: 0o700 });
  chmodSync(path.dirname(ruta), 0o700);
  writeFileSync(ruta, `${valor}\n`, { mode: 0o600 });
  chmodSync(ruta, 0o600);
};

async function principal() {
  const voces = vocesDelInvitado();
  const config = configuracionDelAgente({
    vozPorDefecto: voces.neutra!,
    // Con el tope más alto del panel (4 horas) caben 24 conversaciones de 10 minutos.
    conversacionesPorDia: Math.ceil((TOPE_MINUTOS_MAXIMO * 60) / MAX_SEGUNDOS_CONVERSACION),
  });
  if (prueba) {
    console.log(JSON.stringify(config, null, 2));
    console.log(`Voces del invitado: ${Object.keys(voces).join(", ")}`);
    return;
  }
  if (!existsSync(RUTA_CLAVE)) {
    console.error(
      `Falta la clave de ElevenLabs con permiso de Agents en ${RUTA_CLAVE}.\n` +
        "Los permisos que necesita y cómo se crea están en docs/PODCAST.md («La clave»).",
    );
    process.exit(1);
  }
  chmodSync(RUTA_CLAVE, 0o600);
  const clave = readFileSync(RUTA_CLAVE, "utf8").trim();
  if (clave.length < 10) throw new Error(`El archivo ${RUTA_CLAVE} está vacío.`);

  // La base del panel se carga recién aquí: con --prueba no hace falta el token.
  const { db } = await import("./base-remota");
  const { ajuste, guardarAjuste } = await import("@/lib/consultas");
  const { AJUSTE_AGENTE_ID, AJUSTE_CLAVE, AJUSTE_ERROR, AJUSTE_VOCES } = await import("@/lib/podcast");

  let agenteId = (await ajuste(db, AJUSTE_AGENTE_ID)).trim();
  if (!agenteId && existsSync(RUTA_AGENTE)) agenteId = readFileSync(RUTA_AGENTE, "utf8").trim();
  if (agenteId) {
    const r = await llamar("PATCH", `/v1/convai/agents/${encodeURIComponent(agenteId)}`, clave, config);
    if (r.estado === 404) agenteId = "";
    else if (!r.ok)
      throw new Error(`ElevenLabs no actualizó el agente (${r.estado}): ${JSON.stringify(r.datos)}`);
    else console.log(`Agente puesto al día: ${agenteId}`);
  }
  if (!agenteId) {
    const r = await llamar("POST", "/v1/convai/agents/create", clave, config);
    const id = (r.datos as { agent_id?: string } | null)?.agent_id;
    if (!r.ok || !id)
      throw new Error(`ElevenLabs no creó el agente (${r.estado}): ${JSON.stringify(r.datos)}`);
    agenteId = id;
    console.log(`Agente creado: ${agenteId}`);
  }
  guardarPrivado(RUTA_AGENTE, agenteId);

  // La prueba de verdad: la misma llamada que hará el panel en cada conversación.
  const firmada = await llamar(
    "GET",
    `/v1/convai/conversation/get-signed-url?agent_id=${encodeURIComponent(agenteId)}`,
    clave,
  );
  const url = (firmada.datos as { signed_url?: string } | null)?.signed_url ?? "";
  if (!firmada.ok || !url.startsWith("wss://"))
    throw new Error(
      `La clave no puede abrir conversaciones (${firmada.estado}). Revisa el permiso de Agents.`,
    );

  await guardarAjuste(db, AJUSTE_AGENTE_ID, agenteId);
  await guardarAjuste(db, AJUSTE_VOCES, JSON.stringify(voces));
  if (!sinClaveEnBase) await guardarAjuste(db, AJUSTE_CLAVE, clave);
  await guardarAjuste(db, AJUSTE_ERROR, "");
  console.log(
    `Listo: el estudio ya puede conversar. Voces del invitado: ${Object.keys(voces).join(", ")}.` +
      (sinClaveEnBase ? " Falta poner ELEVENLABS_AGENTES_KEY en las variables del panel." : ""),
  );
}

principal().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
