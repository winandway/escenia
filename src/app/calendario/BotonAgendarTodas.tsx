"use client";

import { useActionState } from "react";
import { agendarTodas, type EstadoForm } from "./acciones";

export function BotonAgendarTodas({
  cuantas,
  plataforma,
  canal,
}: {
  cuantas: number;
  plataforma: string;
  canal: string;
}) {
  const [estado, accion, pendiente] = useActionState<EstadoForm, FormData>(agendarTodas, {
    error: "",
    ok: "",
  });
  return (
    <form action={accion} className="text-sm">
      <input type="hidden" name="plataforma" value={plataforma} />
      <input type="hidden" name="canal" value={canal} />
      {cuantas > 1 && (
        <button type="submit" disabled={pendiente} className="boton">
          {pendiente ? "Agendando…" : `Agendar los ${cuantas} en los próximos huecos libres`}
        </button>
      )}
      {estado.error && (
        <p role="alert" className="mt-2 rounded-md border border-red-900 bg-red-950/50 p-3 text-red-200">
          {estado.error}
        </p>
      )}
      {estado.ok && (
        <p role="status" className="mt-2 text-emerald-300">
          {estado.ok}
        </p>
      )}
    </form>
  );
}
