"use client";

import { useActionState } from "react";
import { AvisoBorrador } from "@/componentes/AvisoBorrador";
import { useBorrador } from "@/componentes/useBorrador";
import { crearGuion, type EstadoNuevo } from "./acciones";

type Props = {
  tematicas: { id: string; nombre: string; ctaProductos: string[] }[];
  productos: { id: string; nombre: string }[];
};

export function FormularioNuevo({ tematicas, productos }: Props) {
  const [estado, accion, pendiente] = useActionState<EstadoNuevo, FormData>(crearGuion, { error: "" });
  const { ref, recuperado, empezarDeNuevo, descartar } = useBorrador("nuevo-video");

  return (
    <form
      ref={ref}
      action={accion}
      onSubmit={() => {
        // Si el servidor falla, el borrador se vuelve a guardar al siguiente tecleo.
        descartar();
      }}
      className="max-w-2xl space-y-5"
    >
      <AvisoBorrador visible={recuperado} alEmpezarDeNuevo={empezarDeNuevo} />

      <div>
        <label htmlFor="titulo" className="etiqueta">
          Tema del video
        </label>
        <input
          id="titulo"
          name="titulo"
          required
          minLength={5}
          maxLength={200}
          className="campo"
          placeholder="De qué va el video"
        />
      </div>

      <div>
        <label htmlFor="tematica_id" className="etiqueta">
          Temática
        </label>
        <select id="tematica_id" name="tematica_id" required className="campo">
          {tematicas.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nombre}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="producto_id" className="etiqueta">
          Producto para el cierre (opcional)
        </label>
        <select id="producto_id" name="producto_id" className="campo" defaultValue="">
          <option value="">Ninguno</option>
          {productos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="url_fuente" className="etiqueta">
          Enlace de la fuente (opcional)
        </label>
        <input id="url_fuente" name="url_fuente" type="url" className="campo" placeholder="https://" />
      </div>

      <div>
        <label htmlFor="contexto" className="etiqueta">
          Contexto: pega aquí el texto de la fuente (opcional, pero mejora mucho el guion)
        </label>
        <textarea
          id="contexto"
          name="contexto"
          rows={10}
          maxLength={20000}
          className="campo font-mono text-xs"
          placeholder="El artículo, la nota o los datos de los que sale el video. La IA solo puede afirmar lo que esté aquí."
        />
      </div>

      {estado.error && (
        <p role="alert" className="rounded-md border border-red-900 bg-red-950/50 p-3 text-sm text-red-200">
          {estado.error}
        </p>
      )}

      <button type="submit" disabled={pendiente} className="boton">
        {pendiente ? "Escribiendo el guion… (unos 30 segundos)" : "Generar guion"}
      </button>
    </form>
  );
}
