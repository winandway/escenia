// Chequeo rápido: sin cookie de sesión no se entra a ninguna pantalla del panel.
// La comprobación de verdad (que la sesión exista en la base) la hace cada página.
import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_SESION } from "@/lib/sesion";

// Lo que el teléfono pide SIN sesión para instalar la app (C-APP-1).
export const RUTAS_DE_LA_APP = ["/manifest.webmanifest", "/sw.js", "/sin-conexion"];
// Las páginas públicas que pide Apple para la app de iPhone (C-APP-IOS-1): privacidad y soporte.
export const RUTAS_PUBLICAS = ["/privacy", "/es/privacy", "/support", "/es/support", "/sitemap.xml"];
// Lo público que cuelga de una carpeta: Docs, cada caso de ayuda por su enlace (C-AYUDA-1) y las capturas
// de las guías.
export const CARPETAS_PUBLICAS = ["/docs", "/es/docs", "/support/case", "/es/support/case", "/capturas"];
const enCarpetaPublica = (ruta: string) =>
  CARPETAS_PUBLICAS.some((c) => ruta === c || ruta.startsWith(`${c}/`));

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const publico =
    pathname === "/entrar" ||
    pathname.startsWith("/datos/") ||
    pathname.startsWith("/iconos/") ||
    pathname.startsWith("/muestras/") ||
    RUTAS_DE_LA_APP.includes(pathname) ||
    RUTAS_PUBLICAS.includes(pathname) ||
    enCarpetaPublica(pathname);
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
