// Publicidad en Short (prototipo, 17 oct 2026): anuncio vertical con las fotos del producto en una
// tarjeta que se mueve, el texto grande de cada momento, las etiquetas que entran una a una, los
// subtítulos al estilo CapCut, el avatar hablando abajo a la izquierda y la tarjeta final con el logo.
import {
  AbsoluteFill,
  Audio,
  Easing,
  Img,
  interpolate,
  OffthreadVideo,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { loadFont } from "@remotion/google-fonts/Anton";
import { textoSobre } from "./monigotes-diseno";
import { type PropsPublicidad, ZONA_PUBLICIDAD as Z } from "./publicidad-diseno";

export * from "./publicidad-diseno";

const { fontFamily } = loadFont("normal", { weights: ["400"], subsets: ["latin", "latin-ext"] });
const FPS = 30;
const f = (ms: number) => Math.round((ms / 1000) * FPS);
const sombra = "0 0 18px rgba(0,0,0,0.85), 0 4px 0 #000, 0 -2px 0 #000, 3px 0 0 #000, -3px 0 0 #000";

/** La foto del momento en la tarjeta: entra con un golpe de zoom y sigue acercándose despacio. */
const Tarjeta: React.FC<{ imagen: string; duracion: number; indice: number; acento: string }> = ({
  imagen,
  duracion,
  indice,
  acento,
}) => {
  const frame = useCurrentFrame();
  const golpe = interpolate(frame, [0, 7], [1.12, 1], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const lento = interpolate(frame, [0, Math.max(1, duracion)], [1, 1.08], { extrapolateRight: "clamp" });
  const lado = indice % 2 === 0 ? 1 : -1;
  const x = interpolate(frame, [0, Math.max(1, duracion)], [-14 * lado, 14 * lado], {
    extrapolateRight: "clamp",
  });
  const entra = interpolate(frame, [0, 5], [0, 1], { extrapolateRight: "clamp" });
  return (
    <div
      style={{
        position: "absolute",
        left: Z.tarjeta.x,
        top: Z.tarjeta.y,
        width: Z.tarjeta.ancho,
        height: Z.tarjeta.alto,
        borderRadius: 40,
        overflow: "hidden",
        border: `6px solid ${acento}`,
        boxShadow: "0 30px 80px rgba(0,0,0,0.55)",
        background: "#fff",
        opacity: entra,
      }}
    >
      <Img
        src={staticFile(imagen)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `translateX(${x}px) scale(${golpe * lento})`,
        }}
      />
    </div>
  );
};

/** El texto grande del momento, en la caja del color de la marca: entra con un rebote. */
const TextoGrande: React.FC<{ texto: string; acento: string }> = ({ texto, acento }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 11, stiffness: 170 } });
  const tamano = Math.max(64, Math.min(118, Math.floor(1700 / Math.max(1, texto.length * 1.05))));
  return (
    <AbsoluteFill
      style={{ top: Z.texto.y, height: Z.texto.alto, alignItems: "center", justifyContent: "center" }}
    >
      <div
        style={{
          transform: `scale(${0.6 + 0.4 * s}) rotate(${(1 - s) * -4}deg)`,
          background: acento,
          color: textoSobre(acento),
          fontSize: tamano,
          lineHeight: 1.05,
          padding: "10px 34px",
          borderRadius: 18,
          textAlign: "center",
          maxWidth: 980,
          boxShadow: "0 12px 30px rgba(0,0,0,0.45)",
        }}
      >
        {texto}
      </div>
    </AbsoluteFill>
  );
};

/** Las etiquetas (lo que se puede encender, por ejemplo): cada una entra cuando se dice. */
const Etiquetas: React.FC<{ chips: { texto: string; inicioMs: number }[]; desdeMs: number }> = ({
  chips,
  desdeMs,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill
      style={{
        top: Z.texto.y - 20,
        height: Z.texto.alto + 40,
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 14,
        alignContent: "center",
        justifyContent: "center",
        padding: "0 50px",
      }}
    >
      {chips.map((c) => {
        const entra = f(c.inicioMs - desdeMs);
        const s = spring({ frame: frame - entra, fps, config: { damping: 12, stiffness: 190 } });
        if (frame < entra) return null;
        return (
          <div
            key={c.texto}
            style={{
              transform: `scale(${0.4 + 0.6 * s})`,
              background: "#fff",
              color: "#111",
              fontSize: 54,
              padding: "6px 22px",
              borderRadius: 999,
              boxShadow: "0 8px 22px rgba(0,0,0,0.4)",
            }}
          >
            {c.texto}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

/** La tarjeta final: el logo grande y las líneas de contacto, sobre blanco. */
const Cierre: React.FC<{ logo: string; lineas: string[]; acento: string }> = ({ logo, lineas, acento }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 13, stiffness: 140 } });
  return (
    <AbsoluteFill
      style={{ background: "#fff", alignItems: "center", paddingTop: 130, opacity: Math.min(1, frame / 6) }}
    >
      <Img src={staticFile(logo)} style={{ width: 920, transform: `scale(${0.7 + 0.3 * s})` }} />
      <div style={{ height: 50 }} />
      {lineas.map((l, i) => {
        const si = spring({ frame: frame - 6 - i * 5, fps, config: { damping: 12 } });
        return (
          <div
            key={l}
            style={{
              transform: `translateY(${(1 - si) * 40}px)`,
              opacity: si,
              fontSize: i === 0 ? 92 : 60,
              color: i === 0 ? acento : "#111",
              marginTop: 18,
              textAlign: "center",
            }}
          >
            {l}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

export const Publicidad: React.FC<PropsPublicidad> = (p) => {
  const frame = useCurrentFrame();
  const ms = (frame / FPS) * 1000;
  const sub = p.subtitulos.find((s) => ms >= s.inicioMs && ms < s.finMs);
  const enCierre = ms >= p.cierre.inicioMs;
  const imagenes = p.tramos.filter((t) => t.imagen);
  const actual = [...imagenes].reverse().find((t) => t.inicioMs <= ms) ?? imagenes[0];
  return (
    <AbsoluteFill style={{ backgroundColor: "#0b0b0b", fontFamily }}>
      {/* Fondo: la misma foto difuminada y oscura (nunca un clip ajeno, C-FONDO-2). */}
      {actual?.imagen && (
        <AbsoluteFill style={{ filter: "blur(28px) brightness(0.45)", transform: "scale(1.2)" }}>
          <Img
            src={staticFile(actual.imagen)}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </AbsoluteFill>
      )}
      <AbsoluteFill
        style={{
          background: `linear-gradient(180deg, ${p.acento}55 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0.6) 100%)`,
        }}
      />
      {/* La foto de cada momento, una detrás de otra. */}
      {imagenes.map((t, i) => {
        const siguiente = imagenes[i + 1];
        const desde = f(t.inicioMs);
        const hasta = siguiente ? f(siguiente.inicioMs) : f(p.cierre.inicioMs);
        if (hasta <= desde) return null;
        return (
          <Sequence key={`img-${i}`} from={desde} durationInFrames={hasta - desde} layout="none">
            <Tarjeta imagen={t.imagen ?? ""} duracion={hasta - desde} indice={i} acento={p.acento} />
          </Sequence>
        );
      })}
      {/* El texto grande o las etiquetas de cada momento. */}
      {p.tramos.map((t, i) => {
        if (!t.texto && !t.chips.length) return null;
        const desde = f(t.inicioMs);
        const hasta = Math.min(f(t.finMs), f(p.cierre.inicioMs));
        if (hasta <= desde) return null;
        return (
          <Sequence key={`txt-${i}`} from={desde} durationInFrames={hasta - desde} layout="none">
            {t.chips.length ? (
              <Etiquetas chips={t.chips} desdeMs={t.inicioMs} />
            ) : (
              <TextoGrande texto={t.texto ?? ""} acento={p.acento} />
            )}
          </Sequence>
        );
      })}
      {/* Logo fijo arriba a la izquierda (fuera del cierre). */}
      {!enCierre && (
        <div
          style={{
            position: "absolute",
            left: Z.logo.x,
            top: Z.logo.y,
            height: Z.logo.alto,
            background: "rgba(255,255,255,0.95)",
            borderRadius: 18,
            padding: "10px 18px",
            boxShadow: "0 8px 22px rgba(0,0,0,0.35)",
          }}
        >
          <Img src={staticFile(p.logo)} style={{ height: Z.logo.alto - 20 }} />
        </div>
      )}
      {/* Tarjeta final con el logo. */}
      <Sequence from={f(p.cierre.inicioMs)} layout="none">
        <Cierre logo={p.logo} lineas={p.cierre.lineas} acento={p.acento} />
      </Sequence>
      {/* Subtítulos al estilo CapCut, a la derecha de la cabeza del avatar. */}
      {sub && !enCierre && (
        <div
          style={{
            position: "absolute",
            left: p.avatar ? Z.subtitulos.izquierda : 80,
            right: p.avatar ? Z.subtitulos.derecha : 80,
            top: Z.subtitulos.y,
            display: "flex",
            flexWrap: "wrap",
            gap: 14,
            justifyContent: "center",
          }}
        >
          {sub.palabras.map((w, i) =>
            i === sub.resaltada ? (
              <span
                key={i}
                style={{
                  background: p.acento,
                  color: textoSobre(p.acento),
                  fontSize: 76,
                  padding: "0 14px",
                  borderRadius: 10,
                }}
              >
                {w}
              </span>
            ) : (
              <span key={i} style={{ color: "#fff", fontSize: 76, textShadow: sombra }}>
                {w}
              </span>
            ),
          )}
        </div>
      )}
      {/* La persona con su fondo, en un recuadro del color de la marca (abajo a la izquierda). */}
      {p.avatar?.recuadro && (
        <div
          style={{
            position: "absolute",
            left:
              Z.recuadro.x +
              interpolate(frame, [0, 10], [-500, 0], {
                extrapolateRight: "clamp",
                easing: Easing.out(Easing.cubic),
              }),
            bottom: Z.recuadro.abajo,
            height: Z.recuadro.alto,
            width: (Z.recuadro.alto * p.avatar.ancho) / p.avatar.alto,
            borderRadius: Z.recuadro.radio,
            border: `${Z.recuadro.borde}px solid ${p.acento}`,
            overflow: "hidden",
            boxShadow: "0 18px 50px rgba(0,0,0,0.45)",
            background: "#000",
          }}
        >
          <OffthreadVideo
            src={staticFile(p.avatar.ruta)}
            muted
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>
      )}
      {/* El avatar sin fondo, abajo a la izquierda: habla todo el anuncio. */}
      {p.avatar && !p.avatar.recuadro && (
        <div
          style={{
            position: "absolute",
            left:
              Z.avatar.x +
              interpolate(frame, [0, 10], [-400, 0], {
                extrapolateRight: "clamp",
                easing: Easing.out(Easing.cubic),
              }),
            bottom: 0,
            height: Z.avatar.alto,
            width: (Z.avatar.alto * p.avatar.ancho) / p.avatar.alto,
          }}
        >
          {p.avatar.video ? (
            <OffthreadVideo
              src={staticFile(p.avatar.ruta)}
              transparent
              muted
              style={{ width: "100%", height: "100%" }}
            />
          ) : (
            <Img
              src={staticFile(p.avatar.ruta)}
              style={{ width: "100%", height: "100%", objectFit: "contain" }}
            />
          )}
        </div>
      )}
      {/* Sonido: la voz, la música bajita (sube al final) y un golpe en cada cambio de imagen. */}
      <Audio src={staticFile(p.audio)} />
      {p.musica && (
        <Audio
          src={staticFile(p.musica)}
          volume={(fr) => {
            const t = (fr / FPS) * 1000;
            const base = t >= p.cierre.inicioMs ? 0.35 : 0.13;
            const entrada = Math.min(1, t / 800);
            const salida = Math.min(1, Math.max(0, (p.duracionMs - t) / 900));
            return base * entrada * salida;
          }}
        />
      )}
      {imagenes.slice(1).map((t, i) => {
        const sfx = p.sfx.cortes[i % Math.max(1, p.sfx.cortes.length)];
        return sfx ? (
          <Sequence
            key={`sfx-${i}`}
            from={Math.max(0, f(t.inicioMs) - 2)}
            durationInFrames={30}
            layout="none"
          >
            <Audio src={staticFile(sfx)} volume={0.35} />
          </Sequence>
        ) : null;
      })}
      {p.sfx.final && (
        <Sequence from={f(p.cierre.inicioMs)} durationInFrames={45} layout="none">
          <Audio src={staticFile(p.sfx.final)} volume={0.5} />
        </Sequence>
      )}
    </AbsoluteFill>
  );
};
