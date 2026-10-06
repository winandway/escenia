"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AvisoBorrador } from "@/componentes/AvisoBorrador";
import { useBorrador } from "@/componentes/useBorrador";
import { esquemaComercialNuevo, IDIOMAS, MAX_PALABRAS_COMERCIAL } from "@compartido/comerciales";
import { contarPalabras } from "@compartido/grabaciones";
import { ETIQUETA_VOZ, VOCES } from "@compartido/guion";
import { NOMBRE_FORMATO } from "@compartido/tematicas";

type Estado = { fase: "listo" | "enviando" | "hecho"; error: string };

export function FormularioComercial({ carpetas }: { carpetas: string[] }) {
  const router = useRouter();
  const { ref, recuperado, empezarDeNuevo, descartar } = useBorrador("comercial-nuevo");
  const [estado, setEstado] = useState<Estado>({ fase: "listo", error: "" });
  const [palabras, setPalabras] = useState(0);

  async function pedir(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const form = evento.currentTarget;
    const datos = new FormData(form);
    const parseo = esquemaComercialNuevo.safeParse({
      nombre: datos.get("nombre"),
      narracion: datos.get("narracion"),
      idioma: datos.get("idioma"),
      voz: datos.get("voz"),
      instrucciones: datos.get("instrucciones") ?? "",
      carpetas: datos.getAll("carpetas").map(String),
    });
    if (!parseo.success)
      return setEstado({ fase: "listo", error: parseo.error.issues[0]?.message ?? "Revisa los datos." });
    setEstado({ fase: "enviando", error: "" });
    try {
      const r = await fetch("/datos/comerciales", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(parseo.data),
      });
      const respuesta = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) return setEstado({ fase: "listo", error: respuesta.error ?? "No se pudo pedir el video." });
      descartar();
      form.reset();
      setEstado({ fase: "hecho", error: "" });
      router.refresh();
      document.getElementById("titulo-lista")?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch {
      setEstado({
        fase: "listo",
        error: "Se cortó la conexión. Lo que escribiste sigue aquí: vuelve a intentarlo.",
      });
    }
  }

  return (
    <>
      {estado.fase === "hecho" && (
        <div role="status" className="max-w-2xl rounded-md border border-emerald-900 bg-emerald-950/40 p-4">
          <p className="text-base font-semibold text-emerald-200">Listo: el video quedó pedido.</p>
          <p className="mt-1 text-sm text-emerald-100/90">
            No tienes que tocar nada más. La Mac baja las imágenes, arma el plan y el video; aquí abajo, en
            «Tus comerciales», ves cómo avanza.
          </p>
          <button
            type="button"
            onClick={() => setEstado({ fase: "listo", error: "" })}
            className="boton-suave mt-3"
          >
            Pedir otro video
          </button>
        </div>
      )}
      <form
        ref={ref}
        onSubmit={pedir}
        className={estado.fase === "hecho" ? "hidden" : "max-w-2xl space-y-5"}
        aria-hidden={estado.fase === "hecho"}
      >
        <AvisoBorrador visible={recuperado} alEmpezarDeNuevo={empezarDeNuevo} />
        <div>
          <label htmlFor="nombre" className="etiqueta">
            Nombre del video (el cliente y de qué es)
          </label>
          <input
            id="nombre"
            name="nombre"
            required
            minLength={3}
            maxLength={120}
            className="campo"
            placeholder="Cliente y tema del video"
          />
        </div>
        <div>
          <label htmlFor="narracion" className="etiqueta">
            El texto que lee la voz (tal como lo mandó el cliente)
          </label>
          <textarea
            id="narracion"
            name="narracion"
            required
            rows={9}
            className="campo"
            placeholder="Pega aquí el texto del video"
            onChange={(e) => setPalabras(contarPalabras(e.currentTarget.value))}
          />
          <p className="mt-1.5 text-xs text-neutral-400">
            {palabras} palabras · unos {Math.round(palabras / 2.5)} segundos. Hasta {MAX_PALABRAS_COMERCIAL}{" "}
            palabras (un minuto y medio).
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="idioma" className="etiqueta">
              Idioma del texto
            </label>
            <select id="idioma" name="idioma" required className="campo" defaultValue="es">
              {IDIOMAS.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.nombre}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="voz" className="etiqueta">
              Quién narra
            </label>
            <select id="voz" name="voz" required className="campo" defaultValue="femenina">
              {VOCES.map((v) => (
                <option key={v} value={v}>
                  {ETIQUETA_VOZ[v]}
                </option>
              ))}
            </select>
          </div>
        </div>
        <fieldset>
          <legend className="etiqueta">Carpetas de imágenes que se usan</legend>
          {carpetas.length === 0 ? (
            <p className="text-sm text-amber-300">
              Todavía no hay carpetas: sube primero las imágenes del cliente en «Imágenes».
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {carpetas.map((c) => (
                <label
                  key={c}
                  className="flex cursor-pointer items-center gap-2 rounded-full border border-neutral-700 px-3 py-1.5 text-sm text-neutral-200 has-[:checked]:border-amber-500 has-[:checked]:bg-amber-500/15"
                >
                  <input type="checkbox" name="carpetas" value={c} className="accent-amber-500" />
                  {c}
                </label>
              ))}
            </div>
          )}
        </fieldset>
        <div>
          <label htmlFor="instrucciones" className="etiqueta">
            Cómo quieres el video (opcional)
          </label>
          <textarea
            id="instrucciones"
            name="instrucciones"
            rows={3}
            maxLength={2000}
            className="campo"
            placeholder="Qué debe salir y cuándo: por ejemplo, que todos los logos pasen uno detrás de otro cuando habla de sus trabajos"
          />
        </div>
        <p className="text-xs text-neutral-400">
          Formato: <strong className="text-neutral-200">{NOMBRE_FORMATO.mixto}</strong>, sin marca de canal ni
          Shorts: el video es del cliente. Solo salen sus imágenes y diagramas de neón; nada de fotos de
          internet.
        </p>
        {estado.error && (
          <p role="alert" className="rounded-md border border-red-900 bg-red-950/50 p-3 text-sm text-red-200">
            {estado.error}
          </p>
        )}
        <button
          type="submit"
          disabled={estado.fase === "enviando" || carpetas.length === 0}
          className="boton"
        >
          {estado.fase === "enviando" ? "Pidiendo…" : "Pedir el video"}
        </button>
      </form>
    </>
  );
}
