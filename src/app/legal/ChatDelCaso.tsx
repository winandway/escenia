"use client";
// La conversación de un caso de ayuda (C-AYUDA-1): los mensajes como un chat y la caja para responder,
// que guarda lo escrito mientras se escribe. Se refresca sola cada 30 segundos mientras la página se ve.
// Las capturas (C-AYUDA-2) se suben apenas se eligen, cada una sola; si una falla, el texto se queda.
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useBorrador } from "@/componentes/useBorrador";
import { anotarCasoLocal } from "./casos-locales";
import type { IdiomaLegal } from "./SelectorIdioma";
import { colorDeEstado, etiquetaDeEstado, TEXTOS_AYUDA, type EstadoCasoWeb } from "./textos-ayuda";

const MAX_ADJUNTOS = 3;
const MAX_BYTES = 10 * 1_048_576;
const TIPOS_CON_VISTA = /^image\/(jpeg|png|webp)$/;

type AdjuntoVisto = { nombre: string; tipo: string; url: string };
type Caso = {
  numero: string;
  asunto: string;
  estado: EstadoCasoWeb;
  mensajes: { de: "cliente" | "soporte"; texto: string; fecha: string; adjuntos: AdjuntoVisto[] }[];
};
type Adjunto = {
  llave: string;
  nombre: string;
  vista: string | null;
  estado: "subiendo" | "listo" | "error";
  id?: number;
  motivo?: string;
};

function Clip() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path d="M21 11.5l-8.6 8.6a5 5 0 0 1-7.1-7.1l8.6-8.6a3.5 3.5 0 0 1 5 5l-8.6 8.6a2 2 0 0 1-2.8-2.8l7.9-7.9" />
    </svg>
  );
}

export function ChatDelCaso({ codigo, idioma }: { codigo: string; idioma: IdiomaLegal }) {
  const t = TEXTOS_AYUDA[idioma];
  const [caso, setCaso] = useState<Caso | null | "no_existe">(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [adjuntos, setAdjuntos] = useState<Adjunto[]>([]);
  const elegir = useRef<HTMLInputElement>(null);
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

  const cambiar = (llave: string, cambios: Partial<Adjunto>) =>
    setAdjuntos((lista) => lista.map((a) => (a.llave === llave ? { ...a, ...cambios } : a)));

  async function subir(llave: string, archivo: File) {
    try {
      const r = await fetch(
        `/datos/ayuda/casos/${encodeURIComponent(codigo)}/adjuntos?nombre=${encodeURIComponent(archivo.name)}`,
        {
          method: "POST",
          headers: { "content-type": archivo.type || "application/octet-stream" },
          body: archivo,
        },
      );
      const j = (await r.json().catch(() => ({}))) as { id?: number };
      if (!r.ok || !j.id) throw new Error(String(r.status));
      cambiar(llave, { estado: "listo", id: j.id });
    } catch {
      cambiar(llave, { estado: "error", motivo: t.adjunto_fallo });
    }
  }

  function alElegir(lista: FileList | null) {
    if (!lista?.length) return;
    const libres = MAX_ADJUNTOS - adjuntos.length;
    if (lista.length > libres) setError(t.adjuntos_max);
    for (const archivo of Array.from(lista).slice(0, Math.max(0, libres))) {
      const llave = crypto.randomUUID();
      const esImagen =
        /^image\/(jpeg|png|webp|heic|heif)$/.test(archivo.type) || /\.hei[cf]$/i.test(archivo.name);
      const motivo = !esImagen ? t.adjunto_tipo : archivo.size > MAX_BYTES ? t.adjunto_grande : "";
      const vista = !motivo && TIPOS_CON_VISTA.test(archivo.type) ? URL.createObjectURL(archivo) : null;
      setAdjuntos((l) => [
        ...l,
        { llave, nombre: archivo.name, vista, estado: motivo ? "error" : "subiendo", motivo },
      ]);
      if (!motivo) void subir(llave, archivo);
    }
    if (elegir.current) elegir.current.value = "";
  }

  function quitar(a: Adjunto) {
    if (a.vista) URL.revokeObjectURL(a.vista);
    setAdjuntos((l) => l.filter((x) => x.llave !== a.llave));
  }

  async function mandar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const texto = String(new FormData(form).get("texto") ?? "").trim();
    const listos = adjuntos.filter((a) => a.estado === "listo" && a.id).map((a) => a.id as number);
    if (enviando || (!texto && !listos.length)) return;
    if (adjuntos.some((a) => a.estado === "subiendo")) return setError(t.adjunto_esperar);
    setEnviando(true);
    setError("");
    try {
      const r = await fetch(`/datos/ayuda/casos/${encodeURIComponent(codigo)}/mensajes`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ texto, adjuntos: listos }),
      });
      if (!r.ok) {
        // El texto y las capturas se quedan en pantalla para intentarlo otra vez.
        setError(r.status === 429 ? t.error_intentos : r.status === 409 ? t.adjunto_reintentar : t.error_red);
        return;
      }
      descartar();
      form.reset();
      for (const a of adjuntos) if (a.vista) URL.revokeObjectURL(a.vista);
      setAdjuntos([]);
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
              {m.texto && <p className="mt-1 whitespace-pre-wrap break-words">{m.texto}</p>}
              {m.adjuntos.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {m.adjuntos.map((a) =>
                    TIPOS_CON_VISTA.test(a.tipo) ? (
                      <a
                        key={a.url}
                        href={a.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={t.adjunto_abrir}
                      >
                        {/* Capturas privadas con enlace firmado: se muestran tal cual. */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={a.url}
                          alt={a.nombre}
                          className="h-24 w-24 rounded-lg border border-white/20 object-cover"
                        />
                      </a>
                    ) : (
                      <a
                        key={a.url}
                        href={a.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 rounded-lg border border-current/20 px-2.5 py-1.5 text-sm underline"
                      >
                        <Clip /> {a.nombre}
                      </a>
                    ),
                  )}
                </div>
              )}
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
            maxLength={4000}
            rows={4}
            placeholder={t.responder_ph}
            className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 outline-none focus:border-[#0b0f19] focus:ring-2 focus:ring-amber-400/60"
          />
        </label>

        <div className="mt-2 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => elegir.current?.click()}
            disabled={adjuntos.length >= MAX_ADJUNTOS}
            className="flex items-center gap-2 rounded-lg border border-neutral-300 px-3 py-2 text-sm font-semibold hover:border-neutral-500 disabled:opacity-50"
          >
            <Clip /> {t.adjuntar}
          </button>
          <span className="text-xs text-neutral-500">{t.adjuntos_ayuda}</span>
          <input
            ref={elegir}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,.heic"
            multiple
            hidden
            onChange={(e) => alElegir(e.target.files)}
          />
        </div>
        {adjuntos.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-3">
            {adjuntos.map((a) => (
              <li key={a.llave} className="w-28">
                <div className="relative h-28 w-28 overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100">
                  {a.vista ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.vista} alt={a.nombre} className="h-full w-full object-cover" />
                  ) : (
                    <span className="flex h-full items-center justify-center px-2 text-center text-xs text-neutral-500">
                      {a.nombre}
                    </span>
                  )}
                  {a.estado === "subiendo" && (
                    <span className="absolute inset-x-0 bottom-0 bg-black/60 py-1 text-center text-xs text-white">
                      {t.adjunto_subiendo}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => quitar(a)}
                    aria-label={`${t.adjunto_quitar}: ${a.nombre}`}
                    className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-sm text-white hover:bg-black"
                  >
                    ×
                  </button>
                </div>
                {a.estado === "error" && (
                  <p className="mt-1 text-xs text-red-700">
                    {a.nombre} {a.motivo}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-4">
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
