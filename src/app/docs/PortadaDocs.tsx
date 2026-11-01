"use client";
// La portada de Docs: el buscador grande (filtra mientras se escribe) y las guías en tarjetas por sección.
import { useState } from "react";
import { Icono } from "./Icono";
import { buscarGuias, rutaDeGuia, SECCIONES, TEXTOS_DOCS, type IdiomaDocs } from "./guias";

export function PortadaDocs({ idioma }: { idioma: IdiomaDocs }) {
  const t = TEXTOS_DOCS[idioma];
  const [consulta, setConsulta] = useState("");
  const guias = buscarGuias(idioma, consulta);
  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-3xl font-semibold sm:text-4xl">{t.titulo}</h1>
      <p className="mt-2 text-neutral-600">{t.sub}</p>
      <input
        type="search"
        value={consulta}
        onChange={(e) => setConsulta(e.target.value)}
        placeholder={t.buscar}
        aria-label={t.buscar}
        className="mt-6 w-full rounded-xl border border-neutral-300 px-4 py-3.5 text-lg outline-none focus:border-neutral-900 focus:ring-2 focus:ring-amber-400/60"
      />
      {(Object.keys(SECCIONES) as (keyof typeof SECCIONES)[]).map((s) => {
        const deLaSeccion = guias.filter((g) => g.seccion === s);
        if (!deLaSeccion.length) return null;
        const seccion = SECCIONES[s];
        return (
          <section key={s} className="mt-10">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <Icono d={seccion.icono} className="h-5 w-5 text-amber-600" />
              {seccion[idioma]}
            </h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {deLaSeccion.map((g) => (
                <a
                  key={g.slug}
                  href={rutaDeGuia(g, idioma)}
                  className="rounded-xl border border-neutral-200 p-4 transition hover:border-neutral-400 hover:shadow-sm"
                >
                  <p className="font-semibold">{g[idioma].titulo}</p>
                  <p className="mt-1 text-sm text-neutral-600">{g[idioma].resumen}</p>
                </a>
              ))}
            </div>
          </section>
        );
      })}
      {!guias.length && <p className="mt-8 text-neutral-500">{t.sin_resultados}</p>}
    </div>
  );
}
