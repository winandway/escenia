"use client";

import { useActionState, useEffect } from "react";
import { AvisoBorrador } from "@/componentes/AvisoBorrador";
import { rellenarFormulario, useBorrador } from "@/componentes/useBorrador";
import { hora12, ZONAS, type ReglasCalendario } from "@compartido/calendario";
import { guardarReglasCalendario, type EstadoManual } from "./acciones";

export function FormularioReglas({ reglas }: { reglas: ReglasCalendario }) {
  const [estado, accion, pendiente] = useActionState<EstadoManual, FormData>(guardarReglasCalendario, {
    error: "",
    ok: "",
    valores: {},
  });
  const { ref, recuperado, empezarDeNuevo, descartar } = useBorrador("calendario-reglas");
  useEffect(() => {
    if (estado.ok) descartar();
    // Lo escrito vuelve a su sitio después de enviar (guardado o rechazado).
    if ((estado.ok || estado.error) && ref.current) rellenarFormulario(ref.current, estado.valores);
  }, [estado, descartar, ref]);

  return (
    <form ref={ref} action={accion} className="max-w-2xl space-y-4 text-sm">
      <AvisoBorrador visible={recuperado} alEmpezarDeNuevo={empezarDeNuevo} />
      <div>
        <label htmlFor="horas_short" className="etiqueta">
          Horas de los Shorts (separadas por coma)
        </label>
        <input
          id="horas_short"
          name="horas_short"
          required
          maxLength={200}
          defaultValue={reglas.horasShort.map(hora12).join(", ")}
          className="campo"
          placeholder="12:00 p. m., 7:00 p. m."
        />
        <p className="mt-1 text-xs text-neutral-500">
          Cuántas horas pongas es el máximo de Shorts por día en cada canal.
        </p>
      </div>
      <div>
        <label htmlFor="horas_largo" className="etiqueta">
          Horas de los videos largos
        </label>
        <input
          id="horas_largo"
          name="horas_largo"
          required
          maxLength={200}
          defaultValue={reglas.horasLargo.map(hora12).join(", ")}
          className="campo"
          placeholder="4:00 p. m."
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="separacion_horas" className="etiqueta">
            Horas mínimas entre dos publicaciones
          </label>
          <input
            id="separacion_horas"
            name="separacion_horas"
            type="number"
            min={0}
            max={24}
            step="0.5"
            required
            defaultValue={reglas.separacionMin / 60}
            className="campo w-32"
          />
        </div>
        <div>
          <label htmlFor="zona" className="etiqueta">
            Tu zona horaria
          </label>
          <select id="zona" name="zona" defaultValue={reglas.zona} className="campo">
            {ZONAS.map((z) => (
              <option key={z.id} value={z.id}>
                {z.nombre}
              </option>
            ))}
          </select>
        </div>
      </div>
      {estado.error && (
        <p role="alert" className="rounded-md border border-red-900 bg-red-950/50 p-3 text-red-200">
          {estado.error}
        </p>
      )}
      {estado.ok && (
        <p role="status" className="text-emerald-300">
          {estado.ok}
        </p>
      )}
      <button type="submit" disabled={pendiente} className="boton">
        {pendiente ? "Guardando…" : "Guardar reglas"}
      </button>
    </form>
  );
}
