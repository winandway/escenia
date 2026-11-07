// Prepara la imagen pública de un invitado del Podcast IA (docs/PODCAST.md, «Cómo se agrega un avatar»).
// Toma el original PRIVADO de avatar/ (fuera de git) y deja en public/podcast/ un webp con transparencia,
// liviano y con el visor LIMPIO: los ojos y la boca pintados se borran con el negro del propio visor, siguiendo
// su forma, para que en el estudio no se vean dos caras (la cara viva la dibuja RobotInvitado encima).
//
// Cómo borra: busca el visor (lo oscuro alrededor de un punto de adentro, con sus huecos rellenos), marca lo
// que brilla adentro (el blanco de los trazos y el rosado de la lengua) y todo lo que está a menos de `radio`
// píxeles de eso, y lo rellena con el negro de alrededor (un relleno suave que no cruza el borde del visor).
// Un avatar humano (modo «sin_visor») no tiene visor: va sin `visor` y solo se limpia el alfa y se pasa a webp
// (su cara no se toca).
//
// Uso (desde la raíz): estacion/node_modules/.bin/tsx scripts/podcast-avatar.ts coleta
//   --medir   además imprime el contorno del visor (para el catálogo, compartido/podcast-avatares.ts)
//
// Un avatar con poses (Mia): `tsx scripts/podcast-avatar.ts mia` prepara TODAS sus poses (las entradas
// `mia_<pose>`) y escribe compartido/podcast-mia.ts con la geometría de cada cara medida en SU imagen: el visor,
// los ojos recortados (los de la imagen, tal cual), las luces de los oídos recortadas y la boca, medida sobre
// la boca pintada (dónde va, cuánto se abre, cuánto se inclina y si lleva lengua).
import { existsSync, writeFileSync } from "node:fs";
import sharp from "sharp";

type Visor = {
  /** Un punto oscuro DENTRO del visor, lejos de los trazos. */
  semilla: [number, number];
  /** La caja donde está el visor (x0, y0, x1, y1): el relleno no sale de aquí. */
  caja: [number, number, number, number];
  /** Hasta dónde llega el resplandor de los trazos pintados. */
  radio: number;
  /** Una caja que NO se borra (x0, y0, x1, y1): la boca pintada que la mano tapa en la pose de risa de Mia. */
  conservar?: Caja;
};

type Caja = [number, number, number, number];

type Preparacion = {
  origen: string;
  destino: string;
  /** El visor que hay que limpiar (un avatar humano no tiene). */
  visor?: Visor;
  /**
   * Los ojos pintados como recortes (Mia): la caja de cada ojo. Después de limpiar el visor, lo que se borró
   * dentro de cada caja (el ojo con sus pestañas y su resplandor) se guarda aparte, en `<destino>-ojo-1.webp`
   * y `-ojo-2.webp`, con transparencia: el estudio los pone encima y los hace parpadear. Son los ojos de la
   * imagen tal cual, sin redibujarlos.
   */
  ojos?: [Caja, Caja];
  /** Las luces de los oídos (aros y bordes de los audífonos) como recortes, para que laten con la voz. */
  oidos?: Caja[];
  /** La caja de la boca pintada, para medirla (la boca viva va en el mismo sitio y del mismo tamaño). */
  boca?: Caja;
};

type Recorte = { recorte: string; x: number; y: number; ancho: number; alto: number };
type Medida = {
  visor: [number, number][];
  ojos: Recorte[];
  oidos: Recorte[];
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

const AVATARES: Record<string, Preparacion> = {
  plateada: {
    origen: "avatar/robots/robot-ella-plateada-cuerpo-entero.png",
    destino: "public/podcast/robot-plateada.webp",
    visor: { semilla: [516, 196], caja: [436, 98, 622, 258], radio: 13 },
  },
  // Mia IA, sentada en su silla (avatar/mia/, 1312 × 1199): siete poses que el estudio alterna. Las cajas
  // (x0, y0, x1, y1) se miraron sobre cada imagen con una rejilla; lo demás lo mide este script.
  mia_tranquila: {
    origen: "avatar/mia/mia-manos-juntas-tranquila.png",
    destino: "public/podcast/mia-tranquila.webp",
    visor: { semilla: [690, 472], caja: [505, 228, 852, 506], radio: 20 },
    ojos: [
      [508, 284, 692, 389],
      [700, 284, 856, 389],
    ],
    boca: [648, 405, 742, 450],
    oidos: [
      [384, 278, 464, 432],
      [836, 258, 906, 448],
    ],
  },
  mia_hablando: {
    origen: "avatar/mia/mia-manos-en-los-brazos-de-la-silla.png",
    destino: "public/podcast/mia-hablando.webp",
    visor: { semilla: [684, 478], caja: [500, 228, 856, 510], radio: 20 },
    ojos: [
      [506, 286, 688, 391],
      [696, 286, 852, 391],
    ],
    boca: [636, 405, 732, 459],
    oidos: [
      [386, 278, 466, 432],
      [830, 240, 904, 448],
    ],
  },
  mia_pensando: {
    origen: "avatar/mia/mia-pensando-mano-en-la-barbilla.png",
    destino: "public/podcast/mia-pensando.webp",
    visor: { semilla: [660, 470], caja: [528, 232, 872, 505], radio: 20 },
    ojos: [
      [530, 300, 722, 400],
      [730, 260, 876, 388],
    ],
    boca: [696, 402, 786, 464],
    oidos: [
      [400, 318, 500, 478],
      [876, 250, 928, 420],
    ],
  },
  mia_notas: {
    origen: "avatar/mia/mia-tablet-tomando-notas.png",
    destino: "public/podcast/mia-notas.webp",
    // El lápiz entra al visor por abajo: no se toca.
    visor: { semilla: [780, 420], caja: [520, 215, 856, 508], radio: 20, conservar: [588, 460, 652, 515] },
    ojos: [
      [528, 278, 676, 378],
      [696, 312, 844, 400],
    ],
    boca: [628, 394, 730, 458],
    oidos: [
      [420, 252, 482, 440],
      [850, 290, 912, 490],
    ],
  },
  // La mano tapa la boca: la boca pintada se queda (la viva no se dibuja) y solo se recortan los ojos.
  mia_riendo: {
    origen: "avatar/mia/mia-riendo-mano-en-la-boca.png",
    destino: "public/podcast/mia-riendo.webp",
    visor: { semilla: [640, 420], caja: [524, 232, 876, 506], radio: 18, conservar: [664, 397, 790, 470] },
    ojos: [
      [528, 300, 718, 397],
      [726, 270, 876, 392],
    ],
    oidos: [
      [402, 310, 494, 462],
      [880, 250, 930, 412],
    ],
  },
  mia_aplaudiendo: {
    origen: "avatar/mia/mia-aplaudiendo.png",
    destino: "public/podcast/mia-aplaudiendo.webp",
    visor: { semilla: [760, 430], caja: [482, 215, 840, 508], radio: 20 },
    ojos: [
      [493, 288, 648, 375],
      [680, 288, 830, 375],
    ],
    boca: [606, 392, 724, 466],
    oidos: [
      [388, 282, 458, 472],
      [868, 270, 912, 466],
    ],
  },
  mia_idea: {
    origen: "avatar/mia/mia-idea-dedo-arriba.png",
    destino: "public/podcast/mia-idea.webp",
    visor: { semilla: [620, 470], caja: [488, 240, 840, 530], radio: 20 },
    ojos: [
      [503, 298, 667, 388],
      [698, 270, 830, 362],
    ],
    boca: [650, 390, 768, 458],
    oidos: [
      [364, 320, 452, 502],
      [850, 250, 895, 452],
    ],
  },
  coleta: {
    origen: "avatar/robots/robot-ella-coleta-cuerpo-entero.png",
    destino: "public/podcast/robot-coleta.webp",
    visor: { semilla: [540, 285], caja: [372, 148, 712, 392], radio: 22 },
  },
};

async function principal(p: Preparacion): Promise<Medida> {
  // El origen sale de la tabla fija de arriba, no de afuera.
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  if (!existsSync(p.origen))
    throw new Error(`No está el original ${p.origen} (la carpeta avatar/ es privada).`);
  const { data, info } = await sharp(p.origen).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = info;
  const px = new Uint8ClampedArray(data.buffer, data.byteOffset, data.length);

  // 1. El alfa limpio: el polvo casi invisible del recorte fuera, y el cuerpo opaco del todo (venía en 252/253).
  for (let k = 3; k < px.length; k += 4) {
    if (px[k]! <= 6) px[k] = 0;
    else if (px[k]! >= 240) px[k] = 255;
  }

  const original = Uint8ClampedArray.from(px);
  const medida: Medida = { visor: [], ojos: [], oidos: [], boca: null };
  if (p.boca) medida.boca = medirBoca(original, W, p.boca);
  if (p.visor) medida.visor = limpiarVisor(px, W, p.visor);
  if (p.ojos) medida.ojos = await guardarOjos(p, original, px, W);
  if (p.oidos) medida.oidos = await guardarLuces(p, original, W);

  const salida = await sharp(Buffer.from(px.buffer, px.byteOffset, px.length), {
    raw: { width: W, height: H, channels: 4 },
  })
    .webp({ quality: 90, alphaQuality: 100, effort: 6, smartSubsample: true })
    .toFile(p.destino);
  console.log(`Listo: ${p.destino} (${W}×${H}, ${Math.round(salida.size / 1024)} KB).`);
  return medida;
}

/** La dirección pública de un archivo de public/. */
const publica = (archivo: string) => archivo.replace(/^public/, "");

/**
 * La boca pintada: sus dos puntas (donde empieza y termina el borde de arriba), cuánto baja el borde de abajo
 * medido en perpendicular a esa línea, el grueso del trazo y el color de la lengua si se ve.
 */
function medirBoca(px: Uint8ClampedArray, W: number, [x0, y0, x1, y1]: Caja): Medida["boca"] {
  const brilla = (x: number, y: number) => {
    const k = (y * W + x) * 4;
    return Math.min(px[k]!, px[k + 1]!, px[k + 2]!) > 170;
  };
  const columnas: { x: number; tramos: [number, number][] }[] = [];
  for (let x = x0; x < x1; x++) {
    const tramos: [number, number][] = [];
    for (let y = y0; y < y1; y++) {
      if (!brilla(x, y)) continue;
      const ultimo = tramos[tramos.length - 1];
      if (ultimo && ultimo[1] === y - 1) ultimo[1] = y;
      else tramos.push([y, y]);
    }
    if (tramos.length) columnas.push({ x, tramos });
  }
  if (columnas.length < 10) throw new Error("No encontré la boca pintada en su caja.");
  const centro = (t: [number, number]) => (t[0] + t[1]) / 2;
  const izq = columnas[3]!;
  const der = columnas[columnas.length - 4]!;
  const pi: [number, number] = [izq.x - 3, centro(izq.tramos[0]!)];
  const pd: [number, number] = [der.x + 3, centro(der.tramos[0]!)];
  const ancho = Math.hypot(pd[0] - pi[0], pd[1] - pi[1]);
  const giro = Math.atan2(pd[1] - pi[1], pd[0] - pi[0]);
  const medio = columnas[Math.floor(columnas.length / 2)]!;
  const grosor = medio.tramos[0]![1] - medio.tramos[0]![0] + 1;
  // Lo más hondo: el centro del tramo de abajo de cada columna, en perpendicular a la línea de las puntas.
  let alto = 0;
  for (const c of columnas) {
    const t = c.tramos[c.tramos.length - 1]!;
    if (c.tramos.length < 2) continue;
    const dx = c.x - pi[0];
    const dy = centro(t) - pi[1];
    alto = Math.max(alto, -dx * Math.sin(giro) + dy * Math.cos(giro));
  }
  let [r, g, b, n] = [0, 0, 0, 0];
  for (let y = y0; y < y1; y++)
    for (let x = x0; x < x1; x++) {
      const k = (y * W + x) * 4;
      if (px[k]! > 190 && px[k + 1]! < 175 && px[k + 2]! > 110 && px[k]! - px[k + 1]! > 50) {
        r += px[k]!;
        g += px[k + 1]!;
        b += px[k + 2]!;
        n++;
      }
    }
  const hex = (v: number) =>
    Math.round(v / n)
      .toString(16)
      .padStart(2, "0");
  const r1 = (v: number) => Math.round(v * 10) / 10;
  return {
    x: r1((pi[0] + pd[0]) / 2),
    y: r1((pi[1] + pd[1]) / 2),
    giro: r1((giro * 180) / Math.PI),
    ancho: r1(ancho),
    alto: r1(alto),
    grosor: Math.max(4, Math.min(8, grosor)),
    ...(n > 40 ? { lengua: `#${hex(r)}${hex(g)}${hex(b)}` } : {}),
  };
}

/**
 * Las luces de los oídos como recortes: dentro de cada caja, lo cian (el azul que le gana al rojo), con su
 * propio color y un alfa según cuánto brilla. El estudio las pone encima, difuminadas, y las hace latir.
 */
async function guardarLuces(p: Preparacion, px: Uint8ClampedArray, W: number): Promise<Recorte[]> {
  const salida: Recorte[] = [];
  for (const [n, [x0, y0, x1, y1]] of p.oidos!.entries()) {
    const w = x1 - x0;
    const h = y1 - y0;
    const capa = new Uint8ClampedArray(w * h * 4);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const k = ((y + y0) * W + x + x0) * 4;
        const [r, g, b] = [px[k]!, px[k + 1]!, px[k + 2]!];
        const alfa = Math.min(1, Math.max(0, (b - Math.max(r, g * 0.55) - 40) / 110)) * (px[k + 3]! / 255);
        if (alfa < 0.03) continue;
        const o = (y * w + x) * 4;
        capa[o] = r;
        capa[o + 1] = g;
        capa[o + 2] = b;
        capa[o + 3] = Math.round(alfa * 255);
      }
    const archivo = p.destino.replace(/\.webp$/, `-luz-${n + 1}.webp`);
    await sharp(Buffer.from(capa.buffer), { raw: { width: w, height: h, channels: 4 } })
      .webp({ quality: 90, alphaQuality: 100, effort: 6 })
      .toFile(archivo);
    salida.push({ recorte: publica(archivo), x: x0, y: y0, ancho: w, alto: h });
  }
  return salida;
}

/**
 * Los ojos como recortes: dentro de cada caja, lo que la limpieza le quitó a la imagen (original − limpia).
 * El alfa es lo más fuerte de esa diferencia y el color, la diferencia sin el alfa: puesto encima de la imagen
 * limpia devuelve el ojo de la imagen (con un error del orden del negro del visor por el alfa, casi nada).
 * Se recorta a lo que tiene luz, y se dice dónde quedó cada uno (para el catálogo).
 */
async function guardarOjos(
  p: Preparacion,
  original: Uint8ClampedArray,
  limpia: Uint8ClampedArray,
  W: number,
): Promise<Recorte[]> {
  const recortes: Recorte[] = [];
  for (const [n, [x0, y0, x1, y1]] of p.ojos!.entries()) {
    let [a0, b0, a1, b1] = [x1, y1, x0, y0];
    for (let y = y0; y < y1; y++)
      for (let x = x0; x < x1; x++) {
        const k = (y * W + x) * 4;
        const d = Math.max(
          original[k]! - limpia[k]!,
          original[k + 1]! - limpia[k + 1]!,
          original[k + 2]! - limpia[k + 2]!,
        );
        if (d < 6) continue;
        a0 = Math.min(a0, x);
        b0 = Math.min(b0, y);
        a1 = Math.max(a1, x + 1);
        b1 = Math.max(b1, y + 1);
      }
    if (a1 <= a0) throw new Error(`El ojo ${n + 1} no tiene luz en su caja: revisa la caja.`);
    const w = a1 - a0;
    const h = b1 - b0;
    const salida = new Uint8ClampedArray(w * h * 4);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const k = ((y + b0) * W + x + a0) * 4;
        const d = [0, 1, 2].map((o) => Math.max(0, original[k + o]! - limpia[k + o]!));
        const alfa = Math.max(...d) / 255;
        const o = (y * w + x) * 4;
        if (alfa < 0.02) continue;
        for (let c = 0; c < 3; c++) salida[o + c] = Math.min(255, Math.round(d[c]! / alfa));
        salida[o + 3] = Math.round(alfa * 255);
      }
    const archivo = p.destino.replace(/\.webp$/, `-ojo-${n + 1}.webp`);
    const r = await sharp(Buffer.from(salida.buffer), { raw: { width: w, height: h, channels: 4 } })
      .webp({ quality: 92, alphaQuality: 100, effort: 6 })
      .toFile(archivo);
    console.log(
      `Ojo ${n + 1}: ${archivo} en x ${a0}, y ${b0}, ${w} × ${h} (${Math.round(r.size / 1024)} KB).`,
    );
    recortes.push({ recorte: publica(archivo), x: a0, y: b0, ancho: w, alto: h });
  }
  return recortes;
}

/** Borra la cara pintada del visor con el negro del propio visor (ver arriba, «Cómo borra»). */
function limpiarVisor(px: Uint8ClampedArray, W: number, p: Visor): [number, number][] {
  const i4 = (x: number, y: number) => (y * W + x) * 4;
  // 2. El visor: lo oscuro (o el resplandor cian) conectado a la semilla, dentro de la caja.
  const [x0, y0, x1, y1] = p.caja;
  const cw = x1 - x0;
  const ch = y1 - y0;
  const dentroCaja = (x: number, y: number) => x >= x0 && x < x1 && y >= y0 && y < y1;
  const c = (x: number, y: number) => (y - y0) * cw + (x - x0);
  const oscuro = (x: number, y: number) => {
    const k = i4(x, y);
    const r = px[k]!;
    const g = px[k + 1]!;
    const b = px[k + 2]!;
    return Math.max(r, g, b) < 100 || (b > r + 35 && r < 150);
  };
  const visor = new Uint8Array(cw * ch);
  const pila: number[] = [c(...p.semilla)];
  visor[pila[0]!] = 1;
  while (pila.length) {
    const q = pila.pop()!;
    const x = (q % cw) + x0;
    const y = Math.floor(q / cw) + y0;
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const) {
      const nx = x + dx;
      const ny = y + dy;
      if (!dentroCaja(nx, ny)) continue;
      const n = c(nx, ny);
      if (visor[n] || !oscuro(nx, ny)) continue;
      visor[n] = 1;
      pila.push(n);
    }
  }
  // Las juntas finas del casco (líneas negras de 2 o 3 píxeles) se quitan con una apertura de 3 píxeles.
  const erosion = (m: Uint8Array, r: number) => {
    const s = new Uint8Array(m.length);
    for (let y = 0; y < ch; y++)
      for (let x = 0; x < cw; x++) {
        let todo = 1;
        for (let dy = -r; dy <= r && todo; dy++)
          for (let dx = -r; dx <= r; dx++) {
            const xx = x + dx;
            const yy = y + dy;
            if (xx < 0 || yy < 0 || xx >= cw || yy >= ch || !m[yy * cw + xx]) {
              todo = 0;
              break;
            }
          }
        s[y * cw + x] = todo;
      }
    return s;
  };
  const dilatacion = (m: Uint8Array, r: number) => {
    const s = new Uint8Array(m.length);
    for (let y = 0; y < ch; y++)
      for (let x = 0; x < cw; x++) {
        if (!m[y * cw + x]) continue;
        for (let dy = -r; dy <= r; dy++)
          for (let dx = -r; dx <= r; dx++) {
            const xx = x + dx;
            const yy = y + dy;
            if (xx >= 0 && yy >= 0 && xx < cw && yy < ch) s[yy * cw + xx] = 1;
          }
      }
    return s;
  };
  let mascara = dilatacion(erosion(visor, 3), 3);
  // Los trazos de la cara quedan como huecos: se rellenan (todo lo que no se alcanza desde el borde de la caja).
  const fuera = new Uint8Array(cw * ch);
  const cola: number[] = [];
  for (let x = 0; x < cw; x++) for (const y of [0, ch - 1]) if (!mascara[y * cw + x]) cola.push(y * cw + x);
  for (let y = 0; y < ch; y++) for (const x of [0, cw - 1]) if (!mascara[y * cw + x]) cola.push(y * cw + x);
  for (const q of cola) fuera[q] = 1;
  while (cola.length) {
    const q = cola.pop()!;
    const x = q % cw;
    const y = Math.floor(q / cw);
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= cw || ny >= ch) continue;
      const n = ny * cw + nx;
      if (fuera[n] || mascara[n]) continue;
      fuera[n] = 1;
      cola.push(n);
    }
  }
  mascara = mascara.map((v, k) => (v || !fuera[k] ? 1 : 0));

  // Lo que se conserva (la boca que tapa la mano) no se toca ni se usa para rellenar.
  const contorno = mascara;
  if (p.conservar) {
    const [c0, d0, c1, d1] = p.conservar;
    mascara = mascara.map((v, q) => {
      const x = (q % cw) + x0;
      const y = Math.floor(q / cw) + y0;
      return v && !(x >= c0 && x < c1 && y >= d0 && y < d1) ? 1 : 0;
    });
  }

  // 3. Lo que brilla adentro (el blanco de los trazos y el rosado de la lengua), y su resplandor.
  const distancia = new Int32Array(cw * ch).fill(1 << 20);
  const frente: number[] = [];
  for (let y = 0; y < ch; y++)
    for (let x = 0; x < cw; x++) {
      const q = y * cw + x;
      if (!mascara[q]) continue;
      const k = i4(x + x0, y + y0);
      const r = px[k]!;
      const g = px[k + 1]!;
      const b = px[k + 2]!;
      if (Math.min(r, g, b) > 170 || (r > 190 && g < 175 && b > 110)) {
        distancia[q] = 0;
        frente.push(q);
      }
    }
  // Distancia por capas (8 vecinos), hasta el radio.
  for (let paso = 1; paso <= p.radio && frente.length; paso++) {
    const nuevo: number[] = [];
    for (const q of frente) {
      const x = q % cw;
      const y = Math.floor(q / cw);
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= cw || ny >= ch) continue;
          const n = ny * cw + nx;
          if (!mascara[n] || distancia[n]! <= paso) continue;
          distancia[n] = paso;
          nuevo.push(n);
        }
    }
    frente.splice(0, frente.length, ...nuevo);
  }
  const borrar: number[] = [];
  for (let q = 0; q < cw * ch; q++) if (mascara[q] && distancia[q]! <= p.radio) borrar.push(q);

  // 4. El relleno: cada píxel borrado toma el promedio de sus vecinos DEL VISOR, hasta que se asienta.
  const canal = [0, 1, 2].map((o) => {
    const v = new Float32Array(cw * ch);
    for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) v[y * cw + x] = px[i4(x + x0, y + y0) + o]!;
    return v;
  });
  const esBorrado = new Uint8Array(cw * ch);
  for (const q of borrar) esBorrado[q] = 1;
  // Arranque: el promedio del borde del visor que no se borra.
  for (const v of canal) {
    let suma = 0;
    let n = 0;
    for (let q = 0; q < cw * ch; q++)
      if (mascara[q] && !esBorrado[q]) {
        suma += v[q]!;
        n++;
      }
    for (const q of borrar) v[q] = n ? suma / n : 10;
  }
  for (let vuelta = 0; vuelta < 3000; vuelta++) {
    let cambio = 0;
    for (const q of borrar) {
      const x = q % cw;
      const y = Math.floor(q / cw);
      for (const v of canal) {
        let suma = 0;
        let n = 0;
        for (const n4 of [q - 1, q + 1, q - cw, q + cw]) {
          const nx = n4 % cw;
          if (n4 < 0 || n4 >= cw * ch || Math.abs(nx - x) > 1 || Math.abs(Math.floor(n4 / cw) - y) > 1)
            continue;
          if (!mascara[n4]) continue;
          suma += v[n4]!;
          n++;
        }
        if (!n) continue;
        const nuevo = suma / n;
        cambio = Math.max(cambio, Math.abs(nuevo - v[q]!));
        v[q] = nuevo;
      }
    }
    if (cambio < 0.02) break;
  }
  for (const q of borrar) {
    const k = i4((q % cw) + x0, Math.floor(q / cw) + y0);
    px[k] = Math.round(canal[0]![q]!);
    px[k + 1] = Math.round(canal[1]![q]!);
    px[k + 2] = Math.round(canal[2]![q]!);
    px[k + 3] = 255;
  }

  // El contorno del visor visto desde la semilla, cada 15 grados, 3 píxeles adentro del borde (para recortar la
  // cara viva al vidrio).
  const contornoVisor: [number, number][] = [];
  for (let a = 0; a < 360; a += 15) {
    const rad = (a * Math.PI) / 180;
    let ultimo = 0;
    for (let r = 1; r < 400; r++) {
      const x = Math.round(p.semilla[0] + Math.cos(rad) * r);
      const y = Math.round(p.semilla[1] + Math.sin(rad) * r);
      if (!dentroCaja(x, y) || !contorno[c(x, y)]) break;
      ultimo = r;
    }
    const r = Math.max(0, ultimo - 3);
    contornoVisor.push([
      Math.round(p.semilla[0] + Math.cos(rad) * r),
      Math.round(p.semilla[1] + Math.sin(rad) * r),
    ]);
  }
  if (process.argv.includes("--medir")) {
    console.log(`Contorno del visor (3 px adentro): ${JSON.stringify(contornoVisor)}`);
    console.log(`Píxeles borrados: ${borrar.length}`);
  }
  return contornoVisor;
}

/** Mia: todas sus poses y el módulo con su geometría (compartido/podcast-mia.ts). */
async function prepararMia() {
  const poses: Record<string, Medida & { imagen: string }> = {};
  for (const [clave, prep] of Object.entries(AVATARES)) {
    if (!clave.startsWith("mia_")) continue;
    poses[clave.slice(4)] = { imagen: publica(prep.destino), ...(await principal(prep)) };
  }
  const texto = `// GENERADO por scripts/podcast-avatar.ts mia (no se edita a mano): la geometría de la cara de Mia IA en cada
// una de sus poses, medida en SU imagen (avatar/mia/). Los ojos y las luces de los oídos son recortes de la
// propia imagen; la boca viva va donde estaba la pintada. Ver docs/PODCAST.md, «Mia y sus poses».
import type { MedidaDePose } from "./podcast-avatares";

export const MEDIDAS_MIA = ${JSON.stringify(poses, null, 2)} as const satisfies Record<string, MedidaDePose>;
`;
  writeFileSync("compartido/podcast-mia.ts", texto);
  console.log(`Listo: compartido/podcast-mia.ts (${Object.keys(poses).join(", ")}).`);
}

const id = process.argv[2] ?? "";
const prep = AVATARES[id];
if (id !== "mia" && !prep) {
  console.error(`Avatar desconocido «${id}». Hay: mia, ${Object.keys(AVATARES).join(", ")}.`);
  process.exit(1);
}
(id === "mia" ? prepararMia() : principal(prep!)).catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
