// Los invitados del Podcast IA (docs/PODCAST.md, «Los avatares»): cada uno es una imagen con un visor y la
// cara viva que el estudio le dibuja encima (RobotInvitado). Todo lo que cambia de un avatar a otro está aquí,
// medido en píxeles de SU imagen: el encuadre en el panel, el visor, los ojos (con pestañas o sin ellas), la
// boca, los aros de los oídos y el color de las luces. Otro avatar de visor entra con una entrada nueva, sin
// tocar el componente. La robot de coleta (la favorita de Richard, 7 nov 2026) va primero.

export type Punto = readonly [number, number];
/** Una curva con dos puntos de control (Bézier cúbica): inicio, control, control, fin. */
export type Curva = readonly [Punto, Punto, Punto, Punto];
export type Elipse = { cx: number; cy: number; rx: number; ry: number; giro: number };

export type OjoAvatar = {
  /** La línea central del ojo (un arco cerrado y feliz). */
  linea: Curva;
  /** El grosor en el medio. */
  grosor: number;
  /** El grosor en las puntas, si el ojo se afina hacia los extremos (si no, es parejo). */
  puntas?: number;
  /** Las pestañas: cada una va de donde nace en el ojo a su punta. */
  pestanas?: readonly Curva[];
};

export type BocaAvatar = {
  /** «onda»: una lente que sigue las frecuencias de la voz. «sonrisa»: una D que se abre con el volumen. */
  forma: "onda" | "sonrisa";
  /** El centro de la boca (en la sonrisa, el centro de su borde de arriba). */
  x: number;
  y: number;
  giro: number;
  ancho: number;
  /** Lo más que se abre. */
  alto: number;
  grosor: number;
  /** Cuánto más ancho es el resplandor que el trazo. */
  halo: number;
  /** El color de la lengua (solo la sonrisa). */
  lengua?: string;
};

export type OidoAvatar = { d: string; grosor: number };

export type AvatarPodcast = {
  id: AvatarId;
  /** Lo que se lee en el selector de la ficha. */
  nombre: string;
  descripcion: string;
  /** La imagen pública (public/podcast/), en webp con transparencia. */
  imagen: string;
  ancho: number;
  alto: number;
  /** Qué parte de la imagen se ve en el panel: de `arriba` a `abajo`, centrada en `centroX`. */
  encuadre: { centroX: number; arriba: number; abajo: number };
  /** Desde dónde respira y se mece. */
  pivote: Punto;
  /** El cuadrado de la imagen que sale en la miniatura del selector (la cabeza y los hombros). */
  miniatura: { x: number; y: number; lado: number };
  cara: {
    luz: string;
    nucleo: string;
    /** El resplandor de los ojos: cuánto más ancho que el trazo, cuánto se difumina y qué tan fuerte. */
    halo: number;
    desenfoque: number;
    opacidadHalo: number;
    /** El vidrio del visor: la luz de la cara no sale de aquí. */
    visor?: readonly Punto[];
    /** Manchas que apagan una cara pintada en la imagen (si la imagen no viene ya limpia). */
    tapas?: { elipses: readonly Elipse[]; color: string; desenfoque: number };
    ojos: readonly [OjoAvatar, OjoAvatar];
    grosorPestana?: number;
    /** A dónde se corren los ojos cuando piensa. */
    mirada: Punto;
    boca: BocaAvatar;
    oidos: readonly OidoAvatar[];
  };
};

/** El panel del invitado en el estudio mide 44,6 × 32,2 cqw (estudio.module.css, `.panel`). */
export const ASPECTO_PANEL = 44.6 / 32.2;

export const IDS_AVATAR = ["coleta", "robot"] as const;
export type AvatarId = (typeof IDS_AVATAR)[number];
export const esAvatar = (v: unknown): v is AvatarId =>
  typeof v === "string" && (IDS_AVATAR as readonly string[]).includes(v);

/** El de las fichas nuevas. */
export const AVATAR_NUEVO: AvatarId = "coleta";
/** El de las fichas de antes del 7 nov 2026 (el valor por defecto de la columna). */
export const AVATAR_DE_LAS_VIEJAS: AvatarId = "robot";

// Números cortos en los caminos del SVG (un decimal alcanza).
const f = (n: number) => (Math.round(n * 10) / 10).toString();
const p = ([x, y]: Punto) => `${f(x)} ${f(y)}`;

/** Una curva de un solo control (cuadrática) dicha con dos controles: es exactamente la misma curva. */
export function curvaQ(p0: Punto, c: Punto, p1: Punto): Curva {
  const dos = (a: Punto): Punto => [a[0] + (2 / 3) * (c[0] - a[0]), a[1] + (2 / 3) * (c[1] - a[1])];
  return [p0, dos(p0), dos(p1), p1];
}

export function caminoDeElipse({ cx, cy, rx, ry, giro }: Elipse): string {
  const g = (giro * Math.PI) / 180;
  const dx = rx * Math.cos(g);
  const dy = rx * Math.sin(g);
  const a = `${f(cx + dx)} ${f(cy + dy)}`;
  const b = `${f(cx - dx)} ${f(cy - dy)}`;
  return `M${a} A${f(rx)} ${f(ry)} ${f(giro)} 1 0 ${b} A${f(rx)} ${f(ry)} ${f(giro)} 1 0 ${a} Z`;
}

// ——— Los dos invitados ———

const COLETA: AvatarPodcast = {
  id: "coleta",
  nombre: "Robot de coleta",
  descripcion: "Ojitos felices con pestañas y coleta plateada.",
  imagen: "/podcast/robot-coleta.webp",
  ancho: 1024,
  alto: 1536,
  // De la coleta (y≈50) a medio muslo (y≈900), con aire arriba para el aviso amarillo de la ficha de ejemplo.
  encuadre: { centroX: 512, arriba: -10, abajo: 905 },
  pivote: [512, 790],
  miniatura: { x: 222, y: 20, lado: 580 },
  cara: {
    luz: "#19b6ff",
    nucleo: "#f4fdff",
    halo: 14,
    desenfoque: 6,
    opacidadHalo: 0.9,
    // Medido con scripts/podcast-avatar.ts --medir (3 píxeles adentro del borde negro).
    visor: [
      [659, 285],
      [647, 314],
      [636, 341],
      [610, 355],
      [584, 361],
      [561, 365],
      [540, 366],
      [519, 365],
      [495, 363],
      [468, 357],
      [436, 345],
      [405, 321],
      [388, 285],
      [384, 243],
      [398, 203],
      [431, 176],
      [471, 166],
      [507, 162],
      [540, 158],
      [573, 160],
      [607, 169],
      [643, 182],
      [661, 215],
      [670, 250],
    ],
    // Los ojos pintados se borraron del visor al preparar la imagen: aquí van los vivos, en el mismo sitio.
    ojos: [
      {
        linea: [
          [430.5, 268],
          [436.7, 224.5],
          [503.8, 224.6],
          [516.5, 265],
        ],
        grosor: 19,
        puntas: 13,
        pestanas: [
          curvaQ([435, 243.5], [423, 238.5], [413, 229.5]),
          curvaQ([430, 256.5], [415.8, 256.2], [402.5, 251]),
        ],
      },
      {
        linea: [
          [579.5, 262],
          [581.2, 220.9],
          [643.5, 217.1],
          [645.5, 260],
        ],
        grosor: 18,
        puntas: 12,
        pestanas: [
          curvaQ([638.5, 231.5], [645.3, 226.2], [648, 218]),
          curvaQ([644, 244.5], [653, 242.4], [659.5, 236]),
        ],
      },
    ],
    grosorPestana: 7,
    mirada: [5, -9],
    boca: {
      forma: "sonrisa",
      x: 548,
      y: 302.5,
      giro: -4,
      ancho: 86,
      alto: 46,
      grosor: 5,
      halo: 9,
      lengua: "#ff8ab9",
    },
    oidos: [
      { d: caminoDeElipse({ cx: 300.4, cy: 290.2, rx: 29.4, ry: 55.7, giro: -1 }), grosor: 7 },
      { d: "M701 202 Q726 264 702 318", grosor: 6 },
    ],
  },
};

// El robot de siempre (public/podcast/robot.webp, 1312 × 1199): exactamente como estaba antes del catálogo, al
// 98 % del alto del panel, centrado y 1,2 cqw por debajo del borde.
const ESCALA_ROBOT = (0.98 * 32.2) / 1199; // cqw por píxel de la imagen
const ABAJO_ROBOT = 1199 - 1.2 / ESCALA_ROBOT;

const ROBOT: AvatarPodcast = {
  id: "robot",
  nombre: "Robot clásico",
  descripcion: "El robot de visor de siempre, de medio cuerpo.",
  imagen: "/podcast/robot.webp",
  ancho: 1312,
  alto: 1199,
  encuadre: { centroX: 656, arriba: ABAJO_ROBOT - 32.2 / ESCALA_ROBOT, abajo: ABAJO_ROBOT },
  pivote: [656, 1199],
  miniatura: { x: 300, y: 30, lado: 860 },
  cara: {
    luz: "#22d3ff",
    nucleo: "#eafeff",
    halo: 23,
    desenfoque: 12,
    opacidadHalo: 0.75,
    // Los ojos pintados de esta imagen se apagan con dos manchas del negro del visor.
    tapas: {
      color: "#020c15",
      desenfoque: 13,
      elipses: [
        { cx: 538, cy: 328, rx: 82, ry: 60, giro: -6 },
        { cx: 767, cy: 272, rx: 92, ry: 64, giro: -14 },
      ],
    },
    ojos: [
      { linea: curvaQ([482, 352], [542.5, 264], [593, 340]), grosor: 23 },
      { linea: curvaQ([695, 300], [773.5, 197], [838, 282]), grosor: 23 },
    ],
    mirada: [14, -16],
    boca: { forma: "onda", x: 672, y: 398, giro: -12.3, ancho: 150, alto: 74, grosor: 11, halo: 15 },
    oidos: [{ d: caminoDeElipse({ cx: 1066, cy: 281, rx: 47, ry: 91, giro: -6 }), grosor: 8 }],
  },
};

export const AVATARES: readonly AvatarPodcast[] = [COLETA, ROBOT];

/** El avatar de la ficha. Uno que ya no existe (o vacío) se ve como el robot de siempre: el estudio no se cae. */
export function avatarPorId(id: string | null | undefined): AvatarPodcast {
  return AVATARES.find((a) => a.id === id) ?? ROBOT;
}

/** La parte de la imagen que llena el panel (el viewBox del SVG), con la forma exacta del panel. */
export function cajaDelEncuadre(a: Pick<AvatarPodcast, "encuadre">) {
  const alto = a.encuadre.abajo - a.encuadre.arriba;
  const ancho = alto * ASPECTO_PANEL;
  return { x: a.encuadre.centroX - ancho / 2, y: a.encuadre.arriba, ancho, alto };
}

// ——— La geometría que dibuja la cara (sin DOM: corre igual en el servidor y en las pruebas) ———

export function puntoDeCurva([a, b, c, d]: Curva, t: number): Punto {
  const u = 1 - t;
  const k0 = u * u * u;
  const k1 = 3 * u * u * t;
  const k2 = 3 * u * t * t;
  const k3 = t * t * t;
  return [k0 * a[0] + k1 * b[0] + k2 * c[0] + k3 * d[0], k0 * a[1] + k1 * b[1] + k2 * c[1] + k3 * d[1]];
}

function tangente([a, b, c, d]: Curva, t: number): Punto {
  const u = 1 - t;
  const x = 3 * u * u * (b[0] - a[0]) + 6 * u * t * (c[0] - b[0]) + 3 * t * t * (d[0] - c[0]);
  const y = 3 * u * u * (b[1] - a[1]) + 6 * u * t * (c[1] - b[1]) + 3 * t * t * (d[1] - c[1]);
  const largo = Math.hypot(x, y) || 1;
  return [x / largo, y / largo];
}

export const caminoDeCurva = ([a, b, c, d]: Curva) => `M${p(a)} C${p(b)} ${p(c)} ${p(d)}`;

/** Une puntos con curvas suaves (por los puntos medios), sin la «M» del principio. */
function suave(puntos: readonly Punto[]): string {
  let d = "";
  for (let i = 1; i < puntos.length - 1; i++) {
    const a = puntos[i]!;
    const b = puntos[i + 1]!;
    d += ` Q${p(a)} ${f((a[0] + b[0]) / 2)} ${f((a[1] + b[1]) / 2)}`;
  }
  return `${d} L${p(puntos[puntos.length - 1]!)}`;
}

/**
 * Un trazo que se afina hacia las puntas, como figura cerrada con las puntas redondas: el ojo feliz de la
 * coleta es más grueso en el medio que en los extremos.
 */
export function trazoAfinado(curva: Curva, grosor: number, puntas: number, pasos = 28): string {
  const izquierda: Punto[] = [];
  const derecha: Punto[] = [];
  for (let i = 0; i <= pasos; i++) {
    const t = i / pasos;
    const [x, y] = puntoDeCurva(curva, t);
    const [tx, ty] = tangente(curva, t);
    const medio = (puntas + (grosor - puntas) * Math.sin(Math.PI * t)) / 2;
    izquierda.push([x - ty * medio, y + tx * medio]);
    derecha.push([x + ty * medio, y - tx * medio]);
  }
  // La punta redonda: dos curvas que pasan por la punta de la línea central.
  const punta = (desde: Punto, hasta: Punto, centro: Punto, haciaAfuera: Punto, radio: number) => {
    const [ax, ay] = haciaAfuera;
    const tope: Punto = [centro[0] + ax * radio, centro[1] + ay * radio];
    return ` Q${p([desde[0] + ax * radio, desde[1] + ay * radio])} ${p(tope)} Q${p([hasta[0] + ax * radio, hasta[1] + ay * radio])} ${p(hasta)}`;
  };
  const fin = tangente(curva, 1);
  const inicio = tangente(curva, 0);
  const radio = puntas / 2;
  const vuelta = [...derecha].reverse();
  return (
    `M${p(izquierda[0]!)}${suave(izquierda)}` +
    punta(izquierda[pasos]!, derecha[pasos]!, curva[3], fin, radio) +
    suave(vuelta) +
    punta(derecha[0]!, izquierda[0]!, curva[0], [-inicio[0], -inicio[1]], radio) +
    " Z"
  );
}

/**
 * La boca de la coleta: una D (el borde de arriba recto, el de abajo redondo) centrada en su borde de arriba.
 * `alto` es cuánto se abre; nunca menos que cerrada.
 */
export function caminoDeSonrisa(ancho: number, alto: number): string {
  const h = Math.max(0, alto);
  const m = ancho / 2;
  // El borde de arriba se curva apenas (una sonrisa cuando está casi cerrada), nunca más que la mitad de lo abierto.
  const curva = Math.min(m * 0.1, h * 0.5);
  return (
    `M${f(-m)} 0 Q0 ${f(curva * 2)} ${f(m)} 0` +
    ` C${f(m * 0.98)} ${f(h * 0.62)} ${f(m * 0.58)} ${f(h)} 0 ${f(h)}` +
    ` C${f(-m * 0.58)} ${f(h)} ${f(-m * 0.98)} ${f(h * 0.62)} ${f(-m)} 0 Z`
  );
}

/** Un contorno cerrado y suave que pasa por todos los puntos (el vidrio del visor). */
export function caminoCerrado(puntos: readonly Punto[]): string {
  const n = puntos.length;
  const en = (i: number) => puntos[((i % n) + n) % n]!;
  let d = `M${p(en(0))}`;
  for (let i = 0; i < n; i++) {
    const [a, b, c, e] = [en(i - 1), en(i), en(i + 1), en(i + 2)];
    const c1: Punto = [b[0] + (c[0] - a[0]) / 6, b[1] + (c[1] - a[1]) / 6];
    const c2: Punto = [c[0] - (e[0] - b[0]) / 6, c[1] - (e[1] - b[1]) / 6];
    d += ` C${p(c1)} ${p(c2)} ${p(c)}`;
  }
  return `${d} Z`;
}
