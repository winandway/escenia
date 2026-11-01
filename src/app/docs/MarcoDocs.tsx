// El marco de Docs: el marco público con la barra izquierda fija y el contenido a la derecha. Lo usan
// los dos layouts (inglés y español), así la barra está en TODAS las páginas de Docs.
import type { ReactNode } from "react";
import { MarcoPublico } from "@/app/legal/MarcoPublico";
import { BarraDocs } from "./BarraDocs";
import type { IdiomaDocs } from "./guias";

export function MarcoDocs({ idioma, children }: { idioma: IdiomaDocs; children: ReactNode }) {
  return (
    <MarcoPublico idioma={idioma}>
      <div className="md:flex">
        <BarraDocs idioma={idioma} />
        <main className="min-w-0 flex-1 px-4 py-8 leading-relaxed md:px-10">{children}</main>
      </div>
    </MarcoPublico>
  );
}
