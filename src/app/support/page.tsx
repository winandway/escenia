// Página pública de la app de iPhone (docs/APP-IPHONE.md): la pide Apple y se abre sin sesión.
import { PaginaLegal } from "@/app/legal/PaginaLegal";
import { SOPORTE } from "@/app/legal/textos";

export const metadata = { title: SOPORTE.en.titulo, robots: { index: true, follow: true } };

export default function PaginaSupport() {
  return <PaginaLegal idioma="en" rutas={{ en: "/support", es: "/es/support" }} {...SOPORTE.en} />;
}
