// Sesión del panel del lado del servidor.
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { contexto } from "./entorno";
import { COOKIE_SESION, sesionValida } from "./sesion";

export async function haySesion(): Promise<boolean> {
  const jar = await cookies();
  const token = jar.get(COOKIE_SESION)?.value;
  if (!token) return false;
  const { db } = await contexto();
  return sesionValida(db, token);
}

/** Para páginas y acciones: si no hay sesión, manda a entrar. */
export async function exigirSesion(): Promise<void> {
  if (!(await haySesion())) redirect("/entrar");
}

export async function ipDelCliente(): Promise<string> {
  const h = await headers();
  return h.get("cf-connecting-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "desconocida";
}
