// Servicio de la app instalable de Escenia (C-APP-1).
// Hace UNA sola cosa: si no hay internet, muestra la pantalla «Sin conexión»
// en vez del error del navegador. Guarda esa pantalla y los archivos fijos
// que la visten (estilos y letras de /_next/static/, que no cambian ni llevan
// datos). NO guarda pantallas del panel ni datos: eso va siempre a la red.
const VERSION = "escenia-v2";
const SIN_CONEXION = "/sin-conexion";
const FIJOS = "/_next/static/";

async function preparar() {
  const cache = await caches.open(VERSION);
  const pagina = await fetch(new Request(SIN_CONEXION, { cache: "reload" }));
  if (!pagina.ok) throw new Error(`La pantalla sin conexión respondió ${pagina.status}`);
  const html = await pagina.clone().text();
  await cache.put(SIN_CONEXION, pagina);
  const fijos = new Set();
  for (const parte of html.split(FIJOS).slice(1)) {
    const fin = parte.search(/["'\\)\s<]/);
    if (fin > 0) fijos.add(FIJOS + parte.slice(0, fin));
  }
  // Si un archivo fijo no baja, la pantalla igual se muestra (sin ese adorno).
  await Promise.all([...fijos].map((ruta) => cache.add(ruta).catch(() => undefined)));
}

self.addEventListener("install", (evento) => {
  evento.waitUntil(preparar().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((claves) => Promise.all(claves.filter((c) => c !== VERSION).map((c) => caches.delete(c))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (evento) => {
  const pedido = evento.request;
  if (pedido.method !== "GET") return;
  if (pedido.mode === "navigate") {
    evento.respondWith(
      fetch(pedido).catch(() => caches.match(SIN_CONEXION).then((pagina) => pagina ?? Response.error())),
    );
    return;
  }
  const url = new URL(pedido.url);
  if (url.origin === self.location.origin && url.pathname.startsWith(FIJOS)) {
    // Solo se sirve de la memoria lo que ya se guardó al instalar; lo demás, a la red.
    evento.respondWith(caches.match(pedido).then((guardado) => guardado ?? fetch(pedido)));
  }
});
