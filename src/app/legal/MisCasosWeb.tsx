"use client";
// «Tus casos»: los casos abiertos desde este navegador, con su estado. No se muestra nada si no hay.
import { useEffect, useState } from "react";
import { leerCasosLocales } from "./casos-locales";
import type { IdiomaLegal } from "./SelectorIdioma";
import {
  colorDeEstado,
  etiquetaDeEstado,
  rutaDelCaso,
  TEXTOS_AYUDA,
  type EstadoCasoWeb,
} from "./textos-ayuda";

type Caso = { codigo: string; numero: string; asunto: string; estado: EstadoCasoWeb };

export function MisCasosWeb({ idioma }: { idioma: IdiomaLegal }) {
  const t = TEXTOS_AYUDA[idioma];
  const [casos, setCasos] = useState<Caso[]>([]);

  useEffect(() => {
    const codigos = leerCasosLocales();
    if (!codigos.length) return;
    fetch(`/datos/ayuda/casos?codigos=${codigos.join(",")}`)
      .then((r) => (r.ok ? (r.json() as Promise<{ casos: Caso[] }>) : { casos: [] }))
      .then((j) => setCasos(j.casos))
      .catch(() => undefined);
  }, []);

  if (!casos.length) return null;
  return (
    <div className="mt-6 border-t border-neutral-200 pt-5">
      <h3 className="font-semibold">{t.mis_casos}</h3>
      <p className="text-sm text-neutral-500">{t.mis_casos_sub}</p>
      <ul className="mt-3 grid gap-2">
        {casos.map((c) => (
          <li key={c.codigo}>
            <a
              href={rutaDelCaso(idioma, c.codigo)}
              className="flex flex-wrap items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 hover:border-neutral-400"
            >
              <span className="font-mono text-sm text-neutral-500">{c.numero}</span>
              <span className="min-w-0 flex-1 truncate font-medium">{c.asunto}</span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${colorDeEstado(c.estado)}`}>
                {etiquetaDeEstado(idioma, c.estado)}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
