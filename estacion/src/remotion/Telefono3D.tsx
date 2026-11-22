// El teléfono 3D del formato «Tutorial en bloques» (docs/TUTORIAL-BLOQUES.md): un modelo de verdad (three.js con
// @remotion/three) con cuerpo de caja redondeada, canto, botones rojos y luz suave, y la captura REAL entera como
// pantalla. La pantalla es un lienzo 2D que se pinta en cada cuadro (la captura que entra desliza sobre la anterior,
// como en la app, y la onda del toque) y se pega al modelo como textura sin luz, para que se lea con sus colores.
// Un dedo de bloques 3D baja, toca y se va, con el rótulo «¡TOCA AQUÍ!».
import React, { useEffect, useLayoutEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { ThreeCanvas } from "@remotion/three";
import {
  cancelRender,
  continueRender,
  delayRender,
  Easing,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { CAPTURA_ALTO, CAPTURA_ANCHO, type CambioCaptura, type Toque } from "../../../compartido/bloques";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const sale = Easing.out(Easing.cubic);
export const BISEL_3D = 16;
const ESC = 100; // 100 px de la pantalla = 1 unidad del mundo 3D

/** Rectángulo de esquinas redondeadas (centrado) para extruir o para la pantalla. */
function rectRedondeado(w: number, h: number, r: number): THREE.Shape {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

/** La geometría plana de la pantalla con sus UV de 0 a 1 (la de three las deja en unidades de la forma). */
function geometriaPantalla(w: number, h: number, r: number): THREE.ShapeGeometry {
  const g = new THREE.ShapeGeometry(rectRedondeado(w, h, r), 8);
  const pos = g.attributes.position as THREE.BufferAttribute;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    uv[i * 2] = pos.getX(i) / w + 0.5;
    uv[i * 2 + 1] = pos.getY(i) / h + 0.5;
  }
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  return g;
}

/** Las capturas ya cargadas (las precarga la composición al empezar; ver `usePrecargarCapturas`). */
const CAPTURAS = new Map<string, HTMLImageElement>();

/**
 * Precarga TODAS las capturas del video antes de dibujar el primer cuadro. Devuelve `true` cuando están listas; la
 * composición no monta nada hasta entonces, y suelta la espera DESPUÉS de montar (así el lienzo 3D ya registró la
 * suya y nunca se fotografía un teléfono en blanco).
 */
export function usePrecargarCapturas(srcs: string[]): boolean {
  const [espera] = useState(() => delayRender(`precarga de ${srcs.length} capturas`));
  const [listas, setListas] = useState(() => srcs.every((s) => CAPTURAS.get(s)?.complete));
  useEffect(() => {
    const faltan = srcs.filter((s) => !CAPTURAS.get(s)?.complete);
    let quedan = faltan.length;
    for (const s of faltan) {
      const im = CAPTURAS.get(s) ?? new Image();
      im.onload = () => {
        if (--quedan === 0) setListas(true);
      };
      im.onerror = () => cancelRender(new Error(`No se pudo cargar la captura ${s}`));
      if (!CAPTURAS.has(s)) {
        im.src = staticFile(s);
        CAPTURAS.set(s, im);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (listas) continueRender(espera);
  }, [listas, espera]);
  return listas;
}

/** Avisa a three que el lienzo cambió y hay que volver a subir la textura. */
function subirTextura(tx: THREE.CanvasTexture) {
  tx.needsUpdate = true;
}

type PropsPantalla = {
  t: number;
  capturas: CambioCaptura[];
  toques: Toque[];
  textura: THREE.CanvasTexture;
  lienzo: HTMLCanvasElement;
};
/** Pinta la pantalla del cuadro actual ANTES de que three dibuje (useLayoutEffect corre antes que el avance del cuadro). */
const PintarPantalla: React.FC<PropsPantalla> = ({ t, capturas, toques, textura, lienzo }) => {
  const frame = useCurrentFrame();
  useLayoutEffect(() => {
    const ctx = lienzo.getContext("2d");
    if (!ctx) return;
    const caps = [...capturas].sort((a, b) => a.t - b.t);
    let i = 0;
    for (let n = 0; n < caps.length; n++) if (t >= (caps[n] as CambioCaptura).t) i = n;
    const cur = caps[i] as CambioCaptura;
    const prev = i > 0 ? caps[i - 1] : undefined;
    const pc = prev ? sale(Math.min(1, Math.max(0, (t - cur.t) / 0.35))) : 1;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, CAPTURA_ANCHO, CAPTURA_ALTO);
    if (prev && pc < 1) {
      const ip = CAPTURAS.get(prev.src);
      if (ip) ctx.drawImage(ip, -pc * CAPTURA_ANCHO * 0.35, 0, CAPTURA_ANCHO, CAPTURA_ALTO);
      ctx.fillStyle = `rgba(0,0,0,${0.25 * pc})`;
      ctx.fillRect(0, 0, CAPTURA_ANCHO, CAPTURA_ALTO);
    }
    const ic = CAPTURAS.get(cur.src);
    if (ic) ctx.drawImage(ic, (1 - pc) * CAPTURA_ANCHO, 0, CAPTURA_ANCHO, CAPTURA_ALTO);
    for (const q of toques) {
      const d = t - q.t;
      if (d < 0 || d > 0.6) continue;
      const r = interpolate(d, [0, 0.5], [16, 120], clamp);
      ctx.strokeStyle = `rgba(255, 212, 0, ${interpolate(d, [0, 0.06, 0.5], [0, 0.95, 0], clamp)})`;
      ctx.lineWidth = 14;
      ctx.beginPath();
      ctx.arc(q.x, q.y, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    subirTextura(textura);
  }, [frame, t, capturas, toques, textura, lienzo]);
  return null;
};

/** El dedo de bloques (dos cajas de piel y una uña) que baja, toca y se va. */
const Dedo: React.FC<{ t: number; punta: [number, number, number]; escala: number }> = ({
  t,
  punta,
  escala,
}) => {
  if (t < -0.5 || t > 1.15) return null;
  const llega = interpolate(t, [-0.5, -0.05], [1, 0], { ...clamp, easing: sale });
  const aprieta = interpolate(t, [-0.05, 0.06, 0.22], [0, 1, 0], clamp);
  const se_va = interpolate(t, [0.75, 1.15], [0, 1], { ...clamp, easing: Easing.in(Easing.cubic) });
  const ida = llega + se_va;
  const L = 1.15 * escala;
  const G = 0.3 * escala;
  const x = punta[0] + ida * 1.6 * escala;
  const y = punta[1] - ida * 1.8 * escala;
  const z = punta[2] + 0.16 * escala - aprieta * 0.1 * escala + ida * 1.2 * escala;
  const piel = "#d99a6c";
  return (
    <group position={[x, y, z]} rotation={[-0.55, 0, 0.62]}>
      {/* la yema queda en el origen del grupo; el dedo sale hacia abajo a la derecha */}
      <mesh position={[0, -L / 2, 0]}>
        <boxGeometry args={[G, L, G]} />
        <meshStandardMaterial color={piel} roughness={0.7} flatShading />
      </mesh>
      <mesh position={[0, -L - 0.38 * escala, -0.02 * escala]}>
        <boxGeometry args={[G * 1.18, 0.8 * escala, G * 1.15]} />
        <meshStandardMaterial color="#c98a5d" roughness={0.75} flatShading />
      </mesh>
      <mesh position={[0, -0.13 * escala, G / 2 + 0.004]}>
        <boxGeometry args={[G * 0.7, 0.2 * escala, 0.02 * escala]} />
        <meshStandardMaterial color="#f3d3c0" roughness={0.4} />
      </mesh>
    </group>
  );
};

export type PropsTelefono3D = {
  t: number;
  /** Ancho del teléfono en píxeles del video. */
  ancho: number;
  capturas: CambioCaptura[];
  toques: Toque[];
  giro: number;
  /** Lo que crece el lienzo alrededor del teléfono, para que quepan el dedo y la sombra. */
  margen?: number;
};

/** El alto total del teléfono (con su borde) para un ancho dado. */
export const altoTelefono3D = (ancho: number) =>
  ((ancho - BISEL_3D * 2) * CAPTURA_ALTO) / CAPTURA_ANCHO + BISEL_3D * 2;

export const Telefono3D: React.FC<PropsTelefono3D> = ({
  t,
  ancho,
  capturas,
  toques,
  giro,
  margen = 1.55,
}) => {
  const alto = altoTelefono3D(ancho);
  const wC = Math.round(ancho * margen);
  const hC = Math.round(alto * 1.22);
  const lienzo = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = CAPTURA_ANCHO;
    c.height = CAPTURA_ALTO;
    return c;
  }, []);
  const textura = useMemo(() => {
    const tx = new THREE.CanvasTexture(lienzo);
    tx.colorSpace = THREE.SRGBColorSpace;
    tx.anisotropy = 8;
    tx.generateMipmaps = true;
    tx.minFilter = THREE.LinearMipmapLinearFilter;
    return tx;
  }, [lienzo]);
  const A = ancho / ESC;
  const H = alto / ESC;
  const P = A * 0.075; // grosor
  const sw = (ancho - BISEL_3D * 2) / ESC;
  const sh = (alto - BISEL_3D * 2) / ESC;
  const cuerpo = useMemo(() => {
    const g = new THREE.ExtrudeGeometry(rectRedondeado(A - 0.06, H - 0.06, A * 0.1), {
      depth: P,
      bevelEnabled: true,
      bevelThickness: 0.03,
      bevelSize: 0.03,
      bevelSegments: 3,
      curveSegments: 10,
    });
    g.translate(0, 0, -P / 2);
    return g;
  }, [A, H, P]);
  const pantalla = useMemo(() => geometriaPantalla(sw, sh, A * 0.065), [sw, sh, A]);
  // El teléfono se mece despacio para que nunca quede quieto.
  const ry = ((giro + Math.sin(t * 0.9) * 4) * Math.PI) / 180;
  const rx = ((4 + Math.cos(t * 0.7) * 2) * Math.PI) / 180;
  const fov = 22;
  const dist = hC / ESC / 2 / Math.tan((fov * Math.PI) / 360);
  const toqueActivo = toques.find((q) => t - q.t > -0.5 && t - q.t < 1.15);
  const punta: [number, number, number] | null = toqueActivo
    ? [(toqueActivo.x / CAPTURA_ANCHO - 0.5) * sw, (0.5 - toqueActivo.y / CAPTURA_ALTO) * sh, P / 2 + 0.04]
    : null;
  return (
    <ThreeCanvas
      width={wC}
      height={hC}
      gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }}
      camera={{ fov, position: [0, 0, dist], near: 0.1, far: 100 }}
      style={{ background: "transparent" }}
    >
      <ambientLight intensity={1.1} color="#fff1ea" />
      <directionalLight position={[-3, 4, 6]} intensity={2.2} color="#ffe4cf" />
      <directionalLight position={[4, -2, 3]} intensity={0.8} color="#c9b6ff" />
      <PintarPantalla t={t} capturas={capturas} toques={toques} textura={textura} lienzo={lienzo} />
      <group rotation={[rx, ry, 0]}>
        <mesh geometry={cuerpo}>
          <meshStandardMaterial color="#18181c" roughness={0.32} metalness={0.45} />
        </mesh>
        {/* botones del costado, en el rojo de la marca */}
        <mesh position={[A / 2 + 0.005, H * 0.22, 0]}>
          <boxGeometry args={[0.05, H * 0.1, P * 0.5]} />
          <meshStandardMaterial color="#F20D20" roughness={0.4} />
        </mesh>
        <mesh position={[A / 2 + 0.005, H * 0.08, 0]}>
          <boxGeometry args={[0.05, H * 0.06, P * 0.5]} />
          <meshStandardMaterial color="#F20D20" roughness={0.4} />
        </mesh>
        <mesh geometry={pantalla} position={[0, 0, P / 2 + 0.032]}>
          <meshBasicMaterial map={textura} toneMapped={false} />
        </mesh>
        {punta && toqueActivo ? <Dedo t={t - toqueActivo.t} punta={punta} escala={A / 4.2} /> : null}
      </group>
    </ThreeCanvas>
  );
};

/** El rótulo «¡TOCA AQUÍ!» que acompaña al dedo (en píxeles del video, junto al punto del toque). */
export const RotuloToque: React.FC<{ t: number; x: number; y: number; texto: string; fuente: string }> = ({
  t,
  x,
  y,
  texto,
  fuente,
}) => {
  if (t < -0.2 || t > 1.1) return null;
  const p = interpolate(t, [-0.2, 0.05, 0.15], [0, 1.1, 1], { ...clamp, easing: sale });
  const a = interpolate(t, [-0.2, -0.05, 0.85, 1.1], [0, 1, 1, 0], clamp);
  return (
    <div
      className="medir"
      style={{
        position: "absolute",
        left: x,
        top: y,
        transform: `translate(-50%, -100%) scale(${p}) rotate(-6deg)`,
        opacity: a,
        fontFamily: fuente,
        fontSize: 40,
        color: "#101010",
        background: "#FFD400",
        padding: "10px 18px 4px",
        borderRadius: 12,
        border: "4px solid #101010",
        boxShadow: Array.from({ length: 7 }, (_, k) => `${k + 1}px ${k + 1}px 0 #101010`).join(", "),
        whiteSpace: "nowrap",
      }}
    >
      {texto}
    </div>
  );
};
