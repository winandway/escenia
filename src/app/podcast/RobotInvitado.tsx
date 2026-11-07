"use client";

// El invitado del Podcast IA: la imagen de su avatar (compartido/podcast-avatares.ts) con la cara viva encima,
// dibujada DENTRO del visor en las coordenadas de esa imagen y con el color de sus luces. Parpadea en reposo,
// la boca se mueve con SU voz (la onda del robot clásico sigue las frecuencias; la sonrisa de la coleta se abre
// con el volumen), los aros de los oídos laten cuando habla y el cuerpo respira mientras escucha. Todo se
// mueve tocando atributos del SVG en cada cuadro (sin volver a pintar React 60 veces por segundo). Un avatar
// nuevo de visor entra con una entrada del catálogo, sin tocar este archivo.
import { useEffect, useId, useRef } from "react";
import {
  AVATAR_NUEVO,
  avatarPorId,
  cajaDelEncuadre,
  caminoCerrado,
  caminoDeCurva,
  caminoDeSonrisa,
  trazoAfinado,
  type AvatarPodcast,
  type OjoAvatar,
} from "@compartido/podcast-avatares";

export type EstadoInvitado = "reposo" | "conectando" | "escuchando" | "pensando" | "hablando";

/** De dónde sale el sonido del invitado: el volumen (0 a 1) y, si hay, las frecuencias de su voz. */
export type AudioInvitado = { volumen: () => number; frecuencias: () => Uint8Array | null };

const PUNTOS = 11;
const sonrisaDeOnda = "M-40 -4 Q0 16 40 -4";

/** La onda de la boca del robot clásico: una lente cuyo grosor en cada punto sigue una banda de la voz. */
export function caminoDeOnda(alturas: number[], ancho = 150): string {
  const n = alturas.length;
  if (n < 2) return sonrisaDeOnda;
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

/** Cuánto se abre la sonrisa (en partes de lo más que se abre) mientras escucha: como en la imagen. */
const APERTURA_EN_REPOSO = 0.85;
const APERTURA_CERRADA = 0.18;

/** Qué tan fuerte suena la voz donde vive (las bandas graves y medias), de 0 a 1. */
function nivelDeVoz(f: Uint8Array | null, volumen: number): number {
  if (!f || f.length < 12) return volumen;
  const hasta = Math.min(f.length, 40);
  let suma = 0;
  for (let i = 2; i < hasta; i++) suma += f[i] ?? 0;
  return Math.min(1, (suma / (hasta - 2) / 255) * 1.35);
}

function Ojo({ ojo, color, extra }: { ojo: OjoAvatar; color: string; extra: number }) {
  // Afinado: una figura cerrada (con borde para el resplandor). Parejo: un trazo de puntas redondas.
  if (ojo.puntas !== undefined)
    return (
      <path
        d={trazoAfinado(ojo.linea, ojo.grosor, ojo.puntas)}
        fill={color}
        stroke={extra > 0 ? color : "none"}
        strokeWidth={extra}
        strokeLinejoin="round"
      />
    );
  return (
    <path
      d={caminoDeCurva(ojo.linea)}
      fill="none"
      stroke={color}
      strokeWidth={ojo.grosor + extra}
      strokeLinecap="round"
    />
  );
}

export function RobotInvitado({
  estado,
  audio,
  avatar = avatarPorId(AVATAR_NUEVO),
  className,
}: {
  estado: EstadoInvitado;
  audio?: AudioInvitado | null;
  avatar?: AvatarPodcast;
  className?: string;
}) {
  const id = useId().replaceAll(":", "");
  const cuerpo = useRef<SVGGElement>(null);
  const boca = useRef<SVGPathElement>(null);
  const bocaBrillo = useRef<SVGPathElement>(null);
  const bocaRecorte = useRef<SVGPathElement>(null);
  const lengua = useRef<SVGEllipseElement>(null);
  const oidos = useRef<(SVGPathElement | null)[]>([]);
  const ojos = useRef<SVGGElement>(null);
  const cara = useRef<SVGGElement>(null);
  const estadoRef = useRef(estado);
  const audioRef = useRef(audio);
  const avatarRef = useRef(avatar);

  useEffect(() => {
    estadoRef.current = estado;
    audioRef.current = audio;
    avatarRef.current = avatar;
  }, [estado, audio, avatar]);

  // El cuadro a cuadro: respiración, la boca, el latido de los oídos.
  useEffect(() => {
    let vivo = true;
    let marco = 0;
    let volumenSuave = 0;
    let vozSuave = 0;
    let apertura = APERTURA_EN_REPOSO;
    const bandas = new Array<number>(PUNTOS).fill(0);
    const pintar = () => {
      if (!vivo) return;
      const t = performance.now() / 1000;
      const e = estadoRef.current;
      const fuente = audioRef.current;
      const a = avatarRef.current;
      const b = a.cara.boca;
      const crudo = e === "hablando" && fuente ? Math.min(1, Math.max(0, fuente.volumen() * 1.6)) : 0;
      // Sube rápido y baja despacio, como un vúmetro: la boca no tiembla.
      volumenSuave += (crudo - volumenSuave) * (crudo > volumenSuave ? 0.55 : 0.18);

      const respira = e === "hablando" ? 2 : 5;
      const dy = Math.sin(t * 1.5) * respira;
      const escala = 1 + Math.sin(t * 1.5) * 0.004;
      const giro = e === "hablando" ? Math.sin(t * 6.3) * 0.7 * volumenSuave : Math.sin(t * 0.7) * 0.25;
      const [px, py] = a.pivote;
      cuerpo.current?.setAttribute(
        "transform",
        `translate(${px} ${py}) rotate(${giro.toFixed(3)}) scale(${escala.toFixed(4)}) translate(${-px} ${-py + dy})`,
      );

      if (b.forma === "onda") {
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
            const meta = (8 + Math.min(1, nivel * 1.7) * b.alto * (0.6 + volumenSuave)) * envolvente;
            bandas[i] = bandas[i]! + (meta - bandas[i]!) * 0.5;
          }
          const d = caminoDeOnda(bandas, b.ancho);
          boca.current?.setAttribute("d", d);
          bocaBrillo.current?.setAttribute("d", d);
          boca.current?.setAttribute("fill", a.cara.nucleo);
        } else {
          for (let i = 0; i < PUNTOS; i++) bandas[i] = 0;
          boca.current?.setAttribute("d", sonrisaDeOnda);
          bocaBrillo.current?.setAttribute("d", sonrisaDeOnda);
          boca.current?.setAttribute("fill", "none");
        }
      } else {
        // La sonrisa: abierta y feliz mientras escucha (como en la imagen); hablando se abre y se cierra con
        // las sílabas de su voz.
        const voz = e === "hablando" && fuente ? nivelDeVoz(fuente.frecuencias(), crudo) : 0;
        vozSuave += (voz - vozSuave) * (voz > vozSuave ? 0.6 : 0.25);
        const meta =
          e === "hablando"
            ? APERTURA_CERRADA + (1.05 - APERTURA_CERRADA) * vozSuave
            : e === "pensando"
              ? APERTURA_CERRADA
              : APERTURA_EN_REPOSO;
        apertura += (meta - apertura) * 0.55;
        const ancho = b.ancho * (1 - 0.1 * Math.max(0, apertura - APERTURA_EN_REPOSO));
        const alto = b.alto * apertura;
        const d = caminoDeSonrisa(ancho, alto);
        boca.current?.setAttribute("d", d);
        bocaBrillo.current?.setAttribute("d", d);
        bocaRecorte.current?.setAttribute("d", d);
        if (lengua.current) {
          lengua.current.setAttribute("cy", (alto * 0.84).toFixed(1));
          lengua.current.setAttribute("rx", (ancho * 0.31).toFixed(1));
          lengua.current.setAttribute("ry", (alto * 0.46).toFixed(1));
          lengua.current.setAttribute("opacity", Math.min(1, Math.max(0, (alto - 12) / 12)).toFixed(2));
        }
      }

      const latido =
        e === "hablando" ? 0.25 + volumenSuave * 0.75 : e === "pensando" ? 0.3 + 0.2 * Math.sin(t * 5) : 0.12;
      a.cara.oidos.forEach((o, i) => {
        const el = oidos.current[i];
        el?.setAttribute("opacity", latido.toFixed(3));
        el?.setAttribute("stroke-width", (o.grosor * (1 + volumenSuave * 1.25)).toFixed(1));
      });
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

  const { cara: c } = avatar;
  const b = c.boca;
  const caja = cajaDelEncuadre(avatar);
  const pensando = estado === "pensando";
  const grosorPestana = c.grosorPestana ?? 6;
  const pestanas = (extra: number, color: string, marcar: boolean) =>
    c.ojos.map((o, i) =>
      (o.pestanas ?? []).map((p, j) => (
        <path
          key={`${i}-${j}`}
          d={caminoDeCurva(p)}
          fill="none"
          stroke={color}
          strokeWidth={grosorPestana + extra}
          strokeLinecap="round"
          data-pestana={marcar ? "" : undefined}
        />
      )),
    );
  const sonrisa = b.forma === "sonrisa";
  const bocaInicial = sonrisa ? caminoDeSonrisa(b.ancho, b.alto * APERTURA_EN_REPOSO) : sonrisaDeOnda;

  return (
    <svg
      viewBox={`${caja.x.toFixed(1)} ${caja.y.toFixed(1)} ${caja.ancho.toFixed(1)} ${caja.alto.toFixed(1)}`}
      className={className}
      role="img"
      aria-label={`El invitado (${estado})`}
      data-estado={estado}
      data-avatar={avatar.id}
    >
      <defs>
        <filter id={`${id}-halo`} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation={c.desenfoque} />
        </filter>
        {/* La boca usa su propio espacio: con la caja de un trazo casi plano, el resplandor salía cortado. */}
        <filter
          id={`${id}-halo-boca`}
          filterUnits="userSpaceOnUse"
          x={-b.ancho}
          y={-b.alto * 1.5}
          width={b.ancho * 2}
          height={b.alto * 4}
        >
          <feGaussianBlur stdDeviation={c.desenfoque} />
        </filter>
        <filter id={`${id}-borde`} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation={c.desenfoque * 0.75} />
        </filter>
        {c.tapas && (
          <filter id={`${id}-tapa`} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation={c.tapas.desenfoque} />
          </filter>
        )}
        {c.visor && (
          <clipPath id={`${id}-visor`}>
            <path d={caminoCerrado(c.visor)} />
          </clipPath>
        )}
        {sonrisa && (
          <clipPath id={`${id}-boca`}>
            <path ref={bocaRecorte} d={bocaInicial} />
          </clipPath>
        )}
      </defs>
      <style>{`
        .pod-parpadeo .pod-ojo { transform: scaleY(0.08); }
        .pod-ojo { transform-box: fill-box; transform-origin: 50% 70%; transition: transform 70ms ease-in-out; }
        .pod-mirada { transition: transform 450ms ease; }
        @keyframes pod-pensar { 0%, 100% { opacity: .25 } 50% { opacity: 1 } }
        .pod-punto { animation: pod-pensar 1.1s ease-in-out infinite; }
      `}</style>
      <g ref={cuerpo}>
        <image href={avatar.imagen} width={avatar.ancho} height={avatar.alto} />
        {/* Si la imagen trae la cara pintada, se apaga con el negro del visor y la cara la dibuja el estudio. */}
        {c.tapas && (
          <g fill={c.tapas.color} filter={`url(#${id}-tapa)`}>
            {c.tapas.elipses.map((t) => (
              <ellipse
                key={`${t.cx}-${t.cy}`}
                cx={t.cx}
                cy={t.cy}
                rx={t.rx}
                ry={t.ry}
                transform={`rotate(${t.giro} ${t.cx} ${t.cy})`}
              />
            ))}
          </g>
        )}
        <g ref={cara} clipPath={c.visor ? `url(#${id}-visor)` : undefined}>
          <g
            ref={ojos}
            className="pod-mirada"
            style={{
              transform: pensando ? `translate(${c.mirada[0]}px, ${c.mirada[1]}px)` : "translate(0px, 0px)",
            }}
          >
            {/* El resplandor de todo junto (ojos y pestañas), para que no se sume donde se tocan. */}
            <g filter={`url(#${id}-halo)`} opacity={c.opacidadHalo}>
              {c.ojos.map((o, i) => (
                <g key={i} className="pod-ojo">
                  <Ojo ojo={o} color={c.luz} extra={c.halo} />
                  {pestanas(c.halo, c.luz, false)[i]}
                </g>
              ))}
            </g>
            {c.ojos.map((o, i) => (
              <g key={i} className="pod-ojo">
                <Ojo ojo={o} color={c.nucleo} extra={0} />
                {pestanas(0, c.nucleo, true)[i]}
              </g>
            ))}
          </g>
          <g transform={`translate(${b.x} ${b.y}) rotate(${b.giro})`}>
            <path
              ref={bocaBrillo}
              d={bocaInicial}
              fill="none"
              stroke={c.luz}
              strokeWidth={b.grosor + b.halo}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={pensando ? 0 : sonrisa ? c.opacidadHalo : 0.7}
              filter={`url(#${id}-halo-boca)`}
            />
            {/* La lengua va encima del resplandor (si no, se ve azulada) y debajo del trazo. */}
            {sonrisa && (
              <g clipPath={`url(#${id}-boca)`} opacity={pensando ? 0 : 1}>
                <ellipse
                  ref={lengua}
                  cx={-b.ancho * 0.05}
                  cy={b.alto * APERTURA_EN_REPOSO * 0.84}
                  rx={b.ancho * 0.31}
                  ry={b.alto * APERTURA_EN_REPOSO * 0.46}
                  fill={b.lengua ?? "#ff8ab9"}
                />
              </g>
            )}
            <path
              ref={boca}
              d={bocaInicial}
              fill="none"
              stroke={c.nucleo}
              strokeWidth={b.grosor}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={pensando ? 0 : 1}
            />
            {pensando &&
              [-34, 0, 34].map((x, i) => (
                <circle
                  key={x}
                  cx={(x * b.ancho) / 150}
                  cy={sonrisa ? b.alto * 0.22 : 2}
                  r={Math.max(4, (9 * b.ancho) / 150)}
                  fill={c.nucleo}
                  className="pod-punto"
                  style={{ animationDelay: `${i * 0.18}s` }}
                />
              ))}
          </g>
        </g>
        {c.oidos.map((o, i) => (
          <path
            key={o.d}
            ref={(el) => {
              oidos.current[i] = el;
            }}
            d={o.d}
            fill="none"
            stroke={c.luz}
            strokeWidth={o.grosor}
            strokeLinecap="round"
            opacity="0.12"
            filter={`url(#${id}-borde)`}
            style={{ mixBlendMode: "screen" }}
          />
        ))}
      </g>
    </svg>
  );
}
