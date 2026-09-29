"use client";

import { useActionState, useEffect } from "react";
import { AvisoBorrador } from "@/componentes/AvisoBorrador";
import { rellenarFormulario, useBorrador } from "@/componentes/useBorrador";
import { CANALES_CALENDARIO, NOMBRE_PLATAFORMA, PLATAFORMAS, type Plataforma } from "@compartido/calendario";
import { NOMBRE_CANAL } from "@compartido/tematicas";
import { agregarManual, type EstadoManual } from "./acciones";

/** Para los videos hechos fuera de Escenia: entran al calendario y ocupan su hueco igual. */
export function FormularioManual({ plataforma, hoy }: { plataforma: Plataforma; hoy: string }) {
  const [estado, accion, pendiente] = useActionState<EstadoManual, FormData>(agregarManual, {
    error: "",
    ok: "",
    valores: {},
  });
  const { ref, recuperado, empezarDeNuevo, descartar } = useBorrador("calendario-manual");
  // El borrador se borra solo cuando el servidor confirma que se guardó.
  useEffect(() => {
    if (estado.ok) descartar();
    // Si lo rechazó, lo escrito vuelve a su sitio (el navegador limpia el formulario al enviar).
    if (estado.error && ref.current) rellenarFormulario(ref.current, estado.valores);
  }, [estado, descartar, ref]);
  const v = estado.valores;

  return (
    <form ref={ref} action={accion} className="max-w-2xl space-y-4 text-sm">
      <AvisoBorrador visible={recuperado} alEmpezarDeNuevo={empezarDeNuevo} />
      <div>
        <label htmlFor="manual-titulo" className="etiqueta">
          Título del video
        </label>
        <input
          id="manual-titulo"
          name="titulo"
          required
          minLength={3}
          maxLength={150}
          defaultValue={v.titulo ?? ""}
          className="campo"
          placeholder="Título del video"
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label htmlFor="manual-canal" className="etiqueta">
            Canal
          </label>
          <select id="manual-canal" name="canal" defaultValue={v.canal ?? "caprichoso-tv"} className="campo">
            {CANALES_CALENDARIO.map((c) => (
              <option key={c} value={c}>
                {NOMBRE_CANAL[c]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="manual-pieza" className="etiqueta">
            Tipo
          </label>
          <select id="manual-pieza" name="pieza" defaultValue={v.pieza ?? "short"} className="campo">
            <option value="short">Short</option>
            <option value="largo">Video largo</option>
          </select>
        </div>
        <div>
          <label htmlFor="manual-plataforma" className="etiqueta">
            Plataforma
          </label>
          <select
            id="manual-plataforma"
            name="plataforma"
            defaultValue={v.plataforma ?? plataforma}
            className="campo"
          >
            {PLATAFORMAS.map((p) => (
              <option key={p} value={p}>
                {NOMBRE_PLATAFORMA[p]}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label htmlFor="manual-fecha" className="etiqueta">
            Día
          </label>
          <input
            id="manual-fecha"
            name="fecha"
            type="date"
            required
            defaultValue={v.fecha ?? hoy}
            className="campo"
          />
        </div>
        <div>
          <label htmlFor="manual-hora" className="etiqueta">
            Hora
          </label>
          <input
            id="manual-hora"
            name="hora"
            type="time"
            required
            defaultValue={v.hora ?? ""}
            className="campo"
          />
        </div>
        <div>
          <label htmlFor="manual-estado" className="etiqueta">
            ¿Cómo va?
          </label>
          <select id="manual-estado" name="estado" defaultValue={v.estado ?? "agendado"} className="campo">
            <option value="agendado">Todavía no lo programo</option>
            <option value="programado">Ya lo programé en la plataforma</option>
            <option value="publicado">Ya salió</option>
          </select>
        </div>
      </div>
      <div>
        <label htmlFor="manual-enlace" className="etiqueta">
          Enlace del video (si ya está subido)
        </label>
        <input
          id="manual-enlace"
          name="enlace"
          type="url"
          inputMode="url"
          maxLength={300}
          defaultValue={v.enlace ?? ""}
          className="campo"
          placeholder="Enlace del video, empezando por https://"
        />
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
        {pendiente ? "Guardando…" : "Agregar al calendario"}
      </button>
    </form>
  );
}
