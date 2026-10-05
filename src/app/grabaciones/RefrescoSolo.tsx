"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Mientras haya algo en marcha, la lista se pone al día sola cada 12 segundos. */
export function RefrescoSolo({ activo }: { activo: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (!activo) return;
    const reloj = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, 12_000);
    return () => clearInterval(reloj);
  }, [activo, router]);
  return null;
}
