// El marco de las páginas públicas de Escenia (soporte, privacidad, casos de ayuda y Docs): cabecera con
// Docs, Soporte y el selector de idioma, y el pie con el crédito de Windoce LLC. Inglés primero (EE. UU.).
import type { ReactNode } from "react";
import { SelectorIdioma, type IdiomaLegal } from "./SelectorIdioma";

const MENU = {
  en: [
    { href: "/docs", texto: "Docs" },
    { href: "/support", texto: "Support" },
  ],
  es: [
    { href: "/es/docs", texto: "Docs" },
    { href: "/es/support", texto: "Soporte" },
  ],
} as const;

export function MarcoPublico({
  idioma,
  rutas,
  children,
}: {
  idioma: IdiomaLegal;
  rutas?: Record<IdiomaLegal, string>;
  children: ReactNode;
}) {
  return (
    <div lang={idioma} className="flex min-h-full flex-col bg-white text-neutral-900">
      <header className="flex items-center justify-between gap-3 bg-[#0b0f19] px-4 py-3">
        <a href={idioma === "en" ? "/docs" : "/es/docs"} className="text-lg font-semibold text-white">
          Escenia
        </a>
        <nav className="flex items-center gap-1 sm:gap-2">
          {MENU[idioma].map((m) => (
            <a
              key={m.href}
              href={m.href}
              className="rounded px-2 py-1 text-sm font-semibold text-white/80 hover:text-white"
            >
              {m.texto}
            </a>
          ))}
          <SelectorIdioma idioma={idioma} rutas={rutas} />
        </nav>
      </header>
      <div className="flex-1">{children}</div>
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
