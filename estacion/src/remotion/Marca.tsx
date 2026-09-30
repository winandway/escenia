// Aspecto de un canal con marca (hoy, Full Código): letra de código, los colores
// del logo, el logo fijo en una esquina y un cierre propio. La plantilla dibuja
// estas piezas solo cuando el video trae `marca`; sin marca, nada de esto sale.
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";
import { loadFont } from "@remotion/google-fonts/Inter";
import {
  AbsoluteFill,
  Audio,
  Img,
  interpolate,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { PropsVideo } from "./props";

export const { fontFamily: mono } = loadMono("normal", {
  weights: ["500", "700", "800"],
  subsets: ["latin", "latin-ext"],
});
const { fontFamily: sans } = loadFont("normal", { weights: ["500", "700"], subsets: ["latin", "latin-ext"] });

export type MarcaVideo = NonNullable<PropsVideo["marca"]>;

/** El fondo del logo: las piezas oscuras de la marca usan el mismo tono para que el logo no se note pegado. */
export const FONDO_MARCA = "#03060b";
export const PANEL_MARCA = "rgba(6,10,16,.86)";

// Fondos de reserva (escenas sin clip) con los colores del canal.
export const PALETA_MARCA = [
  ["#03060b", "#0b3d2a"],
  ["#03060b", "#2a1a5e"],
  ["#03060b", "#0a3340"],
  ["#03060b", "#3a1758"],
] as const;

/** Cursor de terminal: parpadea dos veces por segundo. */
export const Cursor: React.FC<{ color: string; alto?: string }> = ({ color, alto = "0.95em" }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const encendido = Math.floor(frame / (fps / 2)) % 2 === 0;
  return (
    <span
      style={{
        display: "inline-block",
        width: "0.55em",
        height: alto,
        marginLeft: "0.12em",
        verticalAlign: "text-bottom",
        backgroundColor: color,
        opacity: encendido ? 1 : 0,
      }}
    />
  );
};

/** La cabeza del logo recortada en un círculo (el logo completo trae letras que en pequeño no se leen). */
export const LogoRedondo: React.FC<{ logo: string; lado: number; color: string }> = ({
  logo,
  lado,
  color,
}) => (
  <div
    style={{
      width: lado,
      height: lado,
      borderRadius: lado / 2,
      overflow: "hidden",
      position: "relative",
      flexShrink: 0,
      backgroundColor: FONDO_MARCA,
      boxShadow: `0 0 0 ${Math.max(2, Math.round(lado / 28))}px ${color}, 0 0 ${Math.round(lado / 3)}px ${color}55`,
    }}
  >
    <Img
      src={staticFile(logo)}
      style={{
        position: "absolute",
        width: lado * 1.9,
        height: lado * 1.9,
        left: -lado * 0.45,
        top: -lado * 0.205,
        maxWidth: "none",
      }}
    />
  </div>
);

/** Tinte y detalles de código sobre toda la imagen: los colores del canal y cuatro esquinas de visor. */
export const MarcoCodigo: React.FC<{ marca: MarcaVideo; vertical: boolean }> = ({ marca, vertical }) => {
  const margen = vertical ? 34 : 28;
  const largo = vertical ? 70 : 64;
  const esquina = (lados: React.CSSProperties): React.CSSProperties => ({
    position: "absolute",
    width: largo,
    height: largo,
    opacity: 0.55,
    ...lados,
  });
  const linea = `3px solid ${marca.acento}`;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <AbsoluteFill
        style={{
          background: `linear-gradient(135deg, ${marca.acento}14 0%, transparent 38%, transparent 62%, ${marca.secundario}26 100%)`,
        }}
      />
      {/* La esquina donde va el logo se deja libre (arriba a la derecha en 16:9, a la izquierda en vertical). */}
      {!vertical && (
        <div style={esquina({ left: margen, top: margen, borderLeft: linea, borderTop: linea })} />
      )}
      {vertical && (
        <div style={esquina({ right: margen, top: margen, borderRight: linea, borderTop: linea })} />
      )}
      <div style={esquina({ left: margen, bottom: margen + 8, borderLeft: linea, borderBottom: linea })} />
      <div style={esquina({ right: margen, bottom: margen + 8, borderRight: linea, borderBottom: linea })} />
    </AbsoluteFill>
  );
};

/** El logo del canal, fijo y discreto: arriba a la derecha en 16:9, arriba a la izquierda en vertical. */
export const MarcaFija: React.FC<{ marca: MarcaVideo; vertical: boolean }> = ({ marca, vertical }) => {
  const frame = useCurrentFrame();
  const entra = interpolate(frame, [6, 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const lado = vertical ? 78 : 64;
  return (
    <div
      style={{
        position: "absolute",
        top: vertical ? 58 : 50,
        ...(vertical ? { left: 60 } : { right: 56 }),
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "8px 20px 8px 8px",
        borderRadius: 999,
        backgroundColor: "rgba(3,6,11,.62)",
        opacity: entra * 0.95,
      }}
    >
      <LogoRedondo logo={marca.logo} lado={lado} color={marca.acento} />
      <div
        style={{
          fontFamily: mono,
          fontWeight: 800,
          fontSize: vertical ? 30 : 26,
          letterSpacing: 1,
          color: marca.acento,
          textTransform: "uppercase",
        }}
      >
        {marca.nombre}_
      </div>
    </div>
  );
};

/** Barra de ventana de terminal: tres puntos y un nombre. */
const BarraVentana: React.FC<{ nombre: string; derecha?: string; alto?: number }> = ({
  nombre,
  derecha = "",
  alto = 44,
}) => (
  <div
    style={{
      height: alto,
      display: "flex",
      alignItems: "center",
      gap: 9,
      padding: "0 18px",
      backgroundColor: "rgba(255,255,255,.07)",
      borderBottom: "1px solid rgba(255,255,255,.08)",
      fontFamily: mono,
      fontWeight: 500,
      fontSize: alto * 0.44,
      color: "rgba(255,255,255,.55)",
    }}
  >
    {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
      <span
        key={c}
        style={{ width: alto * 0.3, height: alto * 0.3, borderRadius: "50%", backgroundColor: c }}
      />
    ))}
    <span style={{ marginLeft: 10, flex: 1 }}>{nombre}</span>
    <span>{derecha}</span>
  </div>
);

/** Título del video como una orden que se escribe en una terminal: entra, se teclea y se va a los 3 s. */
export const TituloTerminal: React.FC<{ texto: string; vertical: boolean; marca: MarcaVideo }> = ({
  texto,
  vertical,
  marca,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const entrada = spring({ frame, fps, config: { damping: 14, stiffness: 150 } });
  const salida = interpolate(frame, [durationInFrames - 10, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  // Se teclea en menos de un segundo: el título tiene que poder leerse entero dentro de los 3 s.
  const tecleo = Math.min(26, Math.max(10, Math.round(texto.length * 0.5)));
  const letras = Math.round(
    interpolate(frame, [5, 5 + tecleo], [0, texto.length], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
  );
  return (
    <AbsoluteFill
      style={{
        justifyContent: "flex-start",
        alignItems: "flex-start",
        padding: vertical ? "170px 60px" : "70px 80px",
        opacity: salida,
      }}
    >
      <div
        style={{
          transform: `translateY(${(1 - entrada) * -40}px)`,
          opacity: entrada,
          backgroundColor: PANEL_MARCA,
          border: `2px solid ${marca.acento}66`,
          borderRadius: 14,
          overflow: "hidden",
          maxWidth: vertical ? "100%" : "64%",
          boxShadow: `0 18px 60px rgba(0,0,0,.6), 0 0 40px ${marca.acento}22`,
        }}
      >
        <BarraVentana
          nombre={`${marca.usuario.replace(/^@/, "").toLowerCase()} — zsh`}
          alto={vertical ? 46 : 40}
        />
        <div
          style={{
            padding: vertical ? "20px 26px 24px" : "16px 26px 20px",
            fontFamily: mono,
            fontWeight: 800,
            fontSize: vertical ? 42 : 38,
            lineHeight: 1.18,
            color: "#fff",
          }}
        >
          <span style={{ color: marca.acento }}>&gt; </span>
          {texto.slice(0, letras)}
          <Cursor color={marca.acento} />
        </div>
      </div>
    </AbsoluteFill>
  );
};

/** Rótulo como un comentario de código: «// texto», en la esquina. */
export const RotuloCodigo: React.FC<{
  texto: string;
  vertical: boolean;
  retraso: number;
  marca: MarcaVideo;
  abajo?: boolean;
}> = ({ texto, vertical, retraso, marca, abajo = false }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const entrada = spring({ frame: frame - retraso, fps, config: { damping: 12, stiffness: 160 } });
  return (
    <AbsoluteFill
      style={{
        justifyContent: abajo ? "flex-end" : "flex-start",
        alignItems: "flex-start",
        padding: vertical ? 60 : 80,
        paddingTop: vertical ? 190 : 80,
        paddingBottom: abajo ? (vertical ? 560 : 200) : undefined,
      }}
    >
      <div
        style={{
          transform: `translateX(${(1 - entrada) * -50}px)`,
          opacity: entrada,
          backgroundColor: PANEL_MARCA,
          borderLeft: `8px solid ${marca.acento}`,
          fontFamily: mono,
          padding: "16px 28px",
          fontSize: vertical ? 46 : 44,
          fontWeight: 700,
          color: "#fff",
          maxWidth: vertical ? "100%" : "60%",
          lineHeight: 1.18,
          borderRadius: "0 12px 12px 0",
          boxShadow: `0 12px 40px rgba(0,0,0,.5)`,
        }}
      >
        <span style={{ color: marca.acento }}>{"// "}</span>
        {texto}
      </div>
    </AbsoluteFill>
  );
};

/** La noticia como una ventana de terminal (en vez del recorte de periódico viejo). */
export const TarjetaNoticia: React.FC<{
  recorte: NonNullable<PropsVideo["escenas"][number]["recorte"]>;
  retraso: number;
  marca: MarcaVideo;
  vertical: boolean;
  whoosh: string | null;
}> = ({ recorte, retraso, marca, vertical, whoosh }) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const entrada = spring({ frame: frame - retraso, fps, config: { damping: 16, stiffness: 120 } });
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      {whoosh && (
        <Sequence from={Math.max(0, retraso - 4)} name="whoosh-noticia">
          <Audio src={staticFile(whoosh)} volume={0.5} />
        </Sequence>
      )}
      <div
        style={{
          width: vertical ? "88%" : Math.min(1180, width * 0.64),
          transform: `translateX(${(1 - entrada) * -width * 0.7}px)`,
          backgroundColor: "rgba(6,10,16,.94)",
          border: `2px solid ${marca.acento}66`,
          borderRadius: 18,
          overflow: "hidden",
          boxShadow: `0 30px 80px rgba(0,0,0,.75), 0 0 60px ${marca.secundario}33`,
        }}
      >
        <BarraVentana nombre="noticias.log" derecha={recorte.fecha} alto={vertical ? 54 : 50} />
        <div style={{ padding: vertical ? "34px 38px 38px" : "40px 52px 46px" }}>
          <div
            style={{
              fontFamily: mono,
              fontWeight: 800,
              fontSize: vertical ? 56 : 62,
              lineHeight: 1.08,
              color: "#fff",
            }}
          >
            <span style={{ color: marca.acento }}>&gt; </span>
            {recorte.titular}
          </div>
          {recorte.cuerpo && (
            <div
              style={{
                marginTop: 24,
                fontFamily: sans,
                fontWeight: 500,
                fontSize: vertical ? 34 : 32,
                lineHeight: 1.35,
                color: "#c9d1d9",
              }}
            >
              {recorte.cuerpo}
            </div>
          )}
          <div
            style={{
              height: 6,
              marginTop: 28,
              width: "34%",
              borderRadius: 3,
              background: `linear-gradient(90deg, ${marca.acento}, ${marca.secundario})`,
            }}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
};

/** Cierre del video largo: el logo completo, «suscríbete» y el @ del canal. */
export const CierreMarca: React.FC<{
  marca: MarcaVideo;
  vertical: boolean;
  producto: PropsVideo["producto"];
}> = ({ marca, vertical, producto }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fondo = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: "clamp" });
  const logo = spring({ frame: frame - 6, fps, config: { damping: 13, stiffness: 110 } });
  const boton = spring({ frame: frame - 24, fps, config: { damping: 10, stiffness: 170 } });
  const pie = interpolate(frame, [38, 52], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const lado = vertical ? 760 : 520;
  const sitio = producto ? producto.url.replace(/^https?:\/\//, "").replace(/\/$/, "") : "";
  return (
    <AbsoluteFill style={{ opacity: fondo, backgroundColor: FONDO_MARCA }}>
      <AbsoluteFill
        style={{
          backgroundImage: `linear-gradient(${marca.acento}0f 1px, transparent 1px), linear-gradient(90deg, ${marca.acento}0f 1px, transparent 1px)`,
          backgroundSize: "64px 64px",
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 50% 42%, transparent 0%, ${FONDO_MARCA} 68%)`,
        }}
      />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <Img
          src={staticFile(marca.logo)}
          style={{
            width: lado,
            height: lado,
            opacity: Math.min(1, logo * 1.3),
            transform: `scale(${0.82 + logo * 0.18})`,
          }}
        />
        <div
          style={{
            marginTop: vertical ? 30 : 4,
            display: "flex",
            flexDirection: vertical ? "column" : "row",
            alignItems: "center",
            gap: vertical ? 26 : 30,
          }}
        >
          <div
            style={{
              transform: `scale(${0.6 + boton * 0.4})`,
              opacity: Math.min(1, boton * 1.4),
              backgroundColor: marca.acento,
              color: FONDO_MARCA,
              fontFamily: mono,
              fontWeight: 800,
              fontSize: vertical ? 56 : 44,
              letterSpacing: 2,
              padding: vertical ? "20px 48px" : "14px 38px",
              borderRadius: 16,
              boxShadow: `0 0 50px ${marca.acento}55`,
            }}
          >
            SUSCRÍBETE
          </div>
          <div
            style={{
              opacity: pie,
              fontFamily: mono,
              fontWeight: 700,
              fontSize: vertical ? 50 : 40,
              color: "#fff",
            }}
          >
            {marca.usuario}
            <Cursor color={marca.acento} />
          </div>
        </div>
        {producto && (
          <div
            style={{
              marginTop: 26,
              opacity: pie,
              fontFamily: mono,
              fontWeight: 500,
              fontSize: vertical ? 38 : 30,
              color: "rgba(255,255,255,.75)",
            }}
          >
            {producto.nombre} · <span style={{ color: marca.acento }}>{sitio}</span>
          </div>
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
