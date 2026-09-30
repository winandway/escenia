// Sintetiza la pista electrónica de fondo para los videos de tecnología (Full
// Código). Es música PROPIA: la escribe este archivo nota por nota, sin
// muestras ni servicios de terceros, así que puede ir en el repositorio y no
// tiene problema de derechos. Se repite en bucle sin costura.
// Uso (desde la raíz):  node scripts/musica-tech.mjs
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const carpeta = path.join(raiz, "estacion/recursos/musica");
// El nombre ES la ficha de la pista: con estas palabras la elige la Estación.
const NOMBRE = "electronic-tech-synth-minimal-curious-pulse";

const SR = 44100;
const BPM = 104;
const TIEMPO = 60 / BPM;
const COMPAS = 4 * TIEMPO;
const COMPASES = 32;
const N = Math.round(COMPASES * COMPAS * SR);
const izq = new Float32Array(N);
const der = new Float32Array(N);

const hz = (nota) => 440 * 2 ** ((nota - 69) / 12);
// La menor → Fa → Do → Sol, dos compases cada acorde.
const ACORDES = [
  { bajo: 45, notas: [57, 60, 64] },
  { bajo: 41, notas: [57, 60, 65] },
  { bajo: 48, notas: [55, 60, 64] },
  { bajo: 43, notas: [55, 59, 62] },
];

// Ruido repetible: la pista sale idéntica cada vez que se genera.
let semilla = 20260930;
const azar = () => {
  semilla = (semilla + 0x6d2b79f5) | 0;
  let t = Math.imul(semilla ^ (semilla >>> 15), 1 | semilla);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

/** Una nota. `pan` va de 0 (izquierda) a 1 (derecha). Lo que pasa del final vuelve al principio (bucle). */
function nota({
  t0,
  dur,
  f,
  amp,
  pan = 0.5,
  onda = "sierra",
  ataque = 0.005,
  cola = 0.05,
  corte = 2000,
  pulso = false,
}) {
  const i0 = Math.round(t0 * SR);
  const n = Math.round((dur + cola) * SR);
  const a = 1 - Math.exp((-2 * Math.PI * corte) / SR);
  const gi = Math.cos((pan * Math.PI) / 2);
  const gd = Math.sin((pan * Math.PI) / 2);
  let fase = azar();
  let lp = 0;
  let lp2 = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const env = pulso
      ? Math.exp(-t / (dur * 0.4)) * Math.min(1, t / 0.003)
      : t < ataque
        ? t / ataque
        : t < dur
          ? 1
          : Math.max(0, 1 - (t - dur) / cola);
    fase += f / SR;
    if (fase >= 1) fase -= 1;
    const x =
      onda === "seno"
        ? Math.sin(2 * Math.PI * fase)
        : onda === "tri"
          ? 4 * Math.abs(fase - 0.5) - 1
          : 2 * fase - 1;
    lp += a * (x - lp);
    lp2 += a * (lp - lp2);
    const y = lp2 * env * amp;
    const j = (i0 + i) % N;
    izq[j] += y * gi;
    der[j] += y * gd;
  }
}

function bombo(t0, amp) {
  const n = Math.round(0.4 * SR);
  let fase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    fase += (44 + 95 * Math.exp(-t / 0.035)) / SR;
    const y = Math.sin(2 * Math.PI * fase) * Math.exp(-t / 0.16) * amp;
    const j = (Math.round(t0 * SR) + i) % N;
    izq[j] += y * 0.707;
    der[j] += y * 0.707;
  }
}

/** Ruido corto: platillo cerrado (agudo) o palmada (medio). */
function ruido(t0, amp, caida, agudo, pan = 0.5) {
  const n = Math.round(caida * 6 * SR);
  let previo = 0;
  let lp = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const r = azar() * 2 - 1;
    let y;
    if (agudo) {
      y = r - previo; // pasa-altos simple
      previo = r;
    } else {
      lp += 0.25 * (r - lp);
      y = lp * 2;
    }
    y *= Math.exp(-t / caida) * amp;
    const j = (Math.round(t0 * SR) + i) % N;
    izq[j] += y * Math.cos((pan * Math.PI) / 2);
    der[j] += y * Math.sin((pan * Math.PI) / 2);
  }
}

const SEMI = TIEMPO / 4; // semicorchea
for (let compas = 0; compas < COMPASES; compas++) {
  const acorde = ACORDES[Math.floor(compas / 2) % ACORDES.length];
  const t = compas * COMPAS;
  // Cuatro secciones de 8 compases: entra poco a poco y vuelve a empezar.
  const seccion = Math.floor(compas / 8); // 0..3

  // Colchón: el acorde sostenido, con dos sierras apenas desafinadas por nota.
  if (compas % 2 === 0) {
    for (const [k, n] of acorde.notas.entries()) {
      for (const d of [-0.06, 0.06]) {
        nota({
          t0: t,
          dur: 2 * COMPAS - 0.3,
          f: hz(n + d),
          amp: 0.05,
          pan: d < 0 ? 0.2 + k * 0.1 : 0.8 - k * 0.1,
          ataque: 0.9,
          cola: 1.4,
          corte: 750,
        });
      }
    }
    nota({
      t0: t,
      dur: 2 * COMPAS - 0.2,
      f: hz(acorde.bajo),
      amp: 0.07,
      onda: "seno",
      ataque: 0.4,
      cola: 0.8,
      corte: 400,
    });
  }

  // Arpegio: el pulso «de tecnología». Con eco de corchea con puntillo, de lado a lado.
  const arriba = seccion === 3 ? 12 : 0;
  const [a, b, c] = acorde.notas;
  const dibujo = [a, b, c, b + 12, c, b, a + 12, b, a, c, b + 12, c, a + 12, b, c, b + 12];
  for (let s = 0; s < 16; s++) {
    if (seccion === 0 && s % 2 === 1) continue; // al empezar, solo corcheas
    const n = dibujo[s] + arriba;
    const fuerza = (s % 4 === 0 ? 1 : 0.72) * (seccion === 0 ? 0.75 : 1);
    for (const [eco, [retraso, g]] of [
      [0, 1],
      [3, 0.42],
      [6, 0.2],
    ].entries()) {
      nota({
        t0: t + (s + retraso) * SEMI,
        dur: SEMI * 1.6,
        f: hz(n),
        amp: 0.115 * fuerza * g,
        pan: eco === 0 ? 0.5 : eco === 1 ? 0.12 : 0.88,
        onda: "tri",
        pulso: true,
        cola: 0.12,
        corte: eco === 0 ? 3400 : 1800,
      });
    }
  }

  // Bajo: desde la segunda sección. Negras primero; después, a contratiempo.
  if (seccion >= 1) {
    for (let k = 0; k < 8; k++) {
      const contratiempo = k % 2 === 1;
      if (seccion === 1 && contratiempo) continue;
      if (seccion >= 2 && !contratiempo) continue;
      nota({
        t0: t + k * (TIEMPO / 2),
        dur: TIEMPO * 0.45,
        f: hz(acorde.bajo),
        amp: 0.2,
        onda: "tri",
        pulso: true,
        cola: 0.08,
        corte: 520,
      });
    }
  }

  // Percusión: platillos desde la segunda sección; bombo y palmada desde la tercera.
  if (seccion >= 1) {
    for (let k = 0; k < 8; k++) if (k % 2 === 1) ruido(t + k * (TIEMPO / 2), 0.045, 0.022, true, 0.62);
  }
  if (seccion === 3) {
    for (let s = 0; s < 16; s++) if (s % 2 === 1) ruido(t + s * SEMI, 0.018, 0.012, true, 0.35);
  }
  if (seccion >= 2) {
    for (let k = 0; k < 4; k++) {
      if (seccion === 3 || k % 2 === 0) bombo(t + k * TIEMPO, 0.36);
      if (k % 2 === 1) ruido(t + k * TIEMPO, 0.085, 0.05, false, 0.5);
    }
  }
}

// Límite suave y nivel: sin recortes, con el pico a -1 dB.
let pico = 0;
for (let i = 0; i < N; i++) {
  izq[i] = Math.tanh(izq[i] * 1.4);
  der[i] = Math.tanh(der[i] * 1.4);
  pico = Math.max(pico, Math.abs(izq[i]), Math.abs(der[i]));
}
const ganancia = 0.89 / pico;
const datos = Buffer.alloc(N * 4);
for (let i = 0; i < N; i++) {
  datos.writeInt16LE(Math.round(izq[i] * ganancia * 32767), i * 4);
  datos.writeInt16LE(Math.round(der[i] * ganancia * 32767), i * 4 + 2);
}
const cabecera = Buffer.alloc(44);
cabecera.write("RIFF", 0);
cabecera.writeUInt32LE(36 + datos.length, 4);
cabecera.write("WAVEfmt ", 8);
cabecera.writeUInt32LE(16, 16);
cabecera.writeUInt16LE(1, 20);
cabecera.writeUInt16LE(2, 22);
cabecera.writeUInt32LE(SR, 24);
cabecera.writeUInt32LE(SR * 4, 28);
cabecera.writeUInt16LE(4, 32);
cabecera.writeUInt16LE(16, 34);
cabecera.write("data", 36);
cabecera.writeUInt32LE(datos.length, 40);

mkdirSync(carpeta, { recursive: true });
const wav = path.join(carpeta, `${NOMBRE}.wav`);
const mp3 = path.join(carpeta, `${NOMBRE}.mp3`);
writeFileSync(wav, Buffer.concat([cabecera, datos]));
execFileSync("ffmpeg", [
  "-y",
  "-loglevel",
  "error",
  "-i",
  wav,
  "-codec:a",
  "libmp3lame",
  "-b:a",
  "160k",
  mp3,
]);
rmSync(wav);
console.log(`Pista lista: ${mp3} (${(N / SR).toFixed(1)} s, ${BPM} pulsos por minuto)`);
