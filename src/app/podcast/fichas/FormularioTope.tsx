"use client";

// El tope de minutos del podcast por día (C-PODCAST-1): con borrador, como todo formulario.
import { useState, useTransition } from "react";
import { AvisoBorrador } from "@/componentes/AvisoBorrador";
import { useBorrador } from "@/componentes/useBorrador";
import { TOPE_MINUTOS_MAXIMO } from "@compartido/podcast";
import type { EstadoTope } from "./acciones";

export function FormularioTope({
  minutos,
  guardar,
}: {
  minutos: number;
  guardar: (previo: EstadoTope, datos: FormData) => Promise<EstadoTope>;
}) {
  const { ref, recuperado, empezarDeNuevo, descartar } = useBorrador("podcast-tope");
  const [estado, setEstado] = useState<EstadoTope>({ error: "", ok: "" });
  const [pendiente, iniciar] = useTransition();
  return (
    <form
      ref={ref}
      onSubmit={(e) => {
        e.preventDefault();
        const datos = new FormData(e.currentTarget);
        iniciar(async () => {
          const r = await guardar(estado, datos).catch(() => ({
            error: "No se pudo guardar. Inténtalo otra vez.",
            ok: "",
          }));
          setEstado(r);
          if (r.ok) descartar();
        });
      }}
      className="mt-2 space-y-2"
    >
      <AvisoBorrador visible={recuperado} alEmpezarDeNuevo={empezarDeNuevo} />
      <label htmlFor="minutos" className="text-xs text-neutral-400">
        Tope de minutos por día
      </label>
      <div className="flex items-center gap-2">
        <input
          id="minutos"
          name="minutos"
          type="number"
          min={0}
          max={TOPE_MINUTOS_MAXIMO}
          step={5}
          defaultValue={minutos}
          className="campo w-24"
        />
        <button type="submit" disabled={pendiente} className="boton-suave px-3 py-1.5">
          Guardar
        </button>
      </div>
      {estado.error && <p className="text-xs text-red-300">{estado.error}</p>}
      {estado.ok && <p className="text-xs text-green-300">{estado.ok}</p>}
    </form>
  );
}
