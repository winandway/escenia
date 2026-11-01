"use client";
// El formulario para abrir un caso de ayuda desde la página de soporte (C-AYUDA-1). Guarda lo escrito
// mientras se escribe y no se limpia hasta que el caso queda creado (regla global de formularios).
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useBorrador } from "@/componentes/useBorrador";
import { anotarCasoLocal } from "./casos-locales";
import { MisCasosWeb } from "./MisCasosWeb";
import type { IdiomaLegal } from "./SelectorIdioma";
import { rutaDelCaso, TEXTOS_AYUDA } from "./textos-ayuda";

const campo =
  "mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900 outline-none focus:border-[#0b0f19] focus:ring-2 focus:ring-amber-400/60";

export function FormularioAyuda({ idioma }: { idioma: IdiomaLegal }) {
  const t = TEXTOS_AYUDA[idioma];
  const router = useRouter();
  const { ref, recuperado, empezarDeNuevo, descartar } = useBorrador(`ayuda-web-${idioma}`);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");

  async function mandar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (enviando) return;
    const f = new FormData(e.currentTarget);
    setEnviando(true);
    setError("");
    try {
      const r = await fetch("/datos/ayuda/casos", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          origen: "web",
          idioma,
          nombre: f.get("nombre"),
          correo: f.get("correo"),
          asunto: f.get("asunto"),
          mensaje: f.get("mensaje"),
          sitio_web: f.get("sitio_web") || undefined,
        }),
      });
      const j = (await r.json().catch(() => ({}))) as { codigo?: string };
      if (!r.ok || !j.codigo) {
        setError(r.status === 429 ? t.error_intentos : r.status === 400 ? t.error_datos : t.error_red);
        return;
      }
      descartar();
      anotarCasoLocal(j.codigo);
      router.push(rutaDelCaso(idioma, j.codigo));
    } catch {
      setError(t.error_red);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <section className="mt-8 rounded-2xl border border-neutral-200 bg-neutral-50 p-5 sm:p-6">
      <h2 className="text-xl font-semibold">{t.form_titulo}</h2>
      <p className="mt-1 text-sm text-neutral-600">{t.form_sub}</p>
      {recuperado && (
        <p className="mt-3 flex flex-wrap items-center gap-3 text-sm text-amber-800">
          <span>{t.recuperado}</span>
          <button type="button" onClick={empezarDeNuevo} className="underline hover:text-amber-950">
            {t.empezar_de_nuevo}
          </button>
        </p>
      )}
      <form ref={ref} onSubmit={(e) => void mandar(e)} className="relative mt-4 grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium">
          {t.nombre}
          <input
            name="nombre"
            required
            maxLength={80}
            autoComplete="name"
            placeholder={t.nombre_ph}
            className={campo}
          />
        </label>
        <label className="text-sm font-medium">
          {t.correo}
          <input
            name="correo"
            type="email"
            required
            maxLength={120}
            autoComplete="email"
            placeholder={t.correo_ph}
            className={campo}
          />
        </label>
        <label className="text-sm font-medium sm:col-span-2">
          {t.asunto}
          <input name="asunto" required maxLength={120} placeholder={t.asunto_ph} className={campo} />
        </label>
        <label className="text-sm font-medium sm:col-span-2">
          {t.mensaje}
          <textarea
            name="mensaje"
            required
            maxLength={4000}
            rows={6}
            placeholder={t.mensaje_ph}
            className={campo}
          />
        </label>
        {/* Trampa para robots: una persona no la ve ni la llena. */}
        <input
          name="sitio_web"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          className="absolute -left-[9999px] h-px w-px opacity-0"
        />
        <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
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
          <p role="alert" className="text-sm text-red-700 sm:col-span-2">
            {error}
          </p>
        )}
      </form>
      <MisCasosWeb idioma={idioma} />
    </section>
  );
}
