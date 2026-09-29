"use client";

import { useActionState, useEffect } from "react";
import { AvisoBorrador } from "@/componentes/AvisoBorrador";
import { rellenarFormulario, useBorrador } from "@/componentes/useBorrador";
import { NOMBRE_PLATAFORMA, type Plataforma } from "@compartido/calendario";
import { guardarEnlaceEntrada, type EstadoManual } from "./acciones";

/** Se pega el enlace del video ya subido y el calendario muestra su miniatura. */
export function FormularioEnlace({
  id,
  enlace,
  plataforma,
}: {
  id: number;
  enlace: string;
  plataforma: Plataforma;
}) {
  const [estado, accion, pendiente] = useActionState<EstadoManual, FormData>(guardarEnlaceEntrada, {
    error: "",
    ok: "",
    valores: {},
  });
  const { ref, recuperado, empezarDeNuevo, descartar } = useBorrador(`calendario-enlace-${id}`);
  useEffect(() => {
    if (estado.ok) descartar();
    if ((estado.ok || estado.error) && ref.current) rellenarFormulario(ref.current, estado.valores);
  }, [estado, descartar, ref]);

  return (
    <form ref={ref} action={accion} className="space-y-2">
      <AvisoBorrador visible={recuperado} alEmpezarDeNuevo={empezarDeNuevo} />
      <input type="hidden" name="id" value={id} />
      <label htmlFor={`enlace-${id}`} className="etiqueta">
        Enlace del video en {NOMBRE_PLATAFORMA[plataforma]}
      </label>
      <div className="flex flex-wrap gap-2">
        <input
          id={`enlace-${id}`}
          name="enlace"
          type="url"
          inputMode="url"
          maxLength={300}
          defaultValue={enlace}
          className="campo min-w-0 flex-1"
          placeholder="Enlace del video, empezando por https://"
        />
        <button type="submit" disabled={pendiente} className="boton">
          {pendiente ? "Guardando…" : "Guardar enlace"}
        </button>
      </div>
      <p className="text-xs text-neutral-500">
        {plataforma === "youtube"
          ? "Con el enlace, el calendario muestra la miniatura que tiene el video en YouTube."
          : "En esta plataforma se muestra la miniatura que armó Escenia; el enlace queda guardado para abrirlo."}
      </p>
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
