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
const ALTO_DEL_BOCETO = 0.3;
/** Copia de bajadaDelVideo / arribaDeLaLetra (compartido/cancion.ts); una prueba comprueba que den lo mismo. */
type Cara = { arriba: number; abajo: number } | null;
const bajadaDelVideo = (cara: Cara, altoPapel = ALTO_DEL_BOCETO) =>
  cara ? Math.max(0, Math.min(altoPapel, altoPapel + 0.01 - cara.arriba)) : Math.min(altoPapel, 0.1);
const arribaDeLaLetra = (cara: Cara, bajada: number) =>
  Math.min(0.8, Math.max(0.56, (cara?.abajo ?? 0.5) + bajada + 0.025));
const PAPEL = "#efe3c6";
const TINTA = "#2b2118";
const AMARILLO = "#ffd60a";
/** Cuánto dura el título de la canción en el papel antes del primer boceto. */
const TITULO_MS = 2600;
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

  // El papel: arriba, de borde a borde y bien cuadrado (sin torcer), como una franja.
  const papel = { left: 0, top: 0, ancho: width, alto: Math.round(height * ALTO_DEL_BOCETO) };
  // El video se baja justo lo necesario para que su cabeza quede debajo del papel; se pierde un
  // poco del cuerpo por abajo, nunca la cara. La letra va debajo del mentón, sobre el pecho.
  const cara = presentador?.cara ?? null;
  const bajada = Math.round(height * bajadaDelVideo(cara));
  const arribaLetra = Math.round(height * arribaDeLaLetra(cara, bajadaDelVideo(cara)));
  const conTitulo = tMs < TITULO_MS;
  const ultima = [...p.escenas].reverse().find((e) => e.fotos[0] ?? e.foto);
  const ultimaDesdeMs = ultima ? Math.max(ultima.inicioMs, TITULO_MS) : null;

  const video = (
    <OffthreadVideo
      src={staticFile(presentador?.ruta ?? "")}
      muted
      style={{ position: "absolute", left: 0, top: bajada, width, height, objectFit: "cover" }}
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
          overflow: "hidden",
          backgroundColor: PAPEL,
          backgroundImage:
            "radial-gradient(ellipse at 20% 30%, rgba(120,90,40,.18) 0%, transparent 55%), radial-gradient(ellipse at 85% 80%, rgba(120,90,40,.22) 0%, transparent 50%), linear-gradient(180deg, rgba(255,255,255,.25) 0%, rgba(0,0,0,.06) 100%)",
          boxShadow: "0 14px 40px rgba(0,0,0,.55), inset 0 0 60px rgba(90,60,20,.18)",
          borderBottom: "4px solid rgba(60,40,15,.35)",
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
              <Boceto ruta={foto.ruta} />
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

        {/* La última escena deja la mitad derecha del papel en blanco: ahí va el aviso de suscribirse,
            dibujado a mano (un botón, la campanita y una flecha). */}
        {ultimaDesdeMs !== null && tMs >= ultimaDesdeMs && !conTitulo && (
          <AvisoSuscribete
            canal={p.cierre?.canalNombre ?? ""}
            entrada={interpolate(tMs, [ultimaDesdeMs + 400, ultimaDesdeMs + 1100], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            })}
            frame={frame}
            ancho={papel.ancho}
            alto={papel.alto}
          />
        )}
      </div>

      {/* La letra, palabra por palabra, sobre su pecho: la que se canta salta en amarillo. */}
      {pagina && (
        <AbsoluteFill style={{ justifyContent: "flex-start", alignItems: "center", paddingTop: arribaLetra }}>
          <div
            style={{
              maxWidth: "90%",
              textAlign: "center",
              fontSize: 76,
              fontWeight: 900,
              lineHeight: 1.12,
              textTransform: "uppercase",
              color: "#fff",
              WebkitTextStroke: "12px #000",
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
const Boceto: React.FC<{ ruta: string }> = ({ ruta }) => {
  const frame = useCurrentFrame();
  const barrido = interpolate(frame, [0, ENTRADA], [100, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  // El boceto se queda QUIETO: nada de zoom ni de cámara que avance. Richard lo prohibió el
  // 6 oct 2026: el acercamiento se come el dibujo y rompe la gracia de la caricatura. Lo único
  // que se mueve es el barrido de entrada, que lo «dibuja» de izquierda a derecha.
  return (
    <AbsoluteFill style={{ clipPath: `inset(0 ${barrido}% 0 0)` }}>
      <Img
        src={staticFile(ruta)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
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

/** «Suscríbete», dibujado a mano sobre la mitad derecha del papel: botón, campanita y flecha. */
const AvisoSuscribete: React.FC<{
  canal: string;
  entrada: number;
  frame: number;
  ancho: number;
  alto: number;
}> = ({ canal, entrada, frame, ancho, alto }) => {
  const tiembla = Math.sin(frame / 7) * 0.6;
  const salto = Math.abs(Math.sin(frame / 11)) * 6;
  return (
    <div
      style={{
        position: "absolute",
        left: ancho * 0.52,
        top: 0,
        width: ancho * 0.46,
        height: alto,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        opacity: entrada,
        transform: `rotate(${-2 + tiembla}deg) scale(${0.9 + entrada * 0.1})`,
        color: TINTA,
        fontFamily: manuscrita,
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: Math.round(alto * 0.14), fontWeight: 700, lineHeight: 1 }}>¿Te gustó?</div>
      {/* El botón, como lo dibujaría uno con lápiz: borde doble, un poco chueco. */}
      <div
        style={{
          marginTop: Math.round(alto * 0.05),
          padding: `${Math.round(alto * 0.03)}px ${Math.round(alto * 0.09)}px`,
          border: `5px solid ${TINTA}`,
          borderRadius: "48% 52% 50% 50% / 55% 45% 55% 45%",
          boxShadow: `3px 3px 0 ${TINTA}, inset 0 0 0 3px ${PAPEL}, inset 0 0 0 5px ${TINTA}`,
          backgroundColor: "rgba(43,33,24,.08)",
          fontSize: Math.round(alto * 0.17),
          fontWeight: 700,
          lineHeight: 1,
          transform: `translateY(${-salto}px)`,
          display: "flex",
          alignItems: "center",
          gap: Math.round(alto * 0.04),
        }}
      >
        {/* La campanita, en trazo. */}
        <svg width={Math.round(alto * 0.16)} height={Math.round(alto * 0.16)} viewBox="0 0 48 48" fill="none">
          <path
            d="M24 6c-7 0-12 5-12 12v9l-5 7h34l-5-7v-9c0-7-5-12-12-12z"
            stroke={TINTA}
            strokeWidth="3.5"
            strokeLinejoin="round"
            fill="rgba(43,33,24,.12)"
          />
          <path d="M19 38c1 3 3 4 5 4s4-1 5-4" stroke={TINTA} strokeWidth="3.5" strokeLinecap="round" />
          <path d="M24 3v4" stroke={TINTA} strokeWidth="3.5" strokeLinecap="round" />
        </svg>
        Suscríbete
      </div>
      {canal && (
        <div
          style={{
            marginTop: Math.round(alto * 0.05),
            fontSize: Math.round(alto * 0.11),
            fontWeight: 600,
            opacity: 0.85,
          }}
        >
          {canal}
        </div>
      )}
      {/* Una flecha a lápiz que apunta al botón. */}
      <svg
        width={Math.round(alto * 0.3)}
        height={Math.round(alto * 0.2)}
        viewBox="0 0 120 80"
        fill="none"
        style={{ position: "absolute", left: -Math.round(alto * 0.12), top: Math.round(alto * 0.1) }}
      >
        <path d="M8 70 C 30 20, 70 10, 108 30" stroke={TINTA} strokeWidth="4" strokeLinecap="round" />
        <path
          d="M94 20 L 108 30 L 92 40"
          stroke={TINTA}
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};
