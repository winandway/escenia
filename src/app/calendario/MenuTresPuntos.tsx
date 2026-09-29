"use client";

import { useState } from "react";

/**
 * Lo que borra va SIEMPRE dentro de los tres puntos y pide confirmación
 * (regla global): nunca un botón de quitar a la vista.
 */
export function MenuTresPuntos({
  accion,
  ocultos,
  etiqueta,
  pregunta,
  confirmar,
}: {
  accion: (datos: FormData) => Promise<void>;
  ocultos: Record<string, string | number>;
  etiqueta: string;
  pregunta: string;
  confirmar: string;
}) {
  const [paso, setPaso] = useState<"cerrado" | "menu" | "confirmar">("cerrado");
  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Más opciones"
        aria-expanded={paso !== "cerrado"}
        onClick={() => setPaso(paso === "cerrado" ? "menu" : "cerrado")}
        className="rounded-md px-2 py-1 text-lg leading-none text-neutral-400 hover:bg-neutral-800 hover:text-white"
      >
        ⋮
      </button>
      {paso !== "cerrado" && (
        <div className="absolute right-0 z-10 mt-1 w-64 rounded-md border border-neutral-700 bg-neutral-900 p-2 text-sm shadow-lg">
          {paso === "menu" ? (
            <button
              type="button"
              onClick={() => setPaso("confirmar")}
              className="w-full rounded px-2 py-1.5 text-left text-red-300 hover:bg-neutral-800"
            >
              {etiqueta}
            </button>
          ) : (
            <form action={accion} className="space-y-2 p-1">
              {Object.entries(ocultos).map(([k, v]) => (
                <input key={k} type="hidden" name={k} value={String(v)} />
              ))}
              <p className="text-neutral-300">{pregunta}</p>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="rounded-md bg-red-600 px-3 py-1.5 font-medium text-white hover:bg-red-500"
                >
                  {confirmar}
                </button>
                <button type="button" onClick={() => setPaso("cerrado")} className="boton-suave px-3 py-1.5">
                  Cancelar
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
