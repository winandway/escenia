// Estilo neón: una escena explicada con un diagrama. Arriba, por dónde va el
// video (las secciones) y el titular de la escena; en el centro, los objetos de
// neón parados en sus baldosas, que se encienden cuando la voz los nombra, y las
// flechas que los unen, con un pulso de luz que viaja por ellas. Nada se queda
// quieto: los objetos flotan, los pulsos corren y la cámara se acerca despacio.
import { loadFont as cargarAnton } from "@remotion/google-fonts/Anton";
import { loadFont as cargarInter } from "@remotion/google-fonts/Inter";
import { loadFont as cargarMono } from "@remotion/google-fonts/JetBrainsMono";
import {
  AbsoluteFill,
  Audio,
  interpolate,
  random,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { sitiosDeNodos, type Sitio } from "./diagrama-sitios";
import { usePresentador } from "./Presentador";
import { Baldosa, iconoNeon } from "./IconosNeon";
import { FPS, type DiagramaVideo } from "./props";

const { fontFamily: anton } = cargarAnton("normal", { weights: ["400"], subsets: ["latin", "latin-ext"] });
const { fontFamily: inter } = cargarInter("normal", {
  weights: ["500", "800"],
  subsets: ["latin", "latin-ext"],
});
const { fontFamily: mono } = cargarMono("normal", {
  weights: ["500", "700"],
  subsets: ["latin", "latin-ext"],
});

/** Los colores del neón. Con marca de canal, el acento y el secundario son los del canal. */
export type ColoresNeon = { objeto: string; luz: string; aviso: string; rosa: string };
export const NEON: ColoresNeon = { objeto: "#a78bfa", luz: "#67e8f9", aviso: "#fbbf24", rosa: "#fb7185" };

const brillo = (color: string, fuerza = 1) =>
  `drop-shadow(0 0 ${5 * fuerza}px ${color}) drop-shadow(0 0 ${16 * fuerza}px ${color}aa)`;

/** El fondo: morado profundo, un piso de rejilla en perspectiva y motas de luz que suben. */
export const FondoNeon: React.FC<{ colores: ColoresNeon }> = ({ colores }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const corre = (frame * 0.35) % 60;
  return (
    <AbsoluteFill style={{ backgroundColor: "#070412", overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 90% 60% at 50% 22%, #2a1558 0%, #150a2e 46%, #070412 100%)`,
        }}
      />
      <svg
        width={width}
        height={height}
        style={{
          position: "absolute",
          inset: 0,
          maskImage: "linear-gradient(180deg, transparent 22%, #000 62%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(180deg, transparent 22%, #000 62%, transparent 100%)",
        }}
      >
        <defs>
          <pattern
            id="rejilla-neon"
            width={104}
            height={60}
            patternUnits="userSpaceOnUse"
            x={corre * 1.73}
            y={corre}
          >
            <path
              d="M 0 30 L 52 0 L 104 30 L 52 60 Z"
              fill="none"
              stroke={colores.objeto}
              strokeOpacity={0.16}
              strokeWidth={1.4}
            />
          </pattern>
        </defs>
        <rect width={width} height={height} fill="url(#rejilla-neon)" />
      </svg>
      {Array.from({ length: 16 }, (_, k) => {
        const x = random(`mota-x-${k}`) * width;
        const ritmo = 0.5 + random(`mota-v-${k}`) * 0.9;
        const y = height - ((frame * ritmo + random(`mota-y-${k}`) * height) % height);
        const r = 1.6 + random(`mota-r-${k}`) * 2.6;
        return (
          <div
            key={k}
            style={{
              position: "absolute",
              left: x,
              top: y,
              width: r * 2,
              height: r * 2,
              borderRadius: "50%",
              backgroundColor: k % 3 === 0 ? colores.luz : colores.objeto,
              opacity: 0.22 + random(`mota-o-${k}`) * 0.3,
              boxShadow: `0 0 10px ${colores.objeto}`,
            }}
          />
        );
      })}
      <AbsoluteFill
        style={{ background: "radial-gradient(ellipse at 50% 50%, transparent 55%, rgba(0,0,0,.6) 100%)" }}
      />
    </AbsoluteFill>
  );
};

/** Arriba del todo: las secciones del video, con una línea que avanza por la que se está contando. */
const BarraDeSecciones: React.FC<{
  secciones: string[];
  actual: number;
  avance: number;
  vertical: boolean;
  colores: ColoresNeon;
}> = ({ secciones, actual, avance, vertical, colores }) => {
  if (secciones.length < 2) return null;
  return (
    <div
      style={{
        position: "absolute",
        top: vertical ? 172 : 46,
        left: vertical ? 70 : 150,
        // En horizontal, el logo del canal va arriba a la derecha: la barra no llega hasta ahí.
        right: vertical ? 70 : 470,
        display: "flex",
        gap: vertical ? 18 : 26,
      }}
    >
      {secciones.map((s, k) => {
        const lleno = k < actual ? 1 : k === actual ? avance : 0;
        return (
          <div key={k} style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontFamily: mono,
                fontWeight: 700,
                fontSize: vertical ? 23 : 22,
                letterSpacing: 3,
                color: k === actual ? colores.luz : k < actual ? colores.objeto : "rgba(255,255,255,.42)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "clip",
              }}
            >
              {s.toUpperCase()}
            </div>
            <div
              style={{
                marginTop: 10,
                height: 4,
                borderRadius: 2,
                backgroundColor: "rgba(255,255,255,.13)",
                position: "relative",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: `${lleno * 100}%`,
                  borderRadius: 2,
                  background:
                    k === actual
                      ? `linear-gradient(90deg, ${colores.objeto}, ${colores.luz})`
                      : colores.objeto,
                  boxShadow: k === actual ? `0 0 12px ${colores.luz}` : undefined,
                }}
              />
              {k === actual && (
                <div
                  style={{
                    position: "absolute",
                    left: `${lleno * 100}%`,
                    top: -5,
                    width: 14,
                    height: 14,
                    marginLeft: -7,
                    borderRadius: "50%",
                    backgroundColor: colores.luz,
                    boxShadow: `0 0 14px ${colores.luz}`,
                  }}
                />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

/** El titular de la escena. Corto («NO NECESARIAMENTE») va enorme; largo, como un título con su número. */
const TitularNeon: React.FC<{
  numero: number;
  estado: string;
  titular: string;
  bajada: string;
  formula: string;
  formulaVisible: number;
  vertical: boolean;
  colores: ColoresNeon;
}> = ({ numero, estado, titular, bajada, formula, formulaVisible, vertical, colores }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const entra = spring({ frame: frame - 3, fps, config: { damping: 16, stiffness: 150 } });
  const parpadeo = 0.55 + 0.45 * Math.sin(frame / 5);
  const ancho = vertical ? 940 : 1560;
  const golpe = titular.length > 0 && titular.length <= 20 && !titular.includes(":");
  // Lo que va antes de los dos puntos (o las dos primeras palabras) sale en el color del objeto.
  const corte = titular.includes(":")
    ? titular.indexOf(":") + 1
    : titular.split(" ").slice(0, 2).join(" ").length;
  const primero = titular.slice(0, corte);
  const resto = titular.slice(corte);
  const tamGolpe = Math.min(vertical ? 190 : 170, ancho / (Math.max(4, titular.length) * 0.5));
  return (
    <div
      style={{
        position: "absolute",
        top: vertical ? 236 : 104,
        left: 0,
        right: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        opacity: entra,
        transform: `translateY(${(1 - entra) * -26}px)`,
      }}
    >
      <div
        style={{
          fontFamily: mono,
          fontWeight: 700,
          fontSize: vertical ? 24 : 21,
          letterSpacing: 7,
          color: "rgba(255,255,255,.72)",
          display: "flex",
          alignItems: "center",
          gap: 14,
        }}
      >
        <span
          style={{
            width: 11,
            height: 11,
            borderRadius: "50%",
            backgroundColor: "#34d399",
            opacity: parpadeo,
            boxShadow: "0 0 10px #34d399",
          }}
        />
        {estado.toUpperCase()}
      </div>
      {golpe ? (
        <div
          style={{
            marginTop: vertical ? 26 : 12,
            fontFamily: anton,
            fontSize: tamGolpe,
            lineHeight: 1,
            letterSpacing: 1,
            textTransform: "uppercase",
            whiteSpace: "nowrap",
            color: "#f4f1ff",
            textShadow: `0 0 34px ${colores.objeto}88`,
          }}
        >
          <span style={{ color: colores.rosa, textShadow: `0 0 34px ${colores.rosa}88` }}>
            {titular.split(" ")[0]}
          </span>
          {titular.slice((titular.split(" ")[0] ?? "").length)}
        </div>
      ) : (
        <div
          style={{
            marginTop: vertical ? 26 : 14,
            maxWidth: ancho,
            textAlign: "center",
            fontFamily: inter,
            fontWeight: 800,
            fontSize: vertical ? 78 : 66,
            lineHeight: 1.08,
            letterSpacing: -1.5,
            color: "#f4f1ff",
          }}
        >
          <span
            style={{
              display: "inline-block",
              verticalAlign: "middle",
              marginRight: 18,
              padding: vertical ? "2px 14px" : "2px 12px",
              border: `3px solid ${colores.luz}`,
              borderRadius: 12,
              fontFamily: mono,
              fontWeight: 700,
              fontSize: vertical ? 40 : 34,
              letterSpacing: 2,
              color: colores.luz,
              boxShadow: `0 0 18px ${colores.luz}66`,
              transform: "translateY(-6px)",
            }}
          >
            {String(numero).padStart(2, "0")}
          </span>
          <span style={{ color: colores.objeto, textShadow: `0 0 26px ${colores.objeto}88` }}>{primero}</span>
          {resto}
        </div>
      )}
      {bajada && (
        <div
          style={{
            marginTop: vertical ? 22 : 12,
            maxWidth: ancho,
            textAlign: "center",
            fontFamily: inter,
            fontWeight: 500,
            fontSize: vertical ? 44 : 38,
            lineHeight: 1.2,
            color: "#c9c2e8",
          }}
        >
          {bajada}
        </div>
      )}
      {/* La fórmula: la idea de la escena en una línea, como una nota del plano. Va aquí arriba,
          pegada al titular, para que nunca le caiga encima a un objeto ni a su tarjeta. */}
      {formula && formulaVisible > 0 && (
        <div
          style={{
            marginTop: vertical ? 22 : 14,
            opacity: formulaVisible,
            transform: `translateY(${(1 - formulaVisible) * 14}px)`,
            padding: vertical ? "8px 24px" : "6px 22px",
            borderRadius: 14,
            backgroundColor: "rgba(12,8,28,.88)",
            border: `2px solid ${colores.aviso}99`,
            boxShadow: `0 0 18px ${colores.aviso}33`,
            fontFamily: mono,
            fontWeight: 500,
            fontSize: Math.min(vertical ? 34 : 30, (vertical ? 1500 : 2300) / Math.max(20, formula.length)),
            color: "#fde9b8",
            whiteSpace: "nowrap",
          }}
        >
          {formula}
        </div>
      )}
    </div>
  );
};

/** La tarjeta con el nombre de un objeto: su número, el nombre y, si hay, una nota. */
const Etiqueta: React.FC<{
  numero: number;
  texto: string;
  nota: string;
  sitio: Sitio;
  vertical: boolean;
  visible: number;
  activa: boolean;
  colores: ColoresNeon;
}> = ({ numero, texto, nota, sitio, vertical, visible, activa, colores }) => {
  const radio = 64 * 0.866 * 2 * sitio.s;
  const base: React.CSSProperties =
    sitio.lado === "abajo"
      ? {
          left: sitio.x,
          top: sitio.y + 64 * sitio.s + 22,
          transform: `translateX(-50%) translateY(${(1 - visible) * 16}px)`,
        }
      : sitio.lado === "derecha"
        ? {
            left: sitio.x + radio + 26,
            top: sitio.y - 50 * sitio.s,
            transform: `translateY(-50%) translateX(${(1 - visible) * -18}px)`,
          }
        : {
            right: (vertical ? 1080 : 1920) - sitio.x + radio + 26,
            top: sitio.y - 50 * sitio.s,
            transform: `translateY(-50%) translateX(${(1 - visible) * 18}px)`,
          };
  const grande = (vertical ? 42 : 38) * Math.min(1.2, Math.max(0.84, sitio.s));
  return (
    <div
      style={{
        position: "absolute",
        ...base,
        opacity: visible,
        maxWidth: vertical ? 400 : 380,
        padding: "12px 18px 14px",
        borderRadius: 14,
        backgroundColor: "rgba(16,10,36,.84)",
        border: `2px solid ${activa ? colores.luz : `${colores.objeto}88`}`,
        boxShadow: activa ? `0 0 22px ${colores.luz}55` : "0 8px 26px rgba(0,0,0,.5)",
        textAlign: sitio.lado === "abajo" ? "center" : "left",
      }}
    >
      <div
        style={{
          fontFamily: mono,
          fontWeight: 700,
          fontSize: grande * 0.5,
          letterSpacing: 3,
          color: colores.luz,
        }}
      >
        {String(numero).padStart(2, "0")}
      </div>
      <div style={{ fontFamily: inter, fontWeight: 800, fontSize: grande, lineHeight: 1.08, color: "#fff" }}>
        {texto}
      </div>
      {nota && (
        <div
          style={{
            display: "inline-block",
            marginTop: 8,
            padding: "3px 12px",
            borderRadius: 999,
            border: `1.5px solid ${colores.aviso}aa`,
            fontFamily: mono,
            fontWeight: 500,
            fontSize: grande * 0.5,
            color: colores.aviso,
          }}
        >
          ● {nota}
        </div>
      )}
    </div>
  );
};

export const DiagramaNeon: React.FC<{
  diagrama: DiagramaVideo;
  /** Tiempo del video largo en el primer cuadro de esta escena en pantalla. */
  desdeMs: number;
  durFrames: number;
  /** Cuándo empieza y termina la escena entera (para la línea de avance de arriba). */
  inicioMs: number;
  finMs: number;
  vertical: boolean;
  colores: ColoresNeon;
  /** Sonido de cada objeto que entra y de cada flecha. */
  sonidoNodo: string | null;
  sonidoFlecha: string | null;
}> = ({ diagrama, desdeMs, durFrames, inicioMs, finMs, vertical, colores, sonidoNodo, sonidoFlecha }) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const tMs = desdeMs + (frame / FPS) * 1000;
  const aFrame = (ms: number) => Math.round(((ms - desdeMs) / 1000) * FPS);
  const { activo: hayPresentador } = usePresentador();
  const sitios = sitiosDeNodos(diagrama.nodos.length, vertical);
  const porId = new Map(diagrama.nodos.map((n, k) => [n.id, k] as const));
  // El objeto «activo» es el último que entró: brilla más y su tarjeta se enciende.
  const activo = diagrama.nodos.reduce((ultimo, n, k) => (n.entraMs <= tMs ? k : ultimo), -1);
  const avance = interpolate(tMs, [inicioMs, finMs], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const acerca = interpolate(frame, [0, Math.max(1, durFrames)], [1, 1.045], { extrapolateRight: "clamp" });
  const paleta = [colores.objeto, colores.luz, colores.rosa, colores.aviso];
  const total = diagrama.nodos.length;
  const estado =
    total > 1 && activo >= 0
      ? `Paso ${activo + 1} de ${total}`
      : (diagrama.secciones[diagrama.seccion] ?? "En vivo");

  return (
    <AbsoluteFill>
      <FondoNeon colores={colores} />
      <AbsoluteFill
        style={{
          // Con presentador en horizontal, el escenario se achica hacia la izquierda: él va abajo a la derecha.
          transform: `scale(${acerca * (hayPresentador && !vertical ? 0.77 : 1)})`,
          transformOrigin: hayPresentador && !vertical ? "0% 56%" : vertical ? "50% 52%" : "50% 58%",
        }}
      >
        <svg width={width} height={height} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
          {/* Las flechas, debajo de los objetos: primero la guía tenue, encima la que se enciende. */}
          {diagrama.flechas.map((f, k) => {
            const a = sitios[porId.get(f.de) ?? -1];
            const b = sitios[porId.get(f.a) ?? -1];
            if (!a || !b) return null;
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const largo = Math.hypot(dx, dy) || 1;
            const ux = dx / largo;
            const uy = dy / largo;
            // La flecha sale del borde de una baldosa y llega al borde de la otra (un rombo de 111 × 64).
            const alBorde = (s: number) => s / (Math.abs(ux) / 111 + Math.abs(uy) / 64);
            const ra = alBorde(a.s) + 6;
            const rb = alBorde(b.s) + 22;
            const x1 = a.x + ux * ra;
            const y1 = a.y + uy * ra;
            const x2 = b.x - ux * rb;
            const y2 = b.y - uy * rb;
            const tramo = Math.hypot(x2 - x1, y2 - y1);
            const local = frame - aFrame(f.entraMs);
            const dibuja = interpolate(local, [0, 14], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            const pulso = local > 14 ? ((local - 14) % 46) / 46 : -1;
            return (
              <g key={`f${k}`}>
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={colores.objeto}
                  strokeOpacity={0.28}
                  strokeWidth={3}
                  strokeDasharray="3 12"
                  strokeLinecap="round"
                />
                {dibuja > 0 && (
                  <g style={{ filter: brillo(colores.luz, 0.8) }}>
                    <line
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke={colores.luz}
                      strokeWidth={4.5}
                      strokeLinecap="round"
                      strokeDasharray={tramo}
                      strokeDashoffset={tramo * (1 - dibuja)}
                    />
                    {dibuja >= 1 && (
                      <polygon
                        points={`${x2 + ux * 16},${y2 + uy * 16} ${x2 - ux * 12 - uy * 13},${y2 - uy * 12 + ux * 13} ${x2 - ux * 12 + uy * 13},${y2 - uy * 12 - ux * 13}`}
                        fill={colores.luz}
                      />
                    )}
                    {pulso >= 0 && (
                      <circle cx={x1 + (x2 - x1) * pulso} cy={y1 + (y2 - y1) * pulso} r={9} fill="#fff" />
                    )}
                  </g>
                )}
              </g>
            );
          })}
          {/* Los objetos: antes de que la voz los nombre se ven apagados, como un plano; después se encienden. */}
          {diagrama.nodos.map((n, k) => {
            const sitio = sitios[k];
            if (!sitio) return null;
            const local = frame - aFrame(n.entraMs);
            const entra = spring({ frame: local, fps, config: { damping: 12, stiffness: 150, mass: 0.9 } });
            const prendido = local >= 0 ? Math.min(1, entra) : 0;
            const esActivo = k === activo;
            const color = paleta[k % paleta.length] ?? colores.objeto;
            const flota = Math.sin((frame + k * 23) / 22) * 5 * prendido;
            const onda = local >= 0 ? (local % 54) / 54 : 0;
            const lado = 64;
            return (
              <g key={n.id} transform={`translate(${sitio.x} ${sitio.y}) scale(${sitio.s})`}>
                <defs>
                  <linearGradient id={`haz-${k}`} x1="0" y1="1" x2="0" y2="0">
                    <stop offset="0" stopColor={color} stopOpacity={0.5} />
                    <stop offset="1" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <g opacity={0.22 + prendido * 0.78}>
                  <g style={{ filter: prendido > 0 ? brillo(color, esActivo ? 1 : 0.55) : undefined }}>
                    <Baldosa
                      color={prendido > 0 ? color : colores.objeto}
                      encendida={esActivo ? 1 : prendido * 0.4}
                      lado={lado}
                    />
                  </g>
                  {esActivo && (
                    <polygon
                      points={`${-lado * 0.95},0 ${lado * 0.95},0 ${lado * 1.5},${-150} ${-lado * 1.5},${-150}`}
                      fill={`url(#haz-${k})`}
                      opacity={0.5 + 0.2 * Math.sin(frame / 7)}
                    />
                  )}
                  {esActivo && (
                    <ellipse
                      cx={0}
                      cy={0}
                      rx={lado * 1.2247 * (0.9 + onda * 0.9)}
                      ry={lado * 0.7071 * (0.9 + onda * 0.9)}
                      fill="none"
                      stroke={color}
                      strokeWidth={3}
                      strokeOpacity={(1 - onda) * 0.8}
                    />
                  )}
                  <g
                    transform={`translate(0 ${-flota - (1 - Math.min(1, entra)) * (local >= 0 ? 46 : 0)}) scale(${local >= 0 ? 0.82 + entra * 0.18 : 0.92})`}
                    style={{ filter: prendido > 0 ? brillo(color, esActivo ? 1.15 : 0.6) : undefined }}
                  >
                    {iconoNeon(
                      n.icono,
                      prendido > 0 ? color : colores.objeto,
                      prendido > 0 ? (color === colores.luz ? colores.objeto : colores.luz) : colores.objeto,
                    )}
                  </g>
                </g>
              </g>
            );
          })}
        </svg>
        {diagrama.nodos.map((n, k) => {
          const sitio = sitios[k];
          if (!sitio) return null;
          const local = frame - aFrame(n.entraMs);
          const visible = interpolate(local, [3, 13], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          return (
            <Etiqueta
              key={n.id}
              numero={k + 1}
              texto={n.etiqueta}
              nota={n.nota}
              sitio={sitio}
              vertical={vertical}
              visible={visible}
              activa={k === activo}
              colores={colores}
            />
          );
        })}
      </AbsoluteFill>

      <BarraDeSecciones
        secciones={diagrama.secciones}
        actual={diagrama.seccion}
        avance={avance}
        vertical={vertical}
        colores={colores}
      />
      <TitularNeon
        numero={diagrama.numero}
        estado={estado}
        titular={diagrama.titular}
        bajada={diagrama.bajada}
        formula={diagrama.formula}
        formulaVisible={interpolate(frame - aFrame(diagrama.formulaMs ?? inicioMs), [0, 12], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })}
        vertical={vertical}
        colores={colores}
      />

      {/* Cada cosa que entra, suena: un toque por objeto y un soplido por flecha. */}
      {diagrama.nodos.map((n, k) => {
        const desde = aFrame(n.entraMs);
        return desde >= 0 && sonidoNodo ? (
          <Sequence key={`sn${k}`} from={desde} durationInFrames={FPS} name={`objeto ${k + 1}`}>
            <Audio src={staticFile(sonidoNodo)} volume={vertical ? 0.34 : 0.28} />
          </Sequence>
        ) : null;
      })}
      {diagrama.flechas.map((f, k) => {
        const desde = aFrame(f.entraMs);
        return desde >= 0 && sonidoFlecha ? (
          <Sequence key={`sf${k}`} from={desde} durationInFrames={FPS} name={`flecha ${k + 1}`}>
            <Audio src={staticFile(sonidoFlecha)} volume={0.2} />
          </Sequence>
        ) : null;
      })}
    </AbsoluteFill>
  );
};

/**
 * Una escena de un video de neón que no trae diagrama (la opinión, un cierre):
 * el mismo fondo, la frase en grande y unas barras de sonido que no paran.
 */
export const LaminaNeon: React.FC<{
  etiqueta: string;
  texto: string;
  vertical: boolean;
  colores: ColoresNeon;
}> = ({ etiqueta, texto, vertical, colores }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const entra = spring({ frame: frame - 4, fps, config: { damping: 15, stiffness: 140 } });
  const barras = vertical ? 26 : 40;
  return (
    <AbsoluteFill>
      <FondoNeon colores={colores} />
      <AbsoluteFill
        style={{ justifyContent: "center", alignItems: "center", paddingBottom: vertical ? 420 : 160 }}
      >
        <div
          style={{
            fontFamily: mono,
            fontWeight: 700,
            fontSize: vertical ? 30 : 26,
            letterSpacing: 8,
            color: colores.luz,
            opacity: entra,
          }}
        >
          ● {etiqueta.toUpperCase()}
        </div>
        {texto && (
          <div
            style={{
              marginTop: 26,
              maxWidth: vertical ? 940 : 1500,
              textAlign: "center",
              fontFamily: inter,
              fontWeight: 800,
              fontSize: vertical ? 84 : 76,
              lineHeight: 1.08,
              letterSpacing: -1.5,
              color: "#f4f1ff",
              textShadow: `0 0 34px ${colores.objeto}88`,
              opacity: entra,
              transform: `scale(${0.94 + entra * 0.06})`,
            }}
          >
            {texto}
          </div>
        )}
        <div
          style={{
            marginTop: 60,
            height: vertical ? 220 : 170,
            display: "flex",
            alignItems: "center",
            gap: vertical ? 12 : 11,
          }}
        >
          {Array.from({ length: barras }, (_, k) => {
            const alto =
              0.18 +
              0.82 * Math.abs(Math.sin(frame / (5 + (k % 5)) + k * 0.9) * Math.cos(frame / 13 + k * 0.37));
            return (
              <div
                key={k}
                style={{
                  width: vertical ? 14 : 13,
                  height: `${alto * 100}%`,
                  borderRadius: 8,
                  background: `linear-gradient(180deg, ${colores.luz}, ${colores.objeto})`,
                  boxShadow: `0 0 14px ${colores.objeto}aa`,
                }}
              />
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
