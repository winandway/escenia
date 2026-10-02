"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AvisoBorrador } from "@/componentes/AvisoBorrador";
import { useBorrador } from "@/componentes/useBorrador";
import {
  esquemaSonidoNuevo,
  extensionDe,
  GENEROS,
  MAX_BYTES_SONIDO,
  ORIGENES,
  USOS_EFECTO,
  type TipoSonido,
} from "@compartido/sonidos";

type Estado = { fase: "listo" | "subiendo"; error: string; ok: string };

export function FormularioSonido() {
  const router = useRouter();
  const { ref, recuperado, empezarDeNuevo, descartar } = useBorrador("sonido-nuevo");
  const [tipo, setTipo] = useState<TipoSonido>("musica");
  const [estado, setEstado] = useState<Estado>({ fase: "listo", error: "", ok: "" });

  async function subir(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const form = evento.currentTarget;
    const datos = new FormData(form);
    const archivo = datos.get("archivo");
    if (!(archivo instanceof File) || archivo.size === 0) {
      setEstado({ fase: "listo", error: "Elige el archivo de audio que quieres subir.", ok: "" });
      return;
    }
    if (archivo.size > MAX_BYTES_SONIDO) {
      setEstado({
        fase: "listo",
        error: `El archivo pasa de ${MAX_BYTES_SONIDO / 1_048_576} MB. Súbelo en MP3.`,
        ok: "",
      });
      return;
    }
    const parseo = esquemaSonidoNuevo.safeParse({
      tipo,
      nombre: datos.get("nombre"),
      genero: tipo === "musica" ? datos.get("genero") : "",
      uso: tipo === "efecto" ? datos.get("uso") : "",
      origen: datos.get("origen"),
      extension: extensionDe(archivo.name),
    });
    if (!parseo.success) {
      setEstado({ fase: "listo", error: parseo.error.issues[0]?.message ?? "Revisa los datos.", ok: "" });
      return;
    }
    setEstado({ fase: "subiendo", error: "", ok: "" });
    try {
      const r = await fetch(`/datos/sonidos?${new URLSearchParams(parseo.data)}`, {
        method: "POST",
        body: archivo,
        headers: { "content-type": "application/octet-stream" },
      });
      const respuesta = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) {
        // Lo escrito se queda en pantalla: se corrige y se vuelve a intentar.
        setEstado({
          fase: "listo",
          error: respuesta.error ?? "No se pudo subir. Inténtalo otra vez.",
          ok: "",
        });
        return;
      }
      descartar();
      form.reset();
      setEstado({ fase: "listo", error: "", ok: `«${parseo.data.nombre}» ya está en tu biblioteca.` });
      router.refresh();
    } catch {
      setEstado({
        fase: "listo",
        error: "Se cortó la conexión mientras subía. Lo que escribiste sigue aquí: vuelve a intentarlo.",
        ok: "",
      });
    }
  }

  return (
    <form ref={ref} onSubmit={subir} className="max-w-2xl space-y-5">
      <AvisoBorrador visible={recuperado} alEmpezarDeNuevo={empezarDeNuevo} />

      <div>
        <span className="etiqueta" id="etiqueta-tipo">
          Qué vas a subir
        </span>
        <div className="flex flex-wrap gap-2" role="group" aria-labelledby="etiqueta-tipo">
          {(
            [
              ["musica", "Música de fondo"],
              ["efecto", "Efecto de sonido"],
            ] as const
          ).map(([id, nombre]) => (
            <button
              key={id}
              type="button"
              aria-pressed={tipo === id}
              onClick={() => setTipo(id)}
              className={`rounded-full border px-4 py-2 text-sm font-medium ${
                tipo === id
                  ? "border-amber-500 bg-amber-500 text-neutral-950"
                  : "border-neutral-700 text-neutral-200 hover:bg-neutral-800"
              }`}
            >
              {nombre}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="archivo" className="etiqueta">
          Archivo de audio (MP3, M4A o WAV, hasta {MAX_BYTES_SONIDO / 1_048_576} MB)
        </label>
        <input
          id="archivo"
          name="archivo"
          type="file"
          accept="audio/*,.mp3,.m4a,.wav,.ogg,.aac"
          required
          className="campo file:mr-3 file:rounded-md file:border-0 file:bg-neutral-700 file:px-3 file:py-1.5 file:text-neutral-100"
        />
      </div>

      <div>
        <label htmlFor="nombre" className="etiqueta">
          Nombre
        </label>
        <input
          id="nombre"
          name="nombre"
          required
          minLength={2}
          maxLength={80}
          className="campo"
          placeholder={tipo === "musica" ? "Nombre de la pista" : "Nombre del efecto"}
        />
      </div>

      {tipo === "musica" ? (
        <div>
          <label htmlFor="genero" className="etiqueta">
            Género (con esto se elige sola para cada video)
          </label>
          <select id="genero" name="genero" required className="campo" defaultValue="">
            <option value="" disabled>
              Elige el género
            </option>
            {GENEROS.map((g) => (
              <option key={g.id} value={g.id}>
                {g.nombre}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <div>
          <label htmlFor="uso" className="etiqueta">
            Para qué se usa
          </label>
          <select id="uso" name="uso" required className="campo" defaultValue="">
            <option value="" disabled>
              Elige dónde suena
            </option>
            {USOS_EFECTO.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nombre}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label htmlFor="origen" className="etiqueta">
          De dónde salió
        </label>
        <select id="origen" name="origen" required className="campo" defaultValue="">
          <option value="" disabled>
            Elige una opción
          </option>
          {ORIGENES.map((o) => (
            <option key={o.id} value={o.id}>
              {o.nombre}
            </option>
          ))}
        </select>
        <p className="mt-1.5 text-xs text-neutral-400">
          No subas canciones comerciales de artistas: YouTube las reconoce y el video deja de monetizar.
        </p>
      </div>

      {estado.error && (
        <p role="alert" className="rounded-md border border-red-900 bg-red-950/50 p-3 text-sm text-red-200">
          {estado.error}
        </p>
      )}
      {estado.ok && (
        <p
          role="status"
          className="rounded-md border border-emerald-900 bg-emerald-950/40 p-3 text-sm text-emerald-200"
        >
          {estado.ok}
        </p>
      )}

      <button type="submit" disabled={estado.fase === "subiendo"} className="boton">
        {estado.fase === "subiendo" ? "Subiendo…" : "Subir a mi biblioteca"}
      </button>
    </form>
  );
}
