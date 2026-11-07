// La cabeza de Mia como capa propia en cada pose (docs/PODCAST.md, «La cabeza viva»; candado C-PODCAST-6).
//
// De cada pose publicada (public/podcast/mia-<pose>.webp, la que deja limpia scripts/podcast-avatar.ts) saca dos
// imágenes:
// - **La cabeza** (mia-<pose>-cabeza.webp): el casco, el visor, los audífonos, el arranque de la coleta y, en las
//   poses con la mano en la cara, la mano. Se recorta con la silueta de verdad (lo claro del robot y lo que queda
//   encerrado, como el visor) dentro de una zona medida a mano por pose; donde la zona corta a la coleta o al
//   antebrazo, el borde se difumina para que se doble con naturalidad.
// - **El cuerpo** (mia-<pose>-cuerpo.webp): la pose sin la cabeza. El hueco se rellena con lo que hay alrededor
//   (la silla, el cuello, lo transparente de arriba), del borde hacia adentro. Así, cuando la cabeza se mueve,
//   detrás se ve la silla y no otra cabeza: nunca hay doble imagen.
//
// Escribe compartido/podcast-mia-cabeza.ts (generado) con dónde va cada cabeza. Con `--revisar <carpeta>` deja
// una hoja con cada pose: el cuerpo solo y la cabeza en sus dos extremos de movimiento, para mirarla antes de
// publicar.
//
// Uso (desde la raíz): estacion/node_modules/.bin/tsx scripts/podcast-cabeza.ts [--revisar <carpeta>]
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import sharp, { type OverlayOptions } from "sharp";
import { LIMITES_CABEZA, pivoteDelCuello } from "../compartido/podcast-cabeza";
import { MEDIDAS_MIA } from "../compartido/podcast-mia";

type P = readonly [number, number];
type PoseDeMia = keyof typeof MEDIDAS_MIA;

// La zona de la cabeza de cada pose, en píxeles de su imagen (1312 × 1199), medida sobre la imagen con una rejilla.
// Arriba y a los lados es holgada (ahí la silueta la pone el robot); abajo corta debajo de la barbilla y por
// encima de los hombros, y a la izquierda corta la coleta debajo del audífono.
// Arriba sale de la imagen (la punta de la coleta llega casi al borde) y a la izquierda deja aire a la coleta.
const ARRIBA: P[] = [
  [150, -60],
  [1000, -60],
];
const ZONAS: Record<PoseDeMia, readonly P[]> = {
  tranquila: [...ARRIBA, [1000, 540], [800, 562], [480, 562], [430, 532], [150, 450]],
  hablando: [...ARRIBA, [1000, 540], [800, 562], [480, 562], [430, 532], [150, 450]],
  // La mano en la barbilla va con la cabeza (como quien apoya la cara en la mano); corta en la muñeca.
  pensando: [
    ...ARRIBA,
    [1000, 520],
    [830, 560],
    [815, 652],
    [645, 652],
    [612, 585],
    [480, 580],
    [430, 548],
    [150, 462],
  ],
  // El lápiz entra al visor: la mano que lo sostiene va con la cabeza.
  notas: [
    ...ARRIBA,
    [1000, 540],
    [760, 572],
    [705, 668],
    [560, 668],
    [540, 592],
    [480, 582],
    [430, 548],
    [150, 462],
  ],
  // La mano tapa la boca: va con la cabeza.
  riendo: [
    ...ARRIBA,
    [1000, 520],
    [830, 560],
    [815, 652],
    [640, 652],
    [610, 585],
    [480, 580],
    [430, 548],
    [150, 462],
  ],
  // Las manos que aplauden quedan abajo, en el cuerpo.
  aplaudiendo: [...ARRIBA, [1000, 528], [700, 544], [480, 552], [430, 530], [150, 450]],
  // El dedo y el foco de la idea quedan a la derecha, en el cuerpo.
  idea: [
    [150, -60],
    [912, -60],
    [912, 575],
    [800, 588],
    [480, 588],
    [430, 558],
    [150, 472],
  ],
};

/** Cuánto se difumina el borde de la zona (dos pasadas de este radio: la transición mide unos 40 px). */
const DIFUMINADO = 10;

function leerArgs() {
  const i = process.argv.indexOf("--revisar");
  return { revisar: i > 0 ? process.argv[i + 1] : undefined };
}

/** Rellena un polígono en una máscara (de fila en fila). */
function pintarPoligono(poligono: readonly P[], W: number, H: number): Float32Array {
  const m = new Float32Array(W * H);
  for (let y = 0; y < H; y++) {
    const cruces: number[] = [];
    for (let i = 0; i < poligono.length; i++) {
      const [x0, y0] = poligono[i]!;
      const [x1, y1] = poligono[(i + 1) % poligono.length]!;
      if (y0 <= y + 0.5 !== y1 <= y + 0.5) cruces.push(x0 + ((y + 0.5 - y0) * (x1 - x0)) / (y1 - y0));
    }
    cruces.sort((a, b) => a - b);
    for (let k = 0; k + 1 < cruces.length; k += 2) {
      for (let x = Math.max(0, Math.ceil(cruces[k]! - 0.5)); x < Math.min(W, cruces[k + 1]! - 0.5); x++)
        m[y * W + x] = 1;
    }
  }
  return m;
}

/** Desenfoque de caja separable (una pasada horizontal y una vertical). */
function desenfocar(m: Float32Array, W: number, H: number, r: number): Float32Array {
  const tmp = new Float32Array(W * H);
  const out = new Float32Array(W * H);
  const n = 2 * r + 1;
  for (let y = 0; y < H; y++) {
    let s = 0;
    for (let x = -r; x <= r; x++) s += m[y * W + Math.min(W - 1, Math.max(0, x))]!;
    for (let x = 0; x < W; x++) {
      tmp[y * W + x] = s / n;
      s += m[y * W + Math.min(W - 1, x + r + 1)]! - m[y * W + Math.max(0, x - r)]!;
    }
  }
  for (let x = 0; x < W; x++) {
    let s = 0;
    for (let y = -r; y <= r; y++) s += tmp[Math.min(H - 1, Math.max(0, y)) * W + x]!;
    for (let y = 0; y < H; y++) {
      out[y * W + x] = s / n;
      s += tmp[Math.min(H - 1, y + r + 1) * W + x]! - tmp[Math.max(0, y - r) * W + x]!;
    }
  }
  return out;
}

/** Dilata (o erosiona) una máscara binaria con un cuadrado de radio r. */
function morfologia(m: Uint8Array, W: number, H: number, r: number, dilatar: boolean): Uint8Array {
  const busca = dilatar ? 1 : 0;
  const tmp = new Uint8Array(W * H);
  const out = new Uint8Array(W * H);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      let v = 1 - busca;
      for (let k = Math.max(0, x - r); k <= Math.min(W - 1, x + r); k++)
        if (m[y * W + k] === busca) {
          v = busca;
          break;
        }
      tmp[y * W + x] = v;
    }
  for (let x = 0; x < W; x++)
    for (let y = 0; y < H; y++) {
      let v = 1 - busca;
      for (let k = Math.max(0, y - r); k <= Math.min(H - 1, y + r); k++)
        if (tmp[k * W + x] === busca) {
          v = busca;
          break;
        }
      out[y * W + x] = v;
    }
  return out;
}

/** Inunda desde `semillas` por los píxeles donde `paso` es verdad (4 vecinos). */
function inundar(W: number, H: number, semillas: number[], paso: (i: number) => boolean): Uint8Array {
  const visto = new Uint8Array(W * H);
  const cola = new Int32Array(W * H);
  let fin = 0;
  for (const s of semillas)
    if (!visto[s] && paso(s)) {
      visto[s] = 1;
      cola[fin++] = s;
    }
  for (let ini = 0; ini < fin; ini++) {
    const i = cola[ini]!;
    const x = i % W;
    for (const j of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, i - W, i + W]) {
      if (j < 0 || j >= W * H || visto[j] || !paso(j)) continue;
      visto[j] = 1;
      cola[fin++] = j;
    }
  }
  return visto;
}

/**
 * Rellena los píxeles desconocidos con los de alrededor (pirámide «pull-push»): cada nivel promedia lo conocido y
 * el hueco se llena desde los niveles gruesos, suave y del color de lo que lo rodea. Trabaja con el color
 * premultiplicado por el alfa, así lo transparente de arriba sigue transparente.
 */
function rellenar(rgba: Float32Array, conocido: Float32Array, W: number, H: number): Float32Array {
  type Nivel = { c: Float32Array; w: Float32Array; W: number; H: number };
  const niveles: Nivel[] = [{ c: rgba, w: conocido, W, H }];
  while (niveles.at(-1)!.W > 1 || niveles.at(-1)!.H > 1) {
    const a = niveles.at(-1)!;
    const W2 = Math.max(1, Math.ceil(a.W / 2));
    const H2 = Math.max(1, Math.ceil(a.H / 2));
    const c = new Float32Array(W2 * H2 * 4);
    const w = new Float32Array(W2 * H2);
    for (let y = 0; y < H2; y++)
      for (let x = 0; x < W2; x++) {
        let sw = 0;
        const s = [0, 0, 0, 0];
        for (let dy = 0; dy < 2; dy++)
          for (let dx = 0; dx < 2; dx++) {
            const xx = Math.min(a.W - 1, 2 * x + dx);
            const yy = Math.min(a.H - 1, 2 * y + dy);
            const k = yy * a.W + xx;
            const wk = a.w[k]!;
            sw += wk;
            for (let ch = 0; ch < 4; ch++) s[ch]! += a.c[k * 4 + ch]! * wk;
          }
        const o = y * W2 + x;
        w[o] = Math.min(1, sw);
        for (let ch = 0; ch < 4; ch++) c[o * 4 + ch] = sw > 0 ? s[ch]! / sw : 0;
      }
    niveles.push({ c, w, W: W2, H: H2 });
  }
  for (let n = niveles.length - 2; n >= 0; n--) {
    const a = niveles[n]!;
    const g = niveles[n + 1]!;
    for (let y = 0; y < a.H; y++)
      for (let x = 0; x < a.W; x++) {
        const k = y * a.W + x;
        const w = a.w[k]!;
        if (w >= 1) continue;
        // Del nivel grueso, interpolado (bilineal) para que no queden cuadros.
        const gx = Math.min(g.W - 1, Math.max(0, (x - 0.5) / 2));
        const gy = Math.min(g.H - 1, Math.max(0, (y - 0.5) / 2));
        const x0 = Math.floor(gx);
        const y0 = Math.floor(gy);
        const x1 = Math.min(g.W - 1, x0 + 1);
        const y1 = Math.min(g.H - 1, y0 + 1);
        const fx = gx - x0;
        const fy = gy - y0;
        for (let ch = 0; ch < 4; ch++) {
          const v =
            (g.c[(y0 * g.W + x0) * 4 + ch]! * (1 - fx) + g.c[(y0 * g.W + x1) * 4 + ch]! * fx) * (1 - fy) +
            (g.c[(y1 * g.W + x0) * 4 + ch]! * (1 - fx) + g.c[(y1 * g.W + x1) * 4 + ch]! * fx) * fy;
          a.c[k * 4 + ch] = a.c[k * 4 + ch]! * w + v * (1 - w);
        }
        a.w[k] = 1;
      }
  }
  return niveles[0]!.c;
}

type Resultado = {
  imagen: string;
  x: number;
  y: number;
  ancho: number;
  alto: number;
  cuerpo: string;
};

async function prepararPose(pose: PoseDeMia): Promise<{ r: Resultado; cuerpo: Buffer; cabeza: Buffer }> {
  const medida = MEDIDAS_MIA[pose];
  const origen = path.join("public", medida.imagen);
  const { data, info } = await sharp(origen).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width;
  const H = info.height;
  const px = new Uint8Array(data.buffer, data.byteOffset, data.length);
  const N = W * H;

  // 1. La zona de la cabeza, con su borde difuminado.
  const zona = desenfocar(desenfocar(pintarPoligono(ZONAS[pose], W, H), W, H, DIFUMINADO), W, H, DIFUMINADO);

  // 2. Lo claro del robot (el casco, la coleta, los audífonos) y sus luces cian; la silla es roja u oscura.
  const claro = new Uint8Array(N);
  for (let i = 0; i < N; i++) {
    const [r, g, b, a] = [px[i * 4]!, px[i * 4 + 1]!, px[i * 4 + 2]!, px[i * 4 + 3]!];
    if (a < 128) continue;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const luz = 0.299 * r + 0.587 * g + 0.114 * b;
    const gris = max === 0 ? 0 : (max - min) / max;
    const cian = b > 140 && g > 110 && r < 120;
    if ((luz > 95 && gris < 0.3) || cian) claro[i] = 1;
  }
  // Se cierran las rendijas finas (las juntas negras del casco) y se llena lo encerrado (el visor).
  const cerrado = morfologia(morfologia(claro, W, H, 5, true), W, H, 5, false);
  const borde: number[] = [];
  for (let x = 0; x < W; x++) borde.push(x, (H - 1) * W + x);
  for (let y = 0; y < H; y++) borde.push(y * W, y * W + W - 1);
  const fondo = inundar(W, H, borde, (i) => !cerrado[i]);

  // 3. La cabeza: lo que no es fondo, dentro de la zona, unido al visor.
  const xs = medida.visor.map((p) => p[0]);
  const ys = medida.visor.map((p) => p[1]);
  const centro =
    Math.round((Math.min(...ys) + Math.max(...ys)) / 2) * W +
    Math.round((Math.min(...xs) + Math.max(...xs)) / 2);
  const cabeza = inundar(W, H, [centro], (i) => !fondo[i] && zona[i]! > 0.01);
  if (!cabeza[centro]) throw new Error(`${pose}: el centro del visor no quedó dentro de la cabeza.`);

  // 4. La capa de la cabeza: el alfa de la imagen por la zona y por la silueta (suavizada un píxel).
  const silueta = desenfocar(Float32Array.from(cabeza), W, H, 1);
  const alfa = new Float32Array(N);
  let [x0, y0, x1, y1] = [W, H, 0, 0];
  for (let i = 0; i < N; i++) {
    const a = (px[i * 4 + 3]! / 255) * zona[i]! * silueta[i]!;
    alfa[i] = a;
    if (a > 0.01) {
      const x = i % W;
      const y = (i - x) / W;
      x0 = Math.min(x0, x);
      y0 = Math.min(y0, y);
      x1 = Math.max(x1, x);
      y1 = Math.max(y1, y);
    }
  }
  [x0, y0, x1, y1] = [
    Math.max(0, x0 - 2),
    Math.max(0, y0 - 2),
    Math.min(W - 1, x1 + 2),
    Math.min(H - 1, y1 + 2),
  ];
  const cw = x1 - x0 + 1;
  const ch = y1 - y0 + 1;
  const capa = Buffer.alloc(cw * ch * 4);
  for (let y = 0; y < ch; y++)
    for (let x = 0; x < cw; x++) {
      const i = (y + y0) * W + (x + x0);
      const o = (y * cw + x) * 4;
      capa[o] = px[i * 4]!;
      capa[o + 1] = px[i * 4 + 1]!;
      capa[o + 2] = px[i * 4 + 2]!;
      capa[o + 3] = Math.round(alfa[i]! * 255);
    }

  // 5. El cuerpo: la imagen con el hueco de la cabeza relleno desde afuera. El hueco es la cabeza (dos píxeles más
  // ancha, para que no quede un filo claro) donde la zona es plena; donde la zona se difumina, queda la imagen.
  const hueco = morfologia(cabeza, W, H, 2, true);
  const conocido = new Float32Array(N);
  const premult = new Float32Array(N * 4);
  for (let i = 0; i < N; i++) {
    const dentro = hueco[i] && zona[i]! >= 0.995;
    conocido[i] = dentro ? 0 : 1;
    const a = px[i * 4 + 3]! / 255;
    premult[i * 4] = px[i * 4]! * a;
    premult[i * 4 + 1] = px[i * 4 + 1]! * a;
    premult[i * 4 + 2] = px[i * 4 + 2]! * a;
    premult[i * 4 + 3] = a;
  }
  const lleno = rellenar(premult, conocido, W, H);
  const cuerpo = Buffer.alloc(N * 4);
  for (let i = 0; i < N; i++) {
    const a = lleno[i * 4 + 3]!;
    cuerpo[i * 4 + 3] = Math.round(Math.min(1, a) * 255);
    for (let c = 0; c < 3; c++)
      cuerpo[i * 4 + c] = a > 0.002 ? Math.round(Math.min(255, lleno[i * 4 + c]! / a)) : 0;
  }

  const base = medida.imagen.replace(/\.webp$/, "");
  const r: Resultado = {
    imagen: `${base}-cabeza.webp`,
    x: x0,
    y: y0,
    ancho: cw,
    alto: ch,
    cuerpo: `${base}-cuerpo.webp`,
  };
  const webpCuerpo = await sharp(cuerpo, { raw: { width: W, height: H, channels: 4 } })
    .webp({ quality: 90, alphaQuality: 100, effort: 6, smartSubsample: true })
    .toBuffer();
  const webpCabeza = await sharp(capa, { raw: { width: cw, height: ch, channels: 4 } })
    .webp({ quality: 92, alphaQuality: 100, effort: 6, smartSubsample: true })
    .toBuffer();
  // En reposo, la cabeza encima del cuerpo tiene que dar la imagen de siempre (lo mide también la prueba).
  const juntas = await sharp(webpCuerpo)
    .composite([{ input: webpCabeza, left: x0, top: y0 }])
    .raw()
    .toBuffer();
  let suma = 0;
  let grandes = 0;
  for (let i = 0; i < N; i++) {
    const a = px[i * 4 + 3]! / 255;
    let d = Math.abs(juntas[i * 4 + 3]! - px[i * 4 + 3]!);
    for (let c = 0; c < 3; c++) d = Math.max(d, Math.abs(juntas[i * 4 + c]! - px[i * 4 + c]!) * a);
    suma += d;
    if (d > 40) grandes++;
  }
  console.log(
    `  ${pose}: en reposo difiere ${(suma / N).toFixed(2)} de 255 en promedio; ${grandes} píxeles por más de 40`,
  );
  // Rutas fijas del catálogo de Mia (public/podcast/mia-<pose>-…).
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  writeFileSync(path.join("public", r.cuerpo), webpCuerpo);
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  writeFileSync(path.join("public", r.imagen), webpCabeza);
  console.log(
    `${pose}: cabeza ${cw}×${ch} en (${x0}, ${y0}), ${Math.round(webpCabeza.length / 1024)} KB; cuerpo ${Math.round(webpCuerpo.length / 1024)} KB`,
  );
  return { r, cuerpo: webpCuerpo, cabeza: webpCabeza };
}

/** La hoja para mirar: por pose, el cuerpo solo y la cabeza en sus dos extremos de movimiento, sobre la casa. */
async function hojaDeRevision(
  carpeta: string,
  hechas: { pose: PoseDeMia; r: Resultado; cuerpo: Buffer; cabeza: Buffer }[],
) {
  // La carpeta que pide quien corre el script para mirar la hoja.
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  mkdirSync(carpeta, { recursive: true });
  const [X0, Y0, X1, Y1] = [230, 60, 1010, 720];
  const k = 0.42;
  const w = Math.round((X1 - X0) * k);
  const h = Math.round((Y1 - Y0) * k);
  const L = LIMITES_CABEZA;
  // El dibujante de SVG de sharp no lee webp incrustado: se pasan a PNG.
  const datos = async (b: Buffer) =>
    `data:image/png;base64,${(await sharp(b).png().toBuffer()).toString("base64")}`;
  const piezas: OverlayOptions[] = [];
  for (const [fila, { pose, r, cuerpo: webpCuerpo, cabeza: webpCabeza }] of hechas.entries()) {
    const cuerpo = await datos(webpCuerpo);
    const cabeza = await datos(webpCabeza);
    const [cx, cy] = pivoteDelCuello(MEDIDAS_MIA[pose].visor);
    const vistas = [
      { titulo: `${pose}: el cuerpo`, cabeza: false, t: "" },
      { titulo: "extremo +", cabeza: true, t: `translate(${L.dx} ${L.dy}) rotate(${L.giro} ${cx} ${cy})` },
      { titulo: "extremo -", cabeza: true, t: `translate(${-L.dx} ${-L.dy}) rotate(${-L.giro} ${cx} ${cy})` },
    ];
    for (const [col, v] of vistas.entries()) {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}" height="${h}" viewBox="${X0} ${Y0} ${X1 - X0} ${Y1 - Y0}">
        <rect x="${X0}" y="${Y0}" width="${X1 - X0}" height="${Y1 - Y0}" fill="#2a2350"/>
        <image xlink:href="${cuerpo}" width="1312" height="1199"/>
        ${v.cabeza ? `<g transform="${v.t}"><image xlink:href="${cabeza}" x="${r.x}" y="${r.y}" width="${r.ancho}" height="${r.alto}"/></g>` : ""}
        <circle cx="${cx}" cy="${cy}" r="5" fill="#ff2d6f"/>
        <text x="${X0 + 8}" y="${Y1 - 12}" fill="#fff" font-size="30" font-family="sans-serif">${v.titulo}</text>
      </svg>`;
      piezas.push({ input: await sharp(Buffer.from(svg)).png().toBuffer(), left: col * w, top: fila * h });
    }
  }
  const salida = path.join(carpeta, "mia-cabezas.png");
  await sharp({ create: { width: 3 * w, height: hechas.length * h, channels: 3, background: "#000" } })
    .composite(piezas)
    .png()
    .toFile(salida);
  console.log(`Hoja para revisar: ${salida}`);
}

async function principal() {
  const { revisar } = leerArgs();
  const hechas: { pose: PoseDeMia; r: Resultado; cuerpo: Buffer; cabeza: Buffer }[] = [];
  for (const pose of Object.keys(MEDIDAS_MIA) as PoseDeMia[])
    hechas.push({ pose, ...(await prepararPose(pose)) });
  const geometria = Object.fromEntries(hechas.map((h) => [h.pose, h.r]));
  writeFileSync(
    "compartido/podcast-mia-cabeza.ts",
    `// GENERADO por scripts/podcast-cabeza.ts (no se edita a mano): la cabeza de Mia IA como capa propia en cada
// pose (la imagen de la cabeza sola y dónde va) y su cuerpo con el hueco relleno. Ver docs/PODCAST.md,
// «La cabeza viva» (C-PODCAST-6).
export const CABEZAS_MIA = ${JSON.stringify(geometria, null, 2)} as const;
`,
  );
  console.log("Listo: compartido/podcast-mia-cabeza.ts");
  if (revisar) await hojaDeRevision(revisar, hechas);
}

principal().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
