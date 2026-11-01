// Todas las páginas de Docs en inglés cuelgan de este marco: la barra izquierda nunca se pierde.
import { MarcoDocs } from "@/app/docs/MarcoDocs";

export default function LayoutDocs({ children }: { children: React.ReactNode }) {
  return <MarcoDocs idioma="en">{children}</MarcoDocs>;
}
