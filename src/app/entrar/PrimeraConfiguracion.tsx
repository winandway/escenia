"use client";

// Primera vez: el panel todavía no tiene contraseña. Esta pantalla genera la
// huella EN EL NAVEGADOR (la contraseña nunca sale de aquí) y la persona la
// pega en las variables del panel de YaDominios. Sin terminal.
import { useState } from "react";
import { CampoClave } from "@/componentes/CampoClave";
import { huellaDeClave } from "@/lib/clave";

const MINIMO = 12;

export function PrimeraConfiguracion({ faltan }: { faltan: string[] }) {
  const [huella, setHuella] = useState("");
  const [error, setError] = useState("");
  const [copiado, setCopiado] = useState(false);
  const [trabajando, setTrabajando] = useState(false);

  async function generar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const datos = new FormData(e.currentTarget);
    const clave = String(datos.get("clave") ?? "");
    const otraVez = String(datos.get("clave2") ?? "");
    setCopiado(false);
    if (clave.length < MINIMO) return setError(`Usa una contraseña de al menos ${MINIMO} letras.`);
    if (clave !== otraVez) return setError("Las dos contraseñas no coinciden.");
    setError("");
    setTrabajando(true);
    try {
      setHuella(await huellaDeClave(clave));
    } finally {
      setTrabajando(false);
    }
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(huella);
      setCopiado(true);
    } catch {
      setCopiado(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-md border border-amber-800 bg-amber-950/40 p-3 text-sm text-amber-100">
        El panel todavía no está configurado. Faltan en YaDominios Cloud → tarjeta de <strong>escenia</strong>{" "}
        → Variables de entorno: <code className="text-xs">{faltan.join(", ")}</code>.
      </div>

      {faltan.includes("PANEL_CLAVE_HUELLA") && (
        <form onSubmit={generar} className="space-y-4">
          <p className="text-sm text-neutral-300">
            Elige la contraseña con la que vas a entrar. Aquí se convierte en un valor seguro (la contraseña
            no se envía a ningún lado) y ese valor lo pegas en la casilla{" "}
            <code className="text-xs">PANEL_CLAVE_HUELLA</code>.
          </p>
          <div>
            <label htmlFor="clave" className="etiqueta">
              Contraseña nueva (mínimo {MINIMO} letras)
            </label>
            <CampoClave name="clave" autoComplete="new-password" placeholder="Contraseña del panel" />
          </div>
          <div>
            <label htmlFor="clave2" className="etiqueta">
              Escríbela otra vez
            </label>
            <CampoClave name="clave2" autoComplete="new-password" placeholder="La misma contraseña" />
          </div>
          {error && (
            <p role="alert" className="text-sm text-red-400">
              {error}
            </p>
          )}
          <button type="submit" disabled={trabajando} className="boton w-full">
            {trabajando ? "Generando…" : "Generar el valor para el panel"}
          </button>
        </form>
      )}

      {huella && (
        <div className="space-y-2">
          <label htmlFor="huella" className="etiqueta">
            Pega esto en la casilla PANEL_CLAVE_HUELLA
          </label>
          <textarea
            id="huella"
            readOnly
            value={huella}
            rows={3}
            className="campo font-mono text-xs"
            onFocus={(e) => e.currentTarget.select()}
          />
          <button type="button" onClick={copiar} className="boton-suave w-full">
            {copiado ? "Copiado ✓" : "Copiar"}
          </button>
          <p className="text-xs text-neutral-500">
            Después de guardar las variables, espera unos 2 minutos y recarga esta página: te pedirá la
            contraseña.
          </p>
        </div>
      )}
    </div>
  );
}
