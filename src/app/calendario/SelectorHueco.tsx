"use client";

import { useActionState, useState } from "react";
import {
  etiquetaDia,
  hora12,
  huecosDelDia,
  sumarDias,
  type EntradaCalendario,
  type Momento,
  type Pedido,
  type ReglasCalendario,
} from "@compartido/calendario";
import { agendarPieza, moverEntrada, type EstadoForm } from "./acciones";

type Props = {
  modo: "agendar" | "mover";
  /** Campos que viajan con el formulario (la pieza, o el id de la entrada). */
  ocultos: Record<string, string | number>;
  pedido: Pedido;
  entradas: EntradaCalendario[];
  reglas: ReglasCalendario;
  hoy: Momento;
  inicial?: string;
};

const DIAS_A_LA_VISTA = 21;

/** Dos toques: el día y la hora. Las horas ocupadas dicen por qué no se pueden usar. */
export function SelectorHueco({ modo, ocultos, pedido, entradas, reglas, hoy, inicial }: Props) {
  const [estado, accion, pendiente] = useActionState<EstadoForm, FormData>(
    modo === "mover" ? moverEntrada : agendarPieza,
    { error: "", ok: "" },
  );
  const [fecha, setFecha] = useState(inicial && inicial >= hoy.fecha ? inicial : hoy.fecha);
  // Controlado: si el servidor rechaza la hora, lo escrito se queda en pantalla.
  const [otraHora, setOtraHora] = useState("");
  const dias = Array.from({ length: DIAS_A_LA_VISTA }, (_, i) => sumarDias(hoy.fecha, i));
  const huecos = huecosDelDia(entradas, pedido, fecha, reglas, hoy);
  const ocupadas = huecos.filter((h) => !h.libre);
  const cuantos = (dia: string) =>
    entradas.filter(
      (e) =>
        e.fecha === dia &&
        e.canal === pedido.canal &&
        e.plataforma === pedido.plataforma &&
        e.id !== pedido.id &&
        e.estado !== "descartado",
    ).length;

  return (
    <form action={accion} className="min-w-0 space-y-3">
      {Object.entries(ocultos).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={String(v)} />
      ))}
      <input type="hidden" name="fecha" value={fecha} />

      <div className="min-w-0">
        <div className="etiqueta">1. El día</div>
        <div role="group" aria-label="Día" className="flex gap-2 overflow-x-auto pb-1">
          {dias.map((d) => {
            const n = cuantos(d);
            return (
              <button
                key={d}
                type="button"
                aria-pressed={d === fecha}
                onClick={() => setFecha(d)}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium ${
                  d === fecha
                    ? "border-amber-500 bg-amber-500 text-neutral-950"
                    : "border-neutral-700 text-neutral-200 hover:bg-neutral-800"
                }`}
              >
                {etiquetaDia(d, hoy.fecha)}
                {n > 0 && <span className="ml-1 opacity-70">· {n}</span>}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div className="etiqueta">2. La hora</div>
        <div className="flex flex-wrap gap-2">
          {huecos.map((h) =>
            h.libre ? (
              <button
                key={h.hora}
                type="submit"
                name="hora"
                value={h.hora}
                disabled={pendiente}
                className="rounded-full border border-emerald-600 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-950 disabled:opacity-50"
              >
                {hora12(h.hora)} · libre
              </button>
            ) : (
              <span
                key={h.hora}
                className="rounded-full border border-neutral-800 px-3 py-1.5 text-xs text-neutral-500 line-through"
              >
                {hora12(h.hora)}
              </span>
            ),
          )}
        </div>
        {ocupadas.length > 0 && (
          <ul className="mt-2 space-y-1 text-xs text-neutral-400">
            {ocupadas.map((h) => (
              <li key={h.hora}>
                {hora12(h.hora)}: {h.motivo}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <div>
          <label className="etiqueta" htmlFor={`otra-${modo}-${Object.values(ocultos).join("-")}`}>
            Otra hora
          </label>
          <input
            id={`otra-${modo}-${Object.values(ocultos).join("-")}`}
            type="time"
            name="hora_libre"
            value={otraHora}
            onChange={(e) => setOtraHora(e.target.value)}
            className="campo w-36"
          />
        </div>
        <button type="submit" disabled={pendiente} className="boton-suave">
          {pendiente ? "Guardando…" : "Guardar con esa hora"}
        </button>
      </div>

      {estado.error && (
        <p role="alert" className="rounded-md border border-red-900 bg-red-950/50 p-3 text-sm text-red-200">
          {estado.error}
        </p>
      )}
      {estado.ok && (
        <p role="status" className="text-sm text-emerald-300">
          {estado.ok}
        </p>
      )}
    </form>
  );
}
