// Prepara la imagen pública de un invitado del Podcast IA (docs/PODCAST.md, «Cómo se agrega un avatar»).
// Toma el original PRIVADO de avatar/ (fuera de git) y deja en public/podcast/ un webp con transparencia,
// liviano y con el visor LIMPIO: los ojos y la boca pintados se borran con el negro del propio visor, siguiendo
// su forma, para que en el estudio no se vean dos caras (la cara viva la dibuja RobotInvitado encima).
//
// Cómo borra: busca el visor (lo oscuro alrededor de un punto de adentro, con sus huecos rellenos), marca lo
// que brilla adentro (el blanco de los trazos y el rosado de la lengua) y todo lo que está a menos de `radio`
// píxeles de eso, y lo rellena con el negro de alrededor (un relleno suave que no cruza el borde del visor).
//
// Uso (desde la raíz): estacion/node_modules/.bin/tsx scripts/podcast-avatar.ts coleta
//   --medir   además imprime el contorno del visor (para el catálogo, compartido/podcast-avatares.ts)
import { existsSync } from "node:fs";
import sharp from "sharp";

type Preparacion = {
  origen: string;
  destino: string;
  /** Un punto oscuro DENTRO del visor, lejos de los trazos. */
  semilla: [number, number];
  /** La caja donde está el visor (x0, y0, x1, y1): el relleno no sale de aquí. */
  caja: [number, number, number, number];
  /** Hasta dónde llega el resplandor de los trazos pintados. */
  radio: number;
};

const AVATARES: Record<string, Preparacion> = {
  coleta: {
    origen: "avatar/robots/robot-ella-coleta-cuerpo-entero.png",
    destino: "public/podcast/robot-coleta.webp",
    semilla: [540, 285],
    caja: [372, 148, 712, 392],
    radio: 22,
  },
};

const id = process.argv[2] ?? "";
const prep = AVATARES[id];
if (!prep) {
  console.error(`Avatar desconocido «${id}». Hay: ${Object.keys(AVATARES).join(", ")}.`);
  process.exit(1);
}

async function principal(p: Preparacion) {
  // El origen sale de la tabla fija de arriba, no de afuera.
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  if (!existsSync(p.origen))
    throw new Error(`No está el original ${p.origen} (la carpeta avatar/ es privada).`);
  const { data, info } = await sharp(p.origen).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = info;
  const px = new Uint8ClampedArray(data.buffer, data.byteOffset, data.length);
  const i4 = (x: number, y: number) => (y * W + x) * 4;

  // 1. El alfa limpio: el polvo casi invisible del recorte fuera, y el cuerpo opaco del todo (venía en 252/253).
  for (let k = 3; k < px.length; k += 4) {
    if (px[k]! <= 6) px[k] = 0;
    else if (px[k]! >= 240) px[k] = 255;
  }

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

  if (process.argv.includes("--medir")) {
    // El contorno del visor visto desde la semilla, cada 15 grados (para recortar la cara viva al vidrio).
    const puntos: string[] = [];
    for (let a = 0; a < 360; a += 15) {
      const rad = (a * Math.PI) / 180;
      let ultimo: [number, number] = p.semilla;
      for (let r = 1; r < 400; r++) {
        const x = Math.round(p.semilla[0] + Math.cos(rad) * r);
        const y = Math.round(p.semilla[1] + Math.sin(rad) * r);
        if (!dentroCaja(x, y) || !mascara[c(x, y)]) break;
        ultimo = [x, y];
      }
      puntos.push(`[${ultimo[0]}, ${ultimo[1]}]`);
    }
    console.log(`Contorno del visor: [${puntos.join(", ")}]`);
    console.log(`Píxeles borrados: ${borrar.length}`);
  }

  const salida = await sharp(Buffer.from(px.buffer, px.byteOffset, px.length), {
    raw: { width: W, height: H, channels: 4 },
  })
    .webp({ quality: 90, alphaQuality: 100, effort: 6, smartSubsample: true })
    .toFile(p.destino);
  console.log(`Listo: ${p.destino} (${W}×${H}, ${Math.round(salida.size / 1024)} KB).`);
}

principal(prep).catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
