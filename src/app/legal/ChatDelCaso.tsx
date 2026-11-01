"use client";
// La conversación de un caso de ayuda (C-AYUDA-1): los mensajes como un chat y la caja para responder,
// que guarda lo escrito mientras se escribe. Se refresca sola cada 30 segundos mientras la página se ve.
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useBorrador } from "@/componentes/useBorrador";
import { anotarCasoLocal } from "./casos-locales";
import type { IdiomaLegal } from "./SelectorIdioma";
import { colorDeEstado, etiquetaDeEstado, TEXTOS_AYUDA, type EstadoCasoWeb } from "./textos-ayuda";

type Caso = {
  numero: string;
  asunto: string;
  estado: EstadoCasoWeb;
  mensajes: { de: "cliente" | "soporte"; texto: string; fecha: string }[];
};

export function ChatDelCaso({ codigo, idioma }: { codigo: string; idioma: IdiomaLegal }) {
  const t = TEXTOS_AYUDA[idioma];
  const [caso, setCaso] = useState<Caso | null | "no_existe">(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const { ref, recuperado, empezarDeNuevo, descartar } = useBorrador(`ayuda-caso-${codigo}`);
  const fecha = new Intl.DateTimeFormat(idioma === "es" ? "es-US" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const cargar = useCallback(async () => {
    try {
      const r = await fetch(`/datos/ayuda/casos/${encodeURIComponent(codigo)}`, { cache: "no-store" });
      if (r.status === 404) return setCaso("no_existe");
      if (r.ok) setCaso((await r.json()) as Caso);
    } catch {
      // Sin red: se queda lo que ya se veía y se reintenta en la próxima vuelta.
    }
  }, [codigo]);

  useEffect(() => {
    anotarCasoLocal(codigo);
    // La primera carga va en el siguiente tick, para no encadenar renders dentro del efecto.
    const primera = setTimeout(() => void cargar(), 0);
    const cada = setInterval(() => {
      if (document.visibilityState === "visible") void cargar();
    }, 30_000);
    return () => {
      clearTimeout(primera);
      clearInterval(cada);
    };
  }, [codigo, cargar]);

  async function mandar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const texto = String(new FormData(form).get("texto") ?? "").trim();
    if (!texto || enviando) return;
    setEnviando(true);
    setError("");
    try {
      const r = await fetch(`/datos/ayuda/casos/${encodeURIComponent(codigo)}/mensajes`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ texto }),
      });
      if (!r.ok) {
        setError(r.status === 429 ? t.error_intentos : t.error_red);
        return;
      }
      descartar();
      form.reset();
      await cargar();
    } catch {
      setError(t.error_red);
    } finally {
      setEnviando(false);
    }
  }

  if (caso === null) return <p className="text-neutral-500">{t.cargando}</p>;
  if (caso === "no_existe")
    return (
      <div>
        <p>{t.no_existe}</p>
        <a
          href={idioma === "es" ? "/es/support" : "/support"}
          className="mt-4 inline-block font-semibold underline"
        >
          {t.volver}
        </a>
      </div>
    );

  return (
    <div>
      <a
        href={idioma === "es" ? "/es/support" : "/support"}
        className="text-sm text-neutral-500 hover:text-neutral-900"
      >
        {t.volver}
      </a>
      <p className="mt-4 font-mono text-sm text-neutral-500">
        {t.caso} {caso.numero}
      </p>
      <div className="mt-1 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">{caso.asunto}</h1>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${colorDeEstado(caso.estado)}`}>
          {etiquetaDeEstado(idioma, caso.estado)}
        </span>
      </div>
      <p className="mt-2 text-sm text-neutral-500">{t.enlace_privado}</p>

      <ol className="mt-6 grid gap-3">
        {caso.mensajes.map((m, i) => (
          <li
            key={`${m.fecha}-${i}`}
            className={`flex ${m.de === "cliente" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 ${m.de === "cliente" ? "bg-[#0b0f19] text-white" : "border border-neutral-200 bg-neutral-50"}`}
            >
              <p
                className={`text-xs font-semibold ${m.de === "cliente" ? "text-white/60" : "text-neutral-500"}`}
              >
                {m.de === "cliente" ? t.tu : t.soporte} · {fecha.format(new Date(m.fecha))}
              </p>
              <p className="mt-1 whitespace-pre-wrap break-words">{m.texto}</p>
            </div>
          </li>
        ))}
      </ol>
      {caso.estado === "abierto" && <p className="mt-3 text-sm text-neutral-500">{t.respondemos}</p>}

      <form ref={ref} onSubmit={(e) => void mandar(e)} className="mt-8">
        {caso.estado === "cerrado" && <p className="mb-2 text-sm text-neutral-600">{t.cerrado_nota}</p>}
        {recuperado && (
          <p className="mb-2 flex flex-wrap items-center gap-3 text-sm text-amber-800">
            <span>{t.recuperado}</span>
            <button type="button" onClick={empezarDeNuevo} className="underline hover:text-amber-950">
              {t.empezar_de_nuevo}
            </button>
          </p>
        )}
        <label className="text-sm font-medium">
          {t.responder}
          <textarea
            name="texto"
            required
            maxLength={4000}
            rows={4}
            placeholder={t.responder_ph}
            className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 outline-none focus:border-[#0b0f19] focus:ring-2 focus:ring-amber-400/60"
          />
        </label>
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <button
            type="submit"
            disabled={enviando}
            className="rounded-lg bg-[#0b0f19] px-5 py-2.5 font-semibold text-white hover:bg-[#1c2333] disabled:opacity-60"
          >
            {enviando ? t.mandando : t.mandar}
          </button>
          <span className="text-xs text-neutral-500">{t.no_mandes}</span>
        </div>
        {error && (
          <p role="alert" className="mt-2 text-sm text-red-700">
            {error}
          </p>
        )}
      </form>
    </div>
  );
}
