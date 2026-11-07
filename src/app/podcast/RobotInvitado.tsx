"use client";

// El invitado del Podcast IA: la imagen de su avatar (compartido/podcast-avatares.ts) viva en el panel.
// - Una robot (modo «visor»): la cara viva encima, dentro del visor y en las coordenadas de esa imagen. Los ojos
//   parpadean (dibujados con su geometría o recortados de la propia imagen, como los de Mia), la boca se mueve
//   con SU voz (la onda del robot clásico sigue las frecuencias; la sonrisa y la media luna se abren con el
//   volumen) y las luces de los oídos laten cuando habla.
// - Una persona (modo «sin_visor»): sin boca dibujada (se vería falso). Las luces de sus audífonos laten con la
//   voz y un resplandor de su color la acompaña cuando habla.
// - Un avatar con poses (Mia): cada pose es su imagen con su cara; el motor de poses (podcast-poses.ts) elige
//   cuál se ve, con calma (C-PODCAST-4). El cambio (podcast-cabeza.ts, C-PODCAST-6) es un impulso, el cruce
//   rápido de las dos imágenes en el momento de más movimiento y un asentamiento; las dos cabezas se juntan
//   durante el cambio, así la cara viaja de una pose a la otra sin doble imagen. Hablando, espera una pausa de
//   la voz (como mucho medio segundo).
// - Un avatar con la cabeza como capa propia (Mia, C-PODCAST-6): cada pose es su cuerpo (sin la cabeza) y su
//   cabeza encima, con la cara viva adentro. La cabeza se mueve sola: asiente con SU voz, se inclina hacia
//   Richard al escuchar, mira a la cámara, a Richard o a un lado (los ojos primero, la cabeza después) y nunca
//   se queda congelada.
// - Un avatar con escenario (Mia): su micrófono de podcast delante, entrando desde el borde izquierdo, con un
//   vaivén casi nulo (su casa va detrás, en el panel: Escenario.tsx).
// Todos respiran (un ciclo de 4,5 s) y se mecen muy poco; riéndose tiembla un poco y aplaudiendo da saltitos.
// Todo se mueve tocando
// atributos del SVG en cada cuadro (sin volver a pintar React 60 veces por segundo). Un avatar nuevo entra con
// una entrada del catálogo, sin tocar este archivo.
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import {
  AVATAR_NUEVO,
  avatarPorId,
  cajaDelEncuadre,
  caminoCerrado,
  caminoDeCurva,
  caminoDeMediaLuna,
  caminoDeSonrisa,
  esRecorte,
  altoDelMicrofono,
  pivoteDelMicrofono,
  posesDe,
  VAIVEN_MICROFONO,
  trazoAfinado,
  type AvatarPodcast,
  type BocaAvatar,
  type CabezaDePose,
  type CaraConVisor,
  type CaraSinVisor,
  type Ojo,
  type OidoAvatar,
  type TrazoAfinado,
} from "@compartido/podcast-avatares";
import {
  CAMBIO_MS,
  cabezaInicial,
  cambioDePose,
  componer,
  matrizSvg,
  movimientoDeCabeza,
  pasoDeCabeza,
  puedeCambiar,
  transformarCabeza,
} from "@compartido/podcast-cabeza";
import {
  SIN_ENTRADAS,
  memoriaInicial,
  piensa,
  siguientePose,
  type EntradasDelMotor,
  type EstadoDelInvitado,
  type PoseId,
} from "@compartido/podcast-poses";

export type EstadoInvitado = EstadoDelInvitado;

/**
 * De dónde sale el sonido del invitado: el volumen (0 a 1), las frecuencias de su voz si hay, y lo que lee el
 * motor de poses (los gestos que pide la IA y el texto de cada respuesta).
 */
export type AudioInvitado = {
  volumen: () => number;
  frecuencias: () => Uint8Array | null;
  entradas?: () => EntradasDelMotor;
};

/** Un ciclo de respiración (segundos). */
export const RESPIRACION_S = 4.5;

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
/** La media luna llena se aclara al abrirse: abierta del todo, su relleno queda en esta luz (el borde, entero). */
const RELLENO_ABIERTA = 0.45;

/** La boca que se abre con el volumen (la sonrisa y la media luna), en su abertura `alto`. */
const caminoDeBoca = (b: BocaAvatar, ancho: number, alto: number) =>
  b.forma === "media_luna" ? caminoDeMediaLuna(ancho, alto, b.curva) : caminoDeSonrisa(ancho, alto, b.curva);

/** Qué tan fuerte suena la voz donde vive (las bandas graves y medias), de 0 a 1. */
function nivelDeVoz(f: Uint8Array | null, volumen: number): number {
  if (!f || f.length < 12) return volumen;
  const hasta = Math.min(f.length, 40);
  let suma = 0;
  for (let i = 2; i < hasta; i++) suma += f[i] ?? 0;
  return Math.min(1, (suma / (hasta - 2) / 255) * 1.35);
}

/** Un trazo afinado: una figura cerrada (con borde para el resplandor). */
function Afinado({ t, color, extra }: { t: TrazoAfinado; color: string; extra: number }) {
  return (
    <path
      d={trazoAfinado(t.linea, t.grosor, t.puntas, t.puntaFinal ?? t.puntas, t.vientre)}
      fill={color}
      stroke={extra > 0 ? color : "none"}
      strokeWidth={extra}
      strokeLinejoin="round"
    />
  );
}

/** Un ojo dibujado (afinado o parejo, con su ceja) o recortado de la imagen (ya trae su resplandor). */
function OjoVivo({ ojo, color, extra }: { ojo: Ojo; color: string; extra: number }) {
  if (esRecorte(ojo))
    return extra > 0 ? null : (
      <image href={ojo.recorte} x={ojo.x} y={ojo.y} width={ojo.ancho} height={ojo.alto} data-recorte="" />
    );
  const { puntas } = ojo;
  return (
    <>
      {puntas !== undefined ? (
        <Afinado t={{ ...ojo, puntas }} color={color} extra={extra} />
      ) : (
        <path
          d={caminoDeCurva(ojo.linea)}
          fill="none"
          stroke={color}
          strokeWidth={ojo.grosor + extra}
          strokeLinecap="round"
        />
      )}
      {ojo.ceja && <Afinado t={ojo.ceja} color={color} extra={extra} />}
    </>
  );
}

/** Las luces que laten con la voz: un trazo difuminado o un recorte de la imagen, encima, en modo pantalla. */
function Luces({ oidos, luz, filtro }: { oidos: readonly OidoAvatar[]; luz: string; filtro: string }) {
  return oidos.map((o, i) =>
    esRecorte(o) ? (
      <image
        key={i}
        href={o.recorte}
        x={o.x}
        y={o.y}
        width={o.ancho}
        height={o.alto}
        opacity="0.12"
        filter={`url(#${filtro})`}
        style={{ mixBlendMode: "screen" }}
        data-luz=""
      />
    ) : (
      <path
        key={i}
        d={o.d}
        fill="none"
        stroke={luz}
        strokeWidth={o.grosor}
        strokeLinecap="round"
        opacity="0.12"
        filter={`url(#${filtro})`}
        style={{ mixBlendMode: "screen" }}
        data-luz=""
        data-grosor={o.grosor}
      />
    ),
  );
}

/** La cara viva de una robot en una pose: los ojos, la boca y las luces, dentro de su visor. */
function CaraViva({ c, id, pensando }: { c: CaraConVisor; id: string; pensando: boolean }) {
  const b = c.boca;
  const grosorPestana = c.grosorPestana ?? 6;
  const pestanas = (o: Ojo, extra: number, color: string, marcar: boolean) =>
    esRecorte(o)
      ? null
      : (o.pestanas ?? []).map((p, j) => (
          <path
            key={j}
            d={caminoDeCurva(p)}
            fill="none"
            stroke={color}
            strokeWidth={grosorPestana + extra}
            strokeLinecap="round"
            data-pestana={marcar ? "" : undefined}
          />
        ));
  const sonrisa = b.forma !== "onda";
  const llena = b.llena === true;
  const bocaInicial = sonrisa
    ? caminoDeBoca(b, b.ancho, b.alto * (b.reposo ?? APERTURA_EN_REPOSO))
    : sonrisaDeOnda;
  const dibujados = c.ojos.some((o) => !esRecorte(o));

  return (
    <>
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
            <path d={bocaInicial} data-parte="recorte" />
          </clipPath>
        )}
      </defs>
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
      <g clipPath={c.visor ? `url(#${id}-visor)` : undefined} data-parte="cara">
        {/* Los rasgos (ojos y boca) se corren juntos dentro del visor: es la mirada (C-PODCAST-6). */}
        <g data-parte="rasgos">
          <g
            className="pod-mirada"
            data-ojos=""
            style={{
              transform: pensando ? `translate(${c.mirada[0]}px, ${c.mirada[1]}px)` : "translate(0px, 0px)",
            }}
          >
            {/* El resplandor de todo junto (ojos y pestañas), para que no se sume donde se tocan. */}
            {dibujados && (
              <g filter={`url(#${id}-halo)`} opacity={c.opacidadHalo}>
                {c.ojos.map((o, i) => (
                  <g key={i} className="pod-ojo">
                    <OjoVivo ojo={o} color={c.luz} extra={c.halo} />
                    {pestanas(o, c.haloPestana ?? c.halo, c.luz, false)}
                  </g>
                ))}
              </g>
            )}
            {c.ojos.map((o, i) => (
              <g key={i} className="pod-ojo">
                <OjoVivo ojo={o} color={c.nucleo} extra={0} />
                {pestanas(o, 0, c.nucleo, true)}
              </g>
            ))}
          </g>
          {!b.tapada && (
            <g transform={`translate(${b.x} ${b.y}) rotate(${b.giro})`}>
              <path
                d={bocaInicial}
                fill={llena ? c.luz : "none"}
                stroke={c.luz}
                strokeWidth={b.grosor + b.halo}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={pensando ? 0 : sonrisa ? c.opacidadHalo : 0.7}
                filter={`url(#${id}-halo-boca)`}
                data-parte="brillo"
              />
              {/* La lengua va encima del resplandor (si no, se ve azulada) y debajo del trazo. */}
              {sonrisa && b.lengua && (
                <g clipPath={`url(#${id}-boca)`} opacity={pensando ? 0 : 1}>
                  <ellipse
                    cx={-b.ancho * 0.05}
                    cy={b.alto * APERTURA_EN_REPOSO * 0.84}
                    rx={b.ancho * 0.31}
                    ry={b.alto * APERTURA_EN_REPOSO * 0.46}
                    fill={b.lengua}
                    data-parte="lengua"
                  />
                </g>
              )}
              <path
                d={bocaInicial}
                fill={llena ? c.nucleo : "none"}
                stroke={c.nucleo}
                strokeWidth={b.grosor}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={pensando ? 0 : 1}
                data-boca={b.forma}
                data-parte="boca"
              />
              {pensando &&
                [-34, 0, 34].map((x, i) => (
                  <circle
                    key={x}
                    cx={(x * b.ancho) / 150}
                    cy={sonrisa ? b.alto * 0.22 : 2}
                    r={Math.max(2, (9 * b.ancho) / 150)}
                    fill={c.nucleo}
                    className="pod-punto"
                    style={{ animationDelay: `${i * 0.18}s` }}
                  />
                ))}
            </g>
          )}
        </g>
      </g>
      <Luces oidos={c.oidos} luz={c.luz} filtro={`${id}-borde`} />
    </>
  );
}

/** Una persona en una pose: el resplandor detrás de la imagen y las luces de sus audífonos encima. */
function PersonaViva({ c, id, imagen }: { c: CaraSinVisor; id: string; imagen: ReactNode }) {
  const r = c.resplandor;
  return (
    <>
      <defs>
        <filter id={`${id}-borde`} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation={c.desenfoque * 0.75} />
        </filter>
        <radialGradient id={`${id}-resplandor`}>
          <stop offset="0" stopColor={c.luz} stopOpacity="0.55" />
          <stop offset="0.55" stopColor={c.luz} stopOpacity="0.18" />
          <stop offset="1" stopColor={c.luz} stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* Detrás de la imagen: la acompaña cuando habla. Sin boca dibujada: se vería falso. */}
      <ellipse
        cx={r.cx}
        cy={r.cy}
        rx={r.rx}
        ry={r.ry}
        transform={`rotate(${r.giro} ${r.cx} ${r.cy})`}
        fill={`url(#${id}-resplandor)`}
        opacity="0"
        data-resplandor=""
      />
      {imagen}
      <Luces oidos={c.oidos} luz={c.luz} filtro={`${id}-borde`} />
    </>
  );
}

/** Lo que el cuadro a cuadro toca de cada pose (se busca una vez por avatar). */
type Partes = {
  pose: PoseId;
  grupo: SVGGElement;
  /** La cabeza como capa propia (Mia): su grupo, sus rasgos y su geometría. */
  cabeza: { grupo: SVGGElement; rasgos: SVGGElement | null; datos: CabezaDePose } | null;
  boca: BocaAvatar | null;
  trazo: SVGPathElement | null;
  brillo: SVGPathElement | null;
  recorte: SVGPathElement | null;
  lengua: SVGEllipseElement | null;
  cara: SVGGElement | null;
  resplandor: SVGEllipseElement | null;
  luces: SVGElement[];
};

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
  const svg = useRef<SVGSVGElement>(null);
  const cuerpo = useRef<SVGGElement>(null);
  const microfono = useRef<SVGGElement>(null);
  // La cara mira hacia arriba con los tres puntos solo si tarda más de 1,2 s (lo decide el motor de poses).
  const [piensaLaCara, setPiensa] = useState(false);
  const estadoRef = useRef(estado);
  const audioRef = useRef(audio);
  const avatarRef = useRef(avatar);

  useEffect(() => {
    estadoRef.current = estado;
    audioRef.current = audio;
    avatarRef.current = avatar;
  }, [estado, audio, avatar]);

  // El cuadro a cuadro: la pose, la respiración, la boca, el latido de las luces.
  useEffect(() => {
    let vivo = true;
    let marco = 0;
    let volumenSuave = 0;
    let vozSuave = 0;
    let brillo = 0;
    let apertura = APERTURA_EN_REPOSO;
    let memoria = memoriaInicial(performance.now());
    let caraPiensa = false;
    let visible: PoseId = "tranquila";
    let anterior: PoseId | null = null;
    let cambioDesde = Number.NEGATIVE_INFINITY;
    // Desde cuándo el motor pide otra pose (hablando, el cambio espera una pausa de la voz).
    let pideDesde: number | null = null;
    // La cabeza viva: cada vez con otra semilla, para que dos conversaciones no se muevan igual.
    let cabeza = cabezaInicial(1 + Math.floor(Math.random() * 1e6), performance.now());
    let guardado: { avatar: string; partes: Partes[]; tiene: Set<PoseId> } | null = null;
    const bandas = new Array<number>(PUNTOS).fill(0);

    const buscar = (a: AvatarPodcast) => {
      const raiz = svg.current;
      if (!raiz) return null;
      const partes: Partes[] = [];
      for (const p of posesDe(a)) {
        const grupo = raiz.querySelector<SVGGElement>(`[data-pose="${p.id}"]`);
        if (!grupo) return null;
        const de = <T extends Element>(s: string) => grupo.querySelector<T>(s);
        const cabeza = de<SVGGElement>("[data-cabeza]");
        partes.push({
          pose: p.id,
          grupo,
          cabeza:
            cabeza && p.cabeza
              ? { grupo: cabeza, rasgos: cabeza.querySelector('[data-parte="rasgos"]'), datos: p.cabeza }
              : null,
          boca: p.cara.modo === "visor" && !p.cara.boca.tapada ? p.cara.boca : null,
          trazo: de('[data-parte="boca"]'),
          brillo: de('[data-parte="brillo"]'),
          recorte: de('[data-parte="recorte"]'),
          lengua: de('[data-parte="lengua"]'),
          cara: de('[data-parte="cara"]'),
          resplandor: de("[data-resplandor]"),
          luces: [...grupo.querySelectorAll<SVGElement>("[data-luz]")],
        });
      }
      return { avatar: a.id, partes, tiene: new Set(partes.map((p) => p.pose)) };
    };

    const pintar = () => {
      if (!vivo) return;
      const ahora = performance.now();
      const t = ahora / 1000;
      const e = estadoRef.current;
      const fuente = audioRef.current;
      const a = avatarRef.current;
      if (!guardado || guardado.avatar !== a.id) {
        guardado = buscar(a);
        visible = "tranquila";
        anterior = null;
        pideDesde = null;
        memoria = memoriaInicial(ahora);
      }
      if (!guardado) {
        marco = requestAnimationFrame(pintar);
        return;
      }

      // La pose: el motor decide (con calma); el cambio pone la que llega encima de la que se va.
      memoria = siguientePose(memoria, e, ahora, fuente?.entradas?.() ?? SIN_ENTRADAS, guardado.tiene);
      // La cara piensa con la misma regla que la pose: solo si tarda más de 1,2 s, y en un avatar con la pose de
      // pensar, solo cuando esa pose ya se ve (si la de antes todavía cumple sus 6 s, la cara la espera).
      const pensandoAhora =
        piensa(memoria, ahora) && (memoria.pose === "pensando" || !guardado.tiene.has("pensando"));
      if (pensandoAhora !== caraPiensa) {
        caraPiensa = pensandoAhora;
        setPiensa(pensandoAhora);
      }
      const crudo = e === "hablando" && fuente ? Math.min(1, Math.max(0, fuente.volumen() * 1.6)) : 0;
      // El cambio de pose: cuando el motor pide otra, y el cambio anterior ya terminó. Hablando, espera una pausa
      // de la voz (entre palabras), como mucho medio segundo.
      let avance = Math.min(1, Math.max(0, (ahora - cambioDesde) / CAMBIO_MS));
      if (memoria.pose !== visible && avance >= 1) {
        pideDesde ??= ahora;
        if (puedeCambiar(e, crudo, ahora - pideDesde)) {
          anterior = visible;
          visible = memoria.pose;
          cambioDesde = ahora;
          avance = 0;
          pideDesde = null;
          const llega = guardado.partes.find((p) => p.pose === visible)?.grupo;
          llega?.parentNode?.appendChild(llega);
          svg.current?.setAttribute("data-pose", visible);
        }
      } else if (memoria.pose === visible) pideDesde = null;
      const cambio = cambioDePose(avance);
      if (avance >= 1) anterior = null;
      const opacidad = (p: Partes) =>
        p.pose === visible ? (anterior ? cambio.llega : 1) : p.pose === anterior ? cambio.seVa : 0;

      // La cabeza viva (C-PODCAST-6): asiente con SU voz, se inclina, mira; nunca congelada.
      cabeza = pasoDeCabeza(cabeza, { estado: e, ahora, volumen: crudo });
      const mueve = cabeza.salida;
      const ejeSeVa = guardado.partes.find((p) => p.pose === anterior)?.cabeza?.datos.eje;
      const ejeLlega = guardado.partes.find((p) => p.pose === visible)?.cabeza?.datos.eje;

      // Sube rápido y baja despacio, como un vúmetro: la boca no tiembla.
      volumenSuave += (crudo - volumenSuave) * (crudo > volumenSuave ? 0.55 : 0.18);

      // La respiración: lenta (un ciclo de 4,5 s). El vaivén: muy leve, y apenas más cuando habla fuerte.
      const aire = Math.sin((t * 2 * Math.PI) / RESPIRACION_S);
      const respira = e === "hablando" ? 2.5 : 4;
      // El cambio de pose mueve el cuerpo (un impulso y un asentamiento), y el cuerpo toma aire al hablar.
      let dy = aire * respira + cambio.dy + mueve.cuerpoDy;
      const escala = (1 + aire * 0.004) * cambio.escala;
      let giro =
        Math.sin(t * 0.6) * 0.2 +
        (e === "hablando" ? Math.sin(t * 2.1) * 0.3 * volumenSuave : 0) +
        cambio.giro +
        mueve.cuerpoGiro;
      // Riéndose tiembla un poco; aplaudiendo da saltitos (solo mientras dura el gesto).
      if (visible === "riendo") {
        dy += Math.sin(t * 24) * 2.2;
        giro += Math.sin(t * 13) * 0.3;
      } else if (visible === "aplaudiendo") dy -= Math.abs(Math.sin(t * 7)) * 3.5;
      const [px, py] = a.pivote;
      cuerpo.current?.setAttribute(
        "transform",
        `translate(${px} ${py}) rotate(${giro.toFixed(3)}) scale(${escala.toFixed(4)}) translate(${-px} ${-py + dy})`,
      );
      // El micrófono: quieto en su brazo, con un vaivén casi nulo alrededor de donde entra.
      const mic = a.escenario?.microfono;
      if (mic && microfono.current) {
        const [mx, my] = pivoteDelMicrofono(mic);
        const vaiven = Math.sin(t * 0.8) * VAIVEN_MICROFONO;
        microfono.current.setAttribute("transform", `rotate(${(mic.giro + vaiven).toFixed(3)} ${mx} ${my})`);
      }

      // La abertura de la boca (la misma para todas las poses; cada una con su tamaño).
      const voz = e === "hablando" && fuente ? nivelDeVoz(fuente.frecuencias(), crudo) : 0;
      vozSuave += (voz - vozSuave) * (voz > vozSuave ? 0.6 : 0.25);
      const ondaViva = e === "hablando" ? (fuente?.frecuencias() ?? null) : null;

      // Una persona: el resplandor de su color aparece cuando habla y sigue el volumen de su voz.
      const metaBrillo = e === "hablando" ? 0.18 + 0.62 * volumenSuave : e === "pensando" ? 0.08 : 0;
      brillo += (metaBrillo - brillo) * (metaBrillo > brillo ? 0.3 : 0.08);
      const latido =
        e === "hablando" ? 0.25 + volumenSuave * 0.75 : e === "pensando" ? 0.3 + 0.2 * Math.sin(t * 5) : 0.12;
      const nucleo = a.cara.modo === "visor" ? a.cara.nucleo : a.cara.luz;

      let primera = true;
      for (const p of guardado.partes) {
        const op = opacidad(p);
        p.grupo.setAttribute("opacity", op.toFixed(3));
        p.grupo.style.visibility = op > 0 ? "visible" : "hidden";
        if (op <= 0) continue;
        if (p.cabeza) {
          // La cabeza: su movimiento vivo alrededor del cuello y, durante un cambio, la cabeza «de paso» donde
          // se juntan la que se va y la que llega.
          const propia = p.cabeza.datos;
          const mover = movimientoDeCabeza(mueve, propia.cuello);
          const junta =
            anterior && ejeSeVa && ejeLlega
              ? componer(transformarCabeza(propia.eje, ejeSeVa, ejeLlega, cambio.mezcla), mover)
              : mover;
          p.cabeza.grupo.setAttribute("transform", matrizSvg(junta));
          // La mirada: los rasgos se corren dentro del visor y se juntan apenas, como una cara que gira.
          const [vx, vy] = propia.eje.centro;
          const giraLaCara = 1 - 0.0016 * Math.abs(mueve.rasgosX);
          p.cabeza.rasgos?.setAttribute(
            "transform",
            `translate(${(vx + mueve.rasgosX).toFixed(2)} ${(vy + mueve.rasgosY).toFixed(2)}) scale(${giraLaCara.toFixed(4)} 1) translate(${-vx} ${-vy})`,
          );
        }
        p.resplandor?.setAttribute("opacity", brillo.toFixed(3));
        for (const l of p.luces) {
          l.setAttribute("opacity", latido.toFixed(3));
          const g = Number(l.dataset.grosor);
          if (g) l.setAttribute("stroke-width", (g * (1 + volumenSuave * 1.25)).toFixed(1));
        }
        p.cara?.setAttribute("opacity", e === "conectando" ? (0.55 + 0.4 * Math.sin(t * 4)).toFixed(3) : "1");
        const b = p.boca;
        if (!b) continue;
        if (b.forma === "onda") {
          if (e === "hablando") {
            if (primera)
              for (let i = 0; i < PUNTOS; i++) {
                const envolvente = Math.sin((Math.PI * i) / (PUNTOS - 1));
                let nivel: number;
                if (ondaViva && ondaViva.length > 8) {
                  // Las bandas graves y medias, donde vive la voz.
                  const desde = 2 + Math.floor((i * Math.min(ondaViva.length - 2, 48)) / PUNTOS);
                  nivel = (ondaViva[desde] ?? 0) / 255;
                } else {
                  nivel = volumenSuave * (0.6 + 0.4 * Math.sin(t * 17 + i * 1.3));
                }
                const meta = (8 + Math.min(1, nivel * 1.7) * b.alto * (0.6 + volumenSuave)) * envolvente;
                bandas[i] = bandas[i]! + (meta - bandas[i]!) * 0.5;
              }
            const d = caminoDeOnda(bandas, b.ancho);
            p.trazo?.setAttribute("d", d);
            p.brillo?.setAttribute("d", d);
            p.trazo?.setAttribute("fill", nucleo);
          } else {
            if (primera) for (let i = 0; i < PUNTOS; i++) bandas[i] = 0;
            p.trazo?.setAttribute("d", sonrisaDeOnda);
            p.brillo?.setAttribute("d", sonrisaDeOnda);
            p.trazo?.setAttribute("fill", "none");
          }
        } else {
          // La sonrisa y la media luna: abiertas y felices mientras escucha (como en la imagen); hablando se
          // abren y se cierran con las sílabas de su voz.
          const reposo = b.reposo ?? APERTURA_EN_REPOSO;
          if (primera) {
            const meta =
              e === "hablando"
                ? APERTURA_CERRADA + (1.05 - APERTURA_CERRADA) * vozSuave
                : e === "pensando"
                  ? APERTURA_CERRADA
                  : reposo;
            apertura += (meta - apertura) * 0.55;
          }
          const ancho = b.ancho * (1 - 0.1 * Math.max(0, apertura - reposo));
          const alto = b.alto * apertura;
          const d = caminoDeBoca(b, ancho, alto);
          p.trazo?.setAttribute("d", d);
          p.brillo?.setAttribute("d", d);
          p.recorte?.setAttribute("d", d);
          if (b.llena) {
            // Llena mientras escucha; al abrirse para hablar, el relleno se aclara y el borde sigue encendido.
            const abierta = Math.min(1, Math.max(0, (apertura - reposo) / (1.05 - reposo)));
            const relleno = (1 - (1 - RELLENO_ABIERTA) * abierta).toFixed(3);
            p.trazo?.setAttribute("fill-opacity", relleno);
            p.brillo?.setAttribute("fill-opacity", relleno);
          }
          if (p.lengua) {
            p.lengua.setAttribute("cy", (alto * 0.84).toFixed(1));
            p.lengua.setAttribute("rx", (ancho * 0.31).toFixed(1));
            p.lengua.setAttribute("ry", (alto * 0.46).toFixed(1));
            p.lengua.setAttribute("opacity", Math.min(1, Math.max(0, (alto - 12) / 12)).toFixed(2));
          }
        }
        primera = false;
      }
      marco = requestAnimationFrame(pintar);
    };
    marco = requestAnimationFrame(pintar);
    return () => {
      vivo = false;
      cancelAnimationFrame(marco);
    };
  }, []);

  // El parpadeo: cada 2,5 a 6 segundos, 150 milisegundos con los ojos cerrados (los de todas las poses).
  useEffect(() => {
    let reloj: ReturnType<typeof setTimeout>;
    const siguiente = () => {
      reloj = setTimeout(
        () => {
          const ojos = svg.current?.querySelectorAll("[data-ojos]") ?? [];
          ojos.forEach((o) => o.classList.add("pod-parpadeo"));
          setTimeout(() => ojos.forEach((o) => o.classList.remove("pod-parpadeo")), 150);
          siguiente();
        },
        2500 + Math.random() * 3500,
      );
    };
    siguiente();
    return () => clearTimeout(reloj);
  }, []);

  const caja = cajaDelEncuadre(avatar);
  const pensando = piensaLaCara && estado === "pensando";
  const persona = avatar.cara.modo === "sin_visor";

  return (
    <svg
      ref={svg}
      viewBox={`${caja.x.toFixed(1)} ${caja.y.toFixed(1)} ${caja.ancho.toFixed(1)} ${caja.alto.toFixed(1)}`}
      className={className}
      // El brillo alrededor de la silueta de una persona, del color de SUS luces (el de las robots, en el CSS).
      style={persona ? { filter: `drop-shadow(0 0 1.4cqw ${avatar.cara.luz}59)` } : undefined}
      role="img"
      aria-label={`El invitado (${estado})`}
      data-estado={estado}
      data-avatar={avatar.id}
      data-cara={avatar.cara.modo}
      data-pose="tranquila"
    >
      <style>{`
        .pod-parpadeo .pod-ojo { transform: scaleY(0.08); }
        .pod-ojo { transform-box: fill-box; transform-origin: 50% 70%; transition: transform 70ms ease-in-out; }
        .pod-mirada { transition: transform 450ms ease; }
        @keyframes pod-pensar { 0%, 100% { opacity: .25 } 50% { opacity: 1 } }
        .pod-punto { animation: pod-pensar 1.1s ease-in-out infinite; }
      `}</style>
      {/* Una capa por pose; el cuadro a cuadro muestra la que toca (si cambia el avatar, se arman de nuevo). */}
      <g ref={cuerpo} key={avatar.id}>
        {posesDe(avatar).map((p, i) => {
          const pid = `${id}-${p.id}`;
          const imagen = <image href={p.imagen} width={avatar.ancho} height={avatar.alto} />;
          return (
            <g
              key={p.id}
              data-pose={p.id}
              opacity={i === 0 ? 1 : 0}
              style={{ visibility: i === 0 ? "visible" : "hidden" }}
            >
              {p.cara.modo === "sin_visor" ? (
                <PersonaViva c={p.cara} id={pid} imagen={imagen} />
              ) : p.cabeza ? (
                <>
                  {/* El cuerpo sin la cabeza y, encima, la cabeza sola con su cara viva: se mueve sola. */}
                  <image href={p.cabeza.cuerpo} width={avatar.ancho} height={avatar.alto} data-cuerpo="" />
                  <g data-cabeza="">
                    <image
                      href={p.cabeza.imagen}
                      x={p.cabeza.x}
                      y={p.cabeza.y}
                      width={p.cabeza.ancho}
                      height={p.cabeza.alto}
                    />
                    <CaraViva c={p.cara} id={pid} pensando={pensando} />
                  </g>
                </>
              ) : (
                <>
                  {imagen}
                  <CaraViva c={p.cara} id={pid} pensando={pensando} />
                </>
              )}
            </g>
          );
        })}
      </g>
      {/* El micrófono va delante del invitado y no respira con él (C-PODCAST-5: nunca le tapa la cara). */}
      {avatar.escenario?.microfono && (
        <g ref={microfono} key={`mic-${avatar.id}`} data-microfono="">
          <image
            href={avatar.escenario.microfono.imagen}
            x={avatar.escenario.microfono.x}
            y={avatar.escenario.microfono.y}
            width={avatar.escenario.microfono.dibujo}
            height={altoDelMicrofono(avatar.escenario.microfono)}
          />
        </g>
      )}
    </svg>
  );
}
