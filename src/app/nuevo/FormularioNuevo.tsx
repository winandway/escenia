"use client";

import { useActionState, useEffect, useState } from "react";
import { AvisoBorrador } from "@/componentes/AvisoBorrador";
import { useBorrador } from "@/componentes/useBorrador";
import { ETIQUETA_VOZ, VOCES } from "@compartido/guion";
import type { Canal } from "@compartido/tematicas";
import { crearGuion, type EstadoNuevo } from "./acciones";

type Props = {
  canales: { id: Canal; nombre: string }[];
  canalInicial: Canal;
  tematicas: { id: string; nombre: string; canal: Canal }[];
  productos: { id: string; nombre: string }[];
};

const COLOR_CANAL: Record<Canal, string> = {
  "canal-ia": "border-emerald-400 bg-emerald-400 text-neutral-950",
  "caprichoso-tv": "border-amber-500 bg-amber-500 text-neutral-950",
};

export function FormularioNuevo({ canales, canalInicial, tematicas, productos }: Props) {
  const [estado, accion, pendiente] = useActionState<EstadoNuevo, FormData>(crearGuion, { error: "" });
  const { ref, recuperado, empezarDeNuevo, descartar } = useBorrador("nuevo-video");
  const [canal, setCanal] = useState<Canal>(canalInicial);
  const primeraDe = (c: Canal) => tematicas.find((t) => t.canal === c)?.id ?? "";

  // Si el borrador recuperado trae una temática de otro canal, el separador se pone en ese canal.
  useEffect(() => {
    const aviso = setTimeout(() => {
      const campo = ref.current?.elements.namedItem("tematica_id");
      if (!(campo instanceof HTMLSelectElement)) return;
      const guardada = tematicas.find((t) => t.id === campo.value);
      if (guardada) setCanal(guardada.canal);
    }, 0);
    return () => clearTimeout(aviso);
  }, [ref, tematicas]);

  function elegirCanal(c: Canal) {
    setCanal(c);
    const campo = ref.current?.elements.namedItem("tematica_id");
    if (campo instanceof HTMLSelectElement) {
      campo.value = primeraDe(c);
      // Para que el borrador guarde la temática nueva.
      campo.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }

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
      <AvisoBorrador
        visible={recuperado}
        alEmpezarDeNuevo={() => {
          empezarDeNuevo();
          setCanal(canalInicial);
        }}
      />

      <div>
        <span className="etiqueta" id="etiqueta-canal">
          Canal
        </span>
        <div className="flex flex-wrap gap-2" role="group" aria-labelledby="etiqueta-canal">
          {canales.map((c) => (
            <button
              key={c.id}
              type="button"
              aria-pressed={canal === c.id}
              onClick={() => elegirCanal(c.id)}
              className={`rounded-full border px-4 py-2 text-sm font-medium ${
                canal === c.id
                  ? COLOR_CANAL[c.id]
                  : "border-neutral-700 text-neutral-200 hover:bg-neutral-800"
              }`}
            >
              {c.nombre}
            </button>
          ))}
        </div>
      </div>

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
        {/* Todas las temáticas están en la lista (así el borrador puede devolver cualquiera);
            las de otro canal quedan escondidas hasta que se elige ese canal. */}
        <select
          id="tematica_id"
          name="tematica_id"
          required
          className="campo"
          defaultValue={primeraDe(canalInicial)}
        >
          {tematicas.map((t) => (
            <option key={t.id} value={t.id} hidden={t.canal !== canal} disabled={t.canal !== canal}>
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
        <label htmlFor="voz" className="etiqueta">
          Quién narra
        </label>
        <select id="voz" name="voz" className="campo" defaultValue="richard">
          {VOCES.map((v) => (
            <option key={v} value={v}>
              {ETIQUETA_VOZ[v]}
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
