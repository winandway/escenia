// El mapa del sitio con lo público de Escenia: soporte, privacidad y cada guía de Docs en los dos idiomas.
// El panel no entra: es privado.
import type { MetadataRoute } from "next";
import { GUIAS, rutaDeGuia } from "./docs/guias";
import { SITIO_PUBLICO } from "@/lib/ayuda";

export default function sitemap(): MetadataRoute.Sitemap {
  const rutas = [
    "/docs",
    "/es/docs",
    "/support",
    "/es/support",
    "/privacy",
    "/es/privacy",
    ...GUIAS.flatMap((g) => [rutaDeGuia(g, "en"), rutaDeGuia(g, "es")]),
  ];
  return rutas.map((r) => ({ url: `${SITIO_PUBLICO}${r}`, changeFrequency: "monthly" }));
}
