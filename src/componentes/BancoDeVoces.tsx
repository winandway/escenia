"use client";

// El banco de voces (pedido por Richard el 17 oct 2026): cada voz en su tarjeta, con un botón para oír
// la muestra antes de elegirla. Una sola pieza para todos los formularios que eligen voz.
import { useEffect, useRef, useState } from "react";
import { ETIQUETA_VOZ, VOCES, type Voz } from "@compartido/guion";

export const DESCRIPCION_VOZ: Record<Voz, string> = {
  richard: "Tu voz (clonada): hombre, cercana y natural.",
  femenina: "Mujer, tono neutro de catálogo.",
  venezolana: "Chica joven de Caracas, alegre: ideal para anuncios.",
};

export const muestraDeVoz = (voz: Voz) => `/datos/archivos/voces/${voz}.mp3`;

export function BancoDeVoces({ nombre = "voz", porDefecto }: { nombre?: string; porDefecto: Voz }) {
  const [sonando, setSonando] = useState<Voz | null>(null);
  const [sinMuestra, setSinMuestra] = useState<Voz[]>([]);
  const audio = useRef<HTMLAudioElement | null>(null);

  useEffect(() => () => audio.current?.pause(), []);

  function tocar(voz: Voz) {
    if (sonando === voz) {
      audio.current?.pause();
      setSonando(null);
      return;
    }
    audio.current?.pause();
    const a = new Audio(muestraDeVoz(voz));
    a.onended = () => setSonando(null);
    a.onerror = () => {
      setSonando(null);
      setSinMuestra((l) => (l.includes(voz) ? l : [...l, voz]));
    };
    audio.current = a;
    setSonando(voz);
    a.play().catch(() => setSonando(null));
  }

  return (
    <fieldset>
      <legend className="etiqueta">Quién narra (dale play para oír cada voz)</legend>
      <div className="grid gap-2 sm:grid-cols-3">
        {VOCES.map((v) => (
          <label
            key={v}
            className="flex cursor-pointer items-center gap-3 rounded-lg border border-neutral-700 p-3 text-sm has-[:checked]:border-amber-500 has-[:checked]:bg-amber-500/10"
          >
            <input
              type="radio"
              name={nombre}
              value={v}
              defaultChecked={v === porDefecto}
              aria-label={ETIQUETA_VOZ[v]}
              className="accent-amber-500"
            />
            <span className="min-w-0 flex-1">
              <span className="block font-medium text-neutral-100">{ETIQUETA_VOZ[v]}</span>
              <span className="block text-xs text-neutral-400">
                {sinMuestra.includes(v) ? "Todavía no tiene muestra para oír." : DESCRIPCION_VOZ[v]}
              </span>
            </span>
            <button
              type="button"
              onClick={() => tocar(v)}
              aria-label={
                sonando === v ? `Pausar la muestra: ${ETIQUETA_VOZ[v]}` : `Oír la muestra: ${ETIQUETA_VOZ[v]}`
              }
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500 text-neutral-950 hover:bg-amber-400"
            >
              {sonando === v ? (
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
                  <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
