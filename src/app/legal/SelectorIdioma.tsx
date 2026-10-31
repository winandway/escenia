"use client";
// Selector de idioma estilo Amazon (regla global de Richard): botón «🇺🇸 EN ▾» y una ventanita blanca
// con «Change language», opciones con círculo naranja y una línea gris entre ellas. Se cierra al elegir,
// al tocar fuera o con Escape. El español lleva la bandera de España; el inglés, la de EE. UU.
import { useEffect, useId, useRef, useState } from "react";

export type IdiomaLegal = "en" | "es";
const IDIOMAS = [
  { codigo: "en", bandera: "🇺🇸", nombre: "English" },
  { codigo: "es", bandera: "🇪🇸", nombre: "español" },
] as const;
const TITULO = { en: "Change language", es: "Cambiar idioma" } as const;

export function SelectorIdioma({
  idioma,
  rutas,
}: {
  idioma: IdiomaLegal;
  rutas: Record<IdiomaLegal, string>;
}) {
  const [abierto, setAbierto] = useState(false);
  const caja = useRef<HTMLDivElement>(null);
  const id = useId();
  const actual = IDIOMAS.find((i) => i.codigo === idioma) ?? IDIOMAS[0];

  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: MouseEvent) => {
      if (!caja.current?.contains(e.target as Node)) setAbierto(false);
    };
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && setAbierto(false);
    document.addEventListener("mousedown", fuera);
    document.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("mousedown", fuera);
      document.removeEventListener("keydown", tecla);
    };
  }, [abierto]);

  return (
    <div className="relative" ref={caja}>
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={abierto}
        aria-controls={id}
        aria-label={TITULO[idioma]}
        onClick={() => setAbierto((a) => !a)}
        className={`flex items-center gap-1.5 rounded border px-2 py-1 font-bold text-white ${abierto ? "border-white" : "border-transparent hover:border-white"}`}
      >
        <span aria-hidden="true">{actual.bandera}</span> {actual.codigo.toUpperCase()}
        <span aria-hidden="true" className="text-xs">
          ▾
        </span>
      </button>
      {abierto && (
        <div
          id={id}
          role="dialog"
          aria-label={TITULO[idioma]}
          className="absolute right-0 top-11 z-20 w-56 rounded-lg border border-[#d5d9d9] bg-white px-4 pb-1 pt-3 text-[#101010] shadow-lg"
        >
          <span
            aria-hidden="true"
            className="absolute -top-2 right-5 h-3.5 w-3.5 rotate-45 border-l border-t border-[#d5d9d9] bg-white"
          />
          <p className="mb-1 text-sm">{TITULO[idioma]}</p>
          <div role="radiogroup" aria-label={TITULO[idioma]}>
            {IDIOMAS.map((i, n) => (
              <a
                key={i.codigo}
                role="radio"
                aria-checked={idioma === i.codigo}
                href={rutas[i.codigo]}
                onClick={() => setAbierto(false)}
                className={`flex items-center gap-2.5 py-2.5 ${n > 0 ? "border-t border-[#e7e7e7]" : ""}`}
              >
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${idioma === i.codigo ? "border-[#E47911]" : "border-[#8d9096]"}`}
                >
                  {idioma === i.codigo && <span className="h-2.5 w-2.5 rounded-full bg-[#E47911]" />}
                </span>
                <span aria-hidden="true">{i.bandera}</span>
                {i.nombre} - {i.codigo.toUpperCase()}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
