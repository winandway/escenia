"use client";

import { useState } from "react";

/**
 * La miniatura de una publicación: primero la de la plataforma (sale del
 * enlace) y, si no hay o no carga, la que Escenia armó para ese video.
 * Si no hay ninguna, no ocupa espacio. La miniatura de un Short es vertical:
 * al cargar se nota por sus medidas y se muestra de pie, sin recortarla.
 */
export function Miniatura({
  principal,
  respaldo,
  alt,
  className = "",
}: {
  principal: string | null;
  respaldo: string | null;
  alt: string;
  className?: string;
}) {
  const fuentes = [principal, respaldo].filter((f): f is string => Boolean(f));
  const [fallidas, setFallidas] = useState(0);
  const [vertical, setVertical] = useState(false);
  const src = fuentes[fallidas];
  if (!src) return null;
  return (
    // Miniaturas de otra plataforma o del almacén con sesión: el optimizador de imágenes no aplica.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFallidas((n) => n + 1)}
      onLoad={(e) => setVertical(e.currentTarget.naturalHeight > e.currentTarget.naturalWidth)}
      style={vertical ? { maxWidth: 150 } : undefined}
      className={`rounded object-cover ${vertical ? "aspect-[9/16]" : "aspect-video"} ${className}`}
    />
  );
}
