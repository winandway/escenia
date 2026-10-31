// La app de iPhone entra con la contraseña del panel (o la del revisor de Apple) y recibe su token
// (docs/APP-IPHONE.md, C-APP-IOS-1). Mismo límite de intentos que la pantalla de entrar del panel.
// Sin Turnstile: una app nativa no lo puede mostrar; el escudo es el límite por IP.
import { z } from "zod";
import { crearSesionApp, cuentaDeLaClave, ipDelPedido } from "@/lib/app-sesion";
import { contexto } from "@/lib/entorno";
import {
  anotarIntentoFallido,
  demasiadosIntentos,
  limpiarIntentos,
  VENTANA_INTENTOS_MIN,
} from "@/lib/sesion";

export const dynamic = "force-dynamic";

const esquema = z.object({ clave: z.string().min(1).max(200) });

export async function POST(req: Request) {
  const { env, db } = await contexto();
  const parseo = esquema.safeParse(await req.json().catch(() => null));
  if (!parseo.success)
    return Response.json({ error: "Enter the password.", codigo: "vacia" }, { status: 400 });
  const ip = ipDelPedido(req);
  if (await demasiadosIntentos(db, ip))
    return Response.json(
      { error: `Too many attempts. Wait ${VENTANA_INTENTOS_MIN} minutes and try again.`, codigo: "intentos" },
      { status: 429 },
    );
  const cuenta = await cuentaDeLaClave(db, parseo.data.clave, env.PANEL_CLAVE_HUELLA);
  if (!cuenta) {
    await anotarIntentoFallido(db, ip);
    return Response.json({ error: "That password isn't right.", codigo: "clave" }, { status: 401 });
  }
  await limpiarIntentos(db, ip);
  return Response.json({ token: await crearSesionApp(db, cuenta), cuenta });
}
