// Chequeo rápido: sin cookie de sesión no se entra a ninguna pantalla del panel.
// La comprobación de verdad (que la sesión exista en la base) la hace cada página.
import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_SESION } from "@/lib/sesion";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const publico = pathname === "/entrar" || pathname.startsWith("/datos/");
  if (publico) return NextResponse.next();
  if (!request.cookies.get(COOKIE_SESION)?.value) {
    const destino = new URL("/entrar", request.url);
    return NextResponse.redirect(destino);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/|icon|apple-icon|favicon).*)"],
};
