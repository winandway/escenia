// Avisos al iPhone (docs/APP-IPHONE.md, C-APP-IOS-4): cuando la Mac entrega un video, cada iPhone de la
// cuenta de Richard recibe «Tu video está listo» con el nombre del proyecto; al tocarlo, la app abre ese
// chat. La Mac firma directo con la llave de avisos de Apple (APNs) guardada en
// ~/.config/motor-escenia/apple-apns: la llave nunca sube a la nube. Un aviso que falla no tumba nada.
import { createPrivateKey, sign } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import http2 from "node:http2";
import { homedir } from "node:os";
import path from "node:path";

const CARPETA_APNS = path.join(homedir(), ".config", "motor-escenia", "apple-apns");
const CARPETA_ASC = path.join(homedir(), ".config", "motor-escenia", "apple-asc");
export const TEMA = "com.windoce.escenia";
const SERVIDOR = "https://api.push.apple.com";

const b64url = (b: Buffer | string) => Buffer.from(b).toString("base64url");

/** El permiso firmado que pide Apple (ES256, vale una hora; se rehace cada 50 minutos). */
export function firmaApns(
  llavePem: string,
  keyId: string,
  teamId: string,
  ahora = Math.floor(Date.now() / 1000),
): string {
  const cabeza = b64url(JSON.stringify({ alg: "ES256", kid: keyId }));
  const cuerpo = b64url(JSON.stringify({ iss: teamId, iat: ahora }));
  const firma = sign("sha256", Buffer.from(`${cabeza}.${cuerpo}`), {
    key: createPrivateKey(llavePem),
    dsaEncoding: "ieee-p1363",
  });
  return `${cabeza}.${cuerpo}.${b64url(firma)}`;
}

/** Lo que dice el aviso, en el idioma de cada teléfono. */
export function textoDelAviso(idioma: "en" | "es", titulo: string): { title: string; body: string } {
  const proyecto = /^Encargo (\d+)$/.exec(titulo)?.[1];
  const nombre = proyecto ? (idioma === "en" ? `Project ${proyecto}` : `Proyecto ${proyecto}`) : titulo;
  return idioma === "en"
    ? {
        title: "Your video is ready",
        body: nombre ? `${nombre}: open it to watch, save or share.` : "Open Escenia to watch it.",
      }
    : {
        title: "Tu video está listo",
        body: nombre ? `${nombre}: ábrelo para verlo, guardarlo o compartirlo.` : "Abre Escenia para verlo.",
      };
}

/** Lo que viaja a Apple: el texto en «aps» y el proyecto en «body» (ahí lo lee la app al tocar el aviso). */
export const cargaDelAviso = (alerta: { title: string; body: string }, encargoId: number | null) => ({
  aps: { alert: alerta, sound: "default" },
  body: { encargoId },
});

let firmaGuardada: { valor: string; hecha: number } | null = null;
function firmaActual(): string {
  if (firmaGuardada && Date.now() - firmaGuardada.hecha < 50 * 60_000) return firmaGuardada.valor;
  const archivo = readdirSync(CARPETA_APNS).find((f) => f.endsWith(".p8"));
  if (!archivo) throw new Error(`No está la llave de avisos (.p8) en ${CARPETA_APNS}`);
  const keyId = readFileSync(path.join(CARPETA_APNS, "key-id"), "utf8").trim();
  const teamId = readFileSync(path.join(CARPETA_ASC, "team-id"), "utf8").trim();
  firmaGuardada = {
    valor: firmaApns(readFileSync(path.join(CARPETA_APNS, archivo), "utf8"), keyId, teamId),
    hecha: Date.now(),
  };
  return firmaGuardada.valor;
}

/** Un aviso a un iPhone. Devuelve el estado de Apple (200 = entregado; 410 = esa dirección ya no sirve). */
export function enviarAviso(
  token: string,
  carga: object,
  servidor = SERVIDOR,
): Promise<{ estado: number; motivo: string }> {
  return new Promise((ok) => {
    const cliente = http2.connect(servidor);
    cliente.on("error", (e) => ok({ estado: 0, motivo: e.message }));
    const pedido = cliente.request({
      ":method": "POST",
      ":path": `/3/device/${token}`,
      authorization: `bearer ${firmaActual()}`,
      "apns-topic": TEMA,
      "apns-push-type": "alert",
      "apns-priority": "10",
      "content-type": "application/json",
    });
    let estado = 0;
    let cuerpo = "";
    pedido.on("response", (h) => (estado = Number(h[":status"] ?? 0)));
    pedido.on("data", (d: Buffer) => (cuerpo += d.toString()));
    pedido.on("end", () => {
      cliente.close();
      ok({ estado, motivo: cuerpo ? ((JSON.parse(cuerpo) as { reason?: string }).reason ?? cuerpo) : "" });
    });
    pedido.on("error", (e) => {
      cliente.close();
      ok({ estado: 0, motivo: e.message });
    });
    pedido.end(JSON.stringify(carga));
  });
}

async function panel(ruta: string, metodo: "GET" | "DELETE", cuerpo?: unknown): Promise<unknown> {
  // La configuración se carga aquí y no arriba: así las pruebas leen este archivo sin estacion/.env.
  const { config } = await import("./config");
  const r = await fetch(`${config.PANEL_URL}${ruta}`, {
    method: metodo,
    headers: { authorization: `Bearer ${config.ESTACION_SECRETO}`, "content-type": "application/json" },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  });
  return r.json();
}

/** Avisa a los iPhone que un video quedó listo. Nunca lanza: un aviso que falla no tumba la entrega. */
export async function avisarVideoListo(de: { trabajo?: number; publicidad?: number }): Promise<number> {
  try {
    const consulta = de.trabajo ? `trabajo=${de.trabajo}` : `publicidad=${de.publicidad ?? 0}`;
    const r = (await panel(`/datos/estacion/avisos?${consulta}`, "GET")) as {
      telefonos?: { token: string; idioma: "en" | "es" }[];
      encargoId?: number | null;
      titulo?: string;
    };
    let entregados = 0;
    for (const t of r.telefonos ?? []) {
      const alerta = textoDelAviso(t.idioma, r.titulo ?? "");
      // Los datos van en «body»: es donde la app de Expo los lee en un aviso remoto.
      const res = await enviarAviso(t.token, cargaDelAviso(alerta, r.encargoId ?? null));
      if (res.estado === 200) entregados++;
      else if (res.estado === 410 || res.motivo === "BadDeviceToken" || res.motivo === "Unregistered")
        await panel("/datos/estacion/avisos", "DELETE", { token: t.token });
      else console.warn(`[avisos] Apple respondió ${res.estado} ${res.motivo}`);
    }
    return entregados;
  } catch (e) {
    console.warn(`[avisos] no se pudo avisar al iPhone: ${e instanceof Error ? e.message : e}`);
    return 0;
  }
}
