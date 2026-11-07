// La cabeza viva de Mia y el cambio de pose que parece movimiento (docs/PODCAST.md, «La cabeza viva»; candado
// C-PODCAST-6). Richard vio el video de prueba el 7 nov 2026: «no hay naturalidad en el movimiento». Entre pose
// y pose el cuerpo quedaba congelado, la cabeza no asentía al hablar ni miraba a ningún lado, y el fundido de
// 700 ms dejaba una doble imagen. Estas pruebas fijan lo que una persona en un podcast sí hace.
import { describe, expect, it } from "vitest";
import {
  CAMBIO_MS,
  ESPERA_PAUSA_MS,
  LIMITES_CABEZA,
  aplicar,
  cabezaInicial,
  cambioDePose,
  componer,
  movimientoDeCabeza,
  pasoDeCabeza,
  puedeCambiar,
  transformarCabeza,
  type EjeDeCabeza,
  type MemoriaDeCabeza,
  type SalidaDeCabeza,
} from "@compartido/podcast-cabeza";
import type { EstadoDelInvitado } from "@compartido/podcast-poses";

const CUADRO = 1000 / 60;

type Cuadro = SalidaDeCabeza & { t: number; mirada: MemoriaDeCabeza["mirada"] };

/** Corre la cabeza cuadro a cuadro con un guion de estado y volumen. */
function simular(
  guion: (ms: number) => { estado: EstadoDelInvitado; volumen: number },
  segundos: number,
  semilla = 7,
  paso: (i: number) => number = () => CUADRO,
): Cuadro[] {
  let m = cabezaInicial(semilla, 0);
  const cuadros: Cuadro[] = [];
  for (let t = 0, i = 0; t <= segundos * 1000; t += paso(i++)) {
    const g = guion(t);
    m = pasoDeCabeza(m, { estado: g.estado, ahora: t, volumen: g.volumen });
    cuadros.push({ t, mirada: m.mirada, ...m.salida });
  }
  return cuadros;
}

/** Una voz de prueba: sílabas de 0,2 s, una fuerte de cada tres, frases de 2,1 s con 0,3 s de pausa. */
const SILABA = 0.2;
const voz = (ms: number) => {
  const t = ms / 1000;
  if (t % 2.4 >= 2.1) return 0;
  const silaba = Math.max(0, Math.sin(Math.PI * ((t % SILABA) / SILABA)));
  const fuerte = Math.floor((t % 2.4) / SILABA) % 3 === 0;
  return silaba * (fuerte ? 0.8 : 0.42);
};

/** Cuántas veces asiente: los máximos de la altura de la cabeza que sobresalen por lo menos `alto` píxeles. */
function asentidas(c: readonly Cuadro[], alto = 1.2): number {
  let n = 0;
  let minimo = c[0]?.dy ?? 0;
  let subiendo = false;
  let pico = -Infinity;
  for (const k of c) {
    if (!subiendo) {
      minimo = Math.min(minimo, k.dy);
      if (k.dy - minimo >= alto) {
        subiendo = true;
        pico = k.dy;
      }
    } else if (k.dy > pico) pico = k.dy;
    else if (pico - k.dy >= alto) {
      n++;
      subiendo = false;
      minimo = k.dy;
    }
  }
  return n;
}

const promedio = (v: readonly number[]) => v.reduce((s, x) => s + x, 0) / (v.length || 1);

describe("la cabeza viva de Mia (C-PODCAST-6)", () => {
  it("nunca se queda congelada: en cada segundo, aunque nadie hable, la cabeza se mueve un poco", () => {
    for (const estado of ["reposo", "escuchando", "hablando"] as const) {
      const c = simular(() => ({ estado, volumen: 0 }), 20);
      for (let s = 0; s < 20; s++) {
        const ventana = c.filter((k) => k.t >= s * 1000 && k.t < (s + 1) * 1000);
        let recorrido = 0;
        for (let i = 1; i < ventana.length; i++) {
          const a = ventana[i - 1]!;
          const b = ventana[i]!;
          recorrido += Math.abs(b.dx - a.dx) + Math.abs(b.dy - a.dy) + 20 * Math.abs(b.giro - a.giro);
        }
        expect(recorrido, `${estado}, segundo ${s}`).toBeGreaterThan(0.3);
      }
    }
  });

  it("asiente con la energía de su voz: en las sílabas fuertes baja la cabeza, sin voz no", () => {
    const hablando = simular((ms) => ({ estado: "hablando", volumen: voz(ms) }), 24);
    const callada = simular(() => ({ estado: "hablando", volumen: 0 }), 24);
    const conVoz = asentidas(hablando);
    // Entre 0,6 y 2,5 por segundo: con sentido, no un tic en cada sílaba.
    expect(conVoz).toBeGreaterThanOrEqual(0.6 * 24);
    expect(conVoz).toBeLessThanOrEqual(2.5 * 24);
    expect(conVoz).toBeGreaterThanOrEqual(asentidas(callada) + 10);
    // Después de una sílaba fuerte (que no abre la frase), la cabeza baja.
    const bajadas: number[] = [];
    for (let t = 0.6; t < 24; t += 0.6) {
      if (t % 2.4 < 0.05 || t % 2.4 >= 2.1) continue;
      const en = (ms: number) => hablando.reduce((a, k) => (Math.abs(k.t - ms) < Math.abs(a.t - ms) ? k : a));
      bajadas.push(en(t * 1000 + 170).dy - en(t * 1000).dy);
    }
    expect(promedio(bajadas)).toBeGreaterThan(1);
  });

  it("escuchando inclina la cabeza hacia Richard, lo mira casi todo el rato y asiente de vez en cuando", () => {
    const c = simular(() => ({ estado: "escuchando", volumen: 0 }), 40).filter((k) => k.t > 2000);
    // Richard está a la izquierda: la cabeza se inclina hacia él (giro negativo) y los ojos se corren hacia él.
    expect(promedio(c.map((k) => k.giro))).toBeLessThan(-1);
    const aRichard = c.filter((k) => k.mirada === "richard").length / c.length;
    expect(aRichard).toBeGreaterThan(0.6);
    expect(promedio(c.filter((k) => k.mirada === "richard").map((k) => k.rasgosX))).toBeLessThan(-4);
    // A veces mira a la cámara: nunca fija como una estatua.
    expect(c.some((k) => k.mirada === "camara")).toBe(true);
    // El «ajá» de quien escucha: unas cuantas asentidas suaves, no una por segundo.
    const n = asentidas(c, 1.5);
    expect(n).toBeGreaterThanOrEqual(4);
    expect(n).toBeLessThanOrEqual(14);
  });

  it("hablando reparte la mirada entre la cámara y Richard, y a veces mira a un lado", () => {
    const c = simular((ms) => ({ estado: "hablando", volumen: voz(ms) }), 60);
    let cambios = 0;
    for (let i = 1; i < c.length; i++) if (c[i]!.mirada !== c[i - 1]!.mirada) cambios++;
    expect(cambios).toBeGreaterThanOrEqual(10);
    expect(cambios).toBeLessThanOrEqual(45);
    const parte = (m: string) => c.filter((k) => k.mirada === m).length / c.length;
    expect(parte("camara")).toBeGreaterThan(0.3);
    expect(parte("richard")).toBeGreaterThan(0.15);
    expect(parte("lado")).toBeGreaterThan(0);
  });

  it("pensando levanta la barbilla y mira a un lado", () => {
    const c = simular((ms) => ({ estado: ms < 1000 ? "escuchando" : "pensando", volumen: 0 }), 5).filter(
      (k) => k.t > 2500,
    );
    expect(promedio(c.map((k) => k.dy))).toBeLessThan(-1);
    expect(promedio(c.map((k) => k.rasgosX))).toBeGreaterThan(2);
  });

  it("nunca pasa de sus límites, aunque los estados y el volumen se vuelvan locos y los cuadros lleguen a saltos", () => {
    const estados: EstadoDelInvitado[] = ["reposo", "conectando", "escuchando", "pensando", "hablando"];
    let s = 12345;
    const azar = () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648;
    let estado: EstadoDelInvitado = "reposo";
    const c = simular(
      () => {
        if (azar() < 0.01) estado = estados[Math.floor(azar() * estados.length)]!;
        return { estado, volumen: azar() < 0.5 ? azar() * 3 : 0 };
      },
      300,
      3,
      () => 8 + azar() * 120,
    );
    for (const k of c) {
      for (const clave of ["giro", "dx", "dy", "rasgosX", "rasgosY"] as const) {
        expect(Number.isFinite(k[clave])).toBe(true);
        expect(Math.abs(k[clave]), clave).toBeLessThanOrEqual(LIMITES_CABEZA[clave]);
      }
      expect(Math.abs(k.cuerpoDy)).toBeLessThanOrEqual(4);
    }
  });

  it("se mueve suave: ni un tirón de un cuadro a otro, ni al cambiar de estado ni con un golpe de voz", () => {
    const c = simular((ms) => {
      const t = ms / 1000;
      const estado: EstadoDelInvitado =
        t < 5 ? "escuchando" : t < 7 ? "pensando" : t < 20 ? "hablando" : "escuchando";
      return { estado, volumen: estado === "hablando" ? (Math.floor(t * 3) % 2 ? 1 : voz(ms)) : 0 };
    }, 30);
    for (let i = 1; i < c.length; i++) {
      const a = c[i - 1]!;
      const b = c[i]!;
      expect(Math.abs(b.giro - a.giro)).toBeLessThanOrEqual(0.12);
      expect(Math.abs(b.dx - a.dx)).toBeLessThanOrEqual(0.8);
      // Una asentida baja la cara unos 10 px de su imagen en un sexto de segundo; un vistazo cruza el visor en
      // un décimo. Más que esto, en un cuadro, sería un salto.
      expect(Math.abs(b.dy - a.dy)).toBeLessThanOrEqual(2.2);
      expect(Math.abs(b.rasgosX - a.rasgosX)).toBeLessThanOrEqual(3);
      expect(Math.abs(b.rasgosY - a.rasgosY)).toBeLessThanOrEqual(3);
      expect(Math.abs(b.cuerpoDy - a.cuerpoDy)).toBeLessThanOrEqual(0.6);
    }
  });

  it("es determinista: la misma semilla da el mismo movimiento; otra semilla, otro", () => {
    const guion = (ms: number) => ({ estado: "hablando" as const, volumen: voz(ms) });
    expect(simular(guion, 8, 7)).toEqual(simular(guion, 8, 7));
    expect(simular(guion, 8, 8)).not.toEqual(simular(guion, 8, 7));
  });

  it("toma aire al empezar a hablar: el cuerpo sube un poco y vuelve", () => {
    const c = simular((ms) => ({ estado: ms < 2000 ? "escuchando" : "hablando", volumen: 0 }), 4);
    const despues = c.filter((k) => k.t >= 2000 && k.t < 3000).map((k) => k.cuerpoDy);
    expect(Math.min(...despues)).toBeLessThan(-1.5);
    expect(Math.abs(c.at(-1)!.cuerpoDy)).toBeLessThan(0.5);
  });
});

describe("el cambio de pose que parece movimiento (C-PODCAST-6)", () => {
  const paso = 0.001;
  const muestras = Array.from({ length: Math.round(1 / paso) + 1 }, (_, i) => i * paso);

  it("la doble imagen dura menos de 200 ms y el cuerpo nunca se ve transparente", () => {
    expect(CAMBIO_MS).toBeGreaterThanOrEqual(500);
    expect(CAMBIO_MS).toBeLessThanOrEqual(800);
    let doble = 0;
    for (const a of muestras) {
      const c = cambioDePose(a);
      if (c.llega > 0.15 && c.seVa > 0.15) doble += paso * CAMBIO_MS;
      expect(c.llega + c.seVa * (1 - c.llega), `avance ${a}`).toBeGreaterThanOrEqual(0.97);
    }
    expect(doble).toBeLessThanOrEqual(200);
  });

  it("empieza y termina quieta, con un impulso al principio y un asentamiento al final", () => {
    expect(cambioDePose(0)).toMatchObject({ llega: 0, seVa: 1, dy: 0, giro: 0, escala: 1, mezcla: 0 });
    const fin = cambioDePose(1);
    expect(fin.llega).toBe(1);
    expect(fin.seVa).toBe(0);
    expect(fin.mezcla).toBe(1);
    expect(Math.abs(fin.dy)).toBeLessThan(1e-9);
    expect(Math.abs(fin.giro)).toBeLessThan(1e-9);
    expect(fin.escala).toBeCloseTo(1, 9);
    const dys = muestras.map((a) => cambioDePose(a).dy);
    // Se agacha un poco (el impulso), se pasa hacia arriba y se asienta.
    expect(Math.max(...dys)).toBeGreaterThan(2);
    expect(Math.min(...dys)).toBeLessThan(-0.5);
    // El cruce de las dos imágenes cae en el momento de más movimiento, no con el cuerpo quieto.
    const cruce = muestras.find((a) => cambioDePose(a).llega >= 0.5)!;
    const velocidad = (a: number) => Math.abs(cambioDePose(a + paso).dy - cambioDePose(a).dy) / paso;
    expect(velocidad(cruce)).toBeGreaterThan(8);
    let antes = 0;
    for (const a of muestras) {
      const m = cambioDePose(a).mezcla;
      expect(m).toBeGreaterThanOrEqual(antes);
      antes = m;
    }
  });

  it("las dos cabezas se juntan: durante el cambio, la que se va y la que llega están en el mismo sitio", () => {
    const A: EjeDeCabeza = { centro: [677, 367], angulo: -0.3, escala: 447 };
    const B: EjeDeCabeza = { centro: [700, 368], angulo: -7.9, escala: 452 };
    const identidad = [1, 0, 0, 1, 0, 0];
    const cerca = (m: readonly number[], n: readonly number[]) =>
      m.forEach((v, i) => expect(v).toBeCloseTo(n[i]!, 6));
    cerca(transformarCabeza(A, A, B, 0), identidad);
    cerca(transformarCabeza(B, A, B, 1), identidad);
    for (const mezcla of [0.25, 0.5, 0.8]) {
      const tA = transformarCabeza(A, A, B, mezcla);
      const tB = transformarCabeza(B, A, B, mezcla);
      const [ax, ay] = aplicar(tA, A.centro);
      const [bx, by] = aplicar(tB, B.centro);
      expect(Math.hypot(ax - bx, ay - by)).toBeLessThan(1e-6);
      // Y con el mismo ángulo: un punto de la oreja de cada una cae en el mismo sitio.
      const oreja = (e: EjeDeCabeza): [number, number] => {
        const r = (e.angulo * Math.PI) / 180;
        return [e.centro[0] + (Math.cos(r) * e.escala) / 2, e.centro[1] + (Math.sin(r) * e.escala) / 2];
      };
      const [ox, oy] = aplicar(tA, oreja(A));
      const [px, py] = aplicar(tB, oreja(B));
      expect(Math.hypot(ox - px, oy - py)).toBeLessThan(1e-6);
    }
  });

  it("el movimiento de la cabeza gira alrededor del cuello y se compone con el cambio de pose", () => {
    const cuello: [number, number] = [690, 533];
    const m = movimientoDeCabeza({ giro: 3, dx: 0, dy: 0 }, cuello);
    // El cuello no se mueve; la coronilla (380 px arriba) se corre unos 20 px hacia la derecha.
    const [cx, cy] = aplicar(m, cuello);
    expect(Math.hypot(cx - cuello[0], cy - cuello[1])).toBeLessThan(1e-9);
    const [tx] = aplicar(m, [690, 153]);
    expect(tx - 690).toBeCloseTo(380 * Math.sin((3 * Math.PI) / 180), 6);
    const t = movimientoDeCabeza({ giro: 0, dx: 4, dy: -2 }, cuello);
    expect(aplicar(componer(t, m), cuello)).toEqual(aplicar(t, cuello));
  });

  it("hablando, el cambio de pose espera una pausa de la voz (como mucho medio segundo)", () => {
    expect(ESPERA_PAUSA_MS).toBeLessThanOrEqual(500);
    expect(puedeCambiar("hablando", 0.6, 100)).toBe(false);
    expect(puedeCambiar("hablando", 0.05, 100)).toBe(true);
    expect(puedeCambiar("hablando", 0.6, ESPERA_PAUSA_MS)).toBe(true);
    expect(puedeCambiar("escuchando", 0.6, 0)).toBe(true);
  });
});
