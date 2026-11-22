// Formato «Tutorial en bloques» (docs/TUTORIAL-BLOQUES.md, candado C-BLOQUES-1): un tutorial vertical 1080×1920 en un
// mundo de bloques propio, con las capturas REALES de la app dentro. Todo sale del plan (compartido/bloques.ts):
// - cada escena es una imagen de bloques con su cámara (acercamientos y paneos suaves; nunca queda quieta), su sujeto
//   recortado que crece un poco más que el fondo (profundidad) y, si el dibujo trae un teléfono de pantalla verde, la
//   captura pegada por cuatro esquinas debajo del «frente» (los dedos y el marco la tapan como a una pantalla de verdad);
// - un teléfono de bloques que flota en la escena con la captura ENTERA (regla de Richard: nada de zoom a pantalla
//   completa; para resaltar, una lupa), toques con la manito, lupas con resaltes, rótulos del paso, sellos y cubos de
//   progreso que se ponen verdes (lo que salió bien va en verde);
// - transiciones de cubos que se arman y se desarman (hechas con código, gratis) y subtítulos tipo CapCut con aire
//   entre palabras.
// Se renderiza MUDO: la voz, la música y un efecto en cada cambio se mezclan aparte (estacion/src/tutorial-bloques.ts).
// Modo «medir»: solo lo que se lee (clase «medir»), sobre transparente, para el candado de la zona segura.
import React from "react";
import { AbsoluteFill, Easing, Img, interpolate, spring, staticFile, useCurrentFrame } from "remotion";
import { loadFont as cargarBungee } from "@remotion/google-fonts/Bungee";
import { loadFont as cargarRubik } from "@remotion/google-fonts/Rubik";
import { altoTelefono3D, BISEL_3D, RotuloToque, Telefono3D, usePrecargarCapturas } from "./Telefono3D";
import {
  CAPTURA_ALTO,
  CAPTURA_ANCHO,
  ESCENA_ALTO,
  ESCENA_ANCHO,
  homografia,
  margenPalabra,
  matriz3dCss,
  trozosDeSubtitulos,
  ZONA_SEGURA,
  type Camara,
  type EscenaPlan,
  type LupaPlan,
  type PlanTutorialBloques,
  type ProgresoPlan,
  type TelefonoPlan,
  type Transicion,
} from "../../../compartido/bloques";

const { fontFamily: bungee } = cargarBungee("normal", { weights: ["400"], subsets: ["latin", "latin-ext"] });
const { fontFamily: rubik } = cargarRubik("normal", {
  weights: ["500", "700", "800", "900"],
  subsets: ["latin", "latin-ext"],
});

export const FPS_BLOQUES = 30;
const W = 1080;
const H = 1920;
const CENTRO = (ZONA_SEGURA.x0 + ZONA_SEGURA.x1) / 2;
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const sale = Easing.out(Easing.cubic);
const suave = Easing.inOut(Easing.cubic);
const resorte = (seg: number, rigidez = 170) =>
  seg < 0
    ? 0
    : spring({
        frame: seg * FPS_BLOQUES,
        fps: FPS_BLOQUES,
        config: { damping: 13, stiffness: rigidez, mass: 0.7 },
      });
const azar = (k: number) => {
  const x = Math.sin(k * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
/** Letras de bloque: sombra escalonada hacia abajo a la derecha (se leen como cubos) y borde fino. */
const extruir = (px: number, color: string, borde = "#101010") => {
  const s: string[] = [];
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * Math.PI * 2;
    s.push(`${(Math.cos(a) * 3).toFixed(1)}px ${(Math.sin(a) * 3).toFixed(1)}px 0 ${borde}`);
  }
  for (let k = 1; k <= px; k++) s.push(`${k}px ${k}px 0 ${color}`);
  return s.join(", ");
};
const bordeGrueso = (px: number, color: string) => {
  const s: string[] = [];
  for (let k = 0; k < 20; k++) {
    const a = (k / 20) * Math.PI * 2;
    s.push(`${(Math.cos(a) * px).toFixed(1)}px ${(Math.sin(a) * px).toFixed(1)}px 0 ${color}`);
  }
  return s.join(", ");
};
const bloque = (px: number, color = "#101010") =>
  Array.from({ length: px }, (_, k) => `${k + 1}px ${k + 1}px 0 ${color}`).join(", ");

/** Ancho aproximado de un texto en Bungee (letra ancha de cartel): 0,8 de su tamaño por letra. */
const anchoBungee = (texto: string, tam: number) => texto.length * tam * 0.8;
/** El tamaño de letra para que un texto de Bungee quepa en `ancho` (sin pasar de `maximo`). */
const tamQueCabe = (texto: string, ancho: number, maximo: number) =>
  Math.min(maximo, Math.floor(ancho / (texto.length * 0.8)));

// ---------- Cámara ----------
type Vista = { escala: number; left: number; top: number };
function vistaDe(cam: Camara[], t: number, lim: EscenaPlan["limites"], fin: number): Vista {
  const ks = [...cam].sort((a, b) => a.t - b.t);
  const primero = ks[0] as Camara;
  let x = primero.x;
  let y = primero.y;
  let z = primero.z;
  for (let k = 1; k < ks.length; k++) {
    const a = ks[k - 1] as Camara;
    const b = ks[k] as Camara;
    if (t <= a.t) break;
    const p = suave(Math.min(1, Math.max(0, (t - a.t) / Math.max(0.01, b.t - a.t))));
    x = a.x + (b.x - a.x) * p;
    y = a.y + (b.y - a.y) * p;
    z = a.z + (b.z - a.z) * p;
  }
  // Nunca quieta: después del último punto sigue acercándose muy despacio hasta el final de la escena.
  const ultimo = ks[ks.length - 1] as Camara;
  if (t > ultimo.t) z *= 1 + Math.min(fin - ultimo.t, t - ultimo.t) * 0.006;
  const x0 = lim?.x0 ?? 0;
  const y0 = lim?.y0 ?? 0;
  const x1 = lim?.x1 ?? ESCENA_ANCHO;
  const y1 = lim?.y1 ?? ESCENA_ALTO;
  const minima = Math.max(W / (x1 - x0), H / (y1 - y0));
  const escala = Math.max(minima, (W / ESCENA_ANCHO) * z);
  const left = Math.min(-x0 * escala, Math.max(W - x1 * escala, W / 2 - x * escala));
  const top = Math.min(-y0 * escala, Math.max(H - y1 * escala, H / 2 - y * escala));
  return { escala, left, top };
}

// ---------- La captura en la pantalla verde del dibujo ----------
const CapturaEnPantalla: React.FC<{
  e: EscenaPlan;
  t: number;
  colores: PlanTutorialBloques["coloresCaptura"];
}> = ({ e, t, colores }) => {
  const p = e.pantalla;
  if (!p) return null;
  const actual = [...p.capturas].reverse().find((c) => t >= c.t) ?? p.capturas[0];
  if (!actual) return null;
  const q = p.esquinas;
  const dist = (a: number[], b: number[]) => Math.hypot((a[0] ?? 0) - (b[0] ?? 0), (a[1] ?? 0) - (b[1] ?? 0));
  const prop = (dist(q[0], q[3]) + dist(q[1], q[2])) / (dist(q[0], q[1]) + dist(q[3], q[2]));
  const propCap = CAPTURA_ALTO / CAPTURA_ANCHO;
  // La captura entra entera y sin estirarse; lo que sobra se rellena con su propio color de arriba y de abajo.
  const vw = prop >= propCap ? CAPTURA_ANCHO : CAPTURA_ALTO / prop;
  const vh = prop >= propCap ? CAPTURA_ANCHO * prop : CAPTURA_ALTO;
  const ox = (vw - CAPTURA_ANCHO) / 2;
  const oy = (vh - CAPTURA_ALTO) / 2;
  const col = colores[actual.src] ?? { arriba: "#ffffff", abajo: "#ffffff" };
  const m = matriz3dCss(homografia(vw, vh, q));
  const apagado =
    p.encender === undefined ? 0 : interpolate(t, [p.encender - 0.01, p.encender + 0.35], [1, 0], clamp);
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: vw,
        height: vh,
        transformOrigin: "0 0",
        transform: m,
        overflow: "hidden",
        background: `linear-gradient(180deg, ${col.arriba} 50%, ${col.abajo} 50%)`,
      }}
    >
      <Img
        src={staticFile(actual.src)}
        style={{ position: "absolute", left: ox, top: oy, width: CAPTURA_ANCHO, height: CAPTURA_ALTO }}
      />
      {(p.toques ?? []).map((tq, k) => (
        <Toque key={k} t={t - tq.t} x={ox + tq.x} y={oy + tq.y} escala={vw / 400} />
      ))}
      <div style={{ position: "absolute", inset: 0, background: "#050505", opacity: apagado }} />
    </div>
  );
};

/** La manito que toca y la onda que se abre (en píxeles de la captura). */
const Toque: React.FC<{ t: number; x: number; y: number; escala: number }> = ({ t, x, y, escala }) => {
  if (t < -0.45 || t > 1.1) return null;
  const onda = interpolate(t, [0, 0.5], [0.2, 1.6], clamp);
  const aOnda = interpolate(t, [0, 0.08, 0.5], [0, 0.9, 0], clamp);
  const baja =
    t < 0
      ? interpolate(t, [-0.45, 0], [80, 0], { ...clamp, easing: sale })
      : interpolate(t, [0, 0.08, 0.2], [0, 10, 0], clamp);
  const aMano = interpolate(t, [-0.45, -0.3, 0.8, 1.1], [0, 1, 1, 0], clamp);
  const r = 60 * escala;
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: x - r,
          top: y - r,
          width: r * 2,
          height: r * 2,
          borderRadius: "50%",
          border: `${7 * escala}px solid #FFD400`,
          transform: `scale(${onda})`,
          opacity: aOnda,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: x - 18 * escala,
          top: y - 6 * escala + baja * escala,
          opacity: aMano,
          transform: "rotate(-12deg)",
        }}
      >
        <Manito tam={92 * escala} />
      </div>
    </>
  );
};
const Manito: React.FC<{ tam: number }> = ({ tam }) => (
  <svg width={tam} height={tam} viewBox="0 0 64 64">
    <path
      d="M22 34V9.5a5 5 0 0 1 10 0V27l2.6-.6a4.6 4.6 0 0 1 5.4 3.2 4.6 4.6 0 0 1 6.4 2.6 4.6 4.6 0 0 1 6.6 4.2V45c0 9.4-7.2 16-16 16h-3.6c-5.2 0-9.6-2.6-12.2-7.2L13.6 41a4.4 4.4 0 0 1 7.2-5z"
      fill="#fff"
      stroke="#101010"
      strokeWidth="3"
      strokeLinejoin="round"
    />
  </svg>
);

// ---------- La escena (fondo, pantalla, frente, sujeto, rótulos) ----------
type Caja = { x0: number; y0: number; x1: number; y1: number };
const Escena: React.FC<{ e: EscenaPlan; t: number; fin: number; plan: PlanTutorialBloques }> = ({
  e,
  t,
  fin,
  plan,
}) => {
  const v = vistaDe(e.camara, t, e.limites, fin);
  const prog = Math.min(1, Math.max(0, (t - e.inicio) / Math.max(1, fin - e.inicio)));
  return (
    <AbsoluteFill style={{ overflow: "hidden", background: "#1a1020" }}>
      <div
        style={{
          position: "absolute",
          left: v.left,
          top: v.top,
          width: ESCENA_ANCHO,
          height: ESCENA_ALTO,
          transform: `scale(${v.escala})`,
          transformOrigin: "0 0",
        }}
      >
        <Img
          src={staticFile(e.fondo)}
          style={{ position: "absolute", width: ESCENA_ANCHO, height: ESCENA_ALTO }}
        />
        {e.pantalla ? (
          <>
            <svg width={ESCENA_ANCHO} height={ESCENA_ALTO} style={{ position: "absolute", left: 0, top: 0 }}>
              <polygon
                points={e.pantalla.esquinas.map((p) => p.join(",")).join(" ")}
                fill="#0b0b0c"
                stroke="#0b0b0c"
                strokeWidth={10}
                strokeLinejoin="round"
              />
            </svg>
            <CapturaEnPantalla e={e} t={t} colores={plan.coloresCaptura} />
            {e.frente ? (
              <Img
                src={staticFile(e.frente)}
                style={{ position: "absolute", width: ESCENA_ANCHO, height: ESCENA_ALTO }}
              />
            ) : null}
          </>
        ) : null}
        {e.sujeto ? (
          <Img
            src={staticFile(e.sujeto)}
            style={{
              position: "absolute",
              width: ESCENA_ANCHO,
              height: ESCENA_ALTO,
              transform: `scale(${1 + prog * 0.045})`,
              transformOrigin: "50% 85%",
              filter: "drop-shadow(0 18px 24px rgba(30,10,40,0.25))",
            }}
          />
        ) : null}
      </div>
      {e.confeti !== undefined ? <Confeti t={t - e.confeti} /> : null}
      {(e.destellos ?? []).map((d, k) => {
        const a = interpolate(t - d, [0, 0.05, 0.45], [0, 0.85, 0], clamp);
        return a > 0 ? <AbsoluteFill key={k} style={{ background: "#fff", opacity: a }} /> : null;
      })}
    </AbsoluteFill>
  );
};

/**
 * Los rótulos que señalan algo de la escena («EN MOTO», «LICENCIA»): siguen a su objeto con la cámara, nunca salen
 * de la zona segura y nunca quedan detrás del teléfono (se corren a un lado, se achican o bajan).
 */
const Rotulos: React.FC<{
  e: EscenaPlan;
  t: number;
  fin: number;
  plan: PlanTutorialBloques;
  evitar: Caja | null;
}> = ({ e, t, fin, plan, evitar }) => {
  const v = vistaDe(e.camara, t, e.limites, fin);
  return (
    <>
      {(e.rotulos ?? []).map((r, k) => {
        const l = t - r.t;
        if (l < 0 || (r.hasta !== undefined && t > r.hasta + 0.3)) return null;
        const pe = resorte(l, 220);
        const ps = r.hasta === undefined ? 0 : interpolate(t, [r.hasta, r.hasta + 0.3], [0, 1], clamp);
        let tam = 46;
        let ancho = anchoBungee(r.texto, tam) + 52;
        const alto = 92;
        const dentro = (cx: number) =>
          Math.min(ZONA_SEGURA.x1 - ancho / 2 - 8, Math.max(ZONA_SEGURA.x0 + ancho / 2, cx));
        let x = dentro(v.left + r.x * v.escala);
        let y = Math.min(1310, Math.max(ZONA_SEGURA.arriba + 100, v.top + r.y * v.escala));
        const choca = (cx: number, cy: number) =>
          evitar !== null &&
          cx + ancho / 2 > evitar.x0 - 10 &&
          cx - ancho / 2 < evitar.x1 + 10 &&
          cy > evitar.y0 &&
          cy - alto < evitar.y1;
        if (evitar && choca(x, y)) {
          const libreIzq = evitar.x0 - 14 - ZONA_SEGURA.x0;
          const libreDer = ZONA_SEGURA.x1 - 8 - (evitar.x1 + 14);
          const lado = libreIzq >= libreDer ? "izq" : "der";
          const libre = Math.max(libreIzq, libreDer);
          if (ancho > libre) {
            tam = Math.max(30, Math.floor((libre - 52) / (r.texto.length * 0.8)));
            ancho = anchoBungee(r.texto, tam) + 52;
          }
          if (ancho <= libre) x = lado === "izq" ? evitar.x0 - 14 - ancho / 2 : evitar.x1 + 14 + ancho / 2;
          else y = Math.min(1310, evitar.y1 + alto + 16);
        }
        return (
          <div
            key={k}
            style={{
              position: "absolute",
              left: x,
              top: y,
              transform: `translate(-50%, -100%) scale(${(0.4 + pe * 0.6) * (1 - ps)})`,
              transformOrigin: "50% 100%",
              opacity: 1 - ps,
            }}
          >
            <div
              className="medir"
              style={{
                fontFamily: bungee,
                fontSize: tam,
                color: "#fff",
                background: plan.colores.marca,
                padding: "10px 22px 6px",
                borderRadius: 14,
                boxShadow: bloque(8),
                whiteSpace: "nowrap",
                border: "4px solid #fff",
              }}
            >
              {r.texto}
            </div>
            <div
              style={{
                width: 0,
                height: 0,
                margin: "0 auto",
                borderLeft: "16px solid transparent",
                borderRight: "16px solid transparent",
                borderTop: `18px solid ${plan.colores.marca}`,
              }}
            />
          </div>
        );
      })}
    </>
  );
};

/** Cubitos de colores que caen girando (cuando algo salió bien). */
const Confeti: React.FC<{ t: number }> = ({ t }) => {
  if (t < 0 || t > 3.2) return null;
  const colores = ["#F20D20", "#FFD400", "#14A44D", "#2F80ED", "#ffffff", "#FF7A00"];
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {Array.from({ length: 46 }, (_, k) => {
        const x = azar(k) * W;
        const vy = 380 + azar(k + 9) * 520;
        const y = -80 + t * vy + 0.5 * 260 * t * t - azar(k + 3) * 500;
        const lado = 18 + azar(k + 5) * 22;
        const giro = t * (180 + azar(k + 7) * 360) * (k % 2 ? 1 : -1);
        return (
          <div
            key={k}
            style={{
              position: "absolute",
              left: x + Math.sin(t * 3 + k) * 30,
              top: y,
              width: lado,
              height: lado,
              background: colores[k % colores.length],
              boxShadow: `inset -${lado * 0.25}px -${lado * 0.25}px 0 rgba(0,0,0,0.22)`,
              transform: `rotate(${giro}deg)`,
              opacity: interpolate(t, [2.4, 3.2], [1, 0], clamp),
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

// ---------- El teléfono de bloques ----------
/** Dónde está el teléfono en la pantalla (para que los rótulos no queden detrás); null si no se ve. */
function cajaTelefono(tel: TelefonoPlan, t: number): Caja | null {
  if (t < tel.desde || (tel.hasta !== undefined && t > tel.hasta)) return null;
  const { x, top, ancho } = posicionTelefono(tel, t);
  // Un poco más grande que su caja: el teléfono 3D gira y se ve más ancho que su medida.
  return {
    x0: x - ancho / 2 - 16,
    y0: top - 16,
    x1: x + ancho / 2 + 16,
    y1: top + altoTelefono3D(ancho) + 24,
  };
}
function posicionTelefono(tel: TelefonoPlan, t: number) {
  const ps = [...tel.posiciones].sort((a, b) => a.t - b.t);
  let actual = ps[0] as (typeof ps)[number];
  let x = actual.x;
  let top = actual.top;
  let ancho = actual.ancho;
  for (let k = 1; k < ps.length; k++) {
    const b = ps[k] as (typeof ps)[number];
    if (t < b.t) break;
    const p = suave(Math.min(1, (t - b.t) / 0.5));
    x = actual.x + (b.x - actual.x) * p;
    top = actual.top + (b.top - actual.top) * p;
    ancho = actual.ancho + (b.ancho - actual.ancho) * p;
    actual = b;
  }
  return { x, top, ancho };
}
const Telefono: React.FC<{ tel: TelefonoPlan; t: number; medir: boolean }> = ({ tel, t, medir }) => {
  const l = t - tel.desde;
  if (l < 0 || (tel.hasta !== undefined && t > tel.hasta + 0.5)) return null;
  const { x, top, ancho } = posicionTelefono(tel, t);
  const entra = resorte(l, 120);
  const salida =
    tel.hasta === undefined
      ? 0
      : interpolate(t, [tel.hasta, tel.hasta + 0.5], [0, 1], { ...clamp, easing: Easing.in(Easing.cubic) });
  const alto = altoTelefono3D(ancho);
  const y = top + (1 - entra) * 1300 + salida * 1400 + Math.sin(t * 1.7) * 7;
  const margen = 1.55;
  const wC = Math.round(ancho * margen);
  const hC = Math.round(alto * 1.22);
  const k = (ancho - BISEL_3D * 2) / CAPTURA_ANCHO;
  const toque = (tel.toques ?? []).find((q) => t - q.t > -0.2 && t - q.t < 1.1);
  if (medir) {
    if (entra < 0.97 || salida > 0) return null;
    // Para el candado de la zona: el teléfono se mide por su caja (el lienzo 3D no se dibuja).
    return (
      <div
        className="medir"
        style={{
          position: "absolute",
          left: x - ancho / 2,
          top: y,
          width: ancho,
          height: alto,
          background: "#000",
        }}
      />
    );
  }
  return (
    <>
      <div
        style={{ position: "absolute", left: x - wC / 2, top: y - (hC - alto) / 2, width: wC, height: hC }}
      >
        <div
          style={{
            position: "absolute",
            left: wC * 0.2,
            right: wC * 0.2,
            bottom: hC * 0.06,
            height: 46,
            borderRadius: "50%",
            background: "rgba(30,10,40,0.35)",
            filter: "blur(14px)",
          }}
        />
        <Telefono3D
          t={t}
          ancho={ancho}
          capturas={tel.capturas}
          toques={tel.toques ?? []}
          giro={tel.giro ?? -10}
          margen={margen}
        />
      </div>
      {toque ? (
        <RotuloToque
          t={t - toque.t}
          x={Math.min(
            ZONA_SEGURA.x1 - 150,
            Math.max(ZONA_SEGURA.x0 + 150, x - ancho / 2 + BISEL_3D + toque.x * k),
          )}
          y={y + BISEL_3D + toque.y * k - 70}
          texto="¡TOCA AQUÍ!"
          fuente={bungee}
        />
      ) : null}
    </>
  );
};

// ---------- Lupa, rótulo del paso, sellos y cubos de progreso ----------
const Lupa: React.FC<{ l: LupaPlan; t: number; colores: PlanTutorialBloques["colores"] }> = ({
  l,
  t,
  colores,
}) => {
  const d = t - l.desde;
  if (d < 0 || (l.hasta !== undefined && t > l.hasta + 0.3)) return null;
  const p = resorte(d, 200);
  const fuera = l.hasta === undefined ? 0 : interpolate(t, [l.hasta, l.hasta + 0.3], [0, 1], clamp);
  const ancho = l.ancho ?? 800;
  const [x0, y0, x1, y1] = l.recorte;
  const k = ancho / (x1 - x0);
  const alto = (y1 - y0) * k;
  return (
    <div
      className="medir"
      style={{
        position: "absolute",
        left: CENTRO - ancho / 2 - 4,
        top: l.top,
        width: ancho,
        height: alto,
        borderRadius: 26,
        overflow: "hidden",
        background: "#fff",
        border: `7px solid ${colores.marca}`,
        boxShadow: `${bloque(12)}, 0 30px 70px rgba(20,5,30,0.45)`,
        transform: `scale(${(0.55 + p * 0.45) * (1 - fuera * 0.4)}) rotate(${(1 - p) * -4}deg)`,
        opacity: interpolate(p, [0, 0.3], [0, 1], clamp) * (1 - fuera),
      }}
    >
      <Img
        src={staticFile(l.src)}
        style={{
          position: "absolute",
          left: -x0 * k,
          top: -y0 * k,
          width: CAPTURA_ANCHO * k,
          height: CAPTURA_ALTO * k,
        }}
      />
      {(l.resaltes ?? []).map((r, i) => {
        const a = interpolate(t - r.t, [0, 0.25], [0, 1], { ...clamp, easing: sale });
        if (a <= 0) return null;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: (r.x0 - x0) * k - 8,
              top: (r.y0 - y0) * k - 6,
              width: ((r.x1 - r.x0) * k + 16) * a,
              height: (r.y1 - r.y0) * k + 12,
              borderRadius: 12,
              background: "rgba(255, 212, 0, 0.32)",
              boxShadow: `inset 0 -6px 0 ${colores.marca}`,
            }}
          />
        );
      })}
    </div>
  );
};

const Chip: React.FC<{
  desde: number;
  hasta?: number;
  etiqueta: string;
  texto: string;
  t: number;
  colores: PlanTutorialBloques["colores"];
}> = ({ desde, hasta, etiqueta, texto, t, colores }) => {
  const d = t - desde;
  if (d < 0 || (hasta !== undefined && t > hasta + 0.25)) return null;
  const p = resorte(d, 220);
  const fuera = hasta === undefined ? 0 : interpolate(t, [hasta, hasta + 0.25], [0, 1], clamp);
  const tam = tamQueCabe(texto, 840, 70);
  return (
    <div
      style={{
        position: "absolute",
        left: ZONA_SEGURA.x0,
        width: ZONA_SEGURA.x1 - ZONA_SEGURA.x0,
        top: 200,
        textAlign: "center",
        opacity: 1 - fuera,
        transform: `translateY(${-fuera * 40}px)`,
      }}
    >
      <div
        className="medir"
        style={{
          display: "inline-block",
          fontFamily: bungee,
          fontSize: 34,
          color: "#fff",
          background: colores.marca,
          padding: "8px 20px 4px",
          borderRadius: 10,
          boxShadow: bloque(7),
          border: "3px solid #fff",
          transform: `scale(${0.5 + p * 0.5}) rotate(${(1 - p) * -6}deg)`,
          opacity: interpolate(p, [0, 0.3], [0, 1], clamp),
        }}
      >
        {etiqueta}
      </div>
      <div
        className="medir"
        style={{
          marginTop: 14,
          fontFamily: bungee,
          fontSize: tam,
          lineHeight: 1.05,
          color: "#fff",
          whiteSpace: "nowrap",
          textShadow: extruir(9, "#3b0a10"),
          transform: `translateY(${(1 - resorte(d - 0.08, 200)) * 50}px)`,
          opacity: interpolate(resorte(d - 0.08, 200), [0, 0.3], [0, 1], clamp),
        }}
      >
        {texto}
      </div>
    </div>
  );
};

const Sello: React.FC<{
  s: NonNullable<EscenaPlan["sellos"]>[number];
  t: number;
  colores: PlanTutorialBloques["colores"];
}> = ({ s, t, colores }) => {
  const d = t - s.t;
  if (d < 0 || (s.hasta !== undefined && t > s.hasta + 0.3)) return null;
  const golpe = interpolate(d, [0, 0.16, 0.3], [0.35, 1.06, 1], { ...clamp, easing: sale });
  const fuera = s.hasta === undefined ? 0 : interpolate(t, [s.hasta, s.hasta + 0.3], [0, 1], clamp);
  const tam = Math.min(s.tam ?? 96, tamQueCabe(s.texto, 760, 200));
  return (
    <div
      style={{
        position: "absolute",
        left: ZONA_SEGURA.x0,
        width: ZONA_SEGURA.x1 - ZONA_SEGURA.x0,
        top: s.top,
        display: "flex",
        justifyContent: "center",
        transform: `rotate(${s.giro ?? -5}deg) scale(${golpe * (1 - fuera * 0.5)})`,
        opacity: interpolate(d, [0, 0.08], [0, 1], clamp) * (1 - fuera),
      }}
    >
      <div
        className="medir"
        style={{
          fontFamily: bungee,
          fontSize: tam,
          lineHeight: 1,
          color: "#fff",
          background: s.color ?? colores.exito,
          padding: `${tam * 0.16}px ${tam * 0.3}px ${tam * 0.08}px`,
          borderRadius: tam * 0.14,
          border: `${Math.round(tam * 0.06)}px solid #fff`,
          boxShadow: bloque(12),
          whiteSpace: "nowrap",
        }}
      >
        {s.texto}
      </div>
    </div>
  );
};

/** Cubos que se ponen verdes cuando se cumple cada paso. */
const Progreso: React.FC<{ p: ProgresoPlan; t: number; colores: PlanTutorialBloques["colores"] }> = ({
  p,
  t,
  colores,
}) => {
  if (t < p.desde || t > p.hasta + 0.3) return null;
  const fuera = interpolate(t, [p.hasta, p.hasta + 0.3], [0, 1], clamp);
  const lado = p.total > 5 ? 58 : 66;
  const gap = 18;
  const total = p.total * lado + (p.total - 1) * gap;
  const hechos = [...p.hechos].sort((a, b) => a.t - b.t);
  return (
    <div
      className="medir"
      style={{
        position: "absolute",
        left: CENTRO - total / 2,
        top: p.top,
        width: total + 12,
        height: lado + 14,
        opacity: 1 - fuera,
      }}
    >
      {Array.from({ length: p.total }, (_, k) => {
        const entra = resorte(t - p.desde - k * 0.07, 200);
        const cuando = hechos.find((h) => h.n > k)?.t;
        const verde = cuando !== undefined && t >= cuando;
        const salto = cuando === undefined ? 0 : interpolate(t - cuando, [0, 0.12, 0.3], [0, -22, 0], clamp);
        return (
          <div
            key={k}
            style={{
              position: "absolute",
              left: k * (lado + gap),
              top: salto + (1 - entra) * -60,
              width: lado,
              height: lado,
              borderRadius: 8,
              background: verde ? colores.exito : "rgba(255,255,255,0.88)",
              border: "4px solid #101010",
              boxShadow: `${bloque(7)}, inset -8px -8px 0 rgba(0,0,0,${verde ? 0.22 : 0.1})`,
              opacity: entra,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxSizing: "border-box",
            }}
          >
            {verde ? (
              <svg width={lado * 0.62} height={lado * 0.62} viewBox="0 0 24 24">
                <path
                  d="M4.5 12.5l5 5 10-11"
                  stroke="#fff"
                  strokeWidth="4"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ) : (
              <span style={{ fontFamily: bungee, fontSize: lado * 0.46, color: "#101010" }}>{k + 1}</span>
            )}
          </div>
        );
      })}
    </div>
  );
};

/** Una imagen que salta encima tal cual (la insignia oficial de Google Play no se toca: ni color, ni sombra). */
const Pegatina: React.FC<{ g: NonNullable<EscenaPlan["pegatinas"]>[number]; t: number }> = ({ g, t }) => {
  const d = t - g.t;
  if (d < 0 || (g.hasta !== undefined && t > g.hasta + 0.3)) return null;
  const p = resorte(d, 180);
  const fuera = g.hasta === undefined ? 0 : interpolate(t, [g.hasta, g.hasta + 0.3], [0, 1], clamp);
  return (
    <div
      className="medir"
      style={{
        position: "absolute",
        left: (g.x ?? CENTRO) - g.ancho / 2,
        top: g.top,
        width: g.ancho,
        transform: `scale(${p * (1 - fuera * 0.5)})`,
        opacity: interpolate(p, [0, 0.3], [0, 1], clamp) * (1 - fuera),
      }}
    >
      <Img src={staticFile(g.src)} style={{ width: g.ancho, display: "block" }} />
    </div>
  );
};

// ---------- Transición de cubos: se arman tapando lo de antes y se desarman mostrando lo nuevo ----------
const COLS = 9;
const FILAS = 16;
const ARMA = 0.28;
const DESARMA = 0.32;
const Transicion: React.FC<{ tipo: Transicion; t: number; colores: PlanTutorialBloques["colores"] }> = ({
  tipo,
  t,
  colores,
}) => {
  if (tipo === "corte" || t < -ARMA - 0.2 || t > DESARMA + 0.25) return null;
  const lado = W / COLS;
  const alto = H / FILAS;
  const paleta = [colores.marca, colores.oscuro, colores.marca, "#ffffff", colores.oscuro, "#c00a18"];
  const orden = (c: number, f: number) => {
    if (tipo === "centro") return Math.hypot(c - (COLS - 1) / 2, (f - (FILAS - 1) / 2) * 0.6) / 8;
    if (tipo === "lluvia") return (FILAS - 1 - f) / FILAS + azar(c * 7) * 0.12;
    if (tipo === "columnas") return ((c % 2 ? c : COLS - c) / COLS) * 0.7 + azar(f) * 0.15;
    return (c + f * 0.6) / (COLS + FILAS * 0.6);
  };
  const celdas: React.ReactNode[] = [];
  for (let f = 0; f < FILAS; f++) {
    for (let c = 0; c < COLS; c++) {
      const o = Math.min(1, orden(c, f));
      // Arma: cada cubo cae a su lugar antes del corte; desarma: se encoge y sale hacia arriba después.
      const ti = -ARMA + o * ARMA * 0.75;
      const pa = interpolate(t, [ti - 0.12, ti], [0, 1], { ...clamp, easing: sale });
      const td = o * DESARMA * 0.7;
      const pd = interpolate(t, [td, td + 0.14], [0, 1], { ...clamp, easing: Easing.in(Easing.cubic) });
      if (pa <= 0 || pd >= 1) continue;
      const color = paleta[Math.floor(azar(c * 31 + f * 17) * paleta.length)] as string;
      celdas.push(
        <div
          key={`${c}-${f}`}
          style={{
            position: "absolute",
            left: c * lado - 1,
            top: f * alto - 1 - (1 - pa) * 140 - pd * 90,
            width: lado + 2,
            height: alto + 2,
            background: color,
            boxShadow: `inset -10px -12px 0 rgba(0,0,0,0.25), inset 8px 8px 0 rgba(255,255,255,0.18)`,
            transform: `scale(${(0.6 + pa * 0.4) * (1 - pd)})`,
            opacity: pa,
          }}
        />,
      );
    }
  }
  return <AbsoluteFill style={{ pointerEvents: "none" }}>{celdas}</AbsoluteFill>;
};

// ---------- Subtítulos tipo CapCut ----------
const TAM_SUB = 74;
const ESCALA_ACTIVA = 1.1;
const Subtitulos: React.FC<{ plan: PlanTutorialBloques; t: number }> = ({ plan, t }) => {
  const trozos = React.useMemo(() => trozosDeSubtitulos(plan.palabras), [plan.palabras]);
  if (plan.sinSubtitulos.some(([a, b]) => t >= a && t < b)) return null;
  const trozo = trozos.find((z) => t >= z.desde && t < z.hasta);
  if (!trozo) return null;
  const entra = resorte(t - trozo.desde, 260);
  // Rubik negra en mayúsculas: unos 0,7 del tamaño por letra. Se achica lo justo para que el trozo quepa en 840 px.
  const letras = trozo.palabras.reduce((n, w) => n + w.text.replace(/[«»]/g, "").length, 0);
  const largo = Math.max(...trozo.palabras.map((w) => w.text.length));
  const tam = Math.min(
    TAM_SUB,
    Math.floor(
      840 / (letras * 0.7 + largo * 0.07 + trozo.palabras.length * (margenPalabra(1, ESCALA_ACTIVA) + 0.05)),
    ),
  );
  const margen = margenPalabra(tam, ESCALA_ACTIVA);
  return (
    <div
      className="medir"
      style={{
        position: "absolute",
        left: ZONA_SEGURA.x0,
        width: ZONA_SEGURA.x1 - ZONA_SEGURA.x0,
        top: 1336,
        textAlign: "center",
        whiteSpace: "nowrap",
        transform: `scale(${0.82 + entra * 0.18})`,
      }}
    >
      {trozo.palabras.map((w, k) => {
        const sig = trozo.palabras[k + 1];
        const activa = t >= w.startMs / 1000 && (sig ? t < sig.startMs / 1000 : true);
        return (
          <span
            key={k}
            style={{
              display: "inline-block",
              margin: `0 ${margen / 2}px`,
              fontFamily: rubik,
              fontWeight: 900,
              fontSize: tam,
              lineHeight: 1.1,
              textTransform: "uppercase",
              color: activa ? plan.colores.resalte : "#fff",
              textShadow: `${bordeGrueso(8, "#101010")}, 0 9px 0 rgba(0,0,0,0.35)`,
              transform: `scale(${activa ? ESCALA_ACTIVA : 1})`,
            }}
          >
            {w.text.replace(/[«»]/g, "")}
          </span>
        );
      })}
    </div>
  );
};

// ---------- Portada (primer cuadro) y cierre ----------
const Portada: React.FC<{ plan: PlanTutorialBloques; t: number }> = ({ plan, t }) => {
  const po = plan.portada;
  if (t > po.hasta + 0.4) return null;
  const fuera = interpolate(t, [po.hasta, po.hasta + 0.4], [0, 1], {
    ...clamp,
    easing: Easing.in(Easing.cubic),
  });
  const vaiven = Math.sin(t * 2.2) * 1.2;
  const sello = t - po.sello.t;
  return (
    <AbsoluteFill style={{ opacity: 1 - fuera, transform: `translateY(${-fuera * 120}px)` }}>
      <div
        style={{
          position: "absolute",
          left: ZONA_SEGURA.x0,
          width: ZONA_SEGURA.x1 - ZONA_SEGURA.x0,
          top: 196,
          textAlign: "center",
        }}
      >
        <div
          className="medir"
          style={{
            display: "inline-block",
            fontFamily: bungee,
            fontSize: 36,
            color: "#fff",
            background: plan.colores.oscuro,
            padding: "8px 22px 4px",
            borderRadius: 10,
            border: "3px solid #fff",
            boxShadow: bloque(7, plan.colores.marca),
          }}
        >
          {po.etiqueta}
        </div>
        {po.lineas.map((l, k) => (
          <div
            key={k}
            className="medir"
            style={{
              marginTop: k === 0 ? 18 : 4,
              fontFamily: bungee,
              fontSize: 86,
              lineHeight: 1.02,
              color: "#fff",
              whiteSpace: "nowrap",
              textShadow: extruir(10, "#3b0a10"),
              transform: `rotate(${vaiven * (k % 2 ? -1 : 1)}deg)`,
            }}
          >
            {l}
          </div>
        ))}
        <div
          style={{
            marginTop: 20,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 16,
            transform: `rotate(${-vaiven}deg)`,
          }}
        >
          <div
            className="medir"
            style={{
              background: "#fff",
              borderRadius: 18,
              padding: "16px 26px",
              boxShadow: bloque(10),
              border: "4px solid #101010",
            }}
          >
            <Img src={staticFile(po.logo)} style={{ height: 74, display: "block" }} />
          </div>
          <div
            className="medir"
            style={{
              fontFamily: bungee,
              fontSize: 60,
              color: "#fff",
              background: plan.colores.marca,
              padding: "16px 22px 8px",
              borderRadius: 18,
              border: "4px solid #fff",
              boxShadow: bloque(10),
            }}
          >
            {po.remate}
          </div>
        </div>
      </div>
      {sello >= 0 ? (
        <div
          style={{
            position: "absolute",
            left: ZONA_SEGURA.x0,
            width: ZONA_SEGURA.x1 - ZONA_SEGURA.x0,
            top: 1180,
            display: "flex",
            justifyContent: "center",
            transform: `rotate(-6deg) scale(${interpolate(sello, [0, 0.16, 0.3], [0.3, 1.08, 1], { ...clamp, easing: sale })})`,
          }}
        >
          <div
            className="medir"
            style={{
              fontFamily: bungee,
              fontSize: 84,
              color: "#101010",
              background: plan.colores.resalte,
              padding: "16px 30px 8px",
              borderRadius: 16,
              border: "6px solid #101010",
              boxShadow: bloque(12, "#101010"),
            }}
          >
            {po.sello.texto}
          </div>
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

const Cierre: React.FC<{ plan: PlanTutorialBloques; t: number }> = ({ plan, t }) => {
  const c = plan.cierre;
  const d = t - c.desde;
  if (d < 0) return null;
  const p = (dt: number) => resorte(d - dt, 170);
  const ancho = 520;
  const lt = t - c.toque;
  const remate = t - c.remate.t;
  return (
    <AbsoluteFill>
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(20,6,26,0.55) 0%, rgba(20,6,26,0.15) 45%, rgba(20,6,26,0.55) 100%)",
          opacity: interpolate(d, [0, 0.4], [0, 1], clamp),
        }}
      />
      <div
        style={{
          position: "absolute",
          left: ZONA_SEGURA.x0,
          width: ZONA_SEGURA.x1 - ZONA_SEGURA.x0,
          top: 250,
          textAlign: "center",
        }}
      >
        <div
          className="medir"
          style={{
            display: "inline-block",
            background: "#fff",
            borderRadius: 22,
            padding: "22px 36px",
            border: "5px solid #101010",
            boxShadow: bloque(12),
            transform: `scale(${p(0)})`,
          }}
        >
          <Img src={staticFile(c.logo)} style={{ height: 110, display: "block" }} />
        </div>
        <div
          className="medir"
          style={{
            marginTop: 34,
            fontFamily: bungee,
            fontSize: 74,
            lineHeight: 1.05,
            color: "#fff",
            textShadow: extruir(10, "#3b0a10"),
            transform: `translateY(${(1 - p(0.1)) * 60}px)`,
            opacity: p(0.1),
          }}
        >
          {c.titulo}
        </div>
      </div>
      <div
        className="medir"
        style={{
          position: "absolute",
          left: CENTRO - ancho / 2,
          top: 700,
          width: ancho,
          transform: `scale(${p(0.3)})`,
          opacity: interpolate(p(0.3), [0, 0.3], [0, 1], clamp),
        }}
      >
        <Img src={staticFile(c.insignia)} style={{ width: ancho, display: "block" }} />
        {lt >= -0.45 && lt < 1.1 ? (
          <div style={{ position: "absolute", left: 0, top: 0, width: ancho, height: (ancho * 250) / 646 }}>
            <Toque t={lt} x={ancho * 0.66} y={((ancho * 250) / 646) * 0.55} escala={1.3} />
          </div>
        ) : null}
      </div>
      {remate >= 0 ? (
        <div
          style={{
            position: "absolute",
            left: ZONA_SEGURA.x0,
            width: ZONA_SEGURA.x1 - ZONA_SEGURA.x0,
            top: 1000,
            display: "flex",
            justifyContent: "center",
            transform: `rotate(-4deg) scale(${interpolate(remate, [0, 0.16, 0.3], [0.3, 1.07, 1], { ...clamp, easing: sale })})`,
          }}
        >
          <div
            className="medir"
            style={{
              fontFamily: bungee,
              fontSize: 70,
              color: "#fff",
              background: plan.colores.exito,
              padding: "16px 28px 8px",
              borderRadius: 16,
              border: "6px solid #fff",
              boxShadow: bloque(12),
            }}
          >
            {c.remate.texto}
          </div>
        </div>
      ) : null}
      <div
        className="medir"
        style={{
          position: "absolute",
          left: ZONA_SEGURA.x0,
          width: ZONA_SEGURA.x1 - ZONA_SEGURA.x0,
          top: 1420,
          textAlign: "center",
          fontFamily: rubik,
          fontWeight: 500,
          fontSize: 22,
          color: "rgba(255,255,255,0.9)",
          opacity: interpolate(d, [0.6, 1], [0, 1], clamp),
        }}
      >
        {c.legal}
      </div>
    </AbsoluteFill>
  );
};

const ESTILO_MEDIR = `
  * { visibility: hidden !important; }
  .medir, .medir * { visibility: visible !important; }
`;

export type PropsTutorialBloques = { plan: PlanTutorialBloques; medir?: boolean };

export const TutorialBloques: React.FC<PropsTutorialBloques> = ({ plan, medir = false }) => {
  const f = useCurrentFrame();
  const t = f / FPS_BLOQUES;
  const escenas = [...plan.escenas].sort((a, b) => a.inicio - b.inicio);
  const srcs = React.useMemo(
    () => [...new Set(plan.escenas.flatMap((x) => (x.telefono?.capturas ?? []).map((c) => c.src)))],
    [plan.escenas],
  );
  const listas = usePrecargarCapturas(srcs);
  if (escenas.length === 0 || !listas)
    return <AbsoluteFill style={{ backgroundColor: plan.colores.oscuro }} />;
  let k = 0;
  for (let n = 0; n < escenas.length; n++) if (t >= (escenas[n] as EscenaPlan).inicio) k = n;
  const e = escenas[k] as EscenaPlan;
  const fin = (escenas[k + 1] as EscenaPlan | undefined)?.inicio ?? plan.duracion;
  const sig = escenas[k + 1];
  return (
    <AbsoluteFill style={{ backgroundColor: medir ? "transparent" : plan.colores.oscuro }}>
      {medir ? <style>{ESTILO_MEDIR}</style> : null}
      <Escena e={e} t={t} fin={fin} plan={plan} />
      {/* Lo de cada escena que flota encima (teléfono, lupas, rótulos del paso, sellos) */}
      {e.telefono ? <Telefono tel={e.telefono} t={t} medir={medir} /> : null}
      <Rotulos e={e} t={t} fin={fin} plan={plan} evitar={e.telefono ? cajaTelefono(e.telefono, t) : null} />
      {(e.chips ?? []).map((c, n) => (
        <Chip key={n} {...c} t={t} colores={plan.colores} />
      ))}
      {(e.lupas ?? []).map((l, n) => (
        <Lupa key={n} l={l} t={t} colores={plan.colores} />
      ))}
      {(e.sellos ?? []).map((s, n) => (
        <Sello key={n} s={s} t={t} colores={plan.colores} />
      ))}
      {(e.pegatinas ?? []).map((g, n) => (
        <Pegatina key={n} g={g} t={t} />
      ))}
      {plan.progresos.map((p, n) => (
        <Progreso key={n} p={p} t={t} colores={plan.colores} />
      ))}
      <Portada plan={plan} t={t} />
      <Cierre plan={plan} t={t} />
      {/* La transición de la escena que entra (y, si la siguiente está por entrar, sus cubos ya se arman) */}
      {k > 0 ? <Transicion tipo={e.transicion} t={t - e.inicio} colores={plan.colores} /> : null}
      {sig ? <Transicion tipo={sig.transicion} t={t - sig.inicio} colores={plan.colores} /> : null}
      <Subtitulos plan={plan} t={t} />
    </AbsoluteFill>
  );
};
