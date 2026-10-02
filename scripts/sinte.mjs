// Sintetizador mínimo para los sonidos PROPIOS del motor (música y efectos):
// todo se escribe nota por nota, sin muestras ni servicios de terceros, así que
// no hay derechos de nadie de por medio. Lo usan musica-propia.mjs y sfx-propios.mjs.
import { execFileSync } from "node:child_process";

export const SR = 44100;
export const hz = (nota) => 440 * 2 ** ((nota - 69) / 12);

/** Ruido repetible: cada sonido sale idéntico cada vez que se genera. */
export function crearAzar(semilla) {
  let s = semilla | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Un lienzo estéreo. Con `bucle`, lo que pasa del final vuelve al principio (pista sin costura). */
export function crearLienzo(segundos, { bucle = false, semilla = 1 } = {}) {
  const N = Math.round(segundos * SR);
  const izq = new Float32Array(N);
  const der = new Float32Array(N);
  const azar = crearAzar(semilla);
  const poner = (i, y, pan = 0.5) => {
    let j = i;
    if (j >= N) {
      if (!bucle) return;
      j %= N;
    }
    if (j < 0) return;
    izq[j] += y * Math.cos((pan * Math.PI) / 2);
    der[j] += y * Math.sin((pan * Math.PI) / 2);
  };

  /** Nota de sintetizador (sierra, triángulo o seno) con filtro suave. */
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
      poner(i0 + i, lp2 * env * amp, pan);
    }
  }

  /** Bombo: un seno que cae de tono, con un golpecito al arrancar. */
  function bombo(t0, amp, { desde = 150, hasta = 46, caida = 0.2 } = {}) {
    const n = Math.round(0.5 * SR);
    let fase = 0;
    for (let i = 0; i < n; i++) {
      const t = i / SR;
      fase += (hasta + (desde - hasta) * Math.exp(-t / 0.03)) / SR;
      const golpe = t < 0.004 ? (azar() * 2 - 1) * 0.5 * (1 - t / 0.004) : 0;
      poner(Math.round(t0 * SR) + i, (Math.sin(2 * Math.PI * fase) * Math.exp(-t / caida) + golpe) * amp);
    }
  }

  /**
   * Ruido filtrado (platillo, palmada, güira, soplido). `centro` puede ser un
   * número o una función del tiempo, para barridos.
   */
  function ruido(t0, { amp, dur, centro = 6000, ancho = 0.6, pan = 0.5, forma = "caida" }) {
    const n = Math.round(dur * SR);
    let bajo = 0;
    let banda = 0;
    for (let i = 0; i < n; i++) {
      const t = i / SR;
      const fc = typeof centro === "function" ? centro(t / dur) : centro;
      const f = 2 * Math.sin((Math.PI * Math.min(fc, SR / 6)) / SR);
      const x = azar() * 2 - 1;
      // Filtro de estado variable: se queda con la banda alrededor de `fc`.
      const alto = x - bajo - ancho * banda;
      banda += f * alto;
      bajo += f * banda;
      const env =
        forma === "campana"
          ? Math.sin((Math.PI * t) / dur) ** 2
          : Math.exp(-t / (dur * 0.28)) * Math.min(1, t / 0.0015);
      poner(Math.round(t0 * SR) + i, banda * env * amp, pan);
    }
  }

  /** Cuerda pulsada (Karplus-Strong): suena a guitarra de verdad sin usar ninguna muestra. */
  function cuerda({ t0, f, amp, dur = 1.2, pan = 0.5, brillo = 0.5, apagado = 0.996 }) {
    const largo = Math.max(2, Math.round(SR / f));
    const buf = new Float32Array(largo);
    let previo = 0;
    for (let i = 0; i < largo; i++) {
      const r = azar() * 2 - 1;
      previo = previo + brillo * (r - previo);
      buf[i] = previo;
    }
    const n = Math.round(dur * SR);
    let k = 0;
    for (let i = 0; i < n; i++) {
      const y = buf[k];
      const sig = buf[(k + 1) % largo];
      buf[k] = 0.5 * (y + sig) * apagado;
      k = (k + 1) % largo;
      const fin = i > n - 600 ? (n - i) / 600 : 1;
      poner(Math.round(t0 * SR) + i, y * amp * fin, pan);
    }
  }

  /** Límite suave, pico a -1 dB, y a MP3. */
  function guardar(ruta, { ganancia = 1.3 } = {}) {
    let pico = 0;
    for (let i = 0; i < N; i++) {
      izq[i] = Math.tanh(izq[i] * ganancia);
      der[i] = Math.tanh(der[i] * ganancia);
      pico = Math.max(pico, Math.abs(izq[i]), Math.abs(der[i]));
    }
    const g = pico > 0 ? 0.89 / pico : 1;
    const datos = Buffer.alloc(N * 4);
    for (let i = 0; i < N; i++) {
      datos.writeInt16LE(Math.round(izq[i] * g * 32767), i * 4);
      datos.writeInt16LE(Math.round(der[i] * g * 32767), i * 4 + 2);
    }
    // El audio crudo va directo a ffmpeg por su entrada: no queda ningún archivo de paso.
    execFileSync(
      "ffmpeg",
      [
        "-y",
        "-loglevel",
        "error",
        "-f",
        "s16le",
        "-ar",
        String(SR),
        "-ac",
        "2",
        "-i",
        "pipe:0",
        "-codec:a",
        "libmp3lame",
        "-b:a",
        "160k",
        ruta,
      ],
      { input: datos, maxBuffer: 1024 * 1024 * 64 },
    );
  }

  return { N, nota, bombo, ruido, cuerda, guardar, segundos };
}
