"use client";

import { useEffect, useState } from "react";

type AvisoDeInstalacion = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/**
 * Instalar el panel en el teléfono. En Android y en la computadora el
 * navegador ofrece el botón; en iPhone se hace desde el menú Compartir.
 */
export function InstalarApp() {
  const [aviso, setAviso] = useState<AvisoDeInstalacion | null>(null);
  const [instalada, setInstalada] = useState(false);
  const [esIphone, setEsIphone] = useState(false);

  useEffect(() => {
    const alOfrecer = (e: Event) => {
      e.preventDefault();
      setAviso(e as AvisoDeInstalacion);
    };
    const alInstalar = () => {
      setInstalada(true);
      setAviso(null);
    };
    window.addEventListener("beforeinstallprompt", alOfrecer);
    window.addEventListener("appinstalled", alInstalar);
    const inicio = setTimeout(() => {
      setInstalada(
        window.matchMedia("(display-mode: standalone)").matches ||
          (navigator as Navigator & { standalone?: boolean }).standalone === true,
      );
      setEsIphone(/iphone|ipad|ipod/i.test(navigator.userAgent));
    }, 0);
    return () => {
      clearTimeout(inicio);
      window.removeEventListener("beforeinstallprompt", alOfrecer);
      window.removeEventListener("appinstalled", alInstalar);
    };
  }, []);

  if (instalada)
    return <p className="text-sm text-emerald-300">Escenia ya está instalada en este dispositivo.</p>;

  return (
    <div className="space-y-3 text-sm">
      {aviso && (
        <button
          type="button"
          className="boton"
          onClick={async () => {
            await aviso.prompt();
            const { outcome } = await aviso.userChoice;
            if (outcome === "accepted") setInstalada(true);
            setAviso(null);
          }}
        >
          Instalar Escenia
        </button>
      )}
      {esIphone ? (
        <ol className="list-decimal space-y-1 pl-5 text-neutral-300">
          <li>Abre esta página en Safari.</li>
          <li>Toca el botón Compartir (el cuadro con la flecha hacia arriba).</li>
          <li>Elige «Agregar a inicio» y después «Agregar».</li>
        </ol>
      ) : (
        !aviso && (
          <ol className="list-decimal space-y-1 pl-5 text-neutral-300">
            <li>Abre esta página en Chrome.</li>
            <li>Toca los tres puntos de arriba a la derecha.</li>
            <li>Elige «Instalar app» o «Agregar a pantalla principal».</li>
          </ol>
        )
      )}
      <p className="text-xs text-neutral-500">
        Queda con su ícono en la pantalla del teléfono y abre sin la barra del navegador.
      </p>
    </div>
  );
}
