"use client";

import { useActionState } from "react";
import {
  cuando,
  type EntradaCalendario,
  type Momento,
  type PiezaPendiente,
  type Plataforma,
  type ReglasCalendario,
} from "@compartido/calendario";
import { NOMBRE_CANAL } from "@compartido/tematicas";
import { agendarPieza, quitarDeLaLista, type EstadoForm } from "./acciones";
import { MenuTresPuntos } from "./MenuTresPuntos";
import { Miniatura } from "./Miniatura";
import { SelectorHueco } from "./SelectorHueco";

type Props = {
  pieza: PiezaPendiente;
  plataforma: Plataforma;
  hueco: Momento | null;
  entradas: EntradaCalendario[];
  reglas: ReglasCalendario;
  hoy: Momento;
  miniatura: string | null;
};

export function TarjetaPendiente({ pieza, plataforma, hueco, entradas, reglas, hoy, miniatura }: Props) {
  const [estado, accion, pendiente] = useActionState<EstadoForm, FormData>(agendarPieza, {
    error: "",
    ok: "",
  });
  const ocultos = {
    guion_id: pieza.guion_id,
    pieza: pieza.pieza,
    indice: pieza.indice,
    titulo: pieza.titulo,
    canal: pieza.canal,
    plataforma,
  };
  return (
    <li className="tarjeta min-w-0 text-sm">
      <div className="flex items-start gap-2">
        <div className="flex flex-wrap gap-1.5">
          <span className="chip bg-amber-500/15 text-amber-300">
            {pieza.pieza === "short" ? "Short" : "Video largo"}
          </span>
          <span className="chip bg-neutral-800 text-neutral-300">{NOMBRE_CANAL[pieza.canal]}</span>
        </div>
        <div className="ml-auto">
          <MenuTresPuntos
            accion={quitarDeLaLista}
            ocultos={ocultos}
            etiqueta="Quitar de la lista"
            pregunta="¿Este video ya salió o no se va a publicar? Sale de esta lista y lo puedes devolver después."
            confirmar="Sí, quitar"
          />
        </div>
      </div>
      <div className="mt-2 flex items-start gap-3">
        <Miniatura principal={null} respaldo={miniatura} alt="" className="w-24 shrink-0" />
        <p className="min-w-0 font-medium text-neutral-100">{pieza.titulo}</p>
      </div>

      {hueco ? (
        <form action={accion} className="mt-3">
          {Object.entries(ocultos).map(([k, v]) => (
            <input key={k} type="hidden" name={k} value={String(v)} />
          ))}
          <input type="hidden" name="fecha" value={hueco.fecha} />
          <input type="hidden" name="hora" value={hueco.hora} />
          <button type="submit" disabled={pendiente} className="boton">
            {pendiente ? "Agendando…" : `Agendar: ${cuando(hueco.fecha, hueco.hora)}`}
          </button>
        </form>
      ) : (
        <p className="mt-3 text-amber-300">
          No hay huecos libres en los próximos cuatro meses. Agrega más horas en las reglas del calendario.
        </p>
      )}
      {estado.error && (
        <p role="alert" className="mt-2 rounded-md border border-red-900 bg-red-950/50 p-3 text-red-200">
          {estado.error}
        </p>
      )}

      <details className="mt-3">
        <summary className="cursor-pointer text-neutral-400 hover:text-white">Elegir otro día u hora</summary>
        <div className="mt-3">
          <SelectorHueco
            modo="agendar"
            ocultos={ocultos}
            pedido={{ canal: pieza.canal, plataforma, pieza: pieza.pieza, guion_id: pieza.guion_id }}
            entradas={entradas}
            reglas={reglas}
            hoy={hoy}
            inicial={hueco?.fecha}
          />
        </div>
      </details>
    </li>
  );
}
