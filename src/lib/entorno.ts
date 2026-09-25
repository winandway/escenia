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
});

export type Entorno = z.infer<typeof esquemaEntorno>;

type Enlaces = { DB?: unknown; BUCKET?: unknown } & Record<string, unknown>;

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
