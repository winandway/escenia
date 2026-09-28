"use client";

import { useState } from "react";

/** Copia un texto al portapapeles (con respaldo para navegadores que lo bloquean) y avisa «Copiado». */
export function CopiarTexto({ texto, etiqueta = "Copiar" }: { texto: string; etiqueta?: string }) {
  const [estado, setEstado] = useState<"" | "ok" | "fallo">("");
  const copiar = async () => {
    let hecho = false;
    try {
      await navigator.clipboard.writeText(texto);
      hecho = true;
    } catch {
      // Respaldo: un campo invisible seleccionado y el comando clásico de copiar.
      const campo = document.createElement("textarea");
      campo.value = texto;
      campo.setAttribute("readonly", "");
      campo.style.position = "fixed";
      campo.style.opacity = "0";
      document.body.appendChild(campo);
      campo.select();
      try {
        hecho = document.execCommand("copy");
      } catch {
        hecho = false;
      }
      campo.remove();
    }
    setEstado(hecho ? "ok" : "fallo");
    setTimeout(() => setEstado(""), 1800);
  };
  return (
    <button type="button" className="boton-suave px-3 py-1 text-xs" onClick={copiar} aria-live="polite">
      {estado === "ok" ? "Copiado ✓" : estado === "fallo" ? "Selecciona y copia" : etiqueta}
    </button>
  );
}
