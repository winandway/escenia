// Formato «Tutorial en bloques» (docs/TUTORIAL-BLOQUES.md, candado C-BLOQUES-1).
// Un tutorial vertical en un mundo de bloques propio (voxel) con las capturas REALES de la app dentro:
// en la pantalla de un teléfono del dibujo (pegadas por cuatro esquinas) o en un teléfono que flota en la escena.
// Aquí vive lo que no cambia de un video a otro: la ficha de estilo de las imágenes, el candado contra
// nombres de juegos, la cuenta de la perspectiva de la pantalla y la revisión del ritmo.

/**
 * La ficha de estilo: va delante de TODAS las escenas para que se parezcan entre sí. Estilo ORIGINAL de bloques:
 * nunca se nombra un juego (regla de Richard, 22 nov 2026): solo «voxel art», «blocky cubes», «diorama».
 */
export const FICHA_ESTILO_BLOQUES =
  "Stylized 3D voxel art diorama. Everything is built from smooth matte cubes and chunky rectangular blocks with " +
  "slightly rounded edges and flat clean colors, like a handcrafted miniature world; no pixel textures, no noise. " +
  "Soft warm global illumination, gentle ambient occlusion, soft " +
  "long shadows, subtle tilt-shift depth of field. Calm pastel dusk sky in peach, coral pink and lavender. " +
  "Cozy, premium, cinematic 3D render, crisp details, vertical 9:16 composition.";

/**
 * Cómo son las personas. Va SOLO en las escenas con gente: puesto en todas, el modelo metía un muñeco donde no había
 * nadie (el escritorio de los documentos, 22 nov 2026). Se dice en positivo el color de piel: nombrar en el pedido lo
 * que no se quiere (un muñeco amarillo) lo hacía salir más.
 */
export const PERSONAS_BLOQUES =
  "People are original blocky figures with a cube-shaped head, natural brown, tan or light-brown skin, real hair, a " +
  "simple friendly face (two small dark eyes and a small smile), a rectangular body and block arms and legs.";

/** Lo que nunca debe salir en una escena (las letras y los logos los pone el video encima, nunca la IA). */
export const NEGATIVO_BLOQUES =
  "No text, no letters, no numbers, no words, no logos, no brand names, no watermark, no signature, no user interface, " +
  "no video game interface, no health bars, no pixelated textures, no real photographs.";

/** La pantalla del teléfono del dibujo sale de un verde puro para encontrarla y pegarle la captura real. */
export const PANTALLA_VERDE =
  "The smartphone screen is completely flat, turned on and filled edge to edge with one solid pure chroma-key green " +
  "color (#00FF00), perfectly uniform, with no icons, no reflections, no glare and no shading on the screen.";

/**
 * Nombres de juegos, consolas y marcas de bloques que JAMÁS van en un pedido de imagen (ni en el texto del video).
 * Se buscan como palabra entera, sin importar mayúsculas ni acentos.
 */
export const NOMBRES_PROHIBIDOS = [
  "minecraft",
  "mine craft",
  "mojang",
  "roblox",
  "gta",
  "grand theft auto",
  "lego",
  "fortnite",
  "terraria",
  "crossy road",
  "animal crossing",
  "the sims",
  "nintendo",
  "playstation",
  "xbox",
  "creeper",
] as const;

const sinAcentos = (t: string) => t.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

/** Devuelve los nombres prohibidos que aparecen en el texto (vacío si no hay ninguno). */
export function nombresProhibidosEn(texto: string): string[] {
  const limpio = ` ${sinAcentos(texto).replace(/[^a-z0-9]+/g, " ")} `;
  return NOMBRES_PROHIBIDOS.filter((n) => limpio.includes(` ${n} `));
}

/** Lanza un error si el texto nombra un juego o una marca de bloques. */
export function asegurarSinJuegos(texto: string): string {
  const malos = nombresProhibidosEn(texto);
  if (malos.length > 0) throw new Error(`El pedido nombra lo que no se puede nombrar: ${malos.join(", ")}.`);
  return texto;
}

/** El pedido completo de una escena de bloques (texto a imagen). */
export function promptEscenaBloques(
  descripcion: string,
  opciones: { pantallaVerde?: boolean; personas?: boolean } = {},
): string {
  const partes = [FICHA_ESTILO_BLOQUES];
  if (opciones.personas) partes.push(PERSONAS_BLOQUES);
  partes.push(`Scene: ${descripcion.trim()}`);
  if (opciones.pantallaVerde) partes.push(PANTALLA_VERDE);
  partes.push(NEGATIVO_BLOQUES);
  return asegurarSinJuegos(partes.join(" "));
}

/**
 * El pedido de una escena con el MISMO personaje de la hoja de referencia (edición con referencia, imagen 1).
 * La hoja manda en la cara, el cuerpo, la ropa y los colores; la descripción manda en la pose y el lugar.
 */
export function promptEscenaConPersonaje(
  descripcion: string,
  opciones: { pantallaVerde?: boolean } = {},
): string {
  const partes = [
    "Image 1 is the character reference sheet. Create a NEW scene with exactly the same blocky character: the same cube " +
      "head, face, skin color, clothes, colors and proportions as in image 1. Do not copy the reference sheet layout, " +
      "the plain background or the multiple views: show the character only once, inside the new scene.",
    FICHA_ESTILO_BLOQUES,
    PERSONAS_BLOQUES,
    `Scene: ${descripcion.trim()}`,
  ];
  if (opciones.pantallaVerde) partes.push(PANTALLA_VERDE);
  partes.push(NEGATIVO_BLOQUES);
  return asegurarSinJuegos(partes.join(" "));
}

/**
 * La hoja de referencia del personaje (edición con referencia: imagen 1 es la escena donde salió por primera vez).
 * Con ella, el personaje sale igual en todas las escenas (`promptEscenaConPersonaje`).
 */
export function promptHojaPersonaje(descripcion: string): string {
  return asegurarSinJuegos(
    `Image 1 shows a blocky character: ${descripcion.trim()}. Create a clean character reference sheet of exactly this ` +
      "same character, keeping the same cube head, face, beard, skin color, clothes, colors and proportions: two full-body " +
      "views side by side, a front view and a three-quarter view, standing in a relaxed neutral pose with arms down, " +
      "nothing in the hands, on a plain light warm gray background with a soft floor shadow. " +
      `${FICHA_ESTILO_BLOQUES} ${PERSONAS_BLOQUES} ${NEGATIVO_BLOQUES}`,
  );
}

// ---------- La pantalla del dibujo: la captura pegada por cuatro esquinas ----------

export type Punto = [number, number];
/** Las cuatro esquinas de la pantalla en píxeles de la imagen: arriba-izquierda, arriba-derecha, abajo-derecha, abajo-izquierda. */
export type Cuadrilatero = [Punto, Punto, Punto, Punto];

/**
 * La homografía que lleva un rectángulo de `ancho`×`alto` (la captura) a las cuatro esquinas de la pantalla.
 * Devuelve [a, b, c, d, e, f, g, h] con X = (a·x + b·y + c) / (g·x + h·y + 1) y lo mismo para Y con d, e, f.
 */
export function homografia(ancho: number, alto: number, q: Cuadrilatero): number[] {
  if (ancho <= 0 || alto <= 0) throw new Error("La captura tiene que tener ancho y alto.");
  const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = q;
  const dx1 = x1 - x2;
  const dx2 = x3 - x2;
  const dx3 = x0 - x1 + x2 - x3;
  const dy1 = y1 - y2;
  const dy2 = y3 - y2;
  const dy3 = y0 - y1 + y2 - y3;
  let g = 0;
  let h = 0;
  if (Math.abs(dx3) > 1e-9 || Math.abs(dy3) > 1e-9) {
    const den = dx1 * dy2 - dx2 * dy1;
    if (Math.abs(den) < 1e-12)
      throw new Error("Las cuatro esquinas no forman una pantalla (están alineadas).");
    g = (dx3 * dy2 - dx2 * dy3) / den;
    h = (dx1 * dy3 - dx3 * dy1) / den;
  }
  // Del cuadrado unidad a las esquinas…
  const a = x1 - x0 + g * x1;
  const b = x3 - x0 + h * x3;
  const d = y1 - y0 + g * y1;
  const e = y3 - y0 + h * y3;
  // …y del rectángulo de la captura al cuadrado unidad.
  return [a / ancho, b / alto, x0, d / ancho, e / alto, y0, g / ancho, h / alto];
}

/** Aplica la homografía a un punto de la captura (para comprobarla y para poner toques en la pantalla). */
export function aplicarHomografia(m: number[], x: number, y: number): Punto {
  const [a, b, c, d, e, f, g, h] = m as [number, number, number, number, number, number, number, number];
  const w = g * x + h * y + 1;
  return [(a * x + b * y + c) / w, (d * x + e * y + f) / w];
}

/** La misma homografía como `transform: matrix3d(…)` de CSS (con `transform-origin: 0 0`). */
export function matriz3dCss(m: number[]): string {
  const [a, b, c, d, e, f, g, h] = m as [number, number, number, number, number, number, number, number];
  const r = (n: number) => Number(n.toFixed(10));
  return `matrix3d(${[a, d, 0, g, b, e, 0, h, 0, 0, 1, 0, c, f, 0, 1].map(r).join(", ")})`;
}

/** Cuánto se deforma la captura en esa pantalla: 1 es igual; por encima de 1,15 se ve estirada y se avisa. */
export function deformacionPantalla(ancho: number, alto: number, q: Cuadrilatero): number {
  const dist = (p: Punto, r: Punto) => Math.hypot(p[0] - r[0], p[1] - r[1]);
  const anchoQ = (dist(q[0], q[1]) + dist(q[3], q[2])) / 2;
  const altoQ = (dist(q[0], q[3]) + dist(q[1], q[2])) / 2;
  const r = altoQ / anchoQ / (alto / ancho);
  return Number((r >= 1 ? r : 1 / r).toFixed(3));
}

// ---------- Subtítulos tipo CapCut ----------

export type PalabraVoz = { text: string; startMs: number; endMs: number };
export type Trozo = { desde: number; hasta: number; palabras: PalabraVoz[] };

/**
 * Parte la voz en trozos cortos de subtítulo (hasta 3 palabras y 17 letras; corta en cada signo).
 * Cada trozo dura hasta que empieza el siguiente; el último, 1,2 s más que su última palabra.
 */
export function trozosDeSubtitulos(palabras: PalabraVoz[], maxPalabras = 3, maxLetras = 17): Trozo[] {
  const grupos: PalabraVoz[][] = [];
  let actual: PalabraVoz[] = [];
  for (const w0 of palabras) {
    const w = { ...w0, text: w0.text.trim() };
    if (!w.text) continue;
    const largo = actual.map((x) => x.text).join(" ").length + w.text.length + 1;
    if (actual.length > 0 && (actual.length >= maxPalabras || largo > maxLetras)) {
      grupos.push(actual);
      actual = [];
    }
    actual.push(w);
    if (/[.,!?:;…»]$/.test(w.text)) {
      grupos.push(actual);
      actual = [];
    }
  }
  if (actual.length) grupos.push(actual);
  return grupos.map((ps, k) => {
    const sig = grupos[k + 1];
    const ultimo = ps[ps.length - 1] as PalabraVoz;
    return {
      desde: (ps[0] as PalabraVoz).startMs / 1000,
      hasta: sig ? (sig[0] as PalabraVoz).startMs / 1000 : ultimo.endMs / 1000 + 1.2,
      palabras: ps,
    };
  });
}

/**
 * Margen a cada lado de una palabra del subtítulo. La palabra que se dice se agranda: con un margen chico se
 * comía el espacio y se leía pegada («DEDICIEMBRE», Ica, 20 nov 2026). El margen cubre lo que crece y deja aire.
 */
export function margenPalabra(tamLetra: number, escalaActiva: number): number {
  return Math.ceil(tamLetra * 0.27 + tamLetra * (escalaActiva - 1) * 2.5);
}

// ---------- El ritmo (formato Escenia: una imagen nueva cada 3 s, ninguna más de 5) ----------

export const QUIETO_MAXIMO_SEG = 5;

/** Revisa los cambios de imagen de un video: el tramo más largo sin cambio y el promedio. */
export function revisarRitmo(
  cambios: number[],
  duracionSeg: number,
): { maximo: number; promedio: number; tramosLargos: [number, number][] } {
  const t = [...new Set([0, ...cambios.filter((c) => c > 0 && c < duracionSeg), duracionSeg])].sort(
    (a, b) => a - b,
  );
  const tramos: [number, number][] = [];
  for (let k = 1; k < t.length; k++) tramos.push([t[k - 1] as number, t[k] as number]);
  const largos = tramos.map(([a, b]) => b - a);
  return {
    maximo: Number(Math.max(...largos).toFixed(2)),
    promedio: Number((duracionSeg / tramos.length).toFixed(2)),
    tramosLargos: tramos.filter(([a, b]) => b - a > QUIETO_MAXIMO_SEG),
  };
}

// ---------- El plan de un tutorial en bloques (lo que recibe la composición «TutorialBloques») ----------
// Todos los tiempos van en segundos del video. Las posiciones de la escena van en píxeles de la imagen
// (1152×2048); las de una captura, en píxeles de la captura (780×1600); las de la pantalla, en píxeles del video
// (1080×1920). Lo que se lee va dentro de la zona segura de redes (x 60–940, y 180–1490).

export const ESCENA_ANCHO = 1152;
export const ESCENA_ALTO = 2048;
export const CAPTURA_ANCHO = 780;
export const CAPTURA_ALTO = 1600;
export const ZONA_SEGURA = { x0: 60, x1: 940, arriba: 180, abajo: 1490 } as const;

export type Camara = { t: number; x: number; y: number; z: number };
export type CambioCaptura = { t: number; src: string };
export type Toque = { t: number; x: number; y: number };
export type Resalte = { t: number; x0: number; y0: number; x1: number; y1: number };
export type Recorte = [number, number, number, number];
export type LupaPlan = {
  desde: number;
  hasta?: number;
  src: string;
  recorte: Recorte;
  top: number;
  ancho?: number;
  resaltes?: Resalte[];
};
export type PosicionTelefono = { t: number; x: number; top: number; ancho: number };
export type TelefonoPlan = {
  desde: number;
  hasta?: number;
  capturas: CambioCaptura[];
  posiciones: PosicionTelefono[];
  giro?: number;
  toques?: Toque[];
};
export type PantallaPlan = {
  esquinas: Cuadrilatero;
  capturas: CambioCaptura[];
  encender?: number;
  toques?: Toque[];
};
export type ChipPlan = { desde: number; hasta?: number; etiqueta: string; texto: string };
export type SelloPlan = {
  t: number;
  hasta?: number;
  texto: string;
  color?: string;
  top: number;
  giro?: number;
  tam?: number;
};
export type RotuloPlan = { t: number; hasta?: number; texto: string; x: number; y: number };
export type ProgresoPlan = {
  desde: number;
  hasta: number;
  total: number;
  hechos: { t: number; n: number }[];
  top: number;
};
export type Transicion = "diagonal" | "centro" | "lluvia" | "columnas" | "corte";
export type EscenaPlan = {
  id: string;
  inicio: number;
  fondo: string;
  /** La escena con la pantalla verde vuelta transparente (va encima de la captura). */
  frente?: string;
  /** El sujeto recortado (Vision): crece un poco más que el fondo y da profundidad. */
  sujeto?: string;
  /** Lo que la cámara puede mostrar de la imagen (para dejar fuera algo que no debe verse). */
  limites?: { x0?: number; y0?: number; x1?: number; y1?: number };
  camara: Camara[];
  transicion: Transicion;
  pantalla?: PantallaPlan;
  telefono?: TelefonoPlan;
  lupas?: LupaPlan[];
  chips?: ChipPlan[];
  sellos?: SelloPlan[];
  rotulos?: RotuloPlan[];
  confeti?: number;
  destellos?: number[];
};
export type PlanTutorialBloques = {
  duracion: number;
  colores: { marca: string; oscuro: string; exito: string; resalte: string };
  /** Color de arriba y de abajo de cada captura (rellena la pantalla si no tiene su misma forma). */
  coloresCaptura: Record<string, { arriba: string; abajo: string }>;
  palabras: PalabraVoz[];
  /** Tramos sin subtítulos (cuando un titular ya dice lo mismo). */
  sinSubtitulos: [number, number][];
  portada: {
    hasta: number;
    etiqueta: string;
    lineas: string[];
    logo: string;
    remate: string;
    sello: { t: number; texto: string };
  };
  escenas: EscenaPlan[];
  progresos: ProgresoPlan[];
  cierre: {
    desde: number;
    logo: string;
    titulo: string;
    insignia: string;
    toque: number;
    remate: { t: number; texto: string };
    legal: string;
  };
};

/** Los segundos en que cambia algo que se ve (para revisar el ritmo del plan antes de renderizar). */
export function cambiosDelPlan(plan: PlanTutorialBloques): number[] {
  const t: number[] = [];
  for (const e of plan.escenas) {
    t.push(e.inicio);
    for (const c of e.pantalla?.capturas ?? []) t.push(c.t);
    if (e.pantalla?.encender !== undefined) t.push(e.pantalla.encender);
    for (const c of e.telefono?.capturas ?? []) t.push(c.t);
    if (e.telefono) t.push(e.telefono.desde);
    for (const p of e.telefono?.posiciones ?? []) t.push(p.t);
    for (const l of e.lupas ?? []) {
      t.push(l.desde);
      for (const r of l.resaltes ?? []) t.push(r.t);
    }
    for (const c of e.chips ?? []) t.push(c.desde);
    for (const s of e.sellos ?? []) t.push(s.t);
    for (const r of e.rotulos ?? []) t.push(r.t);
    for (const k of e.camara.slice(1)) t.push(k.t);
    for (const d of e.destellos ?? []) t.push(d);
    for (const q of [...(e.telefono?.toques ?? []), ...(e.pantalla?.toques ?? [])]) t.push(q.t);
  }
  t.push(plan.portada.sello.t, plan.cierre.desde, plan.cierre.toque, plan.cierre.remate.t);
  return [...new Set(t.map((x) => Math.round(x * 100) / 100))].sort((a, b) => a - b);
}

/** El momento en que la voz dice una palabra (la n-ésima vez, desde 1), para atar el plan a la voz. */
export function momentoDe(palabras: PalabraVoz[], palabra: string, vez = 1, desde = 0): number {
  const limpia = (s: string) => sinAcentos(s).replace(/[^a-z0-9]/g, "");
  const buscada = limpia(palabra);
  let n = 0;
  for (const w of palabras) {
    if (w.startMs / 1000 < desde) continue;
    if (limpia(w.text) === buscada && ++n === vez) return Math.round(w.startMs) / 1000;
  }
  throw new Error(`La voz no dice «${palabra}» (vez ${vez}, desde ${desde} s).`);
}

// ---------- Un sonido en cada cambio (formato Escenia, regla 4) ----------

export type Efecto = { t: number; sfx: string; db: number };

/**
 * Un efecto por cada cosa que aparece: soplido en cada escena nueva, «pop» en cada captura o lupa, «tic» en cada
 * toque y resalte, golpe en los sellos, «ding» en lo que sale bien y obturador en cada foto. Dos efectos nunca caen a
 * menos de 0,22 s (se queda el más fuerte) y ninguno cae encima de las palabras protegidas (`marcas`, por ejemplo
 * cuando la voz dice el nombre de la marca): se corre un poco antes o se quita.
 */
export function efectosDelPlan(plan: PlanTutorialBloques, marcas: number[] = []): Efecto[] {
  const e: Efecto[] = [];
  const soplidos = ["whoosh-1", "whoosh-2", "whoosh-3"];
  plan.escenas.forEach((s, k) => {
    if (k > 0 && s.transicion !== "corte")
      e.push({ t: s.inicio - 0.12, sfx: soplidos[k % 3] as string, db: -15 });
    for (const c of s.pantalla?.capturas.slice(1) ?? []) e.push({ t: c.t, sfx: "pop", db: -17 });
    if (s.pantalla?.encender !== undefined) e.push({ t: s.pantalla.encender, sfx: "tick", db: -15 });
    if (s.telefono) e.push({ t: s.telefono.desde, sfx: "whoosh-2", db: -19 });
    for (const c of s.telefono?.capturas.slice(1) ?? []) e.push({ t: c.t, sfx: "pop", db: -16 });
    for (const q of [...(s.telefono?.toques ?? []), ...(s.pantalla?.toques ?? [])])
      e.push({ t: q.t, sfx: "tick", db: -13 });
    for (const l of s.lupas ?? []) {
      e.push({ t: l.desde, sfx: "pop", db: -16 });
      for (const r of l.resaltes ?? []) e.push({ t: r.t, sfx: "tick", db: -18 });
    }
    for (const c of s.chips ?? []) e.push({ t: c.desde, sfx: "pop", db: -18 });
    for (const x of s.sellos ?? []) e.push({ t: x.t, sfx: "boom", db: -13 });
    for (const r of s.rotulos ?? []) e.push({ t: r.t, sfx: "pop", db: -18 });
    for (const d of s.destellos ?? []) e.push({ t: d, sfx: "obturador", db: -14 });
    if (s.confeti !== undefined) e.push({ t: s.confeti, sfx: "ding", db: -16 });
  });
  for (const p of plan.progresos) for (const h of p.hechos) e.push({ t: h.t, sfx: "ding", db: -19 });
  e.push({ t: plan.portada.sello.t, sfx: "boom", db: -13 });
  e.push({ t: plan.cierre.desde - 0.1, sfx: "whoosh-3", db: -16 });
  e.push({ t: plan.cierre.toque, sfx: "tick", db: -13 });
  e.push({ t: plan.cierre.remate.t, sfx: "ding", db: -15 });
  const orden = e.filter((x) => x.t >= 0 && x.t < plan.duracion).sort((a, b) => a.t - b.t);
  const fuera: Efecto[] = [];
  for (const x of orden) {
    const choca = marcas.find((m) => x.t > m - 0.3 && x.t < m + 0.6);
    const y = choca === undefined ? x : { ...x, t: choca - 0.32 };
    const ant = fuera[fuera.length - 1];
    if (ant && y.t - ant.t < 0.22) {
      if (y.db > ant.db) fuera[fuera.length - 1] = y;
      continue;
    }
    if (marcas.some((m) => y.t > m - 0.3 && y.t < m + 0.6)) continue;
    fuera.push({ ...y, t: Math.round(y.t * 100) / 100 });
  }
  return fuera;
}
