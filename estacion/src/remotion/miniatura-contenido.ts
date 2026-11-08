// La foto y los textos de la miniatura, sin nada de Remotion (C-COMERCIAL-4): así se prueba desde pruebas/
// sin que la compilación del panel tenga que encontrar las fuentes de la plantilla.
import type { PropsVideo } from "./props";

/** Copia de textosMiniatura (compartido/miniatura.ts): la plantilla no puede importar de fuera. */
function textosMiniatura(titulo: string): { nombre: string; gancho: string } {
  const [antes, ...resto] = titulo.split(/[:—–]/);
  const recortar = (s: string, max: number) => {
    const limpio = s.replace(/\s+/g, " ").trim();
    return limpio.length <= max ? limpio : `${limpio.slice(0, max - 1).replace(/\s+\S*$/u, "")}…`;
  };
  return { nombre: recortar(antes ?? titulo, 28), gancho: recortar(resto.join(" "), 60) };
}

/** La foto y los textos de la miniatura: los que eligió Richard en el panel (C-COMERCIAL-4) o, si no
 * eligió nada, la primera foto con cara y los textos sacados del título. */
export function contenidoMiniatura(p: PropsVideo): {
  foto: { ruta: string; ancho: number; alto: number; enfoque: { x: number; y: number } | null } | null;
  nombre: string;
  gancho: string;
} {
  if (p.portada)
    return { foto: { ...p.portada.foto, enfoque: null }, nombre: p.portada.nombre, gancho: p.portada.gancho };
  const fotos = p.escenas.flatMap((e) => [...(e.foto ? [e.foto] : []), ...e.fotos]);
  return { foto: fotos.find((f) => f.enfoque) ?? fotos[0] ?? null, ...textosMiniatura(p.titulo) };
}
