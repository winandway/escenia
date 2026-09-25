"use client";

import Script from "next/script";

/** Recuadro de Turnstile. Si no hay clave de sitio, no pinta nada. */
export function Turnstile({ siteKey }: { siteKey: string | undefined }) {
  if (!siteKey) return null;
  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        async
        defer
        strategy="afterInteractive"
      />
      <div className="cf-turnstile my-3" data-sitekey={siteKey} data-theme="dark" data-language="es" />
    </>
  );
}
