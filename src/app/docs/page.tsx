import { PortadaDocs } from "@/app/docs/PortadaDocs";
import { TEXTOS_DOCS } from "@/app/docs/guias";

export const metadata = {
  title: TEXTOS_DOCS.en.titulo,
  description: TEXTOS_DOCS.en.sub,
  robots: { index: true, follow: true },
  alternates: { languages: { en: "/docs", es: "/es/docs" } },
};

export default function Pagina() {
  return <PortadaDocs idioma="en" />;
}
