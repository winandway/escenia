// Variables de entorno validadas. En YaDominios Cloud llegan por env.*;
// en local, por .dev.vars (wrangler) o .env.local.
import { z } from "zod";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { baseDesdeD1, type BaseDatos } from "./db";

const esquemaEntorno = z.object({
  // Huella PBKDF2 de la contraseña del panel (`npm run clave`).
  PANEL_CLAVE_HUELLA: z.string().min(20),
  // Secreto que usa la Estación (la Mac) para hablar con /datos/estacion/*.
  ESTACION_SECRETO: z.string().min(24),
  ANTHROPIC_API_KEY: z.string().min(10).optional(),
  TURNSTILE_SITE_KEY: z.string().optional(),
  TURNSTILE_SECRET_KEY: z.string().optional(),
  // La puerta del gerente de correo (C-GERENTE-1). Sin ella vale la huella guardada en la base.
  GERENTE_SECRETO: z.string().min(32).optional(),
  // El token del sitio para mandar correos (API de YaDominios). Sin él vale el ajuste correo_token.
  YAD_TOKEN: z.string().min(10).optional(),
  // El invitado del Podcast IA (docs/PODCAST.md): la clave de ElevenLabs con permiso de Agents y el id del
  // agente. Sin ellas valen las que cargó el script en la base (ajustes podcast_elevenlabs_clave y
  // podcast_agente_id). Nunca llegan al navegador.
  ELEVENLABS_AGENTES_KEY: z.string().min(10).optional(),
  ELEVENLABS_AGENTE_ID: z.string().min(5).optional(),
});

export type Entorno = z.infer<typeof esquemaEntorno>;

type Enlaces = { DB?: unknown; BUCKET?: unknown } & Record<string, unknown>;

/** Nombres de las variables obligatorias que faltan en el panel (sin lanzar error). */
export async function variablesFaltantes(): Promise<string[]> {
  const { env } = await getCloudflareContext({ async: true });
  const parseo = esquemaEntorno.safeParse(env as unknown as Enlaces);
  if (parseo.success) return [];
  return [...new Set(parseo.error.issues.map((i) => String(i.path[0] ?? "")))].filter(Boolean);
}

export async function contexto(): Promise<{ env: Entorno; db: BaseDatos; bucket: R2Bucket | null }> {
  const { env } = await getCloudflareContext({ async: true });
  const enlaces = env as unknown as Enlaces;
  const parseo = esquemaEntorno.safeParse(enlaces);
  if (!parseo.success) {
    const faltan = parseo.error.issues.map((i) => i.path.join(".")).join(", ");
    throw new Error(`Faltan variables de entorno en el panel: ${faltan}`);
  }
  if (!enlaces.DB) {
    throw new Error("La base de datos (DB) no está disponible: el sitio necesita un plan con base de datos.");
  }
  return {
    env: parseo.data,
    db: baseDesdeD1(enlaces.DB as Parameters<typeof baseDesdeD1>[0]),
    bucket: (enlaces.BUCKET as R2Bucket | undefined) ?? null,
  };
}
