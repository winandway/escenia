// Planos (C-RITMO-1): los cambios de imagen DENTRO de una escena, al estilo de
// los videos que se editan hoy en CapCut. Cada plano entra con un movimiento
// distinto y un sonido corto, se mueve mientras dura (nunca queda quieto) y, si
// es de una persona, lleva su nombre. Los «datos» son cifras que saltan en grande.
import {
  AbsoluteFill,
  Audio,
  Easing,
  Img,
  interpolate,
  Loop,
  OffthreadVideo,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { FondoNeon, type ColoresNeon } from "./Diagrama";
import { posicionObjeto } from "./enfoque";
import { figuraALaDerecha, PlanoIlustrado } from "./Ilustrado";
import { usePresentador } from "./Presentador";
import { FPS, type PropsVideo } from "./props";

type Escena = PropsVideo["escenas"][number];
type Plano = Escena["planos"][number];

/** Lo que tarda un plano en entrar: rápido, como un corte con movimiento. */
const ENTRADA = 7;

export const PlanosDeEscena: React.FC<{
  escena: Escena;
  /** Tiempo del video largo que corresponde al primer cuadro de esta escena en pantalla. */
  desdeMs: number;
  durFrames: number;
  indiceEscena: number;
  vertical: boolean;
  acento: string;
  fuente: string;
  colores: readonly [string, string];
  cortes: string[];
  golpe: string | null;
  /** Neón con personajes: las figuras van sobre el fondo de neón (y no sobre el de cómic). */
  neon?: ColoresNeon | null;
}> = ({
  escena,
  desdeMs,
  durFrames,
  indiceEscena,
  vertical,
  acento,
  fuente,
  colores,
  cortes,
  golpe,
  neon = null,
}) => {
  const aFrame = (ms: number) => Math.round(((ms - desdeMs) / 1000) * FPS);
  const planos = escena.planos;
  return (
    <AbsoluteFill>
      {planos.map((plano, k) => {
        const arranca = aFrame(plano.inicioMs);
        const siguiente = planos[k + 1];
        const termina = siguiente ? aFrame(siguiente.inicioMs) : durFrames;
        if (termina <= 0 || arranca >= durFrames) return null;
        const desde = Math.max(0, arranca);
        // Se queda debajo mientras entra el siguiente, para que el corte no deje ver el fondo.
        const dur = Math.max(1, termina - desde + (siguiente ? ENTRADA : 0));
        const n = indiceEscena * 7 + k;
        const sonido = cortes.length ? (cortes[n % cortes.length] ?? null) : null;
        return (
          <Sequence key={k} from={desde} durationInFrames={dur} name={`plano ${k + 1} · ${plano.tipo}`}>
            <PlanoVista
              plano={plano}
              n={n}
              durFrames={dur}
              vertical={vertical}
              acento={acento}
              fuente={fuente}
              colores={colores}
              // Un plano que ya venía de antes (short que arranca a mitad de escena) no «entra».
              conEntrada={arranca >= 0}
              neon={neon}
            />
            {arranca >= 0 && plano.tipo === "dato" && golpe && <Audio src={staticFile(golpe)} volume={0.5} />}
            {arranca >= 0 && plano.tipo !== "dato" && sonido && (
              <Audio src={staticFile(sonido)} volume={vertical ? 0.3 : 0.22} />
            )}
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

const PlanoVista: React.FC<{
  plano: Plano;
  n: number;
  durFrames: number;
  vertical: boolean;
  acento: string;
  fuente: string;
  colores: readonly [string, string];
  conEntrada: boolean;
  neon: ColoresNeon | null;
}> = ({ plano, n, durFrames, vertical, acento, fuente, colores, conEntrada, neon }) => {
  const frame = useCurrentFrame();
  const e = conEntrada
    ? interpolate(frame, [0, ENTRADA], [0, 1], {
        extrapolateRight: "clamp",
        easing: Easing.out(Easing.cubic),
      })
    : 1;
  // Cuatro maneras de entrar, que se van turnando: golpe, desde la derecha, desde abajo, acercándose.
  const modo = n % 4;
  const entrada: React.CSSProperties =
    modo === 0
      ? { transform: `scale(${1.22 - e * 0.22})`, opacity: Math.min(1, e * 2.5) }
      : modo === 1
        ? { transform: `translateX(${(1 - e) * 100}%)` }
        : modo === 2
          ? { transform: `translateY(${(1 - e) * 100}%)` }
          : { transform: `scale(${0.86 + e * 0.14})`, opacity: Math.min(1, e * 2) };
  const destello =
    conEntrada && modo === 0 ? interpolate(frame, [0, 5], [0.38, 0], { extrapolateRight: "clamp" }) : 0;
  const { activo: hayPresentador } = usePresentador();
  // Estilo ilustrado: la persona dibujada sobre fondo de cómic. Si la figura ya estaba en el
  // plano anterior (`sigue`), el cuadro no vuelve a entrar: solo cambia el titular de arriba.
  if (plano.figura) {
    return (
      <AbsoluteFill style={{ overflow: "hidden", ...(plano.sigue ? {} : entrada) }}>
        <PlanoIlustrado
          figura={plano.figura}
          titular={plano.tipo === "dato" ? plano.texto : ""}
          n={n}
          durFrames={durFrames}
          vertical={vertical}
          entraFigura={!plano.sigue}
          conEntrada={conEntrada}
          neon={neon}
        />
        {plano.tipo === "foto" && plano.texto && (
          <EtiquetaNombre
            texto={plano.texto}
            acento={acento}
            fuente={fuente}
            vertical={vertical}
            // En horizontal, el nombre va al lado contrario de la figura: nunca encima de ella.
            aLaDerecha={!vertical && !hayPresentador && !figuraALaDerecha(plano.figura.ruta)}
          />
        )}
        {destello > 0 && !plano.sigue && (
          <AbsoluteFill style={{ backgroundColor: "#fff", opacity: destello }} />
        )}
      </AbsoluteFill>
    );
  }
  return (
    <AbsoluteFill style={{ overflow: "hidden", ...entrada }}>
      {plano.tipo === "foto" && plano.foto && (
        <FotoPlano foto={plano.foto} n={n} durFrames={durFrames} vertical={vertical} />
      )}
      {plano.tipo === "imagen" && plano.foto && (
        <ImagenPlano
          foto={plano.foto}
          transparente={plano.transparente}
          n={n}
          durFrames={durFrames}
          vertical={vertical}
          luz={neon?.luz ?? acento}
          conEntrada={conEntrada}
        />
      )}
      {plano.tipo === "clip" && plano.clip && <ClipPlano clip={plano.clip} durFrames={durFrames} />}
      {plano.tipo === "dato" && (
        <DatoPlano
          texto={plano.texto}
          acento={neon ? neon.luz : acento}
          fuente={fuente}
          colores={colores}
          vertical={vertical}
          conEntrada={conEntrada}
          neon={neon}
        />
      )}
      {plano.tipo !== "dato" && plano.tipo !== "imagen" && (
        <AbsoluteFill
          style={{
            background:
              "linear-gradient(180deg, rgba(0,0,0,.28) 0%, rgba(0,0,0,0) 22%, rgba(0,0,0,0) 52%, rgba(0,0,0,.78) 100%)",
          }}
        />
      )}
      {plano.tipo === "foto" && plano.texto && (
        <EtiquetaNombre texto={plano.texto} acento={acento} fuente={fuente} vertical={vertical} />
      )}
      {destello > 0 && <AbsoluteFill style={{ backgroundColor: "#fff", opacity: destello }} />}
    </AbsoluteFill>
  );
};

/** El movimiento de la imagen mientras dura el plano: cinco maneras que se turnan. */
function movimiento(n: number, frame: number, durFrames: number): string {
  const t = interpolate(frame, [0, Math.max(1, durFrames)], [0, 1], { extrapolateRight: "clamp" });
  switch (n % 5) {
    case 0:
      return `scale(${1.04 + t * 0.13})`;
    case 1:
      return `scale(${1.17 - t * 0.13})`;
    case 2:
      return `scale(1.13) translateX(${-2.6 + t * 5.2}%)`;
    case 3:
      return `scale(1.13) translateX(${2.6 - t * 5.2}%)`;
    default:
      return `scale(${1.06 + t * 0.1}) rotate(${-0.7 + t * 1.4}deg)`;
  }
}

const FotoPlano: React.FC<{
  foto: NonNullable<Plano["foto"]>;
  n: number;
  durFrames: number;
  vertical: boolean;
}> = ({ foto, n, durFrames, vertical }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const mover = movimiento(n, frame, durFrames);
  const pos = posicionObjeto(
    { ancho: foto.ancho, alto: foto.alto },
    { ancho: width, alto: height },
    foto.enfoque ?? null,
  );
  // Llena la pantalla si la foto tiene una forma parecida a la del video; una foto
  // vertical en un video horizontal iría recortada por la frente y la barbilla.
  const llena = vertical || foto.ancho / foto.alto >= 1.15;
  if (llena) {
    return (
      <AbsoluteFill style={{ overflow: "hidden", backgroundColor: "#000" }}>
        <Img
          src={staticFile(foto.ruta)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: `${pos.x}% ${pos.y}%`,
            transform: mover,
            transformOrigin: `${pos.x}% ${pos.y}%`,
          }}
        />
      </AbsoluteFill>
    );
  }
  // La misma foto, difuminada, de fondo; y encima la foto entera, moviéndose.
  return (
    <AbsoluteFill style={{ overflow: "hidden", backgroundColor: "#000" }}>
      <Img
        src={staticFile(foto.ruta)}
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          objectFit: "cover",
          filter: "blur(34px) brightness(.5) saturate(1.2)",
          transform: "scale(1.25)",
        }}
      />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <div
          style={{
            height: "100%",
            aspectRatio: `${foto.ancho} / ${foto.alto}`,
            overflow: "hidden",
            boxShadow: "0 0 90px rgba(0,0,0,.85)",
          }}
        >
          <Img
            src={staticFile(foto.ruta)}
            style={{ width: "100%", height: "100%", objectFit: "cover", transform: mover }}
          />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const ClipPlano: React.FC<{ clip: NonNullable<Plano["clip"]>; durFrames: number }> = ({
  clip,
  durFrames,
}) => {
  const frame = useCurrentFrame();
  const zoom = interpolate(frame, [0, Math.max(1, durFrames)], [1.03, 1.12], { extrapolateRight: "clamp" });
  const clipFrames = Math.max(1, Math.floor(clip.duracionSeg * FPS) - 1);
  return (
    <AbsoluteFill style={{ overflow: "hidden", backgroundColor: "#000", transform: `scale(${zoom})` }}>
      <Loop durationInFrames={clipFrames}>
        <OffthreadVideo
          src={staticFile(clip.ruta)}
          muted
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </Loop>
    </AbsoluteFill>
  );
};

/**
 * La imagen de un cliente (comerciales): un logo sin fondo flota en el centro con un halo; una
 * captura va en una tarjeta con borde, inclinada apenas, y si es más alta que ancha se recorre
 * hacia arriba, como quien baja por la página. Va encima del fondo de neón de la escena.
 */
const ImagenPlano: React.FC<{
  foto: NonNullable<Plano["foto"]>;
  transparente: boolean;
  n: number;
  durFrames: number;
  vertical: boolean;
  luz: string;
  conEntrada: boolean;
}> = ({ foto, transparente, n, durFrames, vertical, luz, conEntrada }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const entra = conEntrada ? spring({ frame, fps, config: { damping: 13, stiffness: 150, mass: 0.9 } }) : 1;
  const t = interpolate(frame, [0, Math.max(1, durFrames)], [0, 1], { extrapolateRight: "clamp" });
  const flota = Math.sin((frame + n * 23) / 24) * (vertical ? 9 : 7);
  // El espacio que le toca: debajo del título de la escena, dejando aire a los lados.
  const caja = vertical
    ? { ancho: width * 0.86, alto: height * 0.5, arriba: height * 0.26 }
    : { ancho: width * 0.74, alto: height * 0.62, arriba: height * 0.2 };
  const forma = foto.ancho / foto.alto;
  if (transparente) {
    const alto = Math.min(caja.alto * 0.9, (caja.ancho * 0.9) / forma);
    const ancho = alto * forma;
    return (
      <AbsoluteFill>
        {/* Un halo del color de la luz detrás del logo, para que no quede pegado al fondo. */}
        <AbsoluteFill
          style={{
            background: `radial-gradient(ellipse ${Math.round(ancho * 0.75)}px ${Math.round(alto * 0.9)}px at 50% ${caja.arriba + caja.alto / 2}px, ${luz}44 0%, transparent 70%)`,
            opacity: entra,
          }}
        />
        <Img
          src={staticFile(foto.ruta)}
          style={{
            position: "absolute",
            left: (width - ancho) / 2,
            top: caja.arriba + (caja.alto - alto) / 2 + flota,
            width: ancho,
            height: alto,
            maxWidth: "none",
            objectFit: "contain",
            transform: `scale(${0.72 + Math.min(1.06, entra) * 0.28}) rotate(${(n % 2 === 0 ? -1 : 1) * (1 - t) * 1.6}deg)`,
            opacity: Math.min(1, entra * 1.6),
            filter: `drop-shadow(0 0 2px rgba(255,255,255,.55)) drop-shadow(0 0 28px ${luz}99) drop-shadow(0 24px 40px rgba(0,0,0,.6))`,
          }}
        />
      </AbsoluteFill>
    );
  }
  // Una captura: tarjeta con borde. Si es alta (una página entera), se recorre hacia arriba.
  const ancho = Math.min(caja.ancho, caja.alto * forma);
  const alto = Math.min(caja.alto, ancho / forma);
  const alta = forma < (vertical ? 0.7 : 1.1);
  const desplazamiento = alta
    ? interpolate(t, [0.1, 0.95], [0, 100], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
    : 50;
  const giro = (n % 2 === 0 ? -1 : 1) * (vertical ? 0 : 4) * (1 - t * 0.5);
  return (
    <AbsoluteFill style={{ perspective: 1600 }}>
      <div
        style={{
          position: "absolute",
          left: (width - ancho) / 2,
          top: caja.arriba + (caja.alto - alto) / 2 + flota * 0.6,
          width: ancho,
          height: alta ? caja.alto : alto,
          overflow: "hidden",
          borderRadius: vertical ? 22 : 18,
          border: `2px solid rgba(255,255,255,.22)`,
          boxShadow: `0 0 0 1px rgba(0,0,0,.6), 0 0 44px ${luz}55, 0 30px 60px rgba(0,0,0,.65)`,
          backgroundColor: "#0b1020",
          transform: `rotateY(${giro}deg) scale(${0.84 + Math.min(1.04, entra) * 0.16})`,
          transformOrigin: "50% 50%",
          opacity: Math.min(1, entra * 1.6),
        }}
      >
        <Img
          src={staticFile(foto.ruta)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: alta ? "cover" : "cover",
            objectPosition: `50% ${desplazamiento}%`,
            transform: alta ? "none" : `scale(${1 + t * 0.04})`,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};

/** Una cifra o una frase corta que salta en grande: los números van en el color del canal. */
const DatoPlano: React.FC<{
  texto: string;
  acento: string;
  fuente: string;
  colores: readonly [string, string];
  vertical: boolean;
  conEntrada: boolean;
  /** Sobre un video de neón, el dato va encima del fondo de neón y no de un color del canal. */
  neon?: ColoresNeon | null;
}> = ({ texto, acento, fuente, colores, vertical, conEntrada, neon = null }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const palabras = texto.split(/\s+/).filter(Boolean);
  const largo = texto.length;
  const tamano = vertical
    ? largo <= 12
      ? 170
      : largo <= 26
        ? 124
        : 96
    : largo <= 12
      ? 220
      : largo <= 26
        ? 160
        : 118;
  const raya = conEntrada ? spring({ frame: frame - 8, fps, config: { damping: 14, stiffness: 140 } }) : 1;
  return (
    <AbsoluteFill
      style={{
        background: neon
          ? "transparent"
          : `radial-gradient(circle at 50% 42%, ${colores[1]} 0%, ${colores[0]} 62%, #000 100%)`,
        justifyContent: "center",
        alignItems: "center",
        padding: vertical ? "0 60px 260px" : "0 140px 60px",
      }}
    >
      {neon && <FondoNeon colores={neon} />}
      <div
        style={{
          textAlign: "center",
          fontFamily: fuente,
          fontWeight: 900,
          fontSize: tamano,
          lineHeight: 1.02,
          color: "#fff",
          textShadow: "0 10px 50px rgba(0,0,0,.9)",
        }}
      >
        {palabras.map((w, k) => {
          const s = conEntrada
            ? spring({ frame: frame - 2 - k * 3, fps, config: { damping: 9, stiffness: 230, mass: 0.8 } })
            : 1;
          return (
            <span
              key={k}
              style={{
                display: "inline-block",
                marginRight: "0.24em",
                opacity: Math.min(1, s * 1.5),
                transform: `scale(${0.5 + s * 0.5})`,
                color: /\d/.test(w) ? acento : "#fff",
              }}
            >
              {w}
            </span>
          );
        })}
      </div>
      <div
        style={{
          marginTop: 30,
          height: vertical ? 14 : 16,
          width: `${raya * (vertical ? 46 : 30)}%`,
          borderRadius: 8,
          backgroundColor: acento,
        }}
      />
    </AbsoluteFill>
  );
};

/** El nombre de quien sale en la foto, abajo a la izquierda, como en un noticiero. */
const EtiquetaNombre: React.FC<{
  texto: string;
  acento: string;
  fuente: string;
  vertical: boolean;
  aLaDerecha?: boolean;
}> = ({ texto, acento, fuente, vertical, aLaDerecha = false }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const entra = spring({ frame: frame - 5, fps, config: { damping: 15, stiffness: 170 } });
  return (
    <div
      style={{
        position: "absolute",
        ...(aLaDerecha ? { right: 80 } : { left: vertical ? 56 : 80 }),
        // En vertical va por encima de los subtítulos; en horizontal, a su izquierda y más arriba.
        bottom: vertical ? 700 : 230,
        transform: `translateX(${(1 - entra) * (aLaDerecha ? 60 : -60)}px)`,
        opacity: entra,
        display: "flex",
        alignItems: "stretch",
        boxShadow: "0 10px 40px rgba(0,0,0,.6)",
      }}
    >
      <div style={{ width: vertical ? 14 : 12, backgroundColor: acento }} />
      <div
        style={{
          backgroundColor: "rgba(8,8,10,.86)",
          color: "#fff",
          fontFamily: fuente,
          fontWeight: 900,
          fontSize: vertical ? 50 : 44,
          lineHeight: 1.1,
          padding: vertical ? "14px 26px" : "12px 24px",
          textTransform: "uppercase",
          letterSpacing: 1,
        }}
      >
        {texto}
      </div>
    </div>
  );
};
