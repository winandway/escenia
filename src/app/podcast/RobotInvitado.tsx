"use client";

// El invitado del Podcast IA: el robot que mandó Richard (public/podcast/robot.webp) con la cara viva
// encima. Los ojos y la boca de luz se dibujan DENTRO del visor, en las mismas coordenadas de la imagen
// (1312 × 1199), con el mismo cian: parpadea en reposo, la boca es una onda que sigue el volumen de SU voz,
// los aros de los oídos laten cuando habla y el cuerpo respira mientras escucha. Todo se mueve tocando
// atributos del SVG en cada cuadro (sin volver a pintar React 60 veces por segundo).
import { useEffect, useId, useRef } from "react";

export type EstadoInvitado = "reposo" | "conectando" | "escuchando" | "pensando" | "hablando";

/** De dónde sale el sonido del invitado: el volumen (0 a 1) y, si hay, las frecuencias de su voz. */
export type AudioInvitado = { volumen: () => number; frecuencias: () => Uint8Array | null };

// Medidas tomadas de la imagen (docs/PODCAST.md): los dos arcos de los ojos, la boca debajo, el aro del oído.
const ANCHO = 1312;
const ALTO = 1199;
const OJO_IZQ = "M482 352 Q542.5 264 593 340";
const OJO_DER = "M695 300 Q773.5 197 838 282";
const BOCA = { x: 672, y: 398, giro: -12.3, ancho: 150, alto: 74 };
const OIDO = { cx: 1066, cy: 281, rx: 47, ry: 91 };
const CIAN = "#22d3ff";
const NUCLEO = "#eafeff";
const PUNTOS = 11;

const sonrisa = "M-40 -4 Q0 16 40 -4";

/** La onda de la boca: una lente cuyo grosor en cada punto sigue una banda de la voz. */
export function caminoDeOnda(alturas: number[], ancho = BOCA.ancho): string {
  const n = alturas.length;
  if (n < 2) return sonrisa;
  const x = (i: number) => -ancho / 2 + (ancho * i) / (n - 1);
  const arriba = alturas.map((h, i) => [x(i), -h / 2] as const);
  const abajo = alturas.map((h, i) => [x(i), h / 2] as const).reverse();
  const curva = (puntos: (readonly [number, number])[]) => {
    let d = "";
    for (let i = 1; i < puntos.length; i++) {
      const [x0, y0] = puntos[i - 1]!;
      const [x1, y1] = puntos[i]!;
      d += ` Q${x0.toFixed(1)} ${y0.toFixed(1)} ${((x0 + x1) / 2).toFixed(1)} ${((y0 + y1) / 2).toFixed(1)}`;
    }
    const [xf, yf] = puntos[puntos.length - 1]!;
    return `${d} L${xf.toFixed(1)} ${yf.toFixed(1)}`;
  };
  const [x0, y0] = arriba[0]!;
  return `M${x0.toFixed(1)} ${y0.toFixed(1)}${curva(arriba)}${curva(abajo)} Z`;
}

export function RobotInvitado({
  estado,
  audio,
  className,
}: {
  estado: EstadoInvitado;
  audio?: AudioInvitado | null;
  className?: string;
}) {
  const id = useId().replaceAll(":", "");
  const cuerpo = useRef<SVGGElement>(null);
  const boca = useRef<SVGPathElement>(null);
  const bocaBrillo = useRef<SVGPathElement>(null);
  const oido = useRef<SVGEllipseElement>(null);
  const ojos = useRef<SVGGElement>(null);
  const cara = useRef<SVGGElement>(null);
  const estadoRef = useRef(estado);
  const audioRef = useRef(audio);

  useEffect(() => {
    estadoRef.current = estado;
    audioRef.current = audio;
  }, [estado, audio]);

  // El cuadro a cuadro: respiración, onda de la boca, latido de los oídos.
  useEffect(() => {
    let vivo = true;
    let marco = 0;
    let volumenSuave = 0;
    const bandas = new Array<number>(PUNTOS).fill(0);
    const pintar = () => {
      if (!vivo) return;
      const t = performance.now() / 1000;
      const e = estadoRef.current;
      const fuente = audioRef.current;
      const crudo = e === "hablando" && fuente ? Math.min(1, Math.max(0, fuente.volumen() * 1.6)) : 0;
      // Sube rápido y baja despacio, como un vúmetro: la boca no tiembla.
      volumenSuave += (crudo - volumenSuave) * (crudo > volumenSuave ? 0.55 : 0.18);

      const respira = e === "hablando" ? 2 : 5;
      const dy = Math.sin(t * 1.5) * respira;
      const escala = 1 + Math.sin(t * 1.5) * 0.004;
      const giro = e === "hablando" ? Math.sin(t * 6.3) * 0.7 * volumenSuave : Math.sin(t * 0.7) * 0.25;
      cuerpo.current?.setAttribute(
        "transform",
        `translate(${ANCHO / 2} ${ALTO}) rotate(${giro.toFixed(3)}) scale(${escala.toFixed(4)}) translate(${-ANCHO / 2} ${-ALTO + dy})`,
      );

      if (e === "hablando") {
        const f = fuente?.frecuencias() ?? null;
        for (let i = 0; i < PUNTOS; i++) {
          const envolvente = Math.sin((Math.PI * i) / (PUNTOS - 1));
          let nivel: number;
          if (f && f.length > 8) {
            // Las bandas graves y medias, donde vive la voz.
            const desde = 2 + Math.floor((i * Math.min(f.length - 2, 48)) / PUNTOS);
            nivel = (f[desde] ?? 0) / 255;
          } else {
            nivel = volumenSuave * (0.6 + 0.4 * Math.sin(t * 17 + i * 1.3));
          }
          const meta = (8 + Math.min(1, nivel * 1.7) * BOCA.alto * (0.6 + volumenSuave)) * envolvente;
          bandas[i] = bandas[i]! + (meta - bandas[i]!) * 0.5;
        }
        const d = caminoDeOnda(bandas);
        boca.current?.setAttribute("d", d);
        bocaBrillo.current?.setAttribute("d", d);
        boca.current?.setAttribute("fill", NUCLEO);
      } else {
        for (let i = 0; i < PUNTOS; i++) bandas[i] = 0;
        boca.current?.setAttribute("d", sonrisa);
        bocaBrillo.current?.setAttribute("d", sonrisa);
        boca.current?.setAttribute("fill", "none");
      }

      const latido =
        e === "hablando" ? 0.25 + volumenSuave * 0.75 : e === "pensando" ? 0.3 + 0.2 * Math.sin(t * 5) : 0.12;
      oido.current?.setAttribute("opacity", latido.toFixed(3));
      oido.current?.setAttribute("stroke-width", (8 + volumenSuave * 10).toFixed(1));
      cara.current?.setAttribute(
        "opacity",
        e === "conectando" ? (0.55 + 0.4 * Math.sin(t * 4)).toFixed(3) : "1",
      );
      marco = requestAnimationFrame(pintar);
    };
    marco = requestAnimationFrame(pintar);
    return () => {
      vivo = false;
      cancelAnimationFrame(marco);
    };
  }, []);

  // El parpadeo: cada 2,5 a 6 segundos, 150 milisegundos con los ojos cerrados.
  useEffect(() => {
    let reloj: ReturnType<typeof setTimeout>;
    const siguiente = () => {
      reloj = setTimeout(
        () => {
          ojos.current?.classList.add("pod-parpadeo");
          setTimeout(() => ojos.current?.classList.remove("pod-parpadeo"), 150);
          siguiente();
        },
        2500 + Math.random() * 3500,
      );
    };
    siguiente();
    return () => clearTimeout(reloj);
  }, []);

  const pensando = estado === "pensando";
  return (
    <svg
      viewBox={`0 0 ${ANCHO} ${ALTO}`}
      className={className}
      role="img"
      aria-label={`El invitado (${estado})`}
      data-estado={estado}
    >
      <defs>
        <filter id={`${id}-halo`} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="12" />
        </filter>
        <filter id={`${id}-borde`} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="9" />
        </filter>
        <filter id={`${id}-tapa`} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="13" />
        </filter>
      </defs>
      <style>{`
        .pod-parpadeo .pod-ojo { transform: scaleY(0.08); }
        .pod-ojo { transform-box: fill-box; transform-origin: 50% 70%; transition: transform 70ms ease-in-out; }
        .pod-mirada { transition: transform 450ms ease; }
        @keyframes pod-pensar { 0%, 100% { opacity: .25 } 50% { opacity: 1 } }
        .pod-punto { animation: pod-pensar 1.1s ease-in-out infinite; }
      `}</style>
      <g ref={cuerpo}>
        <image href="/podcast/robot.webp" width={ANCHO} height={ALTO} />
        {/* Se apagan los ojos pintados de la imagen: el visor queda negro y la cara la dibuja el estudio. */}
        <g fill="#020c15" filter={`url(#${id}-tapa)`}>
          <ellipse cx="538" cy="328" rx="82" ry="60" transform="rotate(-6 538 328)" />
          <ellipse cx="767" cy="272" rx="92" ry="64" transform="rotate(-14 767 272)" />
        </g>
        <g ref={cara}>
          <g
            ref={ojos}
            className="pod-mirada"
            style={{ transform: pensando ? "translate(14px, -16px)" : "translate(0px, 0px)" }}
          >
            {[OJO_IZQ, OJO_DER].map((d) => (
              <g key={d} className="pod-ojo">
                <path
                  d={d}
                  fill="none"
                  stroke={CIAN}
                  strokeWidth="46"
                  strokeLinecap="round"
                  opacity="0.75"
                  filter={`url(#${id}-halo)`}
                />
                <path d={d} fill="none" stroke={NUCLEO} strokeWidth="23" strokeLinecap="round" />
              </g>
            ))}
          </g>
          <g transform={`translate(${BOCA.x} ${BOCA.y}) rotate(${BOCA.giro})`}>
            <path
              ref={bocaBrillo}
              d={sonrisa}
              fill="none"
              stroke={CIAN}
              strokeWidth="26"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.7"
              filter={`url(#${id}-halo)`}
            />
            <path
              ref={boca}
              d={sonrisa}
              fill="none"
              stroke={NUCLEO}
              strokeWidth="11"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={pensando ? 0 : 1}
            />
            {pensando &&
              [-34, 0, 34].map((x, i) => (
                <circle
                  key={x}
                  cx={x}
                  cy="2"
                  r="9"
                  fill={NUCLEO}
                  className="pod-punto"
                  style={{ animationDelay: `${i * 0.18}s` }}
                />
              ))}
          </g>
        </g>
        <ellipse
          ref={oido}
          cx={OIDO.cx}
          cy={OIDO.cy}
          rx={OIDO.rx}
          ry={OIDO.ry}
          transform={`rotate(-6 ${OIDO.cx} ${OIDO.cy})`}
          fill="none"
          stroke={CIAN}
          strokeWidth="8"
          opacity="0.12"
          filter={`url(#${id}-borde)`}
          style={{ mixBlendMode: "screen" }}
        />
      </g>
    </svg>
  );
}
