// Arma los íconos de la app instalable a partir del mismo dibujo del ícono
// del panel (cuadro oscuro con el triángulo ámbar). Uso: node scripts/iconos.mjs
import sharp from "sharp";

const FONDO = "#0f172a";
const ACENTO = "#f59e0b";

/** `relleno` = cuánto margen lleva el triángulo (los íconos «maskable» se recortan en círculo). */
const dibujo = (lado, { redondeado, relleno }) => {
  const r = redondeado ? Math.round(lado * 0.22) : 0;
  const c = lado / 2;
  const t = lado * relleno; // medio alto del triángulo
  const puntos = [
    [c - t * 0.62, c - t],
    [c + t * 0.95, c],
    [c - t * 0.62, c + t],
  ]
    .map((p) => p.map((n) => n.toFixed(1)).join(","))
    .join(" ");
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${lado}" height="${lado}" viewBox="0 0 ${lado} ${lado}">` +
      `<rect width="${lado}" height="${lado}" rx="${r}" fill="${FONDO}"/>` +
      `<polygon points="${puntos}" fill="${ACENTO}"/></svg>`,
  );
};

const salidas = [
  { archivo: "public/iconos/icono-192.png", lado: 192, redondeado: true, relleno: 0.24 },
  { archivo: "public/iconos/icono-512.png", lado: 512, redondeado: true, relleno: 0.24 },
  { archivo: "public/iconos/icono-maskable-512.png", lado: 512, redondeado: false, relleno: 0.18 },
  { archivo: "src/app/apple-icon.png", lado: 180, redondeado: false, relleno: 0.22 },
];
for (const s of salidas) {
  await sharp(dibujo(s.lado, s)).png().toFile(s.archivo);
  console.log(`${s.archivo} (${s.lado}×${s.lado})`);
}
