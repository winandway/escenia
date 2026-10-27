"use client";

/** «Cambiar algo»: lleva al cuadro de escribir; el cambio se le pide al Director con palabras. */
export function BotonCambiar() {
  return (
    <button
      type="button"
      className="boton-suave"
      onClick={() => {
        const campo = document.getElementById("mensaje");
        if (!(campo instanceof HTMLTextAreaElement)) return;
        campo.placeholder = "Dile qué cambiar: el texto, la voz, la persona, las fotos…";
        campo.scrollIntoView({ block: "center", behavior: "smooth" });
        campo.focus();
      }}
    >
      Cambiar algo
    </button>
  );
}
