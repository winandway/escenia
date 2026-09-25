"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { ipDelCliente } from "@/lib/auth";
import { claveCorrecta } from "@/lib/clave";
import { contexto } from "@/lib/entorno";
import {
  anotarIntentoFallido,
  cerrarSesion,
  COOKIE_SESION,
  crearSesion,
  demasiadosIntentos,
  limpiarIntentos,
  MAX_INTENTOS,
  VENTANA_INTENTOS_MIN,
} from "@/lib/sesion";
import { turnstileOk } from "@/lib/turnstile";

const esquema = z.object({
  clave: z.string().min(1).max(200),
  turnstile: z.string().max(4000).optional(),
});

export type EstadoEntrada = { error: string };

export async function entrar(_previo: EstadoEntrada, datos: FormData): Promise<EstadoEntrada> {
  const parseo = esquema.safeParse({
    clave: datos.get("clave"),
    turnstile: datos.get("cf-turnstile-response") ?? undefined,
  });
  if (!parseo.success) return { error: "Escribe la contraseña." };

  const { env, db } = await contexto();
  const ip = await ipDelCliente();

  if (await demasiadosIntentos(db, ip)) {
    return {
      error: `Demasiados intentos (${MAX_INTENTOS}). Espera ${VENTANA_INTENTOS_MIN} minutos y vuelve a probar.`,
    };
  }

  const escudo = await turnstileOk(parseo.data.turnstile, env.TURNSTILE_SECRET_KEY, ip);
  if (!escudo.ok)
    return { error: "No pudimos comprobar que eres una persona. Recarga la página e intenta de nuevo." };

  if (!(await claveCorrecta(parseo.data.clave, env.PANEL_CLAVE_HUELLA))) {
    await anotarIntentoFallido(db, ip);
    return { error: "La contraseña no es correcta." };
  }

  await limpiarIntentos(db, ip);
  const { token, expira } = await crearSesion(db);
  const jar = await cookies();
  jar.set(COOKIE_SESION, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expira,
  });
  redirect("/");
}

export async function salir(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(COOKIE_SESION)?.value;
  try {
    const { db } = await contexto();
    await cerrarSesion(db, token);
  } finally {
    // Aunque el servidor falle, la persona sale igual.
    jar.delete(COOKIE_SESION);
  }
  redirect("/entrar");
}
