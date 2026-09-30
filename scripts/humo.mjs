// Prueba de humo: las rutas críticas del panel responden como deben.
// Uso: node scripts/humo.mjs https://escenia.sitios.dev   (o http://localhost:8787)
const base = (process.argv[2] ?? "http://localhost:8787").replace(/\/$/, "");

const rutas = [
  { ruta: "/entrar", esperado: [200] },
  { ruta: "/datos/salud", esperado: [200] },
  { ruta: "/", esperado: [307, 308], redirigeA: "/entrar" },
  { ruta: "/guiones/1", esperado: [307, 308], redirigeA: "/entrar" },
  { ruta: "/calendario", esperado: [307, 308], redirigeA: "/entrar" },
  { ruta: "/manifest.webmanifest", esperado: [200] },
  { ruta: "/sw.js", esperado: [200] },
  { ruta: "/sin-conexion", esperado: [200] },
  { ruta: "/iconos/icono-192.png", esperado: [200] },
  { ruta: "/iconos/icono-512.png", esperado: [200] },
  { ruta: "/datos/estacion/siguiente", metodo: "POST", esperado: [401] },
];

let fallos = 0;
for (const r of rutas) {
  try {
    const res = await fetch(base + r.ruta, { method: r.metodo ?? "GET", redirect: "manual" });
    const destino = res.headers.get("location") ?? "";
    const ok = r.esperado.includes(res.status) && (!r.redirigeA || destino.includes(r.redirigeA));
    console.log(
      `${ok ? "ok " : "MAL"} ${r.metodo ?? "GET"} ${r.ruta} → ${res.status}${destino ? " → " + destino : ""}`,
    );
    if (!ok) fallos++;
  } catch (e) {
    console.log(`MAL ${r.ruta} → ${e instanceof Error ? e.message : e}`);
    fallos++;
  }
}
if (fallos) {
  console.error(`\n${fallos} ruta(s) fallaron en ${base}. Esto es una EMERGENCIA si es producción.`);
  process.exit(1);
}
const salud = await fetch(base + "/datos/salud")
  .then((r) => r.json())
  .catch(() => null);
console.log(`\nTodo bien en ${base}. Versión en vivo: ${salud?.version ?? "no la dice"}.`);
