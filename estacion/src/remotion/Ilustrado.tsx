// Estilo ilustrado (videos de tecnología): la persona sale DIBUJADA, recortada
// y con un borde de luz, sobre un fondo de cómic (rayos de velocidad y trama de
// puntos), con el titular arriba en letras grandes. La figura respira y flota;
// cuando cambia el titular, da un golpe. Nada de fotos quietas a pantalla llena.
import { loadFont } from "@remotion/google-fonts/Anton";
import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { FondoNeon, type ColoresNeon } from "./Diagrama";
import { usePresentador } from "./Presentador";

const { fontFamily: anton } = loadFont("normal", { weights: ["400"], subsets: ["latin", "latin-ext"] });

/** Los colores de luz que se van turnando de un plano a otro. */
export const LUCES_COMIC = ["#38bdf8", "#f43f5e", "#a78bfa", "#fb923c"] as const;

/** Borde de luz alrededor de la figura: la misma sombra dura en ocho direcciones y un halo. */
function bordeDeLuz(px: number, color: string): string {
  const d = Math.round(px * 0.72);
  const duro = [
    [px, 0],
    [-px, 0],
    [0, px],
    [0, -px],
    [d, d],
    [-d, d],
    [d, -d],
    [-d, -d],
  ]
    .map(([x, y]) => `drop-shadow(${x}px ${y}px 0 ${color})`)
    .join(" ");
  return `${duro} drop-shadow(0 0 26px ${color})`;
}

/** El fondo de cómic: un foco del color de la luz, rayos que giran despacio y trama de puntos. */
export const FondoComic: React.FC<{ color: string; centroX?: number }> = ({ color, centroX = 50 }) => {
  const frame = useCurrentFrame();
  const giro = (frame * 0.06) % 360;
  // Los rayos salen de detrás de la figura, esté en el centro o a un lado.
  const centro = `${centroX}% 44%`;
  return (
    <AbsoluteFill style={{ backgroundColor: "#05060d", overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at ${centro}, ${color}66 0%, #0b1022 46%, #05060d 82%)`,
        }}
      />
      <AbsoluteFill
        style={{
          background: `repeating-conic-gradient(from ${giro}deg at ${centro}, rgba(255,255,255,.085) 0deg 0.9deg, rgba(255,255,255,0) 0.9deg 7deg, ${color}26 7deg 7.7deg, rgba(255,255,255,0) 7.7deg 13deg)`,
          maskImage: `radial-gradient(circle at ${centro}, transparent 24%, #000 62%)`,
          WebkitMaskImage: `radial-gradient(circle at ${centro}, transparent 24%, #000 62%)`,
        }}
      />
      <AbsoluteFill
        style={{
          backgroundImage: `radial-gradient(circle, ${color}70 1.7px, transparent 2.2px)`,
          backgroundSize: "17px 17px",
          maskImage: "linear-gradient(150deg, #000 0%, transparent 34%, transparent 66%, #000 100%)",
          WebkitMaskImage: "linear-gradient(150deg, #000 0%, transparent 34%, transparent 66%, #000 100%)",
        }}
      />
      <AbsoluteFill
        style={{ background: "radial-gradient(ellipse at 50% 46%, transparent 56%, rgba(0,0,0,.7) 100%)" }}
      />
    </AbsoluteFill>
  );
};

/**
 * El titular: una o dos líneas enormes; la segunda va en el color de la luz. En vertical va
 * arriba, centrado, encima de la figura. En horizontal va al lado contrario de la figura.
 */
const TitularComic: React.FC<{
  texto: string;
  color: string;
  vertical: boolean;
  conEntrada: boolean;
  /** En horizontal: de qué lado está la figura (el titular va al otro). */
  figuraALaDerecha: boolean;
  /** Con presentador (abajo a la derecha), el titular sube para no tocarle la cabeza. */
  arriba?: boolean;
}> = ({ texto, color, vertical, conEntrada, figuraALaDerecha, arriba = false }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const palabras = texto.toUpperCase().split(/\s+/).filter(Boolean);
  // Dos líneas parejas: la primera mitad arriba y el resto abajo.
  const mitad = palabras.length <= 2 ? palabras.length : Math.ceil(palabras.length / 2);
  const lineas = [palabras.slice(0, mitad).join(" "), palabras.slice(mitad).join(" ")].filter(Boolean);
  const ancho = vertical ? 960 : 900;
  const masLarga = Math.max(...lineas.map((l) => l.length), 3);
  // Con presentador el titular va más arriba y un poco más chico: debajo de la marca del canal
  // (que está en la esquina de arriba) y sin llegar a la cabeza de él (abajo a la derecha).
  const tam = Math.round(Math.min(vertical ? 165 : arriba ? 160 : 190, ancho / (masLarga * 0.5)));
  const lado: React.CSSProperties = vertical
    ? { left: 0, right: 0, top: 250, alignItems: "center" }
    : figuraALaDerecha
      ? { left: 110, top: arriba ? 150 : 230, alignItems: "flex-start" }
      : { right: 110, top: arriba ? 150 : 230, alignItems: "flex-end" };
  return (
    <div
      style={{
        position: "absolute",
        ...lado,
        display: "flex",
        flexDirection: "column",
        fontFamily: anton,
        textTransform: "uppercase",
        lineHeight: 0.98,
        letterSpacing: 1,
      }}
    >
      {lineas.map((l, k) => {
        const s = conEntrada
          ? spring({ frame: frame - 1 - k * 4, fps, config: { damping: 11, stiffness: 210, mass: 0.8 } })
          : 1;
        return (
          <div
            key={k}
            style={{
              fontSize: tam,
              whiteSpace: "nowrap",
              // El degradado solo pinta dentro de la caja de la línea: sin este aire arriba, la
              // tilde de una mayúscula («PASÓ», «FRENÓ») quedaba fuera y no se veía.
              paddingTop: "0.2em",
              marginTop: "-0.2em",
              opacity: Math.min(1, s * 1.6),
              transform: `scale(${1.28 - Math.min(1, s) * 0.28})`,
              transformOrigin: vertical ? "50% 50%" : figuraALaDerecha ? "0% 50%" : "100% 50%",
              backgroundImage:
                k === 0
                  ? "linear-gradient(180deg, #ffffff 18%, #c9ced8 62%, #8b93a3 100%)"
                  : `linear-gradient(180deg, #fff3e0 0%, ${color} 46%, ${color} 100%)`,
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
              filter: "drop-shadow(0 6px 0 rgba(0,0,0,.55)) drop-shadow(0 14px 26px rgba(0,0,0,.6))",
            }}
          >
            {l}
          </div>
        );
      })}
    </div>
  );
};

/**
 * En horizontal, de qué lado va la figura. Sale de la propia figura (no del turno), para que la
 * misma persona no salte de un lado a otro cuando solo cambia el titular. El nombre va al otro lado.
 */
export const figuraALaDerecha = (ruta: string): boolean =>
  [...ruta].reduce((suma, letra) => suma + letra.charCodeAt(0), 0) % 2 === 0;

export const PlanoIlustrado: React.FC<{
  figura: { ruta: string; ancho: number; alto: number };
  /** El titular de arriba (la cifra o la frase que pesa). Vacío = solo la figura. */
  titular: string;
  n: number;
  durFrames: number;
  vertical: boolean;
  /** La figura entra (plano nuevo) o ya estaba (solo cambia el titular). */
  entraFigura: boolean;
  conEntrada: boolean;
  /** Neón con personajes: el fondo y las luces son los del neón, no los del cómic. */
  neon?: ColoresNeon | null;
}> = ({ figura, titular, n, durFrames, vertical, entraFigura, conEntrada, neon = null }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const luces: readonly string[] = neon ? [neon.luz, neon.objeto, neon.rosa] : LUCES_COMIC;
  const color = luces[n % luces.length] ?? LUCES_COMIC[0];
  // La figura viene de la cintura para arriba. En vertical va debajo del titular, centrada. En
  // horizontal va a un lado y el titular al otro; el lado sale de la propia figura (no del turno),
  // para que la misma persona no salte de un lado a otro cuando solo cambia el titular.
  const alto = vertical ? height * 0.56 : height * 0.92;
  const ancho = (alto * figura.ancho) / figura.alto;
  const arriba = vertical ? height * 0.305 : height * 0.15;
  // Con presentador, él ocupa abajo a la derecha: la figura va siempre a la izquierda.
  const { activo: hayPresentador } = usePresentador();
  const aLaDerecha = hayPresentador ? false : figuraALaDerecha(figura.ruta);
  const centro = vertical ? width / 2 : width * (aLaDerecha ? 0.7 : 0.3);
  const entra =
    conEntrada && entraFigura
      ? spring({ frame, fps, config: { damping: 13, stiffness: 150, mass: 0.9 } })
      : 1;
  // Si la figura ya estaba, el cambio de titular le da un golpe corto.
  const golpe =
    conEntrada && !entraFigura
      ? interpolate(frame, [0, 3, 9], [1, 1.05, 1], { extrapolateRight: "clamp" })
      : 1;
  const respira =
    1 + interpolate(frame, [0, Math.max(1, durFrames)], [0, 0.045], { extrapolateRight: "clamp" });
  const flota = Math.sin((frame + n * 17) / 26) * 7;
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      {neon ? (
        <>
          <FondoNeon colores={neon} />
          {/* Un foco del color de la luz detrás de la figura, para que no flote en lo oscuro. */}
          <AbsoluteFill
            style={{
              background: `radial-gradient(circle at ${(centro / width) * 100}% 46%, ${color}4d 0%, ${color}14 34%, transparent 62%)`,
            }}
          />
        </>
      ) : (
        <FondoComic color={color} centroX={(centro / width) * 100} />
      )}
      <Img
        src={staticFile(figura.ruta)}
        style={{
          position: "absolute",
          left: centro - ancho / 2,
          top: arriba,
          width: ancho,
          height: alto,
          maxWidth: "none",
          transformOrigin: "50% 100%",
          transform: `translateY(${(1 - Math.min(1, entra)) * height * 0.22 + flota}px) scale(${(0.9 + Math.min(1.08, entra) * 0.1) * golpe * respira})`,
          opacity: Math.min(1, entra * 1.8),
          filter: bordeDeLuz(vertical ? 5 : 4, color),
          // La figura termina en un corte recto a la cintura: se desvanece para que no se note.
          maskImage: "linear-gradient(180deg, #000 0%, #000 84%, transparent 99%)",
          WebkitMaskImage: "linear-gradient(180deg, #000 0%, #000 84%, transparent 99%)",
        }}
      />
      {titular && (
        <TitularComic
          texto={titular}
          color={color}
          vertical={vertical}
          conEntrada={conEntrada}
          figuraALaDerecha={aLaDerecha}
          arriba={hayPresentador}
        />
      )}
    </AbsoluteFill>
  );
};
