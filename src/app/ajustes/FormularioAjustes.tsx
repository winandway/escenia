"use client";

import { useActionState } from "react";
import { AvisoBorrador } from "@/componentes/AvisoBorrador";
import { useBorrador } from "@/componentes/useBorrador";
import { guardarAjustes, type EstadoAjustes } from "./acciones";

type Props = {
  presupuesto: string;
  modelo: string;
  instrucciones: string;
  modelos: { id: string; texto: string }[];
};

export function FormularioAjustes(p: Props) {
  const [estado, accion, pendiente] = useActionState<EstadoAjustes, FormData>(guardarAjustes, {
    error: "",
    ok: "",
  });
  const { ref, recuperado, empezarDeNuevo, descartar } = useBorrador("ajustes");
  return (
    <form ref={ref} action={accion} onSubmit={descartar} className="max-w-2xl space-y-5">
      <AvisoBorrador visible={recuperado} alEmpezarDeNuevo={empezarDeNuevo} />
      <div>
        <label htmlFor="presupuesto_diario_usd" className="etiqueta">
          Tope de gasto diario en IA (dólares)
        </label>
        <input
          id="presupuesto_diario_usd"
          name="presupuesto_diario_usd"
          type="number"
          min={0}
          max={100}
          step="0.5"
          defaultValue={p.presupuesto}
          className="campo w-40"
        />
        <p className="mt-1 text-xs text-neutral-500">
          Cuando se alcanza, el motor deja de generar hasta el día siguiente.
        </p>
      </div>
      <div>
        <label htmlFor="modelo_guion" className="etiqueta">
          Modelo para los guiones
        </label>
        <select id="modelo_guion" name="modelo_guion" defaultValue={p.modelo} className="campo">
          {p.modelos.map((m) => (
            <option key={m.id} value={m.id}>
              {m.texto}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-neutral-500">
          Solo aparecen los modelos permitidos; los caros están bloqueados en el código.
        </p>
      </div>
      <div>
        <label htmlFor="instrucciones_extra" className="etiqueta">
          Indicaciones tuyas para la IA (se suman a todos los guiones)
        </label>
        <textarea
          id="instrucciones_extra"
          name="instrucciones_extra"
          rows={6}
          maxLength={4000}
          defaultValue={p.instrucciones}
          className="campo"
          placeholder="Muletillas que no quieres, cómo te gusta cerrar, palabras que sí usas…"
        />
      </div>
      {estado.error && (
        <p role="alert" className="text-sm text-red-300">
          {estado.error}
        </p>
      )}
      {estado.ok && (
        <p role="status" className="text-sm text-emerald-300">
          {estado.ok}
        </p>
      )}
      <button type="submit" disabled={pendiente} className="boton">
        {pendiente ? "Guardando…" : "Guardar"}
      </button>
    </form>
  );
}
