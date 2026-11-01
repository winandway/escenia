import type { Metadata } from "next";
import { PaginaGuia } from "@/app/docs/PaginaGuia";
import { GUIAS, guiaPorRuta, rutaDeGuia } from "@/app/docs/guias";

export const dynamicParams = false;
export const generateStaticParams = () => GUIAS.map((g) => ({ seccion: g.seccion, guia: g.slug }));

export async function generateMetadata({
  params,
}: PageProps<"/es/docs/[seccion]/[guia]">): Promise<Metadata> {
  const { seccion, guia } = await params;
  const g = guiaPorRuta(seccion, guia);
  if (!g) return {};
  return {
    title: g.es.titulo,
    description: g.es.resumen,
    robots: { index: true, follow: true },
    alternates: { languages: { en: rutaDeGuia(g, "en"), es: rutaDeGuia(g, "es") } },
  };
}

export default async function Pagina({ params }: PageProps<"/es/docs/[seccion]/[guia]">) {
  const { seccion, guia } = await params;
  return <PaginaGuia idioma="es" seccion={seccion} slug={guia} />;
}
