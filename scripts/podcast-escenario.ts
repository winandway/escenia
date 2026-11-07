// El escenario de un invitado del Podcast IA (docs/PODCAST.md, «La casa y el micrófono de Mia»): toma los
// originales PRIVADOS de avatar/<personaje>/escenario/ (fuera de git) y deja en public/podcast/:
// - la casa (el fondo de su panel): webp SIN alfa, 1920 × 1080; el estudio la oscurece y la desenfoca;
// - el micrófono de podcast con su brazo: webp CON alfa, recortado a lo que se ve.
// Además mide la silueta del micrófono (en píxeles de la imagen publicada) y la escribe en
// compartido/podcast-<id>-escenario.ts: con ella la prueba comprueba que el micrófono nunca tapa la cara.
//
// Uso (desde la raíz): estacion/node_modules/.bin/tsx scripts/podcast-escenario.ts mia [--revisar <carpeta>]
//   --revisar  deja en <carpeta> una hoja con las siete poses y el micrófono encima, para mirarla pose por pose.
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

type Preparacion = {
  fondo: { origen: string; destino: string };
  microfono: { origen: string; destino: string; ancho: number };
  /** El archivo generado con el tamaño y la silueta del micrófono. */
  medidas: string;
  constante: string;
};

const ESCENARIOS: Record<string, Preparacion> = {
  mia: {
    fondo: { origen: "avatar/mia/escenario/casa-2.png", destino: "public/podcast/mia-casa.webp" },
    microfono: {
      origen: "avatar/mia/escenario/microfono-brazo.png",
      destino: "public/podcast/mia-microfono.webp",
      // Del tamaño con que se dibuja en el panel: más grande no se ve mejor y pesa más.
      ancho: 1100,
    },
    medidas: "compartido/podcast-mia-escenario.ts",
    constante: "MICROFONO_MIA",
  },
};

/** La caja de lo que se ve (alfa > 8) en una imagen RGBA. */
function cajaVisible(px: Buffer, w: number, h: number) {
  let x0 = w,
    y0 = h,
    x1 = -1,
    y1 = -1;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if ((px[(y * w + x) * 4 + 3] ?? 0) > 8) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
  return { x0, y0, x1, y1 };
}

/**
 * La silueta: columna por columna (cada `paso` píxeles), de lo más alto a lo más bajo que se ve, con un margen.
 * Cubre de más (el hueco entre los dos tubos del brazo), nunca de menos: sirve para comprobar que no tapa nada.
 */
function silueta(px: Buffer, w: number, h: number, paso = 16, margen = 4): [number, number][] {
  const arriba: [number, number][] = [];
  const abajo: [number, number][] = [];
  for (let x = 0; x < w; x += paso) {
    const x2 = Math.min(w, x + paso);
    let a = h,
      b = -1;
    for (let xx = x; xx < x2; xx++)
      for (let y = 0; y < h; y++)
        if ((px[(y * w + xx) * 4 + 3] ?? 0) > 24) {
          if (y < a) a = y;
          if (y > b) b = y;
        }
    if (b < 0) continue;
    arriba.push([x, Math.max(0, a - margen)], [x2, Math.max(0, a - margen)]);
    abajo.push([x, Math.min(h, b + margen)], [x2, Math.min(h, b + margen)]);
  }
  return [...arriba, ...abajo.reverse()];
}

async function principal(id: string) {
  const p = ESCENARIOS[id];
  if (!p)
    throw new Error(`No hay escenario para «${id}». Los que hay: ${Object.keys(ESCENARIOS).join(", ")}.`);

  // La casa: 1920 × 1080, sin alfa (es un fondo entero).
  const fondo = await sharp(p.fondo.origen)
    .removeAlpha()
    .resize(1920, 1080, { fit: "cover" })
    .webp({ quality: 80, effort: 6 })
    .toFile(p.fondo.destino);
  console.log(
    `Casa: ${p.fondo.destino} (${fondo.width} × ${fondo.height}, ${Math.round(fondo.size / 1024)} KB)`,
  );

  // El micrófono: recortado a lo que se ve y llevado al ancho con que se dibuja.
  const { data, info } = await sharp(p.microfono.origen)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const c = cajaVisible(data, info.width, info.height);
  const recortado = sharp(p.microfono.origen)
    .ensureAlpha()
    .extract({ left: c.x0, top: c.y0, width: c.x1 - c.x0 + 1, height: c.y1 - c.y0 + 1 })
    .resize({ width: p.microfono.ancho });
  const publicado = await recortado.clone().raw().toBuffer({ resolveWithObject: true });
  const mic = await recortado
    .clone()
    .webp({ quality: 88, alphaQuality: 100, effort: 6, smartSubsample: true })
    .toFile(p.microfono.destino);
  const contorno = silueta(publicado.data, publicado.info.width, publicado.info.height);
  console.log(
    `Micrófono: ${p.microfono.destino} (${mic.width} × ${mic.height}, ${Math.round(mic.size / 1024)} KB, silueta de ${contorno.length} puntos)`,
  );

  const imagen = `/${path.relative("public", p.microfono.destino)}`;
  // La ruta sale de la tabla ESCENARIOS de este archivo, fija en el código.
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  writeFileSync(
    p.medidas,
    [
      `// GENERADO por scripts/podcast-escenario.ts ${id} (no se edita a mano): el micrófono de podcast del escenario,`,
      "// con su tamaño publicado y su silueta en píxeles de ESA imagen (cubre de más, nunca de menos). Dónde va en el",
      "// panel lo dice el catálogo (compartido/podcast-avatares.ts). Ver docs/PODCAST.md, «La casa y el micrófono».",
      "",
      `export const ${p.constante} = {`,
      `  imagen: ${JSON.stringify(imagen)},`,
      `  ancho: ${mic.width},`,
      `  alto: ${mic.height},`,
      `  silueta: ${JSON.stringify(contorno)} as [number, number][],`,
      "};",
      "",
    ].join("\n"),
  );
  console.log(`Medidas: ${p.medidas}`);

  const i = process.argv.indexOf("--revisar");
  if (i > 0) await revisar(id, process.argv[i + 1] ?? "revisar-escenario");
}

/** La hoja de revisión: cada pose con el micrófono encima, en el encuadre del panel, con la cara marcada. */
async function revisar(id: string, carpeta: string) {
  const { avatarPorId, cajaDelEncuadre, posesDe, siluetaDelMicrofono, altoDelMicrofono } =
    await import("@compartido/podcast-avatares");
  const a = avatarPorId(id as Parameters<typeof avatarPorId>[0]);
  const m = a.escenario?.microfono;
  if (!m) throw new Error(`El avatar «${id}» no tiene micrófono en el catálogo.`);
  // La carpeta la elige quien corre el script (es una herramienta local).
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  mkdirSync(carpeta, { recursive: true });
  const caja = cajaDelEncuadre(a);
  const ancho = Math.round(caja.ancho);
  const alto = Math.round(caja.alto);
  const tiras: Buffer[] = [];
  for (const pose of posesDe(a)) {
    const visor = pose.cara.modo === "visor" ? (pose.cara.visor ?? []) : [];
    const oidos = pose.cara.oidos.filter((o) => "recorte" in o) as {
      x: number;
      y: number;
      ancho: number;
      alto: number;
    }[];
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${ancho}" height="${alto}" viewBox="${caja.x} ${caja.y} ${caja.ancho} ${caja.alto}">
      <rect x="${caja.x}" y="${caja.y}" width="${caja.ancho}" height="${caja.alto}" fill="#0b1a3a"/>
      <image href="data:image/png;base64,${(await sharp(`public${pose.imagen}`).png().toBuffer()).toString("base64")}" width="${a.ancho}" height="${a.alto}"/>
      <g transform="rotate(${m.giro} ${m.x} ${m.y + altoDelMicrofono(m) / 2})">
        <image href="data:image/png;base64,${(await sharp(`public${m.imagen}`).png().toBuffer()).toString("base64")}" x="${m.x}" y="${m.y}" width="${m.dibujo}" height="${altoDelMicrofono(m)}"/>
      </g>
      <polygon points="${visor.map(([x, y]) => `${x},${y}`).join(" ")}" fill="none" stroke="#ff3b3b" stroke-width="3"/>
      ${oidos.map((o) => `<rect x="${o.x}" y="${o.y}" width="${o.ancho}" height="${o.alto}" fill="none" stroke="#ff3b3b" stroke-width="3"/>`).join("")}
      <polygon points="${siluetaDelMicrofono(m)
        .map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`)
        .join(" ")}" fill="none" stroke="#facc15" stroke-width="2"/>
      <text x="${caja.x + 20}" y="${caja.y + 50}" font-size="44" fill="#fff" font-family="Helvetica">${pose.id}</text>
    </svg>`;
    tiras.push(
      await sharp(Buffer.from(svg))
        .resize(Math.round(ancho / 2))
        .png()
        .toBuffer(),
    );
  }
  const w = Math.round(ancho / 2);
  const h = Math.round(alto / 2);
  const hoja = path.join(carpeta, `${id}-microfono-poses.png`);
  await sharp({ create: { width: w * 4, height: h * 2, channels: 3, background: "#000" } })
    .composite(tiras.map((input, n) => ({ input, left: (n % 4) * w, top: Math.floor(n / 4) * h })))
    .png()
    .toFile(hoja);
  console.log(`Hoja de revisión: ${hoja}`);
}

principal(process.argv[2] ?? "").catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
