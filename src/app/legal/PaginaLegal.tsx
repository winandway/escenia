// El marco de las páginas públicas de la app de iPhone (privacidad y soporte): cabecera con el selector
// de idioma, el texto y el pie con el crédito de Windoce LLC. En inglés primero (regla de EE. UU.).
import { SelectorIdioma, type IdiomaLegal } from "./SelectorIdioma";

export type Seccion = { titulo: string; parrafos: string[] };

export function PaginaLegal({
  idioma,
  rutas,
  titulo,
  actualizado,
  intro,
  secciones,
}: {
  idioma: IdiomaLegal;
  rutas: Record<IdiomaLegal, string>;
  titulo: string;
  actualizado: string;
  intro: string;
  secciones: Seccion[];
}) {
  return (
    <div lang={idioma} className="min-h-full bg-white text-neutral-900">
      <header className="flex items-center justify-between bg-[#0b0f19] px-4 py-3">
        <a href={idioma === "en" ? "/support" : "/es/support"} className="text-lg font-semibold text-white">
          Escenia
        </a>
        <SelectorIdioma idioma={idioma} rutas={rutas} />
      </header>
      <main className="mx-auto max-w-3xl px-4 py-10 leading-relaxed">
        <h1 className="text-3xl font-semibold">{titulo}</h1>
        <p className="mt-2 text-sm text-neutral-500">{actualizado}</p>
        <p className="mt-6">{intro}</p>
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
      <footer className="border-t border-neutral-200 px-4 py-6 text-center text-xs text-neutral-500">
        © 2026 escenia.sitios.dev | All rights reserved. Developed by{" "}
        <a
          href="https://windoce.com"
          target="_blank"
          rel="noopener noreferrer"
          className="underline-offset-2 hover:text-neutral-800 hover:underline"
        >
          Windoce LLC
        </a>
      </footer>
    </div>
  );
}
