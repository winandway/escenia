// Las pistas PROPIAS del motor, escritas nota por nota (sin muestras ni
// servicios de terceros: son nuestras y pueden ir en el repositorio):
//
//  1. El BOMBO: «tum, pum, pum, pum» con bajo, como pidió Richard el 2 oct 2026.
//     Es la pista de reserva de todo video que no tenga una música de su género.
//  2. Una BACHATA provisional (requinto, bongó, güira y bajo), para que una
//     historia de bachata no salga con otra cosa debajo mientras Richard sube
//     una bachata suya desde el panel (Sonidos).
//  3. Un PIANO suave (balada en Re, arpegios lentos), para las locuciones
//     emotivas: quince años, bodas, homenajes (Richard, 23 oct 2026: «un pianito
//     de fondo bien suavecito»).
//
// El nombre de cada archivo ES su ficha: con esas palabras la elige la Estación.
// Uso (desde la raíz):  node scripts/musica-propia.mjs
import path from "node:path";
import { fileURLToPath } from "node:url";
import { crearLienzo, hz } from "./sinte.mjs";

const carpeta = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../estacion/recursos/musica");

// ───────────────────────── 1. El bombo ─────────────────────────
{
  const BPM = 112;
  const T = 60 / BPM;
  const COMPAS = 4 * T;
  const COMPASES = 32;
  const l = crearLienzo(COMPASES * COMPAS, { bucle: true, semilla: 20261002 });
  // La menor, La menor, Fa, Sol: dos compases cada una. Oscuro y con empuje.
  const BAJOS = [33, 33, 29, 31];
  for (let c = 0; c < COMPASES; c++) {
    const t = c * COMPAS;
    const bajo = BAJOS[Math.floor(c / 2) % BAJOS.length];
    const seccion = Math.floor(c / 8); // 0..3: va sumando capas y vuelve a empezar
    for (let k = 0; k < 4; k++) {
      // El bombo, en cada tiempo: es lo que se tiene que oír.
      l.bombo(t + k * T, 0.62, { desde: 165, hasta: 47, caida: 0.21 });
      // El bajo responde a contratiempo («tum-BA, tum-BA»).
      l.nota({
        t0: t + k * T + T / 2,
        dur: T * 0.42,
        f: hz(bajo + 12),
        amp: 0.3,
        onda: "tri",
        pulso: true,
        cola: 0.07,
        corte: 420,
      });
      l.nota({
        t0: t + k * T + T / 2,
        dur: T * 0.42,
        f: hz(bajo),
        amp: 0.22,
        onda: "seno",
        pulso: true,
        cola: 0.07,
        corte: 300,
      });
      // Palmada en el 2 y el 4, desde la segunda sección.
      if (seccion >= 1 && k % 2 === 1) l.ruido(t + k * T, { amp: 0.3, dur: 0.14, centro: 1500, ancho: 0.9 });
    }
    // Platillo cerrado a contratiempo; en la última sección, en semicorcheas.
    if (seccion >= 1)
      for (let k = 0; k < 4; k++)
        l.ruido(t + k * T + T / 2, { amp: 0.14, dur: 0.05, centro: 8500, ancho: 0.5, pan: 0.62 });
    if (seccion === 3)
      for (let s = 0; s < 16; s++)
        if (s % 2 === 1)
          l.ruido(t + s * (T / 4), { amp: 0.06, dur: 0.03, centro: 9500, ancho: 0.5, pan: 0.36 });
    // Un colchón grave muy bajito, para que no suene vacío.
    if (c % 2 === 0 && seccion >= 2)
      for (const d of [-0.05, 0.05])
        l.nota({
          t0: t,
          dur: 2 * COMPAS - 0.3,
          f: hz(bajo + 24 + d),
          amp: 0.035,
          pan: d < 0 ? 0.25 : 0.75,
          ataque: 0.8,
          cola: 1.2,
          corte: 600,
        });
    // Redoble corto antes de cada cambio de sección.
    if (c % 8 === 7)
      for (let s = 12; s < 16; s++)
        l.bombo(t + s * (T / 4), 0.3 + (s - 12) * 0.06, { desde: 190, hasta: 70, caida: 0.07 });
  }
  l.guardar(path.join(carpeta, "beat-kick-bass-driving-pulse-neutral.mp3"), { ganancia: 1.25 });
}

// ───────────────────────── 2. La bachata ─────────────────────────
{
  const BPM = 126;
  const T = 60 / BPM;
  const COMPAS = 4 * T;
  const COMPASES = 32;
  const l = crearLienzo(COMPASES * COMPAS, { bucle: true, semilla: 1989 });
  // La menor – Sol – Fa – Mi: la vuelta más clásica de la bachata romántica.
  const ACORDES = [
    { bajo: 45, quinta: 52, notas: [57, 60, 64] },
    { bajo: 43, quinta: 50, notas: [55, 59, 62] },
    { bajo: 41, quinta: 48, notas: [53, 57, 60] },
    { bajo: 40, quinta: 47, notas: [52, 56, 59] },
  ];
  const C = T / 2; // corchea
  const S = T / 4; // semicorchea
  for (let c = 0; c < COMPASES; c++) {
    const t = c * COMPAS;
    const ac = ACORDES[c % ACORDES.length];
    const seccion = Math.floor(c / 8);
    const [n1, n2, n3] = ac.notas;

    // Requinto: el arpegio de corcheas que identifica a la bachata, con su doble desafinado (el «chorus»).
    const dibujo = [n1, n3, n2 + 12, n3, n1 + 12, n3, n2 + 12, n3];
    for (let k = 0; k < 8; k++) {
      const acento = k % 2 === 0 ? 1 : 0.78;
      for (const [d, pan] of [
        [0, 0.34],
        [0.09, 0.66],
      ])
        l.cuerda({
          t0: t + k * C + d * 0.02,
          f: hz(dibujo[k] + 12 + d),
          amp: 0.17 * acento,
          dur: 0.9,
          pan,
          brillo: 0.62,
          apagado: 0.9965,
        });
    }
    // En la segunda mitad, el requinto adorna en semicorcheas arriba.
    if (seccion % 2 === 1) {
      const adorno = [n3 + 12, n2 + 24, n1 + 24, n2 + 24];
      for (let s = 8; s < 16; s++)
        l.cuerda({
          t0: t + s * S,
          f: hz(adorno[s % 4] + 12),
          amp: 0.075,
          dur: 0.5,
          pan: 0.5,
          brillo: 0.7,
          apagado: 0.995,
        });
    }
    // Segunda guitarra: el acorde rasgado y apagado en el contratiempo.
    for (const k of [1, 3, 5, 7])
      for (const [i, n] of ac.notas.entries())
        l.cuerda({
          t0: t + k * C + i * 0.006,
          f: hz(n),
          amp: 0.06,
          dur: 0.16,
          pan: 0.2,
          brillo: 0.5,
          apagado: 0.985,
        });

    // Bajo: uno, tres y cuatro («tum… tum-tum»), con la quinta en el tres.
    for (const [k, n] of [
      [0, ac.bajo],
      [2, ac.quinta],
      [3, ac.bajo],
    ]) {
      l.nota({
        t0: t + k * T,
        dur: T * 0.7,
        f: hz(n - 12),
        amp: 0.32,
        onda: "tri",
        pulso: true,
        cola: 0.1,
        corte: 380,
      });
      l.nota({
        t0: t + k * T,
        dur: T * 0.7,
        f: hz(n - 12),
        amp: 0.2,
        onda: "seno",
        pulso: true,
        cola: 0.1,
        corte: 260,
      });
    }

    // Bongó (martillo): corcheas en el macho y la hembra abierta cerrando el compás.
    for (let k = 0; k < 8; k++) {
      const hembra = k === 6 || k === 7;
      l.bombo(
        t + k * C,
        hembra ? 0.26 : k % 2 === 0 ? 0.2 : 0.13,
        hembra ? { desde: 330, hasta: 215, caida: 0.09 } : { desde: 520, hasta: 400, caida: 0.045 },
      );
    }
    // Güira: el raspado continuo en semicorcheas, más fuerte en cada tiempo.
    for (let s = 0; s < 16; s++)
      l.ruido(t + s * S, {
        amp: s % 4 === 0 ? 0.13 : s % 2 === 0 ? 0.085 : 0.06,
        dur: s % 4 === 0 ? 0.07 : 0.04,
        centro: 7600,
        ancho: 0.35,
        pan: 0.72,
      });
  }
  l.guardar(path.join(carpeta, "bachata-guitar-requinto-bongos-guira-romantic-warm.mp3"), { ganancia: 1.2 });
}

// ───────────────────────── 3. El piano suave ─────────────────────────
{
  const BPM = 66;
  const T = 60 / BPM;
  const COMPAS = 4 * T;
  const DURACION = 192;
  const l = crearLienzo(DURACION, { semilla: 20261023 });
  const azar = (() => {
    let s = 7;
    return () => (s = (s * 16807) % 2147483647) / 2147483647;
  })();
  // Cada acorde: el bajo (mano izquierda) y cuatro notas de la derecha, de grave a agudo.
  const A = {
    D: [38, [62, 66, 69, 74]],
    "A/C#": [37, [64, 69, 73, 76]],
    Bm: [35, [62, 66, 71, 74]],
    G: [31, [62, 67, 71, 74]],
    Em7: [40, [62, 67, 71, 76]],
    A: [33, [64, 69, 73, 76]],
    "D/F#": [42, [62, 66, 69, 74]],
    "F#m": [42, [61, 66, 69, 73]],
  };
  const frase1 = ["D", "A/C#", "Bm", "G"];
  const frase2 = ["Em7", "A", "D", "D/F#"];
  const frase3 = ["G", "A", "F#m", "Bm"];
  const frase4 = ["Em7", "A", "D", "D"];
  const compases = ["D", "G", "D", "A"];
  while (compases.length * COMPAS < DURACION - 14) compases.push(...frase1, ...frase2, ...frase3, ...frase4);
  // Se corta donde cabe y se cierra con «G, A» y el acorde final.
  const caben = Math.floor((DURACION - 10) / COMPAS) - 2;
  compases.length = caben;
  compases.push("G", "A");
  const PATRON = [0, 2, 1, 3, 2, 1, 3, 2];
  compases.forEach((nombre, c) => {
    const [bajo, mano] = A[nombre];
    const t = c * COMPAS;
    const suave = c < 4 ? 0.7 : 1; // la entrada, más bajita
    const fin = t + COMPAS + 0.25; // el pedal se levanta al cambiar de acorde
    l.piano({ t0: t, f: hz(bajo + 12), amp: 0.19 * suave, dur: fin - t, pan: 0.42, brillo: 0.35 });
    l.piano({
      t0: t + 2 * T,
      f: hz(bajo + 19),
      amp: 0.08 * suave,
      dur: fin - t - 2 * T,
      pan: 0.45,
      brillo: 0.3,
    });
    PATRON.forEach((k, j) => {
      const t0 = t + (j * T) / 2 + (azar() - 0.5) * 0.016;
      const amp = (j === 0 ? 0.12 : 0.095) * (0.88 + azar() * 0.24) * suave;
      l.piano({
        t0,
        f: hz(mano[k]),
        amp,
        dur: Math.max(0.3, fin - t0),
        pan: 0.5 + (mano[k] - 68) / 60,
        brillo: 0.45,
      });
    });
  });
  // El acorde final, arpegiado despacio, que se queda sonando.
  const tf = compases.length * COMPAS;
  [38, 50, 57, 62, 66, 69, 74].forEach((m, k) => {
    l.piano({
      t0: tf + k * 0.09,
      f: hz(m),
      amp: m < 50 ? 0.17 : 0.1,
      dur: DURACION - tf - 1.2 - k * 0.09,
      pan: 0.5 + (m - 60) / 60,
      brillo: 0.4,
    });
  });
  l.sala(0.24);
  l.guardar(path.join(carpeta, "piano-ballad-soft-gentle-emotional.mp3"), { ganancia: 1.1 });
  console.log("piano-ballad-soft-gentle-emotional.mp3");
}

console.log(`Pistas listas en ${carpeta}`);
