"use client";
// La barra izquierda de Docs (regla global: nunca se pierde). Secciones con su ícono, la guía abierta
// resaltada y un buscador que filtra mientras se escribe (⌘K o Ctrl+K lo enfoca). En el celular va plegada.
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Icono } from "./Icono";
import { buscarGuias, rutaDeGuia, SECCIONES, TEXTOS_DOCS, type IdiomaDocs } from "./guias";

export function BarraDocs({ idioma }: { idioma: IdiomaDocs }) {
  const t = TEXTOS_DOCS[idioma];
  const ruta = usePathname();
  const [consulta, setConsulta] = useState("");
  const caja = useRef<HTMLInputElement>(null);
  const guias = buscarGuias(idioma, consulta);

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        caja.current?.focus();
      }
    };
    document.addEventListener("keydown", tecla);
    return () => document.removeEventListener("keydown", tecla);
  }, []);

  const lista = (
    <nav aria-label={t.menu} className="mt-4 grid gap-5">
      {(Object.keys(SECCIONES) as (keyof typeof SECCIONES)[]).map((s) => {
        const deLaSeccion = guias.filter((g) => g.seccion === s);
        if (!deLaSeccion.length) return null;
        const seccion = SECCIONES[s];
        return (
          <div key={s}>
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
              <Icono d={seccion.icono} />
              {seccion[idioma]}
            </p>
            <ul className="mt-2 grid gap-0.5">
              {deLaSeccion.map((g) => {
                const href = rutaDeGuia(g, idioma);
                const activa = ruta === href;
                return (
                  <li key={g.slug}>
                    <a
                      href={href}
                      aria-current={activa ? "page" : undefined}
                      className={`block rounded-md px-2.5 py-1.5 text-sm ${activa ? "bg-amber-100 font-semibold text-neutral-900" : "text-neutral-700 hover:bg-neutral-100"}`}
                    >
                      {g[idioma].titulo}
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
      {!guias.length && <p className="text-sm text-neutral-500">{t.sin_resultados}</p>}
    </nav>
  );

  const buscador = (
    <div className="relative">
      <input
        ref={caja}
        type="search"
        value={consulta}
        onChange={(e) => setConsulta(e.target.value)}
        placeholder={t.buscar}
        aria-label={t.buscar}
        className="w-full rounded-lg border border-neutral-300 bg-white py-2 pl-3 pr-12 text-sm outline-none focus:border-neutral-900 focus:ring-2 focus:ring-amber-400/60"
      />
      <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded border border-neutral-300 px-1.5 text-[11px] text-neutral-500">
        ⌘K
      </kbd>
    </div>
  );

  return (
    <aside className="border-b border-neutral-200 bg-neutral-50 px-4 py-4 md:sticky md:top-0 md:h-screen md:w-72 md:shrink-0 md:overflow-y-auto md:border-b-0 md:border-r md:py-6">
      <a href={idioma === "es" ? "/es/docs" : "/docs"} className="font-semibold">
        {t.titulo}
      </a>
      <div className="mt-3">{buscador}</div>
      <details className="mt-1 md:hidden">
        <summary className="cursor-pointer py-2 text-sm font-semibold text-neutral-700">{t.menu}</summary>
        {lista}
      </details>
      <div className="hidden md:block">{lista}</div>
    </aside>
  );
}
