import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

// Cabeceras de seguridad para todo el panel. Es un panel privado:
// nadie lo mete en un iframe y no carga nada de terceros salvo Turnstile.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com",
  "style-src 'self' 'unsafe-inline'",
  // i.ytimg.com: las miniaturas de YouTube del calendario de publicaciones.
  "img-src 'self' data: blob: https://images.pexels.com https://i.ytimg.com",
  "media-src 'self' blob:",
  "connect-src 'self'",
  "worker-src 'self'",
  "manifest-src 'self'",
  "frame-src https://challenges.cloudflare.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

// El estudio del Podcast IA (docs/PODCAST.md) es la única página que usa el micrófono y la cámara, y la única
// que habla con ElevenLabs: su conversación va por un WebSocket con URL firmada. Los worklets de audio se
// sirven desde el panel (public/podcast/worklets); el de remuestreo trae WebAssembly ('wasm-unsafe-eval').
const cspPodcast = csp
  .replace("script-src 'self'", "script-src 'self' 'wasm-unsafe-eval'")
  .replace("connect-src 'self'", "connect-src 'self' wss://api.elevenlabs.io wss://api.us.elevenlabs.io");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // La Estación tiene su propio lockfile; sin esto Next duda de cuál es la raíz.
  turbopack: { root: process.cwd() },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
      // Va después: para /podcast estas dos cabeceras reemplazan a las de arriba.
      {
        source: "/podcast",
        headers: [
          { key: "Content-Security-Policy", value: cspPodcast },
          { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;

initOpenNextCloudflareForDev();
