"use client";

import { useState } from "react";
import {
  NOMBRE_PLATAFORMA,
  type EntradaCalendario,
  type Momento,
  type Pieza,
  type Plataforma,
  type ReglasCalendario,
} from "@compartido/calendario";
import type { Canal } from "@compartido/tematicas";
import { SelectorHueco } from "./SelectorHueco";

type Props = {
  /** La pieza que se va a publicar también en otra red. */
  base: { guion_id: number | null; pieza: Pieza; indice: number; titulo: string; canal: Canal };
  /** Redes donde esta pieza todavía no está. */
  faltantes: Plataforma[];
  entradas: EntradaCalendario[];
  reglas: ReglasCalendario;
  hoy: Momento;
};

/** «Publicar también en Facebook / Instagram / TikTok»: se elige la red y después el día y la hora. */
export function PublicarTambien({ base, faltantes, entradas, reglas, hoy }: Props) {
  const [elegida, setElegida] = useState<Plataforma | null>(null);
  if (faltantes.length === 0) return null;
  return (
    <div className="text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-neutral-400">Publicar también en:</span>
        {faltantes.map((p) => (
          <button
            key={p}
            type="button"
            aria-pressed={elegida === p}
            onClick={() => setElegida(elegida === p ? null : p)}
            className={`rounded-full border px-3 py-1 text-xs font-medium ${
              elegida === p
                ? "border-amber-500 bg-amber-500 text-neutral-950"
                : "border-neutral-700 text-neutral-200 hover:bg-neutral-800"
            }`}
          >
            {NOMBRE_PLATAFORMA[p]}
          </button>
        ))}
      </div>
      {elegida && (
        <div className="mt-3 rounded-md border border-neutral-800 p-3">
          <p className="mb-3 text-neutral-300">
            ¿Cuándo sale en <strong>{NOMBRE_PLATAFORMA[elegida]}</strong>?
          </p>
          <SelectorHueco
            key={elegida}
            modo="agendar"
            ocultos={{
              guion_id: base.guion_id ?? "",
              pieza: base.pieza,
              indice: base.indice,
              titulo: base.titulo,
              canal: base.canal,
              plataforma: elegida,
            }}
            pedido={{ canal: base.canal, plataforma: elegida, pieza: base.pieza, guion_id: base.guion_id }}
            entradas={entradas}
            reglas={reglas}
            hoy={hoy}
          />
        </div>
      )}
    </div>
  );
}
