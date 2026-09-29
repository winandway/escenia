"use client";

import { useEffect } from "react";

/** Enciende el servicio de la app instalable (pantalla «Sin conexión»). */
export function RegistrarApp() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .catch((e: unknown) => console.warn("No se pudo encender el servicio de la app:", e));
  }, []);
  return null;
}
