import { createTikTokStyleCaptions } from "@remotion/captions";
import { loadFont } from "@remotion/google-fonts/Inter";
import { useMemo } from "react";
import {
  AbsoluteFill,
  Audio,
  interpolate,
  Loop,
  OffthreadVideo,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { FPS, type PropsVideo } from "./props";

const { fontFamily } = loadFont("normal", {
  weights: ["500", "700", "900"],
  subsets: ["latin", "latin-ext"],
});

const AMBAR = "#f59e0b";
const TRANSICION = 12; // frames de fundido entre escenas
const PALETA = [
  ["#0f172a", "#1e3a8a"],
  ["#111827", "#4c1d95"],
  ["#052e16", "#065f46"],
  ["#1c1917", "#7c2d12"],
  ["#0c0a09", "#374151"],
] as const;

const msAFrame = (ms: number) => Math.round((ms / 1000) * FPS);

type Escena = PropsVideo["escenas"][number];

export const TechExplainer: React.FC<PropsVideo> = (p) => {
  const frame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();
  const vertical = height > width;
  const tMs = (frame / FPS) * 1000;

  const { pages } = useMemo(
    () =>
      createTikTokStyleCaptions({
        captions: p.palabras,
        combineTokensWithinMilliseconds: vertical ? 700 : 1100,
      }),
    [p.palabras, vertical],
  );
  const pagina = pages.find((pg) => tMs >= pg.startMs && tMs < pg.startMs + pg.durationMs);
  const whooshes = p.sfx.whoosh;

  return (
    <AbsoluteFill style={{ backgroundColor: "#000", fontFamily }}>
      {/* Escenas: cada una se funde sobre la anterior */}
      {p.escenas.map((e, i) => {
        const desde = msAFrame(e.inicioMs);
        const dur = Math.max(1, msAFrame(e.finMs) - desde + (i < p.escenas.length - 1 ? TRANSICION : 0));
        const colores = PALETA[i % PALETA.length] ?? PALETA[0];
        const whoosh = whooshes.length ? whooshes[i % whooshes.length] : null;
        return (
          <Sequence key={i} from={desde} durationInFrames={dur} name={`escena ${i + 1} · ${e.parte}`}>
            <EscenaVista
              escena={e}
              colores={colores}
              durFrames={dur}
              vertical={vertical}
              fundir={i > 0}
              pop={p.sfx.pop}
              retraso={i === 0 ? Math.round(FPS * 3.2) : TRANSICION}
            />
            {whoosh && i > 0 && <Audio src={staticFile(whoosh)} volume={0.4} />}
          </Sequence>
        );
      })}

      {/* Título de apertura */}
      <Sequence from={0} durationInFrames={Math.round(FPS * 3.2)} name="título">
        <Titulo texto={p.titulo} vertical={vertical} />
        {p.sfx.riser && <Audio src={staticFile(p.sfx.riser)} volume={0.35} />}
        {p.sfx.boom && (
          <Sequence from={18} name="boom">
            <Audio src={staticFile(p.sfx.boom)} volume={0.45} />
          </Sequence>
        )}
      </Sequence>

      {/* Subtítulos palabra por palabra */}
      {pagina && (
        <AbsoluteFill
          style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: vertical ? 420 : 100 }}
        >
          <div
            style={{
              maxWidth: vertical ? "88%" : "72%",
              textAlign: "center",
              fontSize: vertical ? 64 : 54,
              fontWeight: 900,
              lineHeight: 1.15,
              textShadow: "0 4px 24px rgba(0,0,0,.95), 0 0 2px rgba(0,0,0,1)",
              color: "#fff",
            }}
          >
            {pagina.tokens.map((tk, k) => (
              <span key={k} style={{ color: tMs >= tk.fromMs ? AMBAR : "#fff" }}>
                {tk.text}
              </span>
            ))}
          </div>
        </AbsoluteFill>
      )}

      {/* Cierre con producto */}
      {p.producto && (
        <Sequence from={Math.max(0, durationInFrames - FPS * 6)} name="cta">
          <Cierre nombre={p.producto.nombre} url={p.producto.url} vertical={vertical} />
          {p.sfx.ding && <Audio src={staticFile(p.sfx.ding)} volume={0.45} />}
        </Sequence>
      )}

      {/* Barra de progreso */}
      <AbsoluteFill style={{ justifyContent: "flex-end" }}>
        <div style={{ height: 8, width: `${(frame / durationInFrames) * 100}%`, backgroundColor: AMBAR }} />
      </AbsoluteFill>

      {/* Marca discreta de voz de prueba: solo los primeros 3 segundos, abajo a la derecha */}
      {p.vozDePrueba && frame < FPS * 3 && (
        <div
          style={{
            position: "absolute",
            right: 28,
            bottom: 28,
            color: "rgba(255,255,255,.55)",
            fontSize: 22,
            fontWeight: 500,
            letterSpacing: 1,
          }}
        >
          voz de prueba
        </div>
      )}

      <Audio src={staticFile(p.audio)} />
    </AbsoluteFill>
  );
};

const EscenaVista: React.FC<{
  escena: Escena;
  colores: readonly [string, string];
  durFrames: number;
  vertical: boolean;
  fundir: boolean;
  pop: string | null;
  retraso: number;
}> = ({ escena, colores, durFrames, vertical, fundir, pop, retraso }) => {
  const frame = useCurrentFrame();
  const opacidad = fundir ? interpolate(frame, [0, TRANSICION], [0, 1], { extrapolateRight: "clamp" }) : 1;
  const esFrase = escena.estilo === "frase";
  return (
    <AbsoluteFill style={{ opacity: opacidad }}>
      <Fondo clip={escena.clip} colores={colores} durFrames={durFrames} difuminado={esFrase} />
      {escena.textoEnPantalla &&
        (esFrase ? (
          <FraseGrande texto={escena.textoEnPantalla} vertical={vertical} retraso={retraso} />
        ) : (
          <Rotulo texto={escena.textoEnPantalla} vertical={vertical} retraso={retraso} />
        ))}
      {escena.textoEnPantalla && pop && (
        <Sequence from={retraso} name="pop">
          <Audio src={staticFile(pop)} volume={0.5} />
        </Sequence>
      )}
    </AbsoluteFill>
  );
};

const Fondo: React.FC<{
  clip: Escena["clip"];
  colores: readonly [string, string];
  durFrames: number;
  difuminado: boolean;
}> = ({ clip, colores, durFrames, difuminado }) => {
  const frame = useCurrentFrame();
  // Movimiento lento (Ken Burns) para que ningún plano se sienta quieto.
  const zoom = interpolate(frame, [0, Math.max(1, durFrames)], [1.02, 1.12], { extrapolateRight: "clamp" });
  if (clip) {
    const clipFrames = Math.max(1, Math.floor(clip.duracionSeg * FPS) - 1);
    return (
      <AbsoluteFill style={{ overflow: "hidden" }}>
        <AbsoluteFill
          style={{ transform: `scale(${zoom})`, filter: difuminado ? "blur(10px) brightness(.45)" : "none" }}
        >
          <Loop durationInFrames={clipFrames}>
            <OffthreadVideo
              src={staticFile(clip.ruta)}
              muted
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </Loop>
        </AbsoluteFill>
        {!difuminado && (
          <AbsoluteFill
            style={{
              background:
                "linear-gradient(180deg, rgba(0,0,0,.2) 0%, rgba(0,0,0,.35) 55%, rgba(0,0,0,.75) 100%)",
            }}
          />
        )}
      </AbsoluteFill>
    );
  }
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at 30% 30%, ${colores[1]} 0%, ${colores[0]} 70%)`,
        transform: `scale(${zoom})`,
      }}
    />
  );
};

/** Rótulo arriba a la izquierda: entra con un golpe corto. */
const Rotulo: React.FC<{ texto: string; vertical: boolean; retraso: number }> = ({
  texto,
  vertical,
  retraso,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const entrada = spring({ frame: frame - retraso, fps, config: { damping: 12, stiffness: 160 } });
  return (
    <AbsoluteFill
      style={{
        justifyContent: vertical ? "flex-start" : "flex-start",
        alignItems: "flex-start",
        padding: vertical ? 60 : 80,
        paddingTop: vertical ? 180 : 80,
      }}
    >
      <div
        style={{
          transform: `translateY(${(1 - entrada) * 40}px) scale(${0.9 + entrada * 0.1})`,
          opacity: entrada,
          backgroundColor: "rgba(0,0,0,.6)",
          borderLeft: `10px solid ${AMBAR}`,
          padding: "16px 28px",
          fontSize: vertical ? 54 : 52,
          fontWeight: 700,
          color: "#fff",
          maxWidth: vertical ? "92%" : "62%",
          lineHeight: 1.15,
          borderRadius: "0 12px 12px 0",
        }}
      >
        {texto}
      </div>
    </AbsoluteFill>
  );
};

/** Frase grande al centro, palabra por palabra, sobre el clip difuminado. */
const FraseGrande: React.FC<{ texto: string; vertical: boolean; retraso: number }> = ({
  texto,
  vertical,
  retraso,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const palabras = texto.split(/\s+/).filter(Boolean);
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: vertical ? 70 : 140 }}>
      <div
        style={{
          textAlign: "center",
          fontSize: vertical ? 96 : 104,
          fontWeight: 900,
          lineHeight: 1.05,
          color: "#fff",
          textShadow: "0 8px 40px rgba(0,0,0,.9)",
          maxWidth: "100%",
        }}
      >
        {palabras.map((w, k) => {
          const s = spring({
            frame: frame - retraso - k * 3,
            fps,
            config: { damping: 14, stiffness: 170 },
          });
          return (
            <span
              key={k}
              style={{
                display: "inline-block",
                marginRight: "0.28em",
                opacity: s,
                transform: `translateY(${(1 - s) * 60}px) scale(${0.8 + s * 0.2})`,
                color: k === palabras.length - 1 ? AMBAR : "#fff",
              }}
            >
              {w}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

const Titulo: React.FC<{ texto: string; vertical: boolean }> = ({ texto, vertical }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const entrada = spring({ frame, fps, config: { damping: 200 } });
  const salida = interpolate(frame, [durationInFrames - 14, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const barra = interpolate(frame, [4, 24], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: 80, opacity: salida }}>
      <AbsoluteFill style={{ backgroundColor: "rgba(0,0,0,.45)" }} />
      <div
        style={{
          transform: `scale(${0.85 + entrada * 0.15})`,
          fontSize: vertical ? 84 : 96,
          fontWeight: 900,
          color: "#fff",
          textAlign: "center",
          lineHeight: 1.05,
          textShadow: "0 6px 40px rgba(0,0,0,.9)",
          maxWidth: vertical ? "100%" : "80%",
        }}
      >
        {texto}
      </div>
      <div
        style={{
          marginTop: 28,
          height: 10,
          width: `${barra * (vertical ? 60 : 30)}%`,
          backgroundColor: AMBAR,
          borderRadius: 6,
        }}
      />
    </AbsoluteFill>
  );
};

const Cierre: React.FC<{ nombre: string; url: string; vertical: boolean }> = ({ nombre, url, vertical }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const entrada = spring({ frame, fps, config: { damping: 16, stiffness: 120 } });
  const limpio = url.replace(/^https?:\/\//, "").replace(/\/$/, "");
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <div
        style={{
          transform: `translateY(${(1 - entrada) * 60}px) scale(${0.9 + entrada * 0.1})`,
          opacity: entrada,
          backgroundColor: "rgba(0,0,0,.72)",
          border: `4px solid ${AMBAR}`,
          borderRadius: 32,
          padding: vertical ? "40px 60px" : "48px 96px",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: vertical ? 80 : 88, fontWeight: 900, color: "#fff" }}>{nombre}</div>
        <div style={{ fontSize: vertical ? 48 : 52, fontWeight: 700, color: AMBAR, marginTop: 12 }}>
          {limpio}
        </div>
      </div>
    </AbsoluteFill>
  );
};
