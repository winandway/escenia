// La cabeza viva del invitado y el cambio de pose que parece movimiento (docs/PODCAST.md, «La cabeza viva»;
// candado C-PODCAST-6). Animación por código, sin pagar por minuto.
//
// Richard vio el video de prueba el 7 nov 2026: «no hay naturalidad en el movimiento». Entre pose y pose el
// cuerpo quedaba congelado, y casi todo lo vivo de una persona en un podcast está en la cabeza. Desde entonces la
// cabeza de Mia es una capa propia en cada pose (scripts/podcast-cabeza.ts) y este motor la mueve:
//
// - Nunca congelada: un ruido suave (Perlin en una dimensión) la mece siempre un poco.
// - Hablando: asiente en las sílabas fuertes de SU voz (no en todas), levanta la cabeza al empezar una frase y se
//   mueve más cuanto más energía tiene la voz. Reparte la mirada entre la cámara y Richard y a veces mira a un lado.
// - Escuchando: inclina la cabeza hacia Richard (a la izquierda del estudio), lo mira casi todo el rato y asiente
//   de vez en cuando, como quien dice «ajá».
// - Pensando: levanta la barbilla y mira a un lado.
// - Los ojos llegan primero (rápido, como un vistazo) y la cabeza los sigue despacio.
// - El cuerpo toma aire al empezar a hablar y acompaña un poco las asentidas.
// - El cambio de pose: un impulso (se agacha un poco), el cruce rápido de las dos imágenes justo en el momento de
//   más movimiento y un asentamiento. Las dos cabezas se juntan durante el cambio (`transformarCabeza`), así la
//   cara viaja de una pose a la otra sin doble imagen.
//
// Todo es determinista (una semilla) y sin DOM: corre igual en el navegador y en las pruebas.
import type { EstadoDelInvitado } from "./podcast-poses";

export type Punto = readonly [number, number];
/** Una matriz afín como la de SVG: matrix(a b c d e f) lleva (x, y) a (a·x + c·y + e, b·x + d·y + f). */
export type Matriz = readonly [number, number, number, number, number, number];

/**
 * Lo más que se mueve la cabeza: grados y píxeles de SU imagen (la de Mia mide 1312 × 1199 y en el estudio se ve a
 * un tercio, así que 12 px de su imagen son unos 4 px en la pantalla). Una asentida de verdad baja la cara unos
 * grados; con menos, en la pantalla no se nota (lo mostró el primer video, el 7 nov 2026).
 */
export const LIMITES_CABEZA = { giro: 4, dx: 8, dy: 12, rasgosX: 14, rasgosY: 7 } as const;
/** Lo más que se mueve el cuerpo por su cuenta (píxeles y grados). */
export const LIMITES_CUERPO = { dy: 4, giro: 0.4 } as const;

export type Mirada = "richard" | "camara" | "lado";
/** Hacia dónde se corren los rasgos (ojos y boca) dentro del visor. Richard está a la izquierda del estudio. */
export const MIRADAS: Record<Mirada, Punto> = { richard: [-12, 1], camara: [0, 0], lado: [10, -4] };

export type SalidaDeCabeza = {
  /** Grados alrededor del cuello (positivo: la coronilla va a la derecha). */
  giro: number;
  dx: number;
  /** Positivo: baja (asiente). */
  dy: number;
  /** Cuánto se corren los ojos y la boca dentro del visor (la mirada). */
  rasgosX: number;
  rasgosY: number;
  /** El cuerpo: toma aire (negativo: sube) y acompaña las asentidas. */
  cuerpoDy: number;
  cuerpoGiro: number;
};

type Impulso = { hora: number; alto: number; tau: number };
/** Dos filtros de paso bajo en cascada: llegan suave, sin tirón y sin pasarse. */
type Filtro = readonly [number, number];

export type MemoriaDeCabeza = {
  hora: number | null;
  semilla: number;
  azar: number;
  estado: EstadoDelInvitado;
  /** La voz: la envolvente rápida (sílabas), la lenta (energía) y la del cuadro anterior. */
  rapido: number;
  lento: number;
  previo: number;
  ultimoAcento: number;
  silencioDesde: number | null;
  /** Las asentidas en curso (alto positivo: baja; negativo: levanta la cabeza). */
  asentidas: readonly Impulso[];
  /** El aire que toma el cuerpo. */
  aire: readonly Impulso[];
  mirada: Mirada;
  miradaHasta: number;
  /** Escuchando: cuándo toca el próximo «ajá». */
  proximaAsentida: number;
  f: {
    ojosX: Filtro;
    ojosY: Filtro;
    sigue: Filtro;
    inclina: Filtro;
    altura: Filtro;
  };
  salida: SalidaDeCabeza;
};

const QUIETA: SalidaDeCabeza = { giro: 0, dx: 0, dy: 0, rasgosX: 0, rasgosY: 0, cuerpoDy: 0, cuerpoGiro: 0 };

/** Un número entero revuelto, de 0 a 1 (para el ruido). */
function revolver(n: number, semilla: number): number {
  let h = Math.imul(n | 0, 374761393) ^ Math.imul(semilla | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** Ruido de Perlin en una dimensión, de -1 a 1: suave, sin repetirse y sin saltos. */
export function ruido(x: number, semilla: number): number {
  const i = Math.floor(x);
  const f = x - i;
  const a = (revolver(i, semilla) * 2 - 1) * f;
  const b = (revolver(i + 1, semilla) * 2 - 1) * (f - 1);
  const u = f * f * f * (f * (f * 6 - 15) + 10);
  return 2 * (a + (b - a) * u);
}

/** El generador de azar (mulberry32): el estado vive en la memoria, así todo es determinista. */
function tirar(estado: number): [number, number] {
  const s = (estado + 0x6d2b79f5) | 0;
  let t = Math.imul(s ^ (s >>> 15), 1 | s);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, s];
}

/** La forma de una asentida: sube suave desde cero, llega a 1 en `tau` y vuelve (sin tirón al empezar). */
const forma = (t: number) => (t <= 0 ? 0 : t * t * Math.exp(2 * (1 - t)));
/** Nunca pasa del límite, y llega a él con suavidad. */
const tope = (v: number, l: number) => l * Math.tanh(v / l);
const limitar = (v: number, l: number) => Math.min(l, Math.max(-l, v));

function filtrar([a, b]: Filtro, meta: number, dt: number, tau: number): Filtro {
  const k = 1 - Math.exp(-dt / tau);
  const na = a + (meta - a) * k;
  return [na, b + (na - b) * k];
}

export const cabezaInicial = (semilla = 1, ahora = 0): MemoriaDeCabeza => ({
  hora: null,
  semilla,
  azar: semilla,
  estado: "reposo",
  rapido: 0,
  lento: 0,
  previo: 0,
  ultimoAcento: Number.NEGATIVE_INFINITY,
  silencioDesde: ahora,
  asentidas: [],
  aire: [],
  mirada: "camara",
  miradaHasta: ahora,
  proximaAsentida: Number.POSITIVE_INFINITY,
  f: { ojosX: [0, 0], ojosY: [0, 0], sigue: [0, 0], inclina: [0, 0], altura: [0, 0] },
  salida: QUIETA,
});

/** Hablando, una sílaba cuenta como fuerte si suena esto más que la energía de la voz… */
const ACENTO_VECES = 1.6;
/** …y por lo menos esto. */
const ACENTO_MINIMO = 0.18;
/** Entre una asentida y la siguiente pasan por lo menos esto (ms): con sentido, no un tic en cada sílaba. */
const ENTRE_ACENTOS_MS = 340;
/** Un silencio de más de esto, y la siguiente sílaba abre una frase nueva (levanta la cabeza). */
const PAUSA_DE_FRASE_MS = 300;

/** Cuánto dura cada mirada (ms), según lo que hace. */
type Plan = readonly { mirada: Mirada; peso: number; desde: number; hasta: number }[];
const PLANES: Record<EstadoDelInvitado, Plan> = {
  escuchando: [
    { mirada: "richard", peso: 0.8, desde: 2800, hasta: 6000 },
    { mirada: "camara", peso: 0.2, desde: 1000, hasta: 2200 },
  ],
  hablando: [
    { mirada: "camara", peso: 0.5, desde: 1600, hasta: 4000 },
    { mirada: "richard", peso: 0.36, desde: 1400, hasta: 3200 },
    { mirada: "lado", peso: 0.14, desde: 700, hasta: 1400 },
  ],
  pensando: [{ mirada: "lado", peso: 1, desde: 3000, hasta: 5000 }],
  reposo: [
    { mirada: "camara", peso: 0.8, desde: 3000, hasta: 6000 },
    { mirada: "lado", peso: 0.2, desde: 800, hasta: 1500 },
  ],
  conectando: [{ mirada: "camara", peso: 1, desde: 3000, hasta: 6000 }],
};

/** La inclinación de la cabeza (grados) y su altura (px) según lo que hace. */
const INCLINA: Record<EstadoDelInvitado, number> = {
  escuchando: -2.6,
  pensando: 2,
  hablando: 0,
  reposo: 0,
  conectando: 0,
};
const ALTURA: Record<EstadoDelInvitado, number> = {
  escuchando: 1,
  pensando: -4,
  hablando: 0,
  reposo: 0,
  conectando: 0,
};

/** Un paso de la cabeza: la memoria al día con el estado, el volumen de SU voz (0 a 1) y la hora (ms). */
export function pasoDeCabeza(
  anterior: MemoriaDeCabeza,
  entrada: { estado: EstadoDelInvitado; ahora: number; volumen: number },
): MemoriaDeCabeza {
  const { estado, ahora } = entrada;
  const m = { ...anterior, f: { ...anterior.f } };
  const dt = m.hora === null ? 0 : Math.min(0.1, Math.max(0, (ahora - m.hora) / 1000));
  m.hora = ahora;
  let azar = m.azar;
  const dado = () => {
    const [v, s] = tirar(azar);
    azar = s;
    return v;
  };
  let asentidas = m.asentidas.filter((a) => ahora - a.hora < a.tau * 6000);
  let aire = m.aire.filter((a) => ahora - a.hora < a.tau * 6000);

  // 1. El estado: al cambiar, la mirada se decide de nuevo y, al empezar a hablar, toma aire.
  if (estado !== m.estado) {
    if (estado === "hablando") aire = [...aire, { hora: ahora, alto: -3, tau: 0.22 }];
    if (estado === "escuchando") m.proximaAsentida = ahora + 1500 + dado() * 2000;
    m.miradaHasta = ahora;
    m.estado = estado;
  }

  // 2. La voz: las sílabas fuertes (que suenan bastante más que la energía de la voz) asienten.
  const v = estado === "hablando" ? limitar(entrada.volumen, 1) : 0;
  const voz = Math.max(0, v);
  m.rapido += (voz - m.rapido) * (1 - Math.exp(-dt / (voz > m.rapido ? 0.025 : 0.09)));
  m.lento += (voz - m.lento) * (1 - Math.exp(-dt / 0.5));
  const subiendo = m.rapido > m.previo;
  if (
    estado === "hablando" &&
    subiendo &&
    m.rapido > ACENTO_MINIMO &&
    m.rapido > m.lento * ACENTO_VECES &&
    ahora - m.ultimoAcento >= ENTRE_ACENTOS_MS
  ) {
    const abreFrase = m.silencioDesde !== null && ahora - m.silencioDesde >= PAUSA_DE_FRASE_MS;
    if (abreFrase) asentidas = [...asentidas, { hora: ahora, alto: -4.5, tau: 0.26 }];
    else if (dado() < 0.78) {
      const fuerza = limitar((m.rapido - m.lento) / 0.35, 1);
      asentidas = [...asentidas, { hora: ahora, alto: (4 + 5 * fuerza) * (0.8 + 0.4 * dado()), tau: 0.16 }];
    }
    m.ultimoAcento = ahora;
  }
  if (m.rapido < 0.06) m.silencioDesde ??= ahora;
  else if (m.rapido > ACENTO_MINIMO * 0.6) m.silencioDesde = null;
  m.previo = m.rapido;

  // 3. Escuchando: el «ajá» de vez en cuando (a veces doble).
  if (estado === "escuchando" && ahora >= m.proximaAsentida) {
    asentidas = [...asentidas, { hora: ahora, alto: 5, tau: 0.22 }];
    if (dado() < 0.3) asentidas = [...asentidas, { hora: ahora + 460, alto: 3.5, tau: 0.2 }];
    m.proximaAsentida = ahora + 3200 + dado() * 3800;
  } else if (estado !== "escuchando") m.proximaAsentida = Number.POSITIVE_INFINITY;

  // 4. La mirada: un plan por estado, con su tiempo.
  if (ahora >= m.miradaHasta) {
    const plan = PLANES[estado];
    let r = dado();
    const elegida = plan.find((p) => (r -= p.peso) < 0) ?? plan[plan.length - 1]!;
    m.mirada = elegida.mirada;
    m.miradaHasta = ahora + elegida.desde + dado() * (elegida.hasta - elegida.desde);
  }
  m.azar = azar;
  m.asentidas = asentidas;
  m.aire = aire;

  // 5. Lo que resulta: el ruido de siempre, más el de la voz, la inclinación, la mirada y las asentidas.
  const t = ahora / 1000;
  const s = m.semilla * 16;
  const actividad = limitar(m.lento * 2.2, 1);
  const giroRuido =
    0.7 * ruido(t * 0.31, s + 1) + 0.25 * ruido(t * 0.83, s + 2) + 1.6 * actividad * ruido(t * 0.55, s + 5);
  const dxRuido = 2 * ruido(t * 0.27, s + 3) + 3 * actividad * ruido(t * 0.47, s + 6);
  const dyRuido = 1.4 * ruido(t * 0.37, s + 4);
  const [mx, my] = MIRADAS[m.mirada];
  m.f.ojosX = filtrar(m.f.ojosX, mx, dt, 0.06);
  m.f.ojosY = filtrar(m.f.ojosY, my, dt, 0.06);
  m.f.sigue = filtrar(m.f.sigue, mx, dt, 0.3);
  m.f.inclina = filtrar(m.f.inclina, INCLINA[estado], dt, 0.8);
  m.f.altura = filtrar(m.f.altura, ALTURA[estado], dt, 0.5);
  const asiente = asentidas.reduce((suma, a) => suma + a.alto * forma((ahora - a.hora) / 1000 / a.tau), 0);
  const respira = aire.reduce((suma, a) => suma + a.alto * forma((ahora - a.hora) / 1000 / a.tau), 0);
  const sigue = m.f.sigue[1];
  const giro = m.f.inclina[1] + giroRuido + 0.05 * sigue;
  const L = LIMITES_CABEZA;
  m.salida = {
    giro: tope(giro, L.giro),
    dx: tope(dxRuido + 0.35 * sigue, L.dx),
    dy: tope(m.f.altura[1] + dyRuido + asiente, L.dy),
    rasgosX: tope(m.f.ojosX[1], L.rasgosX),
    rasgosY: tope(m.f.ojosY[1] + 0.45 * asiente, L.rasgosY),
    cuerpoDy: tope(respira + 0.22 * asiente, LIMITES_CUERPO.dy),
    cuerpoGiro: tope(0.12 * giro, LIMITES_CUERPO.giro),
  };
  return m;
}

// ── El cambio de pose ─────────────────────────────────────────────────────────────────────────────────────────

/** Cuánto dura el cambio de una pose a otra (ms). */
export const CAMBIO_MS = 640;
/** Hablando, el cambio de pose espera una pausa de la voz, pero no más que esto. */
export const ESPERA_PAUSA_MS = 450;
/** Por debajo de este volumen, la voz está en una pausa (entre palabras). */
const PAUSA_DE_VOZ = 0.12;

const sube = (x: number) => {
  const u = limitar(Math.max(0, x), 1);
  return u * u * (3 - 2 * u);
};

/**
 * El cambio de pose en su avance (0 a 1): la opacidad de la que llega y de la que se va, cuánto se acomoda el
 * cuerpo (baja, se pasa hacia arriba y se asienta) y la mezcla de las dos cabezas (0: la que se va; 1: la que
 * llega). La que llega aparece rápido en el medio, cuando el cuerpo se mueve más; la que se va se apaga después
 * (así el cuerpo nunca se ve transparente).
 */
export function cambioDePose(avance: number) {
  const a = limitar(Math.max(0, avance), 1);
  const llega = sube((a - 0.3) / 0.28);
  const seVa = 1 - sube((a - 0.47) / 0.22);
  // Un impulso hacia abajo, el cruce con el cuerpo en su mayor velocidad y un asentamiento que se pasa un poco.
  const onda = Math.sin(2 * Math.PI * a) * (1 - a) ** 1.3;
  return {
    llega,
    seVa,
    dy: 5.5 * onda,
    giro: 0.45 * onda,
    escala: 1 - 0.01 * Math.sin(Math.PI * a),
    mezcla: sube((a - 0.05) / 0.85),
  };
}

/** ¿Puede empezar ya el cambio de pose? Hablando, espera una pausa de la voz, como mucho `ESPERA_PAUSA_MS`. */
export const puedeCambiar = (estado: EstadoDelInvitado, volumen: number, esperandoMs: number) =>
  estado !== "hablando" || volumen < PAUSA_DE_VOZ || esperandoMs >= ESPERA_PAUSA_MS;

// ── La geometría de la cabeza ─────────────────────────────────────────────────────────────────────────────────

/** Dónde está la cabeza en una pose: el centro del visor, la inclinación y el tamaño (de oído a oído). */
export type EjeDeCabeza = { centro: Punto; angulo: number; escala: number };

type Caja = { x: number; y: number; ancho: number; alto: number };
const centroDe = (c: Caja): Punto => [c.x + c.ancho / 2, c.y + c.alto / 2];

/** El eje de la cabeza de una pose, medido con su visor y las luces de sus dos oídos. */
export function ejeDeLaCabeza(visor: readonly Punto[], oidos: readonly Caja[]): EjeDeCabeza {
  const xs = visor.map((p) => p[0]);
  const ys = visor.map((p) => p[1]);
  const centro: Punto = [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2];
  const [a, b] = [...oidos].sort((p, q) => p.x - q.x).map(centroDe);
  if (!a || !b) return { centro, angulo: 0, escala: Math.max(...xs) - Math.min(...xs) };
  return {
    centro,
    angulo: (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI,
    escala: Math.hypot(b[0] - a[0], b[1] - a[1]),
  };
}

/** Dónde se apoya la cabeza en el cuello: un poco debajo de lo más bajo del visor (la barbilla). */
export function pivoteDelCuello(visor: readonly Punto[]): Punto {
  const abajo = Math.max(...visor.map((p) => p[1]));
  const barbilla = visor.filter((p) => p[1] >= abajo - 6).map((p) => p[0]);
  return [barbilla.reduce((s, x) => s + x, 0) / barbilla.length, abajo + 40];
}

export const IDENTIDAD: Matriz = [1, 0, 0, 1, 0, 0];

/** Primero `segunda`, después `primera` (como en el atributo transform de SVG: «primera segunda»). */
export function componer(primera: Matriz, segunda: Matriz): Matriz {
  const [a, b, c, d, e, f] = primera;
  const [g, h, i, j, k, l] = segunda;
  return [a * g + c * h, b * g + d * h, a * i + c * j, b * i + d * j, a * k + c * l + e, b * k + d * l + f];
}

export const aplicar = ([a, b, c, d, e, f]: Matriz, [x, y]: Punto): [number, number] => [
  a * x + c * y + e,
  b * x + d * y + f,
];

/** Girar `grados` alrededor de `centro`, escalar `k` y mover. */
function similar(grados: number, k: number, centro: Punto, destino: Punto): Matriz {
  const r = (grados * Math.PI) / 180;
  const cos = Math.cos(r) * k;
  const sin = Math.sin(r) * k;
  const [cx, cy] = centro;
  const [dx, dy] = destino;
  return [cos, sin, -sin, cos, dx - (cos * cx - sin * cy), dy - (sin * cx + cos * cy)];
}

/** El movimiento vivo de la cabeza: gira alrededor del cuello y se corre. */
export const movimientoDeCabeza = (s: Pick<SalidaDeCabeza, "giro" | "dx" | "dy">, cuello: Punto): Matriz =>
  similar(s.giro, 1, cuello, [cuello[0] + s.dx, cuello[1] + s.dy]);

/**
 * Durante un cambio de pose, dónde se dibuja la cabeza de la pose `propia` (la que se va o la que llega): las dos
 * van a la misma cabeza «de paso», que viaja del eje `de` al eje `a` según la mezcla. Así la cara no se duplica.
 */
export function transformarCabeza(
  propia: EjeDeCabeza,
  de: EjeDeCabeza,
  a: EjeDeCabeza,
  mezcla: number,
): Matriz {
  const t = limitar(Math.max(0, mezcla), 1);
  const centro: Punto = [
    de.centro[0] + (a.centro[0] - de.centro[0]) * t,
    de.centro[1] + (a.centro[1] - de.centro[1]) * t,
  ];
  const angulo = de.angulo + (a.angulo - de.angulo) * t;
  const escala = de.escala + (a.escala - de.escala) * t;
  return similar(angulo - propia.angulo, escala / propia.escala, propia.centro, centro);
}

export const matrizSvg = (m: Matriz) => `matrix(${m.map((v) => +v.toFixed(5)).join(" ")})`;
