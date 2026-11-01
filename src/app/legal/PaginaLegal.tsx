// Las páginas públicas de texto (privacidad y soporte) dentro del marco público. En soporte, debajo de la
// introducción va el formulario de ayuda (lo que llega en `children`).
import type { ReactNode } from "react";
import { MarcoPublico } from "./MarcoPublico";
import type { IdiomaLegal } from "./SelectorIdioma";

export type Seccion = { titulo: string; parrafos: string[] };

export function PaginaLegal({
  idioma,
  rutas,
  titulo,
  actualizado,
  intro,
  secciones,
  children,
}: {
  idioma: IdiomaLegal;
  rutas: Record<IdiomaLegal, string>;
  titulo: string;
  actualizado: string;
  intro: string;
  secciones: Seccion[];
  children?: ReactNode;
}) {
  return (
    <MarcoPublico idioma={idioma} rutas={rutas}>
      <main className="mx-auto max-w-3xl px-4 py-10 leading-relaxed">
        <h1 className="text-3xl font-semibold">{titulo}</h1>
        <p className="mt-2 text-sm text-neutral-500">{actualizado}</p>
        <p className="mt-6">{intro}</p>
        {children}
        {secciones.map((s) => (
          <section key={s.titulo} className="mt-8">
            <h2 className="text-xl font-semibold">{s.titulo}</h2>
            {s.parrafos.map((p) => (
              <p key={p.slice(0, 40)} className="mt-3">
                {p}
              </p>
            ))}
          </section>
        ))}
      </main>
    </MarcoPublico>
  );
}
