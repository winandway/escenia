// Los invitados del Podcast IA (docs/PODCAST.md, «Los avatares»): un catálogo en el código con la imagen, el
// encuadre y la cara medida sobre la imagen. Otro avatar entra con una entrada nueva, sin tocar el componente.
// La robot plateada (la que eligió Richard para «Mia IA», 7 nov 2026) va primero; las personas entran con el
// modo «sin_visor» (sin boca dibujada) y las imágenes sentadas, con el encuadre de cámara web.
import { describe, expect, it } from "vitest";
import { readFileSync, statSync } from "node:fs";
import path from "node:path";
import {
  AIRE_CAMARA_WEB,
  ASPECTO_PANEL,
  AVATARES,
  AVATAR_DE_LAS_VIEJAS,
  AVATAR_NUEVO,
  IDS_AVATAR,
  avatarPorId,
  cajaDelEncuadre,
  caminoCerrado,
  caminoDeElipse,
  caminoDeMediaLuna,
  caminoDeSonrisa,
  conVisor,
  curvaQ,
  esAvatar,
  esRecorte,
  posesDe,
  puntoDeCurva,
  siluetaDelMicrofono,
  VAIVEN_MICROFONO,
  trazoAfinado,
  type AvatarPodcast,
  type CaraConVisor,
  type OjoAvatar,
  type Punto,
} from "@compartido/podcast-avatares";
import { POSES } from "@compartido/podcast-poses";
import { limpiarEtiquetasDeEmocion } from "@compartido/podcast";

const raiz = path.resolve(__dirname, "..");

/** La cara de una robot del catálogo (falla si el avatar no tiene visor). */
function caraDe(id: string): CaraConVisor {
  const a = avatarPorId(id);
  if (!conVisor(a)) throw new Error(`${id} no tiene visor`);
  return a.cara;
}

/** Los ojos dibujados (no recortados de la imagen) de una cara. */
function dibujados(c: CaraConVisor): [OjoAvatar, OjoAvatar] {
  const [a, b] = c.ojos;
  if (esRecorte(a) || esRecorte(b)) throw new Error("ojos recortados");
  return [a, b];
}

/** Los números de un camino del SVG, como pares (x, y). */
const puntosDe = (d: string): Punto[] => {
  const n = [...d.matchAll(/-?\d+\.?\d*/g)].map((m) => Number(m[0]));
  return n.flatMap((_, i) => (i % 2 ? [] : [[n[i]!, n[i + 1]!] as const]));
};

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
  it("va completo y en orden: Mia primero (la de las fichas nuevas), la plateada, la coleta y el robot de siempre", () => {
    expect(IDS_AVATAR).toEqual(["mia", "plateada", "coleta", "robot"]);
    expect(AVATARES.map((a) => a.id)).toEqual([...IDS_AVATAR]);
    expect(AVATAR_NUEVO).toBe("mia");
    expect(avatarPorId("mia").nombre).toBe("Mia IA");
    expect(AVATAR_DE_LAS_VIEJAS).toBe("robot");
    expect(avatarPorId("plateada").imagen).toBe("/podcast/robot-plateada.webp");
    expect(dibujados(caraDe("coleta"))[0].pestanas?.length).toBe(2);
    expect(avatarPorId("robot").imagen).toBe("/podcast/robot.webp");
    // Todos son robots de visor hoy; cada uno con su nombre y su descripción para el selector.
    for (const a of AVATARES) {
      expect(a.cara.modo).toBe("visor");
      expect(a.nombre.length).toBeGreaterThan(3);
      expect(a.descripcion.length).toBeGreaterThan(10);
    }
    expect(new Set(AVATARES.map((a) => a.nombre)).size).toBe(AVATARES.length);
  });

  it("Mia trae sus siete poses, cada una con SU cara: los ojos recortados de su imagen, dentro del visor", () => {
    const mia = avatarPorId("mia");
    const poses = posesDe(mia);
    expect(poses.map((p) => p.id)).toEqual([...POSES]);
    expect(new Set(poses.map((p) => p.imagen)).size).toBe(POSES.length);
    for (const p of poses) {
      expect(p.cara.modo).toBe("visor");
      if (p.cara.modo !== "visor") continue;
      const c = p.cara;
      expect(c.visor!.length).toBeGreaterThanOrEqual(12);
      expect(c.ojos.every(esRecorte)).toBe(true);
      for (const o of c.ojos) {
        if (!esRecorte(o)) continue;
        // eslint-disable-next-line security/detect-non-literal-fs-filename -- rutas del catálogo
        expect(statSync(path.join(raiz, "public", o.recorte)).size).toBeGreaterThan(500);
        expect(o.x).toBeGreaterThan(0);
        expect(o.x + o.ancho).toBeLessThan(mia.ancho);
        expect(dentro([o.x + o.ancho / 2, o.y + o.alto / 2], c.visor!)).toBe(true);
      }
      // Las luces de los dos oídos, recortadas, a cada lado del visor.
      expect(c.oidos).toHaveLength(2);
      for (const o of c.oidos) expect(esRecorte(o)).toBe(true);
      if (p.id === "riendo") {
        // La mano tapa la boca: no se dibuja (queda la pintada que asoma).
        expect(c.boca.tapada).toBe(true);
        continue;
      }
      expect(c.boca.tapada).toBeFalsy();
      expect(dentro([c.boca.x, c.boca.y + c.boca.alto * (c.boca.reposo ?? 0.85) * 0.9], c.visor!)).toBe(true);
      // La boca chica de la pose tranquila no lleva lengua; las sonrisas abiertas, sí.
      expect(Boolean(c.boca.lengua)).toBe(p.id !== "tranquila");
    }
  });

  it("Mia se ve como en una cámara: la silla entera, centrada y grande en el panel", () => {
    const caja = cajaDelEncuadre(avatarPorId("mia"));
    expect(caja.x).toBeLessThanOrEqual(0);
    expect(caja.x + caja.ancho).toBeGreaterThanOrEqual(1312);
    expect(caja.y).toBeLessThanOrEqual(0);
    expect(caja.y + caja.alto).toBeCloseTo(1199, 0);
    expect(caja.alto).toBeLessThan(1260);
    expect(caja.x + caja.ancho / 2).toBeCloseTo(656, 0);
  });

  it("la plateada es fiel a su imagen: ojos rasgados con su ceja y dos pestañas, y una media luna de boca", () => {
    const c = caraDe("plateada");
    const ojos = dibujados(c);
    for (const o of ojos) {
      expect(o.pestanas).toHaveLength(2);
      expect(o.ceja).toBeDefined();
      // Rasgado: romo donde nacen las pestañas, fino junto a la nariz.
      expect(o.puntas).toBeGreaterThan(o.puntaFinal ?? 0);
      expect(o.grosor).toBeGreaterThan(o.puntas ?? 0);
    }
    // Los dos ojos terminan junto a la nariz (hacia el centro de la cara).
    const centro = c.boca.x;
    expect(Math.abs(ojos[0].linea[3][0] - centro)).toBeLessThan(Math.abs(ojos[0].linea[0][0] - centro));
    expect(Math.abs(ojos[1].linea[3][0] - centro)).toBeLessThan(Math.abs(ojos[1].linea[0][0] - centro));
    expect(c.boca.forma).toBe("media_luna");
    expect(c.boca.lengua).toBeUndefined();
    // Escuchando se ve la media luna chica de la imagen (unos 8 píxeles de alto).
    expect(c.boca.alto * (c.boca.reposo ?? 0)).toBeGreaterThan(7);
    expect(c.boca.alto * (c.boca.reposo ?? 0)).toBeLessThan(10);
    // Sus dos aros: el del oído de la izquierda entero y el de la derecha, que se ve de canto.
    expect(c.oidos).toHaveLength(2);
  });

  it("un avatar desconocido (o vacío) cae en el robot de siempre, nunca rompe el estudio", () => {
    expect(esAvatar("plateada")).toBe(true);
    expect(esAvatar("coleta")).toBe(true);
    expect(esAvatar("presentadora")).toBe(false);
    expect(avatarPorId("presentadora").id).toBe("robot");
    expect(avatarPorId(null).id).toBe("robot");
  });

  it("cada imagen (y cada pose) existe en public/, es un webp con transparencia y pesa poco", () => {
    const imagenes = AVATARES.flatMap((a) => posesDe(a).map((p) => ({ ...a, imagen: p.imagen })));
    expect(imagenes.length).toBe(AVATARES.length + 6);
    for (const a of imagenes) {
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

  it("la plateada sale como en una cámara web: de la cabeza al pecho, sin las manos levantadas", () => {
    const caja = cajaDelEncuadre(avatarPorId("plateada"));
    expect(avatarPorId("plateada").encuadre.tipo).toBe("camara_web");
    // La coronilla (y≈8) con aire arriba, el «IA» del pecho (y≈390) dentro y el pecho (y≈440) contra el borde.
    expect(caja.y).toBeLessThan(8);
    expect(caja.y + caja.alto).toBeGreaterThan(400);
    expect(caja.y + caja.alto).toBeLessThanOrEqual(445);
    // Las manos abiertas (de y≈430 para abajo, por fuera de x≈200 y x≈830) no entran; los dos aros, sí.
    expect(caja.x).toBeGreaterThan(150);
    expect(caja.x + caja.ancho).toBeLessThan(875);
    expect(caja.x).toBeLessThan(380);
    expect(caja.x + caja.ancho).toBeGreaterThan(640);
  });

  it("el encuadre de cámara web deja la coronilla con aire arriba y el pecho contra el borde de abajo, centrado", () => {
    const sentada = {
      encuadre: { tipo: "camara_web", centroX: 500, coronilla: 120, pecho: 900 },
    } as const satisfies Pick<AvatarPodcast, "encuadre">;
    const caja = cajaDelEncuadre(sentada);
    expect(caja.ancho / caja.alto).toBeCloseTo(ASPECTO_PANEL, 6);
    expect(caja.y + caja.alto).toBeCloseTo(900, 6);
    expect((120 - caja.y) / caja.alto).toBeCloseTo(AIRE_CAMARA_WEB, 6);
    expect(caja.x + caja.ancho / 2).toBeCloseTo(500, 6);
    // Ni tan pegado que corte la cabeza, ni tanto aire que se vea chiquita.
    expect(AIRE_CAMARA_WEB).toBeGreaterThan(0.05);
    expect(AIRE_CAMARA_WEB).toBeLessThan(0.25);
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

  it("la cara de cada avatar cae dentro de su imagen, y la de la coleta y la plateada dentro de su visor", () => {
    for (const a of AVATARES) {
      if (!conVisor(a)) continue;
      const { ojos, boca } = a.cara;
      const puntos: Punto[] = [
        ...ojos.flatMap((o): Punto[] =>
          esRecorte(o)
            ? [
                [o.x, o.y],
                [o.x + o.ancho, o.y + o.alto],
              ]
            : [...o.linea, ...(o.ceja?.linea ?? []), ...(o.pestanas ?? []).flat()],
        ),
        [boca.x, boca.y],
      ];
      for (const [x, y] of puntos) {
        expect(x).toBeGreaterThan(0);
        expect(x).toBeLessThan(a.ancho);
        expect(y).toBeGreaterThan(0);
        expect(y).toBeLessThan(a.alto);
      }
    }
    for (const id of ["coleta", "plateada"]) {
      const c = caraDe(id);
      expect(c.visor).toBeDefined();
      for (const o of dibujados(c)) {
        for (let t = 0; t <= 1; t += 0.1) {
          expect(dentro(puntoDeCurva(o.linea, t), c.visor!)).toBe(true);
          if (o.ceja) expect(dentro(puntoDeCurva(o.ceja.linea, t), c.visor!)).toBe(true);
        }
        for (const p of o.pestanas ?? []) expect(dentro(p[3], c.visor!)).toBe(true);
      }
      // La boca abierta del todo (hablando) tampoco se sale del vidrio.
      expect(dentro([c.boca.x, c.boca.y + c.boca.alto * 1.05], c.visor!)).toBe(true);
      // Las dos traen el visor ya limpio (scripts/podcast-avatar.ts): no hace falta taparles nada.
      expect(c.tapas).toBeUndefined();
    }
    expect(caraDe("robot").tapas?.elipses.length).toBe(2);
  });
});

/** ¿Se cruzan los segmentos ab y cd? */
function seCruzan(a: Punto, b: Punto, c: Punto, d: Punto): boolean {
  const lado = (p: Punto, q: Punto, r: Punto) =>
    Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]));
  return lado(a, b, c) * lado(a, b, d) < 0 && lado(c, d, a) * lado(c, d, b) < 0;
}
function adentro([x, y]: Punto, poligono: readonly Punto[]): boolean {
  let dentro = false;
  for (let i = 0, j = poligono.length - 1; i < poligono.length; j = i++) {
    const [xi, yi] = poligono[i]!;
    const [xj, yj] = poligono[j]!;
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) dentro = !dentro;
  }
  return dentro;
}
function aSegmento(p: Punto, a: Punto, b: Punto): number {
  const vx = b[0] - a[0];
  const vy = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * vx + (p[1] - a[1]) * vy) / (vx * vx + vy * vy || 1)));
  return Math.hypot(p[0] - a[0] - t * vx, p[1] - a[1] - t * vy);
}
/** Cuánto aire hay entre dos figuras (0 si se tocan o una tapa a la otra). */
function holgura(a: readonly Punto[], b: readonly Punto[]): number {
  const lados = (f: readonly Punto[]) => f.map((p, i) => [p, f[(i + 1) % f.length]!] as const);
  for (const [p, q] of lados(a)) for (const [r, t] of lados(b)) if (seCruzan(p, q, r, t)) return 0;
  if (a.some((p) => adentro(p, b)) || b.some((p) => adentro(p, a))) return 0;
  let d = Infinity;
  for (const p of a) for (const [r, t] of lados(b)) d = Math.min(d, aSegmento(p, r, t));
  for (const p of b) for (const [r, t] of lados(a)) d = Math.min(d, aSegmento(p, r, t));
  return d;
}

describe("el escenario de Mia: su casa detrás y su micrófono delante (C-PODCAST-5)", () => {
  const mia = avatarPorId("mia");
  const fondo = mia.escenario?.fondo;
  const mic = mia.escenario?.microfono;

  it("la casa es un webp sin alfa de 1920 × 1080, liviano, oscurecida y apenas desenfocada", () => {
    expect(fondo).toBeDefined();
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    const archivo = readFileSync(path.join(raiz, "public", fondo!.imagen));
    expect(archivo.subarray(8, 12).toString()).toBe("WEBP");
    // «VP8 » es el webp simple: sin alfa (un fondo entero).
    expect(archivo.subarray(12, 16).toString()).toBe("VP8 ");
    expect([archivo.readUInt16LE(26) & 0x3fff, archivo.readUInt16LE(28) & 0x3fff]).toEqual([1920, 1080]);
    expect(archivo.length).toBeLessThan(250 * 1024);
    expect(fondo!.brillo).toBeGreaterThanOrEqual(0.6);
    expect(fondo!.brillo).toBeLessThanOrEqual(0.8);
    // De 2 a 3 px en una pantalla de 1920 (el estudio mide 100 cqw de ancho).
    expect(fondo!.desenfoque * 19.2).toBeGreaterThanOrEqual(2);
    expect(fondo!.desenfoque * 19.2).toBeLessThanOrEqual(3);
  });

  it("el micrófono es un webp con alfa del tamaño que dice el catálogo, y pesa poco", () => {
    expect(mic).toBeDefined();
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    const archivo = readFileSync(path.join(raiz, "public", mic!.imagen));
    expect(archivo.subarray(12, 16).toString()).toBe("VP8X");
    expect(archivo[20]! & 0x10).toBe(0x10);
    expect([1 + archivo.readUIntLE(24, 3), 1 + archivo.readUIntLE(27, 3)]).toEqual([mic!.ancho, mic!.alto]);
    expect(archivo.length).toBeLessThan(120 * 1024);
  });

  it("nunca le tapa la cara: ni el visor ni los aros de los oídos, en ninguna de las siete poses, ni con su vaivén", () => {
    const poses = posesDe(mia);
    expect(poses).toHaveLength(7);
    for (const giro of [-VAIVEN_MICROFONO, 0, VAIVEN_MICROFONO]) {
      const silueta = siluetaDelMicrofono(mic!, giro);
      for (const pose of poses) {
        const cara = pose.cara as CaraConVisor;
        expect(holgura(silueta, cara.visor!), `${pose.id}: el visor`).toBeGreaterThanOrEqual(25);
        for (const o of cara.oidos) {
          const r = o as { x: number; y: number; ancho: number; alto: number };
          const caja: Punto[] = [
            [r.x, r.y],
            [r.x + r.ancho, r.y],
            [r.x + r.ancho, r.y + r.alto],
            [r.x, r.y + r.alto],
          ];
          expect(holgura(silueta, caja), `${pose.id}: el aro del oído`).toBeGreaterThanOrEqual(25);
        }
      }
    }
  });

  it("entra desde el borde izquierdo del panel y no baja hasta la etiqueta del nombre", () => {
    const caja = cajaDelEncuadre(mia);
    const silueta = siluetaDelMicrofono(mic!);
    expect(Math.min(...silueta.map(([x]) => x))).toBeLessThan(caja.x);
    // La etiqueta empieza al 84 % del alto del panel (1,3 cqw del borde y 3,95 cqw de alto, en 32,2 cqw).
    const etiqueta = caja.y + caja.alto * ((32.2 - 1.3 - 3.95) / 32.2);
    const visible = silueta.filter(([x]) => x >= caja.x);
    expect(Math.max(...visible.map(([, y]) => y))).toBeLessThan(etiqueta - 60);
    // La punta queda cerca de la cara: a la altura de la boca o un poco más abajo, a la izquierda del visor.
    const punta = silueta.reduce((a, b) => (b[0] > a[0] ? b : a));
    const boca = (mia.cara as CaraConVisor).boca;
    expect(punta[0]).toBeLessThan(boca.x);
    expect(punta[1]).toBeGreaterThan(boca.y - 40);
    expect(punta[1]).toBeLessThan(boca.y + 200);
  });

  it("los demás avatares no tienen escenario y se ven como siempre", () => {
    for (const a of AVATARES) if (a.id !== "mia") expect(a.escenario).toBeUndefined();
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

  it("el ojo rasgado tiene cada punta de su grosor y lo más grueso donde se le dice", () => {
    const linea = curvaQ([0, 0], [50, 0], [100, 0]);
    // Una línea recta: el alto de la figura en cada x es el grosor del trazo ahí.
    const altoEn = (d: string, x: number) => {
      const ys = puntosDe(d)
        .filter(([px]) => Math.abs(px - x) < 2.5)
        .map(([, y]) => y);
      return Math.max(...ys) - Math.min(...ys);
    };
    const parejo = trazoAfinado(linea, 12, 6);
    const rasgado = trazoAfinado(linea, 12, 6, 1);
    expect(altoEn(rasgado, 97)).toBeLessThan(altoEn(parejo, 97));
    expect(altoEn(rasgado, 3)).toBeCloseTo(altoEn(parejo, 3), 0);
    // Sin decir dónde, lo más grueso es el medio; con vientre 0,3, antes del medio.
    const adelante = trazoAfinado(linea, 12, 2, 2, 0.3);
    expect(altoEn(adelante, 30)).toBeGreaterThan(altoEn(adelante, 70));
    expect(trazoAfinado(linea, 12, 6, 6, 0.5)).toBe(parejo);
  });

  it("la media luna se abre con la voz, nunca se da vuelta y tiene las puntas finas", () => {
    const quieta = caminoDeMediaLuna(36, 8.6, 0.17);
    const abierta = caminoDeMediaLuna(36, 19, 0.17);
    expect(quieta.endsWith("Z")).toBe(true);
    const fondo = (d: string) => Math.max(...puntosDe(d).map(([, y]) => y));
    expect(fondo(abierta)).toBeGreaterThan(fondo(quieta));
    expect(caminoDeMediaLuna(36, -5)).toBe(caminoDeMediaLuna(36, 0));
    // Las puntas: el borde de abajo sale de cada punta inclinado, no en vertical como la D de la coleta.
    const salida = (d: string) => puntosDe(d.slice(d.indexOf("C")))[0]!;
    expect(Math.abs(salida(quieta)[0])).toBeLessThan(18 * 0.6);
    expect(Math.abs(salida(caminoDeSonrisa(36, 8.6))[0])).toBeGreaterThan(18 * 0.9);
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
