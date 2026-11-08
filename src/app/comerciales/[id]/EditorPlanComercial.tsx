"use client";

// C-COMERCIAL-3: el plan del comercial, frase por frase, con la imagen que entra en cada momento.
// Cada imagen se cambia con un selector (o se quita); lo elegido se guarda solo en el navegador
// mientras se trabaja (regla de los formularios) y se borra al guardar con éxito.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AvisoBorrador } from "@/componentes/AvisoBorrador";
import { useBorrador } from "@/componentes/useBorrador";
import { guardarPlan } from "./acciones";

export type OpcionDeImagen = { nombre: string; miniatura: number | null };
export type PlanoDelEditor = {
  indice: number;
  tipo: string;
  frase: string;
  archivo: string;
  texto: string;
  miniatura: number | null;
};
export type EscenaDelEditor = {
  narracion: string;
  titular: string;
  diagrama: boolean;
  planos: PlanoDelEditor[];
};

type Estado = { fase: "listo" | "enviando"; error: string; aviso: string };

function Miniatura({ id, nombre }: { id: number | null; nombre: string }) {
  return (
    <div className="flex h-16 w-24 shrink-0 items-center justify-center overflow-hidden rounded-md bg-neutral-900">
      {id ? (
        // Sale del almacén con sesión: el optimizador de imágenes no aplica.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/datos/imagenes/${id}`}
          alt={nombre}
          loading="lazy"
          className="max-h-full max-w-full object-contain"
        />
      ) : (
        <span className="px-1 text-center text-[10px] text-neutral-500">
          {nombre ? "sin vista previa" : "quitada"}
        </span>
      )}
    </div>
  );
}

export function EditorPlanComercial({
  id,
  guionId,
  escenas,
  opciones,
  editable,
}: {
  id: number;
  guionId: number;
  escenas: EscenaDelEditor[];
  opciones: OpcionDeImagen[];
  editable: boolean;
}) {
  const router = useRouter();
  const { ref, recuperado, empezarDeNuevo, descartar } = useBorrador(`plan-comercial-${id}`);
  const [estado, setEstado] = useState<Estado>({ fase: "listo", error: "", aviso: "" });
  // Lo elegido en cada selector, para mostrar la miniatura correcta (también tras recuperar el borrador).
  const [elegidas, setElegidas] = useState<Record<string, string>>({});
  const miniaturaDe = (nombre: string) => opciones.find((o) => o.nombre === nombre)?.miniatura ?? null;

  useEffect(() => {
    if (!recuperado || !ref.current) return;
    const leidas: Record<string, string> = {};
    ref.current.querySelectorAll("select").forEach((s) => {
      leidas[s.name] = s.value;
    });
    setElegidas(leidas);
  }, [recuperado, ref]);

  async function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const boton = (evento.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const datos = new FormData(evento.currentTarget);
    datos.set("accion", boton?.value === "armar" ? "armar" : "guardar");
    setEstado({ fase: "enviando", error: "", aviso: "" });
    try {
      const r = await guardarPlan(datos);
      if (!r.ok) return setEstado({ fase: "listo", error: r.error, aviso: "" });
      descartar();
      if (r.armado) return router.push("/comerciales");
      setEstado({ fase: "listo", error: "", aviso: "Cambios guardados." });
      router.refresh();
    } catch {
      setEstado({
        fase: "listo",
        error: "Se cortó la conexión. Lo que elegiste sigue aquí: vuelve a intentarlo.",
        aviso: "",
      });
    }
  }

  return (
    <form ref={ref} onSubmit={enviar} className="max-w-3xl space-y-4">
      <input type="hidden" name="id" value={id} />
      <AvisoBorrador visible={recuperado} alEmpezarDeNuevo={empezarDeNuevo} />
      <ol className="space-y-4">
        {escenas.map((e, i) => (
          <li key={i} className="tarjeta text-sm">
            <p className="text-xs uppercase tracking-wide text-neutral-500">
              Parte {i + 1}
              {e.titular ? ` · ${e.titular}` : ""}
              {e.diagrama ? " · diagrama de neón" : ""}
            </p>
            <p className="mt-2 text-neutral-200">{e.narracion}</p>
            {e.planos.length > 0 && (
              <ul className="mt-3 space-y-2">
                {e.planos.map((p) => {
                  const nombre = `p-${i}-${p.indice}`;
                  const actual = elegidas[nombre] ?? p.archivo;
                  return (
                    <li
                      key={p.indice}
                      className="flex flex-wrap items-center gap-3 border-t border-neutral-800 pt-2"
                    >
                      {p.tipo === "imagen" ? (
                        <>
                          <Miniatura
                            id={actual ? (miniaturaDe(actual) ?? p.miniatura) : null}
                            nombre={actual}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs text-neutral-400">Entra cuando dice «{p.frase}»</p>
                            <label className="sr-only" htmlFor={nombre}>
                              Imagen que entra cuando dice «{p.frase}»
                            </label>
                            <select
                              id={nombre}
                              name={nombre}
                              defaultValue={p.archivo}
                              disabled={!editable}
                              className="campo mt-1"
                              onChange={(ev) => {
                                const valor = ev.currentTarget.value;
                                setElegidas((x) => ({ ...x, [nombre]: valor }));
                              }}
                            >
                              {opciones.map((o) => (
                                <option key={o.nombre} value={o.nombre}>
                                  {o.nombre}
                                </option>
                              ))}
                              {!opciones.some((o) => o.nombre === p.archivo) && p.archivo && (
                                <option value={p.archivo}>{p.archivo}</option>
                              )}
                              <option value="">Quitar esta imagen</option>
                            </select>
                          </div>
                        </>
                      ) : (
                        <p className="text-xs text-neutral-400">
                          {p.tipo === "dato" ? `Texto en grande: «${p.texto}»` : `Plano ${p.tipo}`} cuando
                          dice «{p.frase}»
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </li>
        ))}
      </ol>
      {estado.error && (
        <p role="alert" className="rounded-md border border-red-900 bg-red-950/50 p-3 text-sm text-red-200">
          {estado.error}
        </p>
      )}
      {estado.aviso && (
        <p role="status" className="text-sm text-emerald-300">
          {estado.aviso}
        </p>
      )}
      {editable ? (
        <div className="flex flex-wrap gap-2">
          <button type="submit" value="armar" disabled={estado.fase === "enviando"} className="boton">
            {estado.fase === "enviando" ? "Guardando…" : "Armar el video"}
          </button>
          <button type="submit" value="guardar" disabled={estado.fase === "enviando"} className="boton-suave">
            Guardar sin armar
          </button>
        </div>
      ) : (
        <Link href={`/guiones/${guionId}`} className="boton">
          Ver cómo va el video
        </Link>
      )}
    </form>
  );
}
