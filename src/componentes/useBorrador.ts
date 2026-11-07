"use client";

// Ningún formulario pierde lo escrito (regla global). Guarda en el navegador
// mientras se escribe y lo devuelve al volver. Lo sensible (contraseñas) no
// se guarda nunca.
import { useCallback, useEffect, useRef, useState } from "react";

const PREFIJO = "escenia:borrador:";
const ESPERA_MS = 500;
const CAMPOS_SENSIBLES = /clave|password|pin|cvv|tarjeta|token|secreto/i;
// Campos ocultos que el propio framework mete en el formulario («$ACTION_…»):
// no son de la persona y guardarlos rompería el envío con un valor viejo.
const CAMPOS_INTERNOS = /^\$/;
// Un grupo (las voces en radio, las carpetas en casillas) guarda sus valores juntos con este separador.
const SEPARADOR = "\u001f";
/**
 * Una casilla que la persona DESMARCÓ no viaja en FormData: sin esta marca, al volver la casilla quedaba
 * otra vez marcada (por ejemplo, el permiso de la ficha del podcast). Lo encontró el revisor el 7 nov 2026.
 */
export const SIN_MARCAR = "\u001esin-marcar";

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
    if (CAMPOS_SENSIBLES.test(k) || CAMPOS_INTERNOS.test(k)) continue;
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
    if (typeof v !== "string") return;
    // Los campos ocultos los pone el programa, no la persona: no son borrador.
    const campo = form.elements.namedItem(k);
    if (campo instanceof HTMLInputElement && campo.type === "hidden") return;
    // Varias casillas con el mismo nombre (las carpetas): se guardan todas, no solo la última.
    datos[k] = k in datos ? `${datos[k]}${SEPARADOR}${v}` : v;
  });
  // Solo las que venían marcadas y la persona desmarcó: un formulario sin tocar no deja borrador.
  for (const el of Array.from(form.elements)) {
    if (!(el instanceof HTMLInputElement) || el.type !== "checkbox" || !el.name) continue;
    if (!(el.name in datos) && el.defaultChecked) datos[el.name] = SIN_MARCAR;
  }
  return datos;
}

export function rellenarFormulario(form: HTMLFormElement, datos: Borrador): void {
  for (const [k, v] of Object.entries(datos)) {
    if (CAMPOS_INTERNOS.test(k)) continue;
    const campo = form.elements.namedItem(k);
    if (!campo) continue;
    // Un grupo de radios o de casillas: se marcan las que estaban marcadas (antes se saltaba y se perdía).
    if (campo instanceof RadioNodeList) {
      const valores = v.split(SEPARADOR);
      for (const el of Array.from(campo))
        if (el instanceof HTMLInputElement && (el.type === "checkbox" || el.type === "radio"))
          el.checked = valores.includes(el.value);
      continue;
    }
    const el = campo as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
    if (!("value" in el)) continue;
    if (el instanceof HTMLInputElement && ["password", "file", "hidden"].includes(el.type)) continue;
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

  // Al guardar con éxito: se borra el borrador y se quita el aviso (si no, «Recuperamos…» seguía ahí).
  const descartar = useCallback(() => {
    if (temporizador.current) clearTimeout(temporizador.current);
    borrarBorrador(formulario);
    setRecuperado(false);
  }, [formulario]);

  return { ref, recuperado, empezarDeNuevo, descartar };
}
