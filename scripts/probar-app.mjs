// Comprueba la app instalable en un navegador de teléfono de verdad (sin
// ventana): el servicio se enciende, el manifiesto está completo y, sin
// internet, sale la pantalla «Sin conexión» con su diseño.
// Uso: node scripts/probar-app.mjs https://escenia.sitios.dev
import { chromium, devices } from "playwright";

const base = (process.argv[2] ?? "http://localhost:8787").replace(/\/$/, "");
const navegador = await chromium.launch();
const contexto = await navegador.newContext({ ...devices["Pixel 7"] });
const pagina = await contexto.newPage();
const fallos = [];
const revisar = (nombre, ok, detalle) => {
  console.log(`${ok ? "ok " : "MAL"} ${nombre}${detalle ? ` → ${detalle}` : ""}`);
  if (!ok) fallos.push(nombre);
};

await pagina.goto(`${base}/sin-conexion`, { waitUntil: "load" });
const servicio = await pagina.evaluate(() =>
  Promise.race([
    navigator.serviceWorker.ready.then((r) => `activo en ${r.scope}`),
    new Promise((listo) => setTimeout(() => listo("no se activó en 10 s"), 10_000)),
  ]),
);
revisar("servicio de la app", String(servicio).startsWith("activo"), servicio);

const manifiesto = await pagina.evaluate(async () => {
  const href = document.querySelector('link[rel="manifest"]')?.getAttribute("href");
  if (!href) return null;
  return (await fetch(href)).json();
});
revisar(
  "manifiesto",
  manifiesto?.display === "standalone" && manifiesto?.icons?.length >= 3,
  manifiesto ? `${manifiesto.name} · ${manifiesto.display} · ${manifiesto.icons.length} íconos` : "falta",
);
for (const icono of manifiesto?.icons ?? []) {
  const r = await pagina.request.get(base + icono.src);
  revisar(`ícono ${icono.sizes}${icono.purpose ? ` (${icono.purpose})` : ""}`, r.ok(), `${r.status()}`);
}
revisar(
  "ícono para iPhone",
  await pagina.evaluate(() => Boolean(document.querySelector('link[rel="apple-touch-icon"]'))),
);

const guardado = await pagina.evaluate(async () => {
  const rutas = [];
  for (const n of await caches.keys())
    for (const k of await (await caches.open(n)).keys()) rutas.push(new URL(k.url).pathname);
  return rutas;
});
revisar(
  "la memoria del teléfono solo tiene la pantalla sin conexión y archivos fijos",
  guardado.includes("/sin-conexion") &&
    guardado.every((r) => r === "/sin-conexion" || r.startsWith("/_next/static/")),
  `${guardado.length} archivo(s)`,
);

await pagina.reload({ waitUntil: "load" });
await contexto.setOffline(true);
await pagina.goto(`${base}/calendario`, { waitUntil: "load" }).catch(() => undefined);
const sinInternet = await pagina.evaluate(() => ({
  titulo: document.querySelector("h1")?.textContent ?? "",
  fondo: getComputedStyle(document.body).backgroundColor,
}));
revisar("sin internet sale «Sin conexión»", sinInternet.titulo === "Sin conexión", sinInternet.titulo);
revisar("y sale con su diseño", sinInternet.fondo === "rgb(11, 15, 25)", sinInternet.fondo);
await contexto.setOffline(false);

await navegador.close();
if (fallos.length) {
  console.error(`\n${fallos.length} revisión(es) fallaron en ${base}.`);
  process.exit(1);
}
console.log(`\nLa app instalable está bien en ${base}.`);
