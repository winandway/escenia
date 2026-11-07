// Los invitados del Podcast IA (docs/PODCAST.md, «Los avatares»). Hay dos modos de cara:
// - «visor» (las robots): la imagen con un visor negro y la cara viva que el estudio le dibuja encima
//   (RobotInvitado): ojos de luz que parpadean, una boca de luz que se mueve con la voz y los aros que laten.
// - «sin_visor» (las personas): no se les dibuja boca (se vería falso). Respiran, se mecen, las luces de sus
//   audífonos laten con la voz y un resplandor de su color las acompaña cuando hablan.
// Todo lo que cambia de un avatar a otro está aquí, medido en píxeles de SU imagen: el encuadre en el panel,
// el visor, los ojos (con pestañas, cejas o sin ellas), la boca, las luces y su color. Un avatar nuevo entra
// con una entrada nueva, sin tocar el componente. La robot plateada (la que eligió Richard el 7 nov 2026 para
// «Mia IA») va primero.

import { MEDIDAS_MIA } from "./podcast-mia";
import { MICROFONO_MIA } from "./podcast-mia-escenario";
import { POSES, type PoseId } from "./podcast-poses";

export type Punto = readonly [number, number];
/** Una curva con dos puntos de control (Bézier cúbica): inicio, control, control, fin. */
export type Curva = readonly [Punto, Punto, Punto, Punto];
export type Elipse = { cx: number; cy: number; rx: number; ry: number; giro: number };

/** Un trazo que se afina: más grueso en el medio que en las puntas (y cada punta puede ser distinta). */
export type TrazoAfinado = {
  linea: Curva;
  /** El grosor en el medio. */
  grosor: number;
  /** El grosor en la punta donde empieza la línea. */
  puntas: number;
  /** El grosor en la punta donde termina (si no se dice, el mismo del principio). */
  puntaFinal?: number;
  /** Dónde es más grueso, de 0 (el principio) a 1 (el final); en el medio si no se dice. */
  vientre?: number;
};

/**
 * Un pedazo de la propia imagen, guardado aparte con transparencia (public/podcast/), y dónde va encima: los ojos
 * de Mia (los pintados, tal cual, que el estudio hace parpadear) y las luces de sus oídos (que laten).
 */
export type Recorte = { recorte: string; x: number; y: number; ancho: number; alto: number };
export const esRecorte = (v: object): v is Recorte => "recorte" in v;

export type OjoAvatar = {
  /** La línea central del ojo (un arco cerrado y feliz). */
  linea: Curva;
  /** El grosor en el medio. */
  grosor: number;
  /** El grosor en las puntas, si el ojo se afina hacia los extremos (si no, es parejo). */
  puntas?: number;
  /** El grosor en la punta donde termina la línea, si es distinto (el ojo rasgado de la plateada). */
  puntaFinal?: number;
  /** Dónde es más grueso el ojo afinado, de 0 a 1 (en el medio si no se dice). */
  vientre?: number;
  /** La línea fina de arriba del ojo (la ceja de luz de la plateada). Parpadea con el ojo. */
  ceja?: TrazoAfinado;
  /** Las pestañas: cada una va de donde nace en el ojo a su punta. */
  pestanas?: readonly Curva[];
};

/** Un ojo: dibujado con su geometría (las robots de pie) o recortado de la imagen (Mia). */
export type Ojo = OjoAvatar | Recorte;

export type BocaAvatar = {
  /**
   * «onda»: una lente que sigue las frecuencias de la voz. «sonrisa»: una D que se abre con el volumen.
   * «media_luna»: una media luna de luz llena, de puntas finas, que se abre con el volumen (la plateada).
   */
  forma: "onda" | "sonrisa" | "media_luna";
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
  /** El color de la lengua (solo la sonrisa; sin color, no lleva lengua). */
  lengua?: string;
  /** La sonrisa y la media luna: cuánto se abren mientras escucha, en partes de lo más que se abren (0,85). */
  reposo?: number;
  /** La sonrisa y la media luna: cuánto se curva el borde de arriba, en partes de medio ancho (0,1). */
  curva?: number;
  /** Llena de luz (la media luna de la plateada); si no, solo el borde encendido. */
  llena?: boolean;
  /** La mano la tapa (Mia riéndose): no se dibuja; se queda la boca pintada que asoma. */
  tapada?: boolean;
};

/** Una luz que late con la voz: un trazo (el aro de un oído) o un recorte de la imagen (las de Mia). */
export type OidoAvatar = { d: string; grosor: number } | Recorte;

/**
 * Qué parte de la imagen se ve en el panel del invitado (siempre con la forma del panel, centrada en `centroX`).
 * - «cuerpo»: de `arriba` a `abajo` (la robot de pie, de la cabeza a medio muslo).
 * - «camara_web»: como en una videollamada, de la cabeza al pecho: la coronilla con un poco de aire arriba
 *   (`AIRE_CAMARA_WEB`) y el pecho contra el borde de abajo. Es el de las imágenes de personajes sentados.
 */
export type Encuadre =
  | { tipo?: "cuerpo"; centroX: number; arriba: number; abajo: number }
  | { tipo: "camara_web"; centroX: number; coronilla: number; pecho: number };

/** La cara de una robot: la cara viva que el estudio le dibuja encima del visor. */
export type CaraConVisor = {
  modo: "visor";
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
  ojos: readonly [Ojo, Ojo];
  grosorPestana?: number;
  /** El resplandor de las pestañas, si es más fino que el de los ojos (las pestañas finas de la plateada). */
  haloPestana?: number;
  /** A dónde se corren los ojos cuando piensa. */
  mirada: Punto;
  boca: BocaAvatar;
  oidos: readonly OidoAvatar[];
};

/** La cara de una persona: sin boca dibujada (se vería falso); laten sus luces y la acompaña un resplandor. */
export type CaraSinVisor = {
  modo: "sin_visor";
  /** El color de sus luces (las de los audífonos) y del resplandor. */
  luz: string;
  /** Cuánto se difumina el brillo de las luces. */
  desenfoque: number;
  /** Las luces que laten con la voz: los aros y la diadema de los audífonos, encima de las pintadas. */
  oidos: readonly OidoAvatar[];
  /** El resplandor suave que la acompaña cuando habla (detrás de la imagen). */
  resplandor: Elipse;
};

export type AvatarPodcast = {
  id: AvatarId;
  /** Lo que se lee en el selector de la ficha. */
  nombre: string;
  descripcion: string;
  /** La imagen pública (public/podcast/), en webp con transparencia. */
  imagen: string;
  ancho: number;
  alto: number;
  encuadre: Encuadre;
  /** Desde dónde respira y se mece. */
  pivote: Punto;
  /** El cuadrado de la imagen que sale en la miniatura del selector (la cabeza y los hombros). */
  miniatura: { x: number; y: number; lado: number };
  cara: CaraConVisor | CaraSinVisor;
  /**
   * Las demás poses (Mia): otra imagen del mismo tamaño y encuadre, con la cara medida en ESA imagen. La pose
   * «tranquila» es la de arriba (`imagen` y `cara`). El motor de poses (podcast-poses.ts) elige cuál se ve.
   */
  poses?: Partial<Record<Exclude<PoseId, "tranquila">, PoseAvatar>>;
  /** Su casa detrás y su micrófono delante (Mia). */
  escenario?: EscenarioAvatar;
};

export type PoseAvatar = { imagen: string; cara: CaraConVisor | CaraSinVisor };

/**
 * La casa del invitado: una imagen 16:9 sin alfa que cubre su panel, detrás de él. El estudio la oscurece y la
 * desenfoca un poco para que el invitado resalte y siga leyéndose como su casa.
 */
export type FondoAvatar = {
  imagen: string;
  /** Qué parte se ve de lado a lado (0 = la izquierda, 100 = la derecha), como `object-position`. */
  enfoqueX: number;
  /** El brillo (1 = tal cual). */
  brillo: number;
  /** El desenfoque, en cqw del estudio (escala con la pantalla: igual en 1080p que en 4K). */
  desenfoque: number;
};

/**
 * El micrófono de podcast del invitado, delante de él, entrando desde el borde izquierdo del panel. Va en
 * píxeles de la imagen del avatar: así la prueba comprueba, pose por pose, que nunca le tapa la cara (C-PODCAST-5).
 */
export type MicrofonoAvatar = {
  /** La imagen publicada (webp con alfa) y su tamaño. */
  imagen: string;
  ancho: number;
  alto: number;
  /** Lo que se ve del micrófono, en píxeles de SU imagen (lo mide scripts/podcast-escenario.ts). */
  silueta: readonly Punto[];
  /** La esquina de arriba a la izquierda donde va, y el ancho con que se dibuja (px de la imagen del avatar). */
  x: number;
  y: number;
  dibujo: number;
  /** El giro (grados) alrededor de donde entra (el medio del borde izquierdo de su imagen). */
  giro: number;
};

/** Lo que rodea al invitado. Opcional: un avatar sin escenario se ve como siempre. */
export type EscenarioAvatar = { fondo?: FondoAvatar; microfono?: MicrofonoAvatar };

/** El vaivén del micrófono (grados, para cada lado): casi nada. */
export const VAIVEN_MICROFONO = 0.25;

export const altoDelMicrofono = (m: MicrofonoAvatar) => (m.alto * m.dibujo) / m.ancho;
/** Alrededor de dónde gira el micrófono: el medio de su borde izquierdo, por donde entra. */
export const pivoteDelMicrofono = (m: MicrofonoAvatar): Punto => [m.x, m.y + altoDelMicrofono(m) / 2];

/** La silueta del micrófono donde va, en píxeles de la imagen del avatar (con un giro de más, si se pide). */
export function siluetaDelMicrofono(m: MicrofonoAvatar, giroExtra = 0): Punto[] {
  const k = m.dibujo / m.ancho;
  const [px, py] = pivoteDelMicrofono(m);
  const g = ((m.giro + giroExtra) * Math.PI) / 180;
  const cos = Math.cos(g);
  const sin = Math.sin(g);
  return m.silueta.map(([sx, sy]) => {
    const x = m.x + sx * k - px;
    const y = m.y + sy * k - py;
    return [px + x * cos - y * sin, py + x * sin + y * cos];
  });
}

/** Lo que mide scripts/podcast-avatar.ts en cada pose de Mia (compartido/podcast-mia.ts, generado). */
export type MedidaDePose = {
  imagen: string;
  visor: readonly Punto[];
  ojos: readonly Recorte[];
  oidos: readonly Recorte[];
  boca: {
    x: number;
    y: number;
    giro: number;
    ancho: number;
    alto: number;
    grosor: number;
    lengua?: string;
  } | null;
};

/** Todas las poses del avatar, la tranquila primero (un avatar sin poses tiene solo esa). */
export function posesDe(a: AvatarPodcast): { id: PoseId; imagen: string; cara: AvatarPodcast["cara"] }[] {
  const otras = POSES.flatMap((id) => {
    if (id === "tranquila") return [];
    const p = a.poses?.[id];
    return p ? [{ id, ...p }] : [];
  });
  return [{ id: "tranquila", imagen: a.imagen, cara: a.cara }, ...otras];
}

/** ¿Es una robot (con visor y cara viva)? */
export const conVisor = (a: AvatarPodcast): a is AvatarPodcast & { cara: CaraConVisor } =>
  a.cara.modo === "visor";

/** El panel del invitado en el estudio mide 44,6 × 32,2 cqw (estudio.module.css, `.panel`). */
export const ASPECTO_PANEL = 44.6 / 32.2;

export const IDS_AVATAR = ["mia", "plateada", "coleta", "robot"] as const;
export type AvatarId = (typeof IDS_AVATAR)[number];
export const esAvatar = (v: unknown): v is AvatarId =>
  typeof v === "string" && (IDS_AVATAR as readonly string[]).includes(v);

/** El de las fichas nuevas: el primero del catálogo. */
export const AVATAR_NUEVO: AvatarId = "mia";
/** En el encuadre de cámara web, cuánto aire queda arriba de la coronilla (en partes del alto del panel). */
export const AIRE_CAMARA_WEB = 0.14;
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

// ——— Los invitados ———

// Mia IA (avatar/mia/, 1312 × 1199): la robot de coleta sentada en su silla gamer, la invitada que eligió Richard
// (7 nov 2026). Siete poses que el motor alterna (podcast-poses.ts). Cada cara está medida en SU imagen por
// scripts/podcast-avatar.ts (compartido/podcast-mia.ts): el visor, los ojos pintados recortados tal cual (con
// sus pestañas), las luces de los oídos recortadas y la boca viva donde estaba la pintada.
type PoseDeMia = keyof typeof MEDIDAS_MIA;

function caraDeMia(pose: PoseDeMia): CaraConVisor {
  const m: MedidaDePose = MEDIDAS_MIA[pose];
  const [ojo1, ojo2] = m.ojos;
  if (!ojo1 || !ojo2) throw new Error(`A la pose ${pose} de Mia le faltan los ojos.`);
  // La boca pintada es la de la pose: escuchando se ve así; hablando se abre hasta un poco más.
  const b = m.boca ?? MEDIDAS_MIA.hablando.boca;
  const alto = Math.max(b.alto * 1.12, b.ancho * 0.42);
  return {
    modo: "visor",
    luz: "#14a6f5",
    nucleo: "#f4fdff",
    halo: 8,
    desenfoque: 5,
    opacidadHalo: 0.9,
    visor: m.visor,
    ojos: [ojo1, ojo2],
    mirada: [2, -5],
    boca: {
      forma: "media_luna",
      x: b.x,
      y: b.y,
      giro: b.giro,
      ancho: b.ancho,
      alto,
      grosor: Math.max(4, b.grosor - 1),
      halo: 8,
      reposo: b.alto / alto,
      curva: 0.065,
      ...("lengua" in b && b.lengua ? { lengua: b.lengua } : {}),
      ...(m.boca ? {} : { tapada: true }),
    },
    oidos: m.oidos,
  };
}

const poseDeMia = (pose: PoseDeMia): PoseAvatar => ({
  imagen: MEDIDAS_MIA[pose].imagen,
  cara: caraDeMia(pose),
});

const MIA: AvatarPodcast = {
  id: "mia",
  nombre: "Mia IA",
  descripcion: "Sentada en su silla: cambia de pose al escuchar, pensar, hablar, reírse o aplaudir.",
  imagen: MEDIDAS_MIA.tranquila.imagen,
  ancho: 1312,
  alto: 1199,
  // Como en una cámara: la silla entera, centrada y grande; el borde de la mesa contra el borde de abajo.
  encuadre: { centroX: 656, arriba: -24, abajo: 1199 },
  pivote: [656, 1120],
  miniatura: { x: 346, y: 36, lado: 640 },
  cara: caraDeMia("tranquila"),
  poses: {
    hablando: poseDeMia("hablando"),
    pensando: poseDeMia("pensando"),
    notas: poseDeMia("notas"),
    riendo: poseDeMia("riendo"),
    aplaudiendo: poseDeMia("aplaudiendo"),
    idea: poseDeMia("idea"),
  },
  // Su casa (avatar/mia/escenario/casa-2.png): encuadrada para que se vean el cuadrito de la escuela a la
  // izquierda y los de la derecha; y su micrófono, que entra por la izquierda a la altura de la barbilla y
  // apunta a su boca sin tocarle la cara en ninguna pose (C-PODCAST-5).
  escenario: {
    fondo: { imagen: "/podcast/mia-casa.webp", enfoqueX: 22, brillo: 0.7, desenfoque: 0.13 },
    microfono: { ...MICROFONO_MIA, x: -281, y: 752, dibujo: 800, giro: -24 },
  },
};

// La robot plateada (avatar/robots/robot-ella-plateada-cuerpo-entero.png, 1024 × 1536): esbelta, «no parece tan
// juguete», con los ojos rasgados. Cada ojo es una media luna cerrada que se afina hacia la nariz, con su ceja
// fina arriba y dos pestañas en la punta de afuera; la boca, una media luna chica de luz llena. Todo medido sobre
// la imagen, columna por columna, donde brilla el trazo pintado (docs/PODCAST.md, «Cómo se agrega un avatar»).
const PLATEADA: AvatarPodcast = {
  id: "plateada",
  nombre: "Robot plateada",
  descripcion: "Elegante y esbelta: ojos rasgados con pestañas y aros de luz.",
  imagen: "/podcast/robot-plateada.webp",
  ancho: 1024,
  alto: 1536,
  // Como en una cámara web (Richard, 7 nov 2026: de pie y con las manos en el aire «es como ver una muñeca
  // que no se mueve»): de la coronilla (y≈8) al pecho (y≈440), con el «IA» del pecho. Las manos levantadas
  // empiezan en y≈430 y por los lados (x < 200 y x > 830): quedan fuera del cuadro.
  encuadre: { tipo: "camara_web", centroX: 512, coronilla: 8, pecho: 440 },
  pivote: [512, 640],
  miniatura: { x: 312, y: 14, lado: 400 },
  cara: {
    modo: "visor",
    luz: "#1683f0",
    nucleo: "#f4fbff",
    halo: 5,
    desenfoque: 3.4,
    opacidadHalo: 0.95,
    // Medido con scripts/podcast-avatar.ts plateada --medir, 3 píxeles adentro del borde negro.
    visor: [
      [589, 196],
      [579, 213],
      [567, 226],
      [555, 235],
      [542, 240],
      [528, 243],
      [516, 242],
      [505, 239],
      [494, 234],
      [484, 228],
      [475, 220],
      [465, 209],
      [458, 196],
      [452, 179],
      [448, 157],
      [451, 131],
      [470, 116],
      [492, 106],
      [516, 106],
      [539, 110],
      [565, 111],
      [589, 123],
      [601, 147],
      [597, 174],
    ],
    // Cada ojo empieza en la punta de las pestañas (la gruesa) y termina en la punta fina, junto a la nariz.
    ojos: [
      {
        linea: [
          [467, 160.5],
          [485, 164],
          [497, 164.5],
          [505.5, 175.5],
        ],
        grosor: 11,
        puntas: 4.5,
        puntaFinal: 1.5,
        vientre: 0.4,
        ceja: {
          linea: [
            [467, 141.5],
            [476, 137],
            [495, 138],
            [505.5, 150.5],
          ],
          grosor: 3.8,
          puntas: 1.2,
          puntaFinal: 2,
        },
        pestanas: [
          curvaQ([468, 160.5], [460.5, 158.5], [455.8, 152]),
          curvaQ([468, 157.5], [465.3, 154.6], [462.8, 150.8]),
        ],
      },
      {
        linea: [
          [583, 168.5],
          [568, 172],
          [556, 169.5],
          [546.5, 180],
        ],
        grosor: 10.5,
        puntas: 4.5,
        puntaFinal: 1.5,
        vientre: 0.4,
        ceja: {
          linea: [
            [586.5, 151.5],
            [578, 146.5],
            [560, 145.5],
            [551, 153.5],
          ],
          grosor: 3.4,
          puntas: 1.2,
          puntaFinal: 2.2,
        },
        pestanas: [
          curvaQ([581.5, 167], [585.5, 165], [588.5, 160.5]),
          curvaQ([582, 170], [591.5, 169], [593.8, 162.8]),
        ],
      },
    ],
    grosorPestana: 1.8,
    haloPestana: 1.5,
    mirada: [3, -5],
    // Escuchando, la media luna chica de la imagen (8 de alto); hablando se abre hasta 19.
    boca: {
      forma: "media_luna",
      x: 523.3,
      y: 213.2,
      giro: 2.4,
      ancho: 37,
      alto: 18,
      grosor: 1.5,
      halo: 4,
      reposo: 0.48,
      curva: 0.17,
      llena: true,
    },
    oidos: [
      { d: caminoDeElipse({ cx: 395.5, cy: 146, rx: 12.5, ry: 44, giro: 4 }), grosor: 5 },
      { d: "M616 115 Q647 160 616 215", grosor: 4 },
    ],
  },
};

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
    modo: "visor",
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
    modo: "visor",
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

export const AVATARES: readonly AvatarPodcast[] = [MIA, PLATEADA, COLETA, ROBOT];

/** El avatar de la ficha. Uno que ya no existe (o vacío) se ve como el robot de siempre: el estudio no se cae. */
export function avatarPorId(id: string | null | undefined): AvatarPodcast {
  return AVATARES.find((a) => a.id === id) ?? ROBOT;
}

/** La parte de la imagen que llena el panel (el viewBox del SVG), con la forma exacta del panel. */
export function cajaDelEncuadre(a: Pick<AvatarPodcast, "encuadre">) {
  const e = a.encuadre;
  // En la cámara web, el pecho va contra el borde de abajo y la coronilla deja el aire de arriba.
  const [arriba, alto] =
    e.tipo === "camara_web"
      ? [
          e.coronilla - ((e.pecho - e.coronilla) * AIRE_CAMARA_WEB) / (1 - AIRE_CAMARA_WEB),
          (e.pecho - e.coronilla) / (1 - AIRE_CAMARA_WEB),
        ]
      : [e.arriba, e.abajo - e.arriba];
  const ancho = alto * ASPECTO_PANEL;
  return { x: e.centroX - ancho / 2, y: arriba, ancho, alto };
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
 * coleta es más grueso en el medio que en los extremos. Cada punta puede tener su grosor (`puntaFinal`, la del
 * final): el ojo rasgado de la plateada es romo donde nacen las pestañas y fino junto a la nariz.
 */
export function trazoAfinado(
  curva: Curva,
  grosor: number,
  puntas: number,
  puntaFinal = puntas,
  vientre = 0.5,
  pasos = 28,
): string {
  const izquierda: Punto[] = [];
  const derecha: Punto[] = [];
  // Lo más grueso cae en t = vientre: la curva del grosor se estira hacia esa punta.
  const exponente = Math.log(0.5) / Math.log(Math.min(0.95, Math.max(0.05, vientre)));
  for (let i = 0; i <= pasos; i++) {
    const t = i / pasos;
    const [x, y] = puntoDeCurva(curva, t);
    const [tx, ty] = tangente(curva, t);
    const base = puntas + (puntaFinal - puntas) * t;
    const medio = (base + (grosor - base) * Math.sin(Math.PI * t ** exponente)) / 2;
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
  const vuelta = [...derecha].reverse();
  return (
    `M${p(izquierda[0]!)}${suave(izquierda)}` +
    punta(izquierda[pasos]!, derecha[pasos]!, curva[3], fin, puntaFinal / 2) +
    suave(vuelta) +
    punta(derecha[0]!, izquierda[0]!, curva[0], [-inicio[0], -inicio[1]], puntas / 2) +
    " Z"
  );
}

/**
 * La boca de la coleta: una D (el borde de arriba recto, el de abajo redondo) centrada en su borde de arriba.
 * `alto` es cuánto se abre; nunca menos que cerrada. `curvaTope` es cuánto se curva el borde de arriba (en
 * partes de medio ancho): la media luna de la plateada se curva más que la D de la coleta.
 */
export function caminoDeSonrisa(ancho: number, alto: number, curvaTope = 0.1): string {
  const h = Math.max(0, alto);
  const m = ancho / 2;
  // El borde de arriba se curva apenas (una sonrisa cuando está casi cerrada), nunca más que la mitad de lo abierto.
  const curva = Math.min(m * curvaTope, h * 0.5);
  return (
    `M${f(-m)} 0 Q0 ${f(curva * 2)} ${f(m)} 0` +
    ` C${f(m * 0.98)} ${f(h * 0.62)} ${f(m * 0.58)} ${f(h)} 0 ${f(h)}` +
    ` C${f(-m * 0.58)} ${f(h)} ${f(-m * 0.98)} ${f(h * 0.62)} ${f(-m)} 0 Z`
  );
}

/**
 * La boca de la plateada: una media luna de luz llena, centrada en la línea de sus dos puntas. El borde de
 * arriba se curva hacia abajo (`curvaTope`, en partes de medio ancho) y el de abajo es una parábola, así las
 * puntas quedan finas como en la imagen. `alto` es cuánto se abre; nunca menos que cerrada.
 */
export function caminoDeMediaLuna(ancho: number, alto: number, curvaTope = 0.17): string {
  const h = Math.max(0, alto);
  const m = ancho / 2;
  const curva = Math.min(m * curvaTope, h * 0.5);
  return (
    `M${f(-m)} 0 Q0 ${f(curva * 2)} ${f(m)} 0` +
    ` C${f(m * 0.42)} ${f(h * 1.3)} ${f(-m * 0.42)} ${f(h * 1.3)} ${f(-m)} 0 Z`
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
