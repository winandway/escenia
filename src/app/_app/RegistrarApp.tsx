"use client";

import { useEffect } from "react";
import { alAbrirLaApp, MARCA_DE_INICIO } from "@compartido/app";

/**
 * Enciende el servicio de la app instalable (pantalla «Sin conexión») y, en la
 * app ya instalada, la lleva al calendario al abrirse.
 */
export function RegistrarApp() {
  useEffect(() => {
    try {
      const instalada =
        window.matchMedia("(display-mode: standalone)").matches ||
        (navigator as Navigator & { standalone?: boolean }).standalone === true;
      const paso = alAbrirLaApp({
        instalada,
        ruta: window.location.pathname,
        yaLlevada: window.sessionStorage.getItem(MARCA_DE_INICIO) === "1",
      });
      if (paso.marcar) window.sessionStorage.setItem(MARCA_DE_INICIO, "1");
      if (paso.ir) window.location.replace(paso.ir);
    } catch (e) {
      // Sin memoria de sesión (modo privado): la app abre donde esté, sin romperse.
      console.warn("No se pudo decidir la pantalla de inicio de la app:", e);
    }
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .catch((e: unknown) => console.warn("No se pudo encender el servicio de la app:", e));
  }, []);
  return null;
}
