// Efectos de sonido PROPIOS para los cambios de imagen (C-RITMO-1): un sonido
// corto y bajito cada vez que entra un plano, como en los videos editados en
// CapCut. Sintetizados aquí mismo: sin derechos de terceros.
// Uso (desde la raíz):  node scripts/sfx-propios.mjs
import path from "node:path";
import { fileURLToPath } from "node:url";
import { crearLienzo } from "./sinte.mjs";

const carpeta = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../estacion/recursos/sfx");
const en = (nombre) => path.join(carpeta, nombre);

// corte-1: chasquido seco y agudo.
{
  const l = crearLienzo(0.2, { semilla: 11 });
  l.ruido(0.005, { amp: 0.9, dur: 0.05, centro: 2600, ancho: 0.5 });
  l.nota({ t0: 0.005, dur: 0.012, f: 1900, amp: 0.35, onda: "seno", pulso: true, cola: 0.02, corte: 6000 });
  l.guardar(en("corte-1.mp3"));
}
// corte-2: soplido corto que sube.
{
  const l = crearLienzo(0.32, { semilla: 22 });
  l.ruido(0.01, { amp: 0.8, dur: 0.24, centro: (x) => 500 + 4200 * x * x, ancho: 0.45, forma: "campana" });
  l.guardar(en("corte-2.mp3"));
}
// corte-3: golpecito grave, como un toque de dedo.
{
  const l = crearLienzo(0.25, { semilla: 33 });
  l.bombo(0.005, 0.8, { desde: 260, hasta: 110, caida: 0.045 });
  l.ruido(0.005, { amp: 0.25, dur: 0.03, centro: 1500, ancho: 0.7 });
  l.guardar(en("corte-3.mp3"));
}
// corte-4: soplido corto que baja.
{
  const l = crearLienzo(0.34, { semilla: 44 });
  l.ruido(0.01, { amp: 0.8, dur: 0.26, centro: (x) => 4600 - 3800 * x, ancho: 0.45, forma: "campana" });
  l.guardar(en("corte-4.mp3"));
}
// corte-5: obturador de cámara (dos clics muy juntos), para las fotos.
{
  const l = crearLienzo(0.26, { semilla: 55 });
  l.ruido(0.005, { amp: 0.8, dur: 0.035, centro: 3400, ancho: 0.5 });
  l.ruido(0.075, { amp: 0.6, dur: 0.045, centro: 2200, ancho: 0.5 });
  l.guardar(en("corte-5.mp3"));
}
// boom: el golpe grave de las cifras y los titulares.
{
  const l = crearLienzo(1.1, { semilla: 66 });
  l.bombo(0.01, 1, { desde: 120, hasta: 36, caida: 0.42 });
  l.ruido(0.01, { amp: 0.35, dur: 0.5, centro: 180, ancho: 0.9 });
  l.guardar(en("boom.mp3"), { ganancia: 1.6 });
}
console.log(`Efectos listos en ${carpeta}`);
