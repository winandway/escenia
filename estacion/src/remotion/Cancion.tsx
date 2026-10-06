// Formato Canción (docs/CANCION.md): Richard canta a cámara y se ve ENTERO, con su fondo
// real y su audio en vivo. Encima de su cabeza, un papel viejo donde va apareciendo, verso a
// verso, un boceto a lápiz de lo que dice la letra; sobre su pecho, la letra palabra por
// palabra, como un video de lyrics. Sale solo en vertical.
import { createTikTokStyleCaptions } from "@remotion/captions";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadCaveat } from "@remotion/google-fonts/Caveat";
import { useMemo } from "react";
import {
  AbsoluteFill,
  Audio,
  Freeze,
  Img,
  interpolate,
  OffthreadVideo,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { FPS, type PropsVideo } from "./props";

const { fontFamily: inter } = loadInter("normal", {
  weights: ["700", "900"],
  subsets: ["latin", "latin-ext"],
});
const { fontFamily: manuscrita } = loadCaveat("normal", {
  weights: ["600", "700"],
  subsets: ["latin", "latin-ext"],
});

/** Lo mismo que ALTO_DEL_BOCETO en compartido/cancion.ts (la plantilla no puede importar de fuera). */
const ALTO_DEL_BOCETO = 0.34;
const PAPEL = "#efe3c6";
const TINTA = "#2b2118";
const AMARILLO = "#ffd60a";
/** Cuánto dura el título de la canción en el papel antes del primer boceto. */
const TITULO_MS = 2600;
/** Cuánto antes del final aparece el nombre del canal en el papel. */
const CANAL_MS = 4500;
const ENTRADA = 16; // cuadros que tarda un boceto en «dibujarse» (barrido de izquierda a derecha)

const msAFrame = (ms: number) => Math.round((ms / 1000) * FPS);

export const Cancion: React.FC<PropsVideo> = (p) => {
  const frame = useCurrentFrame();
  const { width, height, durationInFrames } = useVideoConfig();
  const tMs = (frame / FPS) * 1000;
  const presentador = p.presentador;
  const videoFrames = msAFrame(p.duracionMs);

  const { pages } = useMemo(
    () =>
      createTikTokStyleCaptions({
        captions: p.palabras,
        // Un trozo de verso a la vez: más largo que en los videos hablados, para que se lea como letra.
        combineTokensWithinMilliseconds: 1100,
      }),
    [p.palabras],
  );
  const pagina =
    tMs < p.duracionMs
      ? pages.find((pg) => tMs >= pg.startMs && tMs < pg.startMs + pg.durationMs)
      : undefined;

  // El papel: arriba, un poco torcido, con sombra, como pegado encima del video.
  const papel = {
    left: Math.round(width * 0.045),
    top: Math.round(height * 0.028),
    ancho: Math.round(width * 0.91),
    alto: Math.round(height * ALTO_DEL_BOCETO),
  };
  const conTitulo = tMs < TITULO_MS;
  const finCanal = p.duracionMs;
  const conCanal = tMs >= finCanal - CANAL_MS;

  const video = (
    <OffthreadVideo
      src={staticFile(presentador?.ruta ?? "")}
      muted
      style={{ width: "100%", height: "100%", objectFit: "cover" }}
    />
  );

  return (
    <AbsoluteFill style={{ backgroundColor: "#000", fontFamily: inter }}>
      {/* Él, entero, con su fondo real. Al final, el último cuadro se queda quieto (sin negro). */}
      {presentador &&
        (frame >= videoFrames - 2 ? <Freeze frame={Math.max(0, videoFrames - 3)}>{video}</Freeze> : video)}
      <Audio src={staticFile(p.audio)} />

      {/* El papel con el boceto de cada verso. */}
      <div
        style={{
          position: "absolute",
          left: papel.left,
          top: papel.top,
          width: papel.ancho,
          height: papel.alto,
          transform: "rotate(-1.4deg)",
          borderRadius: 14,
          overflow: "hidden",
          backgroundColor: PAPEL,
          backgroundImage:
            "radial-gradient(ellipse at 20% 30%, rgba(120,90,40,.18) 0%, transparent 55%), radial-gradient(ellipse at 85% 80%, rgba(120,90,40,.22) 0%, transparent 50%), linear-gradient(180deg, rgba(255,255,255,.25) 0%, rgba(0,0,0,.06) 100%)",
          boxShadow: "0 22px 50px rgba(0,0,0,.55), inset 0 0 60px rgba(90,60,20,.18)",
          border: "3px solid rgba(60,40,15,.25)",
        }}
      >
        {p.escenas.map((e, i) => {
          const foto = e.fotos[0] ?? e.foto;
          if (!foto) return null;
          // El boceto entra cuando empieza su verso (nunca antes de que se vaya el título) y
          // se queda hasta que entra el siguiente.
          const desde = Math.max(msAFrame(e.inicioMs), msAFrame(TITULO_MS));
          const siguiente = p.escenas.slice(i + 1).find((x) => x.fotos[0] ?? x.foto);
          const hasta = siguiente
            ? Math.max(msAFrame(siguiente.inicioMs), msAFrame(TITULO_MS)) + ENTRADA
            : durationInFrames;
          if (hasta <= desde) return null;
          return (
            <Sequence
              key={i}
              from={desde}
              durationInFrames={hasta - desde}
              name={`boceto ${i + 1}`}
              layout="none"
            >
              <Boceto ruta={foto.ruta} durFrames={hasta - desde} />
            </Sequence>
          );
        })}

        {/* El título de la canción, a mano, mientras arranca. */}
        {conTitulo && (
          <AbsoluteFill
            style={{
              justifyContent: "center",
              alignItems: "center",
              opacity: interpolate(tMs, [0, 300, TITULO_MS - 400, TITULO_MS], [0, 1, 1, 0], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
              padding: "0 60px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontFamily: manuscrita,
                fontWeight: 700,
                fontSize: 92,
                color: TINTA,
                lineHeight: 1.05,
              }}
            >
              «{p.titulo}»
            </div>
            {p.cierre?.canalNombre && (
              <div
                style={{
                  fontFamily: manuscrita,
                  fontWeight: 600,
                  fontSize: 46,
                  color: TINTA,
                  marginTop: 18,
                  opacity: 0.8,
                }}
              >
                {p.cierre.canalNombre}
              </div>
            )}
          </AbsoluteFill>
        )}

        {/* Al final, el canal escrito a mano en una esquina del papel. */}
        {conCanal && !conTitulo && p.cierre?.canalNombre && (
          <div
            style={{
              position: "absolute",
              right: 34,
              bottom: 22,
              fontFamily: manuscrita,
              fontWeight: 700,
              fontSize: 54,
              color: TINTA,
              transform: "rotate(-2deg)",
              opacity: interpolate(tMs, [finCanal - CANAL_MS, finCanal - CANAL_MS + 500], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
              textShadow: "0 0 18px rgba(239,227,198,.95), 0 0 30px rgba(239,227,198,.9)",
            }}
          >
            {p.cierre.canalNombre} · Suscríbete
          </div>
        )}
      </div>

      {/* La letra, palabra por palabra, sobre su pecho: la que se canta salta en amarillo. */}
      {pagina && (
        <AbsoluteFill
          style={{ justifyContent: "flex-start", alignItems: "center", paddingTop: Math.round(height * 0.6) }}
        >
          <div
            style={{
              maxWidth: "88%",
              textAlign: "center",
              fontSize: 74,
              fontWeight: 900,
              lineHeight: 1.18,
              color: "#fff",
              WebkitTextStroke: "11px #000",
              paintOrder: "stroke fill",
              textShadow: "0 6px 26px rgba(0,0,0,.85)",
            }}
          >
            {pagina.tokens.map((tk, k) => {
              const siguiente = pagina.tokens[k + 1];
              const cantando = tMs >= tk.fromMs && (!siguiente || tMs < siguiente.fromMs);
              return (
                <span
                  key={k}
                  style={{
                    display: "inline-block",
                    margin: "0 4px",
                    padding: cantando ? "0 14px" : 0,
                    borderRadius: 14,
                    backgroundColor: cantando ? AMARILLO : "transparent",
                    color: cantando ? "#000" : "#fff",
                    WebkitTextStroke: cantando ? "0px transparent" : undefined,
                    transform: cantando ? "scale(1.06)" : "none",
                  }}
                >
                  {tk.text.trim()}
                </span>
              );
            })}
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};

/** Un boceto que se «dibuja» de izquierda a derecha y respira con un acercamiento lento. */
const Boceto: React.FC<{ ruta: string; durFrames: number }> = ({ ruta, durFrames }) => {
  const frame = useCurrentFrame();
  const barrido = interpolate(frame, [0, ENTRADA], [100, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const zoom = interpolate(frame, [0, Math.max(1, durFrames)], [1.02, 1.1], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ clipPath: `inset(0 ${barrido}% 0 0)` }}>
      <Img
        src={staticFile(ruta)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `scale(${zoom})`,
          // Se funde con el papel: lo claro del dibujo deja ver el papel, lo oscuro queda como tinta.
          mixBlendMode: "multiply",
          filter: "contrast(1.08) sepia(0.25)",
        }}
      />
      {/* El borde del barrido: una línea de grafito que va «dibujando». */}
      {barrido > 0 && (
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: `${100 - barrido}%`,
            width: 6,
            backgroundColor: "rgba(43,33,24,.55)",
            filter: "blur(2px)",
          }}
        />
      )}
    </AbsoluteFill>
  );
};
