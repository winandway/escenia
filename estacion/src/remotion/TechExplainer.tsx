import { createTikTokStyleCaptions } from "@remotion/captions";
import { loadFont } from "@remotion/google-fonts/Inter";
import { loadFont as loadSerif } from "@remotion/google-fonts/PlayfairDisplay";
import { useMemo } from "react";
import {
  AbsoluteFill,
  Audio,
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
import { FPS, type PropsVideo } from "./props";

const { fontFamily } = loadFont("normal", {
  weights: ["500", "700", "900"],
  subsets: ["latin", "latin-ext"],
});

const { fontFamily: serif } = loadSerif("normal", {
  weights: ["700", "900"],
  subsets: ["latin", "latin-ext"],
});

const AMBAR = "#f59e0b";
const ORO = "#e8b04b";
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
  const documental = p.tema === "documental";
  const acento = documental ? ORO : AMBAR;
  const fuenteTitulos = documental ? serif : fontFamily;

  return (
    <AbsoluteFill style={{ backgroundColor: "#000", fontFamily }}>
      {/* Escenas: cada una se funde sobre la anterior */}
      {p.escenas.map((e, i) => {
        const desde = msAFrame(e.inicioMs);
        const dur = Math.max(1, msAFrame(e.finMs) - desde + (i < p.escenas.length - 1 ? TRANSICION : 0));
        const colores = PALETA[i % PALETA.length] ?? PALETA[0];
        const whoosh = whooshes.length ? (whooshes[i % whooshes.length] ?? null) : null;
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
              acento={acento}
              fuenteTitulos={fuenteTitulos}
              boom={p.sfx.boom}
              whoosh={whoosh}
            />
            {whoosh && i > 0 && <Audio src={staticFile(whoosh)} volume={0.4} />}
          </Sequence>
        );
      })}

      {/* Título de apertura */}
      <Sequence from={0} durationInFrames={Math.round(FPS * 3.2)} name="título">
        <Titulo texto={p.titulo} vertical={vertical} acento={acento} fuente={fuenteTitulos} />
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
              <span key={k} style={{ color: tMs >= tk.fromMs ? acento : "#fff" }}>
                {tk.text}
              </span>
            ))}
          </div>
        </AbsoluteFill>
      )}

      {/* Cierre con producto */}
      {p.producto && (
        <Sequence from={Math.max(0, durationInFrames - FPS * 6)} name="cta">
          <Cierre nombre={p.producto.nombre} url={p.producto.url} vertical={vertical} acento={acento} />
          {p.sfx.ding && <Audio src={staticFile(p.sfx.ding)} volume={0.45} />}
        </Sequence>
      )}

      {/* Barra de progreso */}
      <AbsoluteFill style={{ justifyContent: "flex-end" }}>
        <div style={{ height: 8, width: `${(frame / durationInFrames) * 100}%`, backgroundColor: acento }} />
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
  acento: string;
  fuenteTitulos: string;
  boom: string | null;
  whoosh: string | null;
}> = ({
  escena,
  colores,
  durFrames,
  vertical,
  fundir,
  pop,
  retraso,
  acento,
  fuenteTitulos,
  boom,
  whoosh,
}) => {
  const frame = useCurrentFrame();
  const opacidad = fundir ? interpolate(frame, [0, TRANSICION], [0, 1], { extrapolateRight: "clamp" }) : 1;
  const esFrase = escena.estilo === "frase";
  const esFoto = escena.estilo === "foto" && escena.foto !== null;
  const esTitular = escena.estilo === "titular" && escena.recorte !== null;
  const esRecorte = escena.estilo === "recorte" && escena.recorte !== null;
  return (
    <AbsoluteFill style={{ opacity: opacidad }}>
      <Fondo
        clip={escena.clip}
        colores={colores}
        durFrames={durFrames}
        difuminado={esFrase || esFoto || esTitular || esRecorte}
      />
      {esFoto && escena.foto && (
        <FotoConMovimiento foto={escena.foto} durFrames={durFrames} vertical={vertical} />
      )}
      {esTitular && escena.recorte && (
        <TitularGolpe
          titular={escena.recorte.titular}
          fecha={escena.recorte.fecha}
          retraso={retraso}
          acento={acento}
          fuente={fuenteTitulos}
          vertical={vertical}
          boom={boom}
        />
      )}
      {esRecorte && escena.recorte && escena.recorte.tipo === "periodico" && (
        <Periodico
          recorte={escena.recorte}
          retraso={retraso}
          acento={acento}
          vertical={vertical}
          whoosh={whoosh}
        />
      )}
      {esRecorte && escena.recorte && escena.recorte.tipo === "red" && (
        <TarjetaRed
          recorte={escena.recorte}
          retraso={retraso}
          acento={acento}
          vertical={vertical}
          whoosh={whoosh}
        />
      )}
      {!esTitular &&
        !esRecorte &&
        escena.textoEnPantalla &&
        (esFrase ? (
          <FraseGrande
            texto={escena.textoEnPantalla}
            vertical={vertical}
            retraso={retraso}
            acento={acento}
            fuente={fuenteTitulos}
          />
        ) : (
          <Rotulo
            texto={escena.textoEnPantalla}
            vertical={vertical}
            retraso={retraso}
            acento={acento}
            fuente={fuenteTitulos}
            abajo={esFoto}
          />
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

/** Titular enorme que entra de golpe (con boom), para hitos y giros. */
const TitularGolpe: React.FC<{
  titular: string;
  fecha: string;
  retraso: number;
  acento: string;
  fuente: string;
  vertical: boolean;
  boom: string | null;
}> = ({ titular, fecha, retraso, acento, fuente, vertical, boom }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const golpe = spring({ frame: frame - retraso, fps, config: { damping: 9, stiffness: 260, mass: 0.9 } });
  const sacudida = frame > retraso && frame < retraso + 8 ? Math.sin(frame * 9) * (8 - (frame - retraso)) : 0;
  const fechaEntra = spring({ frame: frame - retraso - 10, fps, config: { damping: 14, stiffness: 140 } });
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: vertical ? 60 : 120 }}>
      {boom && (
        <Sequence from={retraso} name="boom-titular">
          <Audio src={staticFile(boom)} volume={0.55} />
        </Sequence>
      )}
      <div
        style={{
          transform: `scale(${0.6 + golpe * 0.4}) translate(${sacudida}px, ${-sacudida}px)`,
          opacity: Math.min(1, golpe * 1.4),
          fontFamily: fuente,
          fontSize: vertical ? 120 : 150,
          fontWeight: 900,
          lineHeight: 0.95,
          textAlign: "center",
          color: "#fff",
          textTransform: "uppercase",
          letterSpacing: -2,
          textShadow: `0 0 40px rgba(0,0,0,.9), 0 12px 0 ${acento}`,
          maxWidth: "100%",
        }}
      >
        {titular}
      </div>
      {fecha && (
        <div
          style={{
            marginTop: 30,
            opacity: fechaEntra,
            transform: `translateY(${(1 - fechaEntra) * 30}px)`,
            fontSize: vertical ? 56 : 64,
            fontWeight: 700,
            color: acento,
            letterSpacing: 6,
            backgroundColor: "rgba(0,0,0,.55)",
            padding: "6px 28px",
            borderRadius: 8,
          }}
        >
          {fecha}
        </div>
      )}
    </AbsoluteFill>
  );
};

/** Recorte de periódico que entra deslizándose con whoosh. */
const Periodico: React.FC<{
  recorte: NonNullable<Escena["recorte"]>;
  retraso: number;
  acento: string;
  vertical: boolean;
  whoosh: string | null;
}> = ({ recorte, retraso, acento, vertical, whoosh }) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const entrada = spring({ frame: frame - retraso, fps, config: { damping: 16, stiffness: 120 } });
  const balanceo = Math.sin(frame / 18) * 0.6;
  const relleno =
    recorte.cuerpo ||
    "Lorem ipsum no: aquí va el texto corto que escribe la IA. Se lee poco, pero da la sensación de recorte real de la época.";
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      {whoosh && (
        <Sequence from={Math.max(0, retraso - 4)} name="whoosh-recorte">
          <Audio src={staticFile(whoosh)} volume={0.5} />
        </Sequence>
      )}
      <div
        style={{
          width: vertical ? "88%" : Math.min(1100, width * 0.62),
          transform: `translateX(${(1 - entrada) * -width * 0.7}px) rotate(${-2.5 + balanceo}deg)`,
          backgroundColor: "#f3ecd8",
          color: "#1b1b1b",
          padding: vertical ? "36px 40px" : "44px 56px",
          boxShadow: "0 30px 80px rgba(0,0,0,.75)",
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(0,0,0,.025) 0px, rgba(0,0,0,.025) 1px, transparent 1px, transparent 4px)",
          fontFamily: serif,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            borderBottom: "3px double #1b1b1b",
            paddingBottom: 8,
            marginBottom: 18,
            fontSize: vertical ? 22 : 24,
            letterSpacing: 3,
            textTransform: "uppercase",
            fontFamily: fontFamily,
            fontWeight: 700,
          }}
        >
          <span>Diario</span>
          <span>{recorte.fecha || " "}</span>
        </div>
        <div style={{ fontSize: vertical ? 54 : 66, fontWeight: 900, lineHeight: 1.02, marginBottom: 18 }}>
          {recorte.titular}
        </div>
        <div
          style={{
            columnCount: vertical ? 1 : 2,
            columnGap: 28,
            fontSize: vertical ? 22 : 24,
            lineHeight: 1.35,
            color: "#333",
            fontFamily: fontFamily,
          }}
        >
          {relleno}
        </div>
        <div style={{ height: 6, backgroundColor: acento, marginTop: 20, width: "30%" }} />
      </div>
    </AbsoluteFill>
  );
};

/** Tarjeta de red social (comentario del público de hoy), sube desde abajo con whoosh. */
const TarjetaRed: React.FC<{
  recorte: NonNullable<Escena["recorte"]>;
  retraso: number;
  acento: string;
  vertical: boolean;
  whoosh: string | null;
}> = ({ recorte, retraso, acento, vertical, whoosh }) => {
  const frame = useCurrentFrame();
  const { fps, height } = useVideoConfig();
  const entrada = spring({ frame: frame - retraso, fps, config: { damping: 15, stiffness: 130 } });
  const iniciales = (recorte.titular || "Público").slice(0, 1).toUpperCase();
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      {whoosh && (
        <Sequence from={Math.max(0, retraso - 4)} name="whoosh-red">
          <Audio src={staticFile(whoosh)} volume={0.45} />
        </Sequence>
      )}
      <div
        style={{
          width: vertical ? "86%" : 900,
          transform: `translateY(${(1 - entrada) * height * 0.6}px) rotate(${1.5 - entrada * 1.5}deg)`,
          backgroundColor: "#fff",
          color: "#111",
          borderRadius: 24,
          padding: "28px 34px",
          boxShadow: "0 30px 80px rgba(0,0,0,.7)",
          fontFamily: fontFamily,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              backgroundColor: acento,
              color: "#111",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 900,
              fontSize: 30,
            }}
          >
            {iniciales}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 28 }}>{recorte.titular || "Comentario"}</div>
            <div style={{ color: "#667", fontSize: 22 }}>{recorte.fecha || "hoy"}</div>
          </div>
        </div>
        <div style={{ fontSize: vertical ? 34 : 36, lineHeight: 1.3, fontWeight: 500 }}>{recorte.cuerpo}</div>
        <div style={{ marginTop: 18, color: "#889", fontSize: 22, display: "flex", gap: 28 }}>
          <span>♥ 12,4 mil</span>
          <span>↻ 2.108</span>
          <span>💬 934</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

/** Fotografía real con movimiento lento y marco, sobre el clip difuminado. */
const FotoConMovimiento: React.FC<{
  foto: NonNullable<Escena["foto"]>;
  durFrames: number;
  vertical: boolean;
}> = ({ foto, durFrames, vertical }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const entrada = spring({ frame, fps, config: { damping: 30, stiffness: 60 } });
  const zoom = interpolate(frame, [0, Math.max(1, durFrames)], [1.0, 1.1], { extrapolateRight: "clamp" });
  const desplazo = interpolate(frame, [0, Math.max(1, durFrames)], [-12, 12], { extrapolateRight: "clamp" });
  const horizontal = foto.ancho >= foto.alto;
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: vertical ? 60 : 90 }}>
      <div
        style={{
          opacity: entrada,
          transform: `scale(${0.96 + entrada * 0.04})`,
          height: vertical ? "62%" : "84%",
          maxWidth: "88%",
          aspectRatio: `${foto.ancho} / ${foto.alto}`,
          overflow: "hidden",
          borderRadius: 14,
          boxShadow: "0 30px 80px rgba(0,0,0,.7), 0 0 0 6px rgba(255,255,255,.08)",
          backgroundColor: "#111",
        }}
      >
        <Img
          src={staticFile(foto.ruta)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transform: `scale(${zoom}) translate(${horizontal ? desplazo : 0}px, ${horizontal ? 0 : desplazo}px)`,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};

/** Rótulo arriba a la izquierda: entra con un golpe corto. */
const Rotulo: React.FC<{
  texto: string;
  vertical: boolean;
  retraso: number;
  acento: string;
  fuente: string;
  abajo?: boolean;
}> = ({ texto, vertical, retraso, acento, fuente, abajo = false }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const entrada = spring({ frame: frame - retraso, fps, config: { damping: 12, stiffness: 160 } });
  return (
    <AbsoluteFill
      style={{
        justifyContent: abajo ? "flex-end" : "flex-start",
        alignItems: "flex-start",
        padding: vertical ? 60 : 80,
        paddingTop: vertical ? 180 : 80,
        paddingBottom: abajo ? (vertical ? 560 : 200) : undefined,
      }}
    >
      <div
        style={{
          transform: `translateY(${(1 - entrada) * 40}px) scale(${0.9 + entrada * 0.1})`,
          opacity: entrada,
          backgroundColor: "rgba(0,0,0,.6)",
          borderLeft: `10px solid ${acento}`,
          fontFamily: fuente,
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
const FraseGrande: React.FC<{
  texto: string;
  vertical: boolean;
  retraso: number;
  acento: string;
  fuente: string;
}> = ({ texto, vertical, retraso, acento, fuente }) => {
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
          fontFamily: fuente,
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
                color: k === palabras.length - 1 ? acento : "#fff",
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

const Titulo: React.FC<{ texto: string; vertical: boolean; acento: string; fuente: string }> = ({
  texto,
  vertical,
  acento,
  fuente,
}) => {
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
          fontFamily: fuente,
        }}
      >
        {texto}
      </div>
      <div
        style={{
          marginTop: 28,
          height: 10,
          width: `${barra * (vertical ? 60 : 30)}%`,
          backgroundColor: acento,
          borderRadius: 6,
        }}
      />
    </AbsoluteFill>
  );
};

const Cierre: React.FC<{ nombre: string; url: string; vertical: boolean; acento: string }> = ({
  nombre,
  url,
  vertical,
  acento,
}) => {
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
          border: `4px solid ${acento}`,
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
