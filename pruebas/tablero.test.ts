import { describe, expect, it } from "vitest";
import { detectarTablero, restosDeTablero } from "../estacion/src/tablero";

// C-FONDO-3 (21 oct 2026): la foto de la chica de QRBott traía el «tablero de cuadritos» pintado (no
// era transparente de verdad). Vision lo quitó casi todo, pero entre el brazo y la cintura quedó un
// pedazo de cuadros grises que se veía en el video.
const ANCHO = 240;
const ALTO = 240;
const CELDA = 12;
const CLARO = 196;
const OSCURO = 46;

function fotoConTablero() {
  const rgb = new Uint8Array(ANCHO * ALTO * 3);
  const alfa = new Uint8Array(ANCHO * ALTO);
  let semilla = 7;
  const azar = () => (semilla = (semilla * 1103515245 + 12345) % 2147483648) / 2147483648;
  for (let y = 0; y < ALTO; y++)
    for (let x = 0; x < ANCHO; x++) {
      const p = y * ANCHO + x;
      const claro = (Math.floor(x / CELDA) + Math.floor(y / CELDA)) % 2 === 0;
      let c = [claro ? CLARO : OSCURO, claro ? CLARO : OSCURO, claro ? CLARO : OSCURO];
      // La persona: piel (no es gris) en el centro; el pelo: oscuro y con mechones (textura).
      const piel = x >= 60 && x < 180 && y >= 40 && y < 220;
      const pelo = x >= 60 && x < 180 && y >= 40 && y < 90;
      if (piel) c = [205, 150, 120];
      if (pelo) {
        const v = 15 + Math.round(azar() * 55);
        c = [v, v, v];
      }
      rgb.set(c, p * 3);
      // Vision dejó la persona y, pegado a ella, un pedazo de tablero (4 × 3 celdas) a la derecha.
      const resto = x >= 180 && x < 228 && y >= 120 && y < 156;
      alfa[p] = piel || resto ? 255 : 0;
    }
  return { rgb, alfa };
}

describe("C-FONDO-3: el tablero de cuadritos pintado no queda pegado a la persona", () => {
  it("reconoce el tamaño de los cuadros y sus dos tonos mirando el borde de la foto", () => {
    const { rgb } = fotoConTablero();
    const t = detectarTablero(rgb, ANCHO, ALTO);
    expect(t).not.toBeNull();
    expect(t?.celda).toBeCloseTo(CELDA, 0);
    expect(t?.claro).toBeCloseTo(CLARO, 0);
    expect(t?.oscuro).toBeCloseTo(OSCURO, 0);
  });

  it("borra el pedazo de tablero y no toca la piel ni el pelo", () => {
    const { rgb, alfa } = fotoConTablero();
    const t = detectarTablero(rgb, ANCHO, ALTO);
    if (!t) throw new Error("no reconoció el tablero");
    const borrar = restosDeTablero(rgb, alfa, ANCHO, ALTO, t);
    let resto = 0;
    let restoBorrado = 0;
    let pelo = 0;
    let peloBorrado = 0;
    let pielBorrada = 0;
    for (let y = 0; y < ALTO; y++)
      for (let x = 0; x < ANCHO; x++) {
        const p = y * ANCHO + x;
        if (x >= 180 && x < 228 && y >= 120 && y < 156) {
          resto++;
          restoBorrado += borrar[p] ?? 0;
        } else if (x >= 60 && x < 180 && y >= 40 && y < 90) {
          pelo++;
          peloBorrado += borrar[p] ?? 0;
        } else if (x >= 60 && x < 180 && y >= 90 && y < 220) pielBorrada += borrar[p] ?? 0;
      }
    expect(restoBorrado / resto).toBeGreaterThan(0.95);
    expect(pielBorrada).toBe(0);
    expect(peloBorrado / pelo).toBeLessThan(0.05);
  });

  it("una foto sin tablero (fondo liso) no se toca", () => {
    const rgb = new Uint8Array(ANCHO * ALTO * 3).fill(230);
    expect(detectarTablero(rgb, ANCHO, ALTO)).toBeNull();
  });
});
