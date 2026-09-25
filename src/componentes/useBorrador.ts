"use client";

// Ningún formulario pierde lo escrito (regla global). Guarda en el navegador
// mientras se escribe y lo devuelve al volver. Lo sensible (contraseñas) no
// se guarda nunca.
import { useCallback, useEffect, useRef, useState } from "react";

const PREFIJO = "escenia:borrador:";
const ESPERA_MS = 500;
const CAMPOS_SENSIBLES = /clave|password|pin|cvv|tarjeta|token|secreto/i;

export type Borrador = Record<string, string>;

export function claveBorrador(formulario: string): string {
  return `${PREFIJO}${formulario}`;
}

export function leerBorrador(formulario: string): Borrador | null {
  try {
    const crudo = window.localStorage.getItem(claveBorrador(formulario));
    if (!crudo) return null;
    const datos = JSON.parse(crudo) as unknown;
    if (!datos || typeof datos !== "object") return null;
    return datos as Borrador;
  } catch {
    return null;
  }
}

export function guardarBorrador(formulario: string, datos: Borrador): void {
  const limpio: Borrador = {};
  for (const [k, v] of Object.entries(datos)) {
    if (CAMPOS_SENSIBLES.test(k)) continue;
    if (typeof v === "string" && v !== "") limpio[k] = v;
  }
  try {
    if (Object.keys(limpio).length === 0) window.localStorage.removeItem(claveBorrador(formulario));
    else window.localStorage.setItem(claveBorrador(formulario), JSON.stringify(limpio));
  } catch {
    // Sin almacenamiento (modo privado): el formulario sigue funcionando.
  }
}

export function borrarBorrador(formulario: string): void {
  try {
    window.localStorage.removeItem(claveBorrador(formulario));
  } catch {
    // nada que borrar
  }
}

/** Lee todos los campos con `name` de un <form> como texto. */
export function datosDelFormulario(form: HTMLFormElement): Borrador {
  const datos: Borrador = {};
  const fd = new FormData(form);
  fd.forEach((v, k) => {
    if (typeof v === "string") datos[k] = v;
  });
  return datos;
}

export function rellenarFormulario(form: HTMLFormElement, datos: Borrador): void {
  for (const [k, v] of Object.entries(datos)) {
    const campo = form.elements.namedItem(k);
    if (!campo || campo instanceof RadioNodeList) continue;
    const el = campo as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
    if (!("value" in el)) continue;
    if (el instanceof HTMLInputElement && (el.type === "password" || el.type === "file")) continue;
    if (el instanceof HTMLInputElement && (el.type === "checkbox" || el.type === "radio")) {
      el.checked = v === el.value || v === "on";
      continue;
    }
    el.value = v;
  }
}

/**
 * Se engancha a un <form> por ref. Devuelve si se recuperó un borrador, y
 * funciones para empezar de nuevo y para descartar al guardar con éxito.
 */
export function useBorrador(formulario: string) {
  const ref = useRef<HTMLFormElement>(null);
  const [recuperado, setRecuperado] = useState(false);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const form = ref.current;
    if (!form) return;
    const guardado = leerBorrador(formulario);
    let avisar: ReturnType<typeof setTimeout> | null = null;
    if (guardado) {
      rellenarFormulario(form, guardado);
      // Se avisa en el siguiente tick para no encadenar renders dentro del efecto.
      avisar = setTimeout(() => setRecuperado(true), 0);
    }
    const alEscribir = () => {
      if (temporizador.current) clearTimeout(temporizador.current);
      temporizador.current = setTimeout(
        () => guardarBorrador(formulario, datosDelFormulario(form)),
        ESPERA_MS,
      );
    };
    form.addEventListener("input", alEscribir);
    form.addEventListener("change", alEscribir);
    return () => {
      form.removeEventListener("input", alEscribir);
      form.removeEventListener("change", alEscribir);
      if (avisar) clearTimeout(avisar);
      if (temporizador.current) clearTimeout(temporizador.current);
    };
  }, [formulario]);

  const empezarDeNuevo = useCallback(() => {
    borrarBorrador(formulario);
    ref.current?.reset();
    setRecuperado(false);
  }, [formulario]);

  const descartar = useCallback(() => {
    if (temporizador.current) clearTimeout(temporizador.current);
    borrarBorrador(formulario);
  }, [formulario]);

  return { ref, recuperado, empezarDeNuevo, descartar };
}
