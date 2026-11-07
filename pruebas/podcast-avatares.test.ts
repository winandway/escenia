// Los invitados del Podcast IA (docs/PODCAST.md, «Los avatares»): un catálogo en el código con la imagen, el
// encuadre y la cara medida sobre la imagen. Otro avatar de visor entra con una entrada nueva, sin tocar el
// componente. La robot de coleta (la favorita de Richard, con voz paisa) va primero.
import { describe, expect, it } from "vitest";
import { readFileSync, statSync } from "node:fs";
import path from "node:path";
import {
  ASPECTO_PANEL,
  AVATARES,
  AVATAR_DE_LAS_VIEJAS,
  AVATAR_NUEVO,
  IDS_AVATAR,
  avatarPorId,
  cajaDelEncuadre,
  caminoCerrado,
  caminoDeElipse,
  caminoDeSonrisa,
  curvaQ,
  esAvatar,
  puntoDeCurva,
  trazoAfinado,
  type Punto,
} from "@compartido/podcast-avatares";
import { limpiarEtiquetasDeEmocion } from "@compartido/podcast";

const raiz = path.resolve(__dirname, "..");

/** ¿El punto cae dentro del polígono? (rayo horizontal) */
function dentro([x, y]: Punto, poligono: readonly Punto[]): boolean {
  let adentro = false;
  for (let i = 0, j = poligono.length - 1; i < poligono.length; j = i++) {
    const [xi, yi] = poligono[i]!;
    const [xj, yj] = poligono[j]!;
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) adentro = !adentro;
  }
  return adentro;
}

describe("el catálogo de invitados", () => {
  it("la robot de coleta va primero y es la de las fichas nuevas; las viejas quedan con el robot de siempre", () => {
    expect(IDS_AVATAR).toEqual(["coleta", "robot"]);
    expect(AVATARES.map((a) => a.id)).toEqual([...IDS_AVATAR]);
    expect(AVATAR_NUEVO).toBe("coleta");
    expect(AVATAR_DE_LAS_VIEJAS).toBe("robot");
    expect(avatarPorId("coleta").cara.ojos[0].pestanas?.length).toBe(2);
    expect(avatarPorId("robot").imagen).toBe("/podcast/robot.webp");
  });

  it("un avatar desconocido (o vacío) cae en el robot de siempre, nunca rompe el estudio", () => {
    expect(esAvatar("coleta")).toBe(true);
    expect(esAvatar("presentadora")).toBe(false);
    expect(avatarPorId("presentadora").id).toBe("robot");
    expect(avatarPorId(null).id).toBe("robot");
  });

  it("cada imagen existe en public/, es un webp con transparencia y pesa poco", () => {
    for (const a of AVATARES) {
      // Rutas del catálogo, fijas en el código.
      // eslint-disable-next-line security/detect-non-literal-fs-filename
      const archivo = readFileSync(path.join(raiz, "public", a.imagen));
      expect(archivo.subarray(0, 4).toString()).toBe("RIFF");
      expect(archivo.subarray(8, 12).toString()).toBe("WEBP");
      // VP8X con la marca de alfa (bit 4 del primer byte de banderas).
      expect(archivo.subarray(12, 16).toString()).toBe("VP8X");
      expect(archivo[20]! & 0x10).toBe(0x10);
      // El ancho y el alto del catálogo son los de la imagen (VP8X los guarda menos uno, en 24 bits).
      const ancho = 1 + archivo.readUIntLE(24, 3);
      const alto = 1 + archivo.readUIntLE(27, 3);
      expect([ancho, alto]).toEqual([a.ancho, a.alto]);
      // eslint-disable-next-line security/detect-non-literal-fs-filename
      expect(statSync(path.join(raiz, "public", a.imagen)).size).toBeLessThan(320 * 1024);
    }
  });

  it("el encuadre tiene la forma del panel del invitado (el mismo número que el CSS)", () => {
    const css = readFileSync(path.join(raiz, "src/app/podcast/estudio.module.css"), "utf8");
    const panel = /\.panel \{[^}]*width: ([\d.]+)cqw;[^}]*height: ([\d.]+)cqw;/.exec(css);
    expect(panel).not.toBeNull();
    expect(ASPECTO_PANEL).toBeCloseTo(Number(panel![1]) / Number(panel![2]), 6);
    for (const a of AVATARES) {
      const caja = cajaDelEncuadre(a);
      expect(caja.ancho / caja.alto).toBeCloseTo(ASPECTO_PANEL, 6);
    }
  });

  it("la robot de coleta se ve grande: de la cabeza a medio muslo, con las dos manos dentro", () => {
    const caja = cajaDelEncuadre(avatarPorId("coleta"));
    // La coleta empieza en y≈50 y el medio muslo está en y≈900; las manos abiertas van de x≈30 a x≈1006.
    expect(caja.y).toBeLessThanOrEqual(30);
    expect(caja.y + caja.alto).toBeGreaterThanOrEqual(860);
    expect(caja.alto).toBeLessThanOrEqual(1000);
    expect(caja.x).toBeLessThanOrEqual(10);
    expect(caja.x + caja.ancho).toBeGreaterThanOrEqual(1020);
  });

  it("el robot de siempre queda exactamente donde estaba (98 % del alto, centrado, 1,2 cqw bajo el borde)", () => {
    const caja = cajaDelEncuadre(avatarPorId("robot"));
    const escala = (0.98 * 32.2) / 1199; // cqw por píxel de la imagen
    expect(caja.alto * escala).toBeCloseTo(32.2, 2);
    expect(caja.x + caja.ancho / 2).toBeCloseTo(656, 1);
    expect(caja.y + caja.alto).toBeCloseTo(1199 - 1.2 / escala, 1);
  });

  it("la cara de cada avatar cae dentro de su imagen, y la de la coleta dentro de su visor", () => {
    for (const a of AVATARES) {
      const { ojos, boca } = a.cara;
      const puntos: Punto[] = [
        ...ojos.flatMap((o) => [...o.linea, ...(o.pestanas ?? []).flat()]),
        [boca.x, boca.y],
      ];
      for (const [x, y] of puntos) {
        expect(x).toBeGreaterThan(0);
        expect(x).toBeLessThan(a.ancho);
        expect(y).toBeGreaterThan(0);
        expect(y).toBeLessThan(a.alto);
      }
    }
    const coleta = avatarPorId("coleta").cara;
    expect(coleta.visor).toBeDefined();
    for (const o of coleta.ojos) {
      for (let t = 0; t <= 1; t += 0.1) expect(dentro(puntoDeCurva(o.linea, t), coleta.visor!)).toBe(true);
      for (const p of o.pestanas ?? []) expect(dentro(p[3], coleta.visor!)).toBe(true);
    }
    expect(dentro([coleta.boca.x, coleta.boca.y + coleta.boca.alto], coleta.visor!)).toBe(true);
    // La coleta trae el visor ya limpio (scripts/podcast-avatar.ts): no hace falta taparle nada.
    expect(coleta.tapas).toBeUndefined();
    expect(avatarPorId("robot").cara.tapas?.elipses.length).toBe(2);
  });
});

describe("la geometría de la cara viva", () => {
  it("una curva de un control se pasa a dos controles sin cambiar de forma", () => {
    const c = curvaQ([482, 352], [542.5, 264], [593, 340]);
    // A mitad de camino la cuadrática pasa por (p0 + 2c + p1) / 4.
    const [x, y] = puntoDeCurva(c, 0.5);
    expect(x).toBeCloseTo((482 + 2 * 542.5 + 593) / 4, 6);
    expect(y).toBeCloseTo((352 + 2 * 264 + 340) / 4, 6);
  });

  it("el ojo afinado es una figura cerrada, más gruesa en el medio que en las puntas", () => {
    const linea = curvaQ([0, 0], [50, -60], [100, 0]);
    const d = trazoAfinado(linea, 20, 10);
    expect(d.startsWith("M")).toBe(true);
    expect(d.endsWith("Z")).toBe(true);
    const numeros = [...d.matchAll(/-?\d+\.?\d*/g)].map((m) => Number(m[0]));
    expect(numeros.every(Number.isFinite)).toBe(true);
    // El grosor sube del extremo (10) al centro (20): la figura mide ~20 de alto en el medio.
    const ys = numeros.filter((_, i) => i % 2 === 1);
    expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThan(40);
  });

  it("la sonrisa se abre con la voz y nunca se da vuelta", () => {
    const cerrada = caminoDeSonrisa(86, 8);
    const abierta = caminoDeSonrisa(86, 50);
    expect(cerrada).not.toBe(abierta);
    expect(abierta.endsWith("Z")).toBe(true);
    const fondo = (d: string) => Math.max(...[...d.matchAll(/-?\d+\.?\d*/g)].map((m) => Number(m[0])));
    expect(fondo(abierta)).toBeGreaterThan(fondo(cerrada));
    // Con un alto negativo (un volumen raro) queda cerrada, no al revés.
    expect(caminoDeSonrisa(86, -20)).toBe(caminoDeSonrisa(86, 0));
  });

  it("la elipse y el contorno del visor son caminos cerrados", () => {
    expect(caminoDeElipse({ cx: 10, cy: 20, rx: 5, ry: 9, giro: -6 })).toMatch(/^M.*A.*A.*Z$/);
    expect(
      caminoCerrado([
        [0, 0],
        [10, 0],
        [10, 10],
        [0, 10],
      ]),
    ).toMatch(/^M.*C.*Z$/);
  });
});

describe("las etiquetas de emoción de la voz v3", () => {
  it("no se ven en el texto del invitado", () => {
    expect(limpiarEtiquetasDeEmocion("[nervous] Hola, Richard… [slow] perdona.")).toBe(
      "Hola, Richard… perdona.",
    );
    expect(limpiarEtiquetasDeEmocion("Me reí mucho [laughs] , de verdad.")).toBe("Me reí mucho, de verdad.");
    expect(limpiarEtiquetasDeEmocion("Sin etiquetas.")).toBe("Sin etiquetas.");
  });
});
