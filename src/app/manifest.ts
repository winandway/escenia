import type { MetadataRoute } from "next";

/** Lo que el teléfono necesita para instalar el panel como una app (C-APP-1). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Escenia",
    short_name: "Escenia",
    description: "Motor de videos de Windoce: guiones, producción y calendario de publicaciones.",
    lang: "es",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#0b0f19",
    theme_color: "#0b0f19",
    icons: [
      { src: "/iconos/icono-192.png", sizes: "192x192", type: "image/png" },
      { src: "/iconos/icono-512.png", sizes: "512x512", type: "image/png" },
      { src: "/iconos/icono-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Calendario", url: "/calendario" },
      { name: "Nuevo video", url: "/nuevo" },
      { name: "Estación", url: "/trabajos" },
    ],
  };
}
