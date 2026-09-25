"use client";

import { useActionState, useState } from "react";
import { AvisoBorrador } from "@/componentes/AvisoBorrador";
import { useBorrador } from "@/componentes/useBorrador";
import { OPINION_MINIMA, PARTES, TIPOS_VISUAL, type Escena } from "@compartido/guion";
import { aprobarGuion, guardarGuion, rechazarGuion, type EstadoGuion } from "./acciones";

type Props = {
  id: number;
  estado: "borrador" | "aprobado" | "rechazado";
  titulo: string;
  gancho: string;
  escenas: Escena[];
  hechos: string[];
  opinion: string;
  notas: string;
  producto: { nombre: string; url: string } | null;
};

export function EditorGuion(p: Props) {
  const [escenas, setEscenas] = useState<Escena[]>(p.escenas);
  const [estadoGuardar, guardar, guardando] = useActionState<EstadoGuion, FormData>(guardarGuion, {
    error: "",
    ok: "",
  });
  const [estadoAprobar, aprobar, aprobando] = useActionState<EstadoGuion, FormData>(aprobarGuion, {
    error: "",
    ok: "",
  });
  const { ref, recuperado, empezarDeNuevo, descartar } = useBorrador(`guion-${p.id}`);
  const soloLectura = p.estado !== "borrador";
  const ocupado = guardando || aprobando;
  const mensaje = estadoAprobar.error || estadoGuardar.error || estadoAprobar.ok || estadoGuardar.ok;
  const esError = Boolean(estadoAprobar.error || estadoGuardar.error);

  const cambiar = (i: number, cambio: Partial<Escena> | { visual: Partial<Escena["visual"]> }) =>
    setEscenas((prev) =>
      prev.map((e, k) => {
        if (k !== i) return e;
        if ("visual" in cambio && cambio.visual && !("parte" in cambio) && !("narracion" in cambio)) {
          return { ...e, visual: { ...e.visual, ...cambio.visual } };
        }
        return { ...e, ...(cambio as Partial<Escena>) };
      }),
    );
  const quitar = (i: number) => setEscenas((prev) => prev.filter((_, k) => k !== i));
  const mover = (i: number, d: -1 | 1) =>
    setEscenas((prev) => {
      const j = i + d;
      if (j < 0 || j >= prev.length) return prev;
      const copia = [...prev];
      const a = copia[i];
      const b = copia[j];
      if (!a || !b) return prev;
      copia[i] = b;
      copia[j] = a;
      return copia;
    });
  const agregar = (i: number) =>
    setEscenas((prev) => [
      ...prev.slice(0, i + 1),
      { parte: "contexto", narracion: "", visual: { tipo: "stock", busqueda: "" } },
      ...prev.slice(i + 1),
    ]);

  return (
    <form ref={ref} onSubmit={descartar} className="space-y-6">
      <input type="hidden" name="id" value={p.id} />
      <input type="hidden" name="escenas" value={JSON.stringify(escenas)} />
      <AvisoBorrador visible={recuperado && !soloLectura} alEmpezarDeNuevo={empezarDeNuevo} />

      <div>
        <label htmlFor="titulo" className="etiqueta">
          Título del video
        </label>
        <input
          id="titulo"
          name="titulo"
          defaultValue={p.titulo}
          required
          minLength={5}
          maxLength={100}
          className="campo text-lg"
          readOnly={soloLectura}
        />
      </div>

      <div>
        <label htmlFor="gancho" className="etiqueta">
          Gancho (primeros 5 segundos)
        </label>
        <textarea
          id="gancho"
          name="gancho"
          defaultValue={p.gancho}
          rows={2}
          maxLength={300}
          className="campo"
          readOnly={soloLectura}
        />
      </div>

      {p.hechos.length > 0 && (
        <div className="tarjeta text-sm">
          <p className="mb-2 font-medium text-amber-300">
            Comprueba estos datos antes de aprobar (los afirmó la IA a partir de la fuente):
          </p>
          <ul className="list-disc space-y-1 pl-5 text-neutral-300">
            {p.hechos.map((h, i) => (
              <li key={i}>{h}</li>
            ))}
          </ul>
        </div>
      )}

      <section>
        <h2 className="mb-2 text-lg font-semibold">Escenas</h2>
        <ol className="space-y-3">
          {escenas.map((e, i) => (
            <li key={i} className="tarjeta space-y-2">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="text-neutral-500">{i + 1}</span>
                <select
                  value={e.parte}
                  disabled={soloLectura}
                  onChange={(ev) => cambiar(i, { parte: ev.target.value as Escena["parte"] })}
                  className="campo w-auto py-1"
                  aria-label="Parte"
                >
                  {PARTES.map((x) => (
                    <option key={x} value={x}>
                      {x}
                    </option>
                  ))}
                </select>
                <select
                  value={e.visual.tipo}
                  disabled={soloLectura}
                  onChange={(ev) =>
                    cambiar(i, { visual: { tipo: ev.target.value as Escena["visual"]["tipo"] } })
                  }
                  className="campo w-auto py-1"
                  aria-label="Tipo de visual"
                >
                  {TIPOS_VISUAL.map((x) => (
                    <option key={x} value={x}>
                      visual: {x}
                    </option>
                  ))}
                </select>
                {e.visual.tipo === "stock" && (
                  <input
                    value={e.visual.busqueda ?? ""}
                    readOnly={soloLectura}
                    onChange={(ev) => cambiar(i, { visual: { busqueda: ev.target.value } })}
                    className="campo w-48 py-1"
                    placeholder="búsqueda del clip (en inglés)"
                    aria-label="Búsqueda del clip"
                  />
                )}
                <input
                  value={e.visual.texto_en_pantalla ?? ""}
                  readOnly={soloLectura}
                  onChange={(ev) => cambiar(i, { visual: { texto_en_pantalla: ev.target.value } })}
                  className="campo w-56 py-1"
                  placeholder="texto en pantalla"
                  aria-label="Texto en pantalla"
                />
                {!soloLectura && (
                  <span className="ml-auto flex gap-1">
                    <button
                      type="button"
                      onClick={() => mover(i, -1)}
                      className="boton-suave px-2 py-1"
                      aria-label="Subir"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => mover(i, 1)}
                      className="boton-suave px-2 py-1"
                      aria-label="Bajar"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => agregar(i)}
                      className="boton-suave px-2 py-1"
                      aria-label="Agregar escena debajo"
                    >
                      +
                    </button>
                    <button
                      type="button"
                      onClick={() => quitar(i)}
                      className="boton-suave px-2 py-1"
                      aria-label="Quitar escena"
                    >
                      ×
                    </button>
                  </span>
                )}
              </div>
              <textarea
                value={e.narracion}
                readOnly={soloLectura}
                onChange={(ev) => cambiar(i, { narracion: ev.target.value })}
                rows={3}
                maxLength={1500}
                className="campo"
                aria-label={`Narración de la escena ${i + 1}`}
              />
            </li>
          ))}
        </ol>
      </section>

      <div>
        <label htmlFor="opinion" className="etiqueta">
          Tu opinión (obligatoria para aprobar; se narra con tu voz antes del cierre)
        </label>
        <textarea
          id="opinion"
          name="opinion"
          defaultValue={p.opinion}
          rows={4}
          maxLength={2000}
          className="campo"
          readOnly={soloLectura}
          placeholder={`Qué piensas tú de esto, con tus palabras. Mínimo ${OPINION_MINIMA} letras.`}
        />
      </div>

      <div>
        <label htmlFor="notas" className="etiqueta">
          Notas internas (no se narran)
        </label>
        <textarea
          id="notas"
          name="notas"
          defaultValue={p.notas}
          rows={2}
          maxLength={2000}
          className="campo"
          readOnly={soloLectura}
        />
      </div>

      {p.producto && (
        <p className="text-sm text-neutral-400">
          Cierre con producto: <strong className="text-neutral-200">{p.producto.nombre}</strong> (
          {p.producto.url})
        </p>
      )}

      {mensaje && (
        <p
          role={esError ? "alert" : "status"}
          className={`rounded-md border p-3 text-sm ${esError ? "border-red-900 bg-red-950/50 text-red-200" : "border-emerald-900 bg-emerald-950/40 text-emerald-200"}`}
        >
          {mensaje}
        </p>
      )}

      {!soloLectura && (
        <div className="flex flex-wrap gap-3">
          <button type="submit" formAction={guardar} disabled={ocupado} className="boton-suave">
            {guardando ? "Guardando…" : "Guardar cambios"}
          </button>
          <button type="submit" formAction={aprobar} disabled={ocupado} className="boton">
            {aprobando ? "Aprobando…" : "Aprobar y producir"}
          </button>
          <button
            type="submit"
            formAction={rechazarGuion}
            disabled={ocupado}
            className="ml-auto text-sm text-neutral-400 hover:text-red-300"
          >
            Rechazar guion
          </button>
        </div>
      )}
    </form>
  );
}
