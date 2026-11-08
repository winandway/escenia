"use client";

// C-COMERCIAL-4: la imagen de la miniatura (una de las que salen en el video) y sus dos textos.
// Lo escrito se guarda solo mientras se escribe (useBorrador) y se borra al pedirla con éxito.
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AvisoBorrador } from "@/componentes/AvisoBorrador";
import { useBorrador } from "@/componentes/useBorrador";
import { MAX_FRASE_PORTADA, MAX_TITULO_PORTADA } from "@compartido/comerciales";
import { elegirMiniatura } from "./acciones";

export type OpcionMiniatura = { nombre: string; imagenId: number | null };

export function FormularioMiniatura({
  id,
  opciones,
  inicial,
}: {
  id: number;
  opciones: OpcionMiniatura[];
  inicial: { archivo: string; titulo: string; frase: string };
}) {
  const router = useRouter();
  const { ref, recuperado, empezarDeNuevo, descartar } = useBorrador(`miniatura-comercial-${id}`);
  const [estado, setEstado] = useState<{ enviando: boolean; error: string; aviso: string }>({
    enviando: false,
    error: "",
    aviso: "",
  });

  async function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setEstado({ enviando: true, error: "", aviso: "" });
    try {
      const r = await elegirMiniatura(new FormData(evento.currentTarget));
      if (!r.ok) return setEstado({ enviando: false, error: r.error, aviso: "" });
      descartar();
      setEstado({
        enviando: false,
        error: "",
        aviso: r.cambio
          ? "Listo: la Mac la dibuja en un minuto y aparece al lado del video."
          : "Esa miniatura ya está hecha así: no hay nada que cambiar.",
      });
      router.refresh();
    } catch {
      setEstado({
        enviando: false,
        error: "Se cortó la conexión. Lo que elegiste sigue aquí: vuelve a intentarlo.",
        aviso: "",
      });
    }
  }

  return (
    <form ref={ref} onSubmit={enviar} className="max-w-3xl space-y-5">
      <AvisoBorrador visible={recuperado} alEmpezarDeNuevo={empezarDeNuevo} />
      <input type="hidden" name="id" value={id} />
      <fieldset>
        <legend className="etiqueta">La imagen que va en la miniatura</legend>
        <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {opciones.map((o) => (
            <label
              key={o.nombre}
              className="tarjeta flex cursor-pointer flex-col gap-2 p-2 text-xs has-[:checked]:border-emerald-500 has-[:checked]:ring-2 has-[:checked]:ring-emerald-500/40"
            >
              <span className="flex h-24 items-center justify-center overflow-hidden rounded-md bg-neutral-900">
                {o.imagenId ? (
                  // Sale del almacén con sesión: el optimizador de imágenes no aplica.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`/datos/imagenes/${o.imagenId}`}
                    alt={o.nombre}
                    loading="lazy"
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <span className="px-1 text-center text-neutral-500">sin vista previa</span>
                )}
              </span>
              <span className="flex items-center gap-2">
                <input
                  type="radio"
                  name="archivo"
                  value={o.nombre}
                  defaultChecked={o.nombre === inicial.archivo}
                  required
                />
                <span className="min-w-0 truncate text-neutral-300">{o.nombre}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <div>
        <label htmlFor="titulo" className="etiqueta">
          Texto grande (hasta {MAX_TITULO_PORTADA} letras)
        </label>
        <input
          id="titulo"
          name="titulo"
          className="campo"
          maxLength={MAX_TITULO_PORTADA}
          defaultValue={inicial.titulo}
          placeholder="Nombre del servicio o de la marca"
          required
        />
      </div>
      <div>
        <label htmlFor="frase" className="etiqueta">
          Frase de abajo, en color (opcional, hasta {MAX_FRASE_PORTADA} letras)
        </label>
        <input
          id="frase"
          name="frase"
          className="campo"
          maxLength={MAX_FRASE_PORTADA}
          defaultValue={inicial.frase}
          placeholder="Lo que gana el cliente en pocas palabras"
        />
      </div>
      {estado.error && (
        <p role="alert" className="text-sm text-red-300">
          {estado.error}
        </p>
      )}
      {estado.aviso && (
        <p role="status" className="text-sm text-emerald-300">
          {estado.aviso}
        </p>
      )}
      <button type="submit" className="boton" disabled={estado.enviando}>
        {estado.enviando ? "Guardando…" : "Hacer esta miniatura"}
      </button>
    </form>
  );
}
