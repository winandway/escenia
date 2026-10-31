// Página pública de la app de iPhone (docs/APP-IPHONE.md): la pide Apple y se abre sin sesión.
import { PaginaLegal } from "@/app/legal/PaginaLegal";
import { PRIVACIDAD } from "@/app/legal/textos";

export const metadata = { title: PRIVACIDAD.es.titulo, robots: { index: true, follow: true } };

export default function PaginaPrivacy() {
  return <PaginaLegal idioma="es" rutas={{ en: "/privacy", es: "/es/privacy" }} {...PRIVACIDAD.es} />;
}
