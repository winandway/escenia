// C-COMERCIAL-4: las props del video con la miniatura que Richard eligió (sin tocar nada más).
// Va aparte de portada-comercial.ts para poder probarla sin la configuración de la Mac.
import path from "node:path";
import type { PropsVideo } from "./remotion/props";

/** Las props del video con la miniatura elegida (la ruta es la de la carpeta pública del trabajo). */
export function propsConPortada(
  props: PropsVideo,
  imagen: { ruta: string; ancho: number; alto: number },
  textos: { titulo: string; frase: string },
): PropsVideo {
  return {
    ...props,
    portada: {
      foto: { ruta: `imagenes/${path.basename(imagen.ruta)}`, ancho: imagen.ancho, alto: imagen.alto },
      nombre: textos.titulo.trim(),
      gancho: textos.frase.trim(),
    },
  };
}
