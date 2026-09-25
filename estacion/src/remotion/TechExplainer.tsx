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
const PALETA = [
  ["#0f172a", "#1e3a8a"],
  ["#111827", "#4c1d95"],
  ["#052e16", "#065f46"],
  ["#1c1917", "#7c2d12"],
  ["#0c0a09", "#374151"],
] as const;

const msAFrame = (ms: number) => Math.round((ms / 1000) * FPS);

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

  return (
    <AbsoluteFill style={{ backgroundColor: "#000", fontFamily }}>
      {/* Fondo por escena */}
      {p.escenas.map((e, i) => {
        const desde = msAFrame(e.inicioMs);
        const dur = Math.max(1, msAFrame(e.finMs) - desde);
        const colores = PALETA[i % PALETA.length] ?? PALETA[0];
        return (
          <Sequence key={i} from={desde} durationInFrames={dur} name={`escena ${i + 1} · ${e.parte}`}>
            <Fondo clip={e.clip} colores={colores} durFrames={dur} />
            {e.textoEnPantalla && <TextoEnPantalla texto={e.textoEnPantalla} vertical={vertical} />}
          </Sequence>
        );
      })}

      {/* Título de apertura */}
      <Sequence from={0} durationInFrames={Math.round(FPS * 3)} name="título">
        <Titulo texto={p.titulo} vertical={vertical} />
      </Sequence>

      {/* Subtítulos palabra por palabra */}
      {pagina && (
        <AbsoluteFill
          style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: vertical ? 420 : 110 }}
        >
          <div
            style={{
              maxWidth: vertical ? "88%" : "72%",
              textAlign: "center",
              fontSize: vertical ? 64 : 52,
              fontWeight: 900,
              lineHeight: 1.15,
              textShadow: "0 4px 24px rgba(0,0,0,.9)",
              color: "#fff",
            }}
          >
            {pagina.tokens.map((tk, k) => (
              <span key={k} style={{ color: tMs >= tk.fromMs ? AMBAR : "#fff", transition: "none" }}>
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
        </Sequence>
      )}

      {/* Barra de progreso */}
      <AbsoluteFill style={{ justifyContent: "flex-end" }}>
        <div style={{ height: 8, width: `${(frame / durationInFrames) * 100}%`, backgroundColor: AMBAR }} />
      </AbsoluteFill>

      {p.vozDePrueba && (
        <div
          style={{
            position: "absolute",
            top: 24,
            right: 32,
            color: "#fca5a5",
            fontSize: 26,
            fontWeight: 700,
            opacity: 0.8,
          }}
        >
          VOZ DE PRUEBA
        </div>
      )}

      <Audio src={staticFile(p.audio)} />
    </AbsoluteFill>
  );
};

const Fondo: React.FC<{
  clip: PropsVideo["escenas"][number]["clip"];
  colores: readonly [string, string];
  durFrames: number;
}> = ({ clip, colores, durFrames }) => {
  const frame = useCurrentFrame();
  const zoom = interpolate(frame, [0, durFrames], [1, 1.08], { extrapolateRight: "clamp" });
  if (clip) {
    const clipFrames = Math.max(1, Math.floor(clip.duracionSeg * FPS) - 1);
    return (
      <AbsoluteFill>
        <Loop durationInFrames={clipFrames}>
          <OffthreadVideo
            src={staticFile(clip.ruta)}
            muted
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </Loop>
        <AbsoluteFill
          style={{ background: "linear-gradient(180deg, rgba(0,0,0,.25) 0%, rgba(0,0,0,.65) 100%)" }}
        />
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

const TextoEnPantalla: React.FC<{ texto: string; vertical: boolean }> = ({ texto, vertical }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const entrada = spring({ frame, fps, config: { damping: 14 } });
  return (
    <AbsoluteFill
      style={{
        justifyContent: vertical ? "center" : "flex-start",
        alignItems: "flex-start",
        padding: vertical ? 60 : 90,
      }}
    >
      <div
        style={{
          transform: `translateY(${(1 - entrada) * 40}px)`,
          opacity: entrada,
          backgroundColor: "rgba(0,0,0,.55)",
          borderLeft: `10px solid ${AMBAR}`,
          padding: "18px 28px",
          fontSize: vertical ? 58 : 56,
          fontWeight: 700,
          color: "#fff",
          maxWidth: vertical ? "92%" : "60%",
          lineHeight: 1.15,
        }}
      >
        {texto}
      </div>
    </AbsoluteFill>
  );
};

const Titulo: React.FC<{ texto: string; vertical: boolean }> = ({ texto, vertical }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const entrada = spring({ frame, fps, config: { damping: 200 } });
  const salida = interpolate(frame, [durationInFrames - 12, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: 80, opacity: salida }}>
      <div
        style={{
          transform: `scale(${0.85 + entrada * 0.15})`,
          fontSize: vertical ? 84 : 96,
          fontWeight: 900,
          color: "#fff",
          textAlign: "center",
          lineHeight: 1.05,
          textShadow: "0 6px 40px rgba(0,0,0,.9)",
        }}
      >
        {texto}
      </div>
    </AbsoluteFill>
  );
};

const Cierre: React.FC<{ nombre: string; url: string; vertical: boolean }> = ({ nombre, url, vertical }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const entrada = spring({ frame, fps, config: { damping: 18 } });
  const limpio = url.replace(/^https?:\/\//, "").replace(/\/$/, "");
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <div
        style={{
          transform: `translateY(${(1 - entrada) * 60}px)`,
          opacity: entrada,
          backgroundColor: "rgba(0,0,0,.7)",
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
