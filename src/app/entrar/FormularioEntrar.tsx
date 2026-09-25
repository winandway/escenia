"use client";

import { useActionState } from "react";
import { CampoClave } from "@/componentes/CampoClave";
import { Turnstile } from "@/componentes/Turnstile";
import { entrar, type EstadoEntrada } from "./acciones";

export function FormularioEntrar({ siteKey }: { siteKey: string | undefined }) {
  const [estado, accion, pendiente] = useActionState<EstadoEntrada, FormData>(entrar, { error: "" });
  return (
    <form action={accion} className="space-y-4">
      <div>
        <label htmlFor="clave" className="etiqueta">
          Contraseña
        </label>
        <CampoClave name="clave" placeholder="Contraseña del panel" />
      </div>
      <Turnstile siteKey={siteKey} />
      {estado.error && (
        <p role="alert" className="text-sm text-red-400">
          {estado.error}
        </p>
      )}
      <button type="submit" disabled={pendiente} className="boton w-full">
        {pendiente ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
