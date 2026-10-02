// Portada de impacto, 1280×720: la miniatura hecha para que le den clic. Tres
// cosas que se leen en un segundo y en chiquito: la cara (recortada, con borde
// blanco), una cifra enorme y un remate en una caja de color. Nada más.
import { loadFont } from "@remotion/google-fonts/Anton";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { partesDelRemate, type PropsPortada } from "./props";

const { fontFamily } = loadFont("normal", { weights: ["400"], subsets: ["latin", "latin-ext"] });

/** Borde alrededor de una figura recortada: la misma sombra dura en ocho direcciones. */
function borde(px: number, color: string): string {
  const d = Math.round(px * 0.72);
  return [
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
}

const NEGRO = "#0a0a0a";
/** Letra con borde negro grueso: se lee encima de cualquier fondo. */
const trazo = (px: number): React.CSSProperties => ({
  WebkitTextStroke: `${px}px ${NEGRO}`,
  paintOrder: "stroke fill",
});

export const Portada: React.FC<PropsPortada> = (p) => {
  // Al acercar, la persona crece hacia abajo: la cabeza se queda arriba y la cara gana tamaño.
  const altoSujeto = Math.round(800 * p.acercar);
  const anchoSujeto = (altoSujeto * p.sujeto.ancho) / p.sujeto.alto;
  // Del objeto se enseña solo la parte de arriba que se pidió (la base de un trofeo trae otro nombre).
  const DISCO = 226;
  const cabe = p.objeto ? (DISCO * 0.98) / Math.hypot(p.objeto.ancho, p.objeto.alto * p.objeto.mostrar) : 0;
  const ANCHO_OBJETO = p.objeto ? p.objeto.ancho * cabe : 0;
  const altoObjeto = p.objeto ? p.objeto.alto * p.objeto.mostrar * cabe : 0;
  // El remate, palabra por palabra: lo que va entre asteriscos sale en el color de acento.
  const palabras = partesDelRemate(p.remate);
  const letrasRemate = palabras.map((w) => w.texto).join(" ").length;
  return (
    <AbsoluteFill style={{ backgroundColor: p.fondo[1], fontFamily, overflow: "hidden" }}>
      {/* Fondo: un foco de color detrás de la persona y rayos que salen de ahí. */}
      <AbsoluteFill
        style={{ background: `radial-gradient(circle at 74% 42%, ${p.fondo[0]} 0%, ${p.fondo[1]} 68%)` }}
      />
      <AbsoluteFill
        style={{
          background:
            "repeating-conic-gradient(from 0deg at 74% 42%, rgba(255,255,255,.075) 0deg 7deg, rgba(255,255,255,0) 7deg 18deg)",
        }}
      />
      <AbsoluteFill
        style={{
          background: "linear-gradient(90deg, rgba(0,0,0,.55) 0%, rgba(0,0,0,.15) 46%, rgba(0,0,0,0) 62%)",
        }}
      />

      {/* La persona: recortada, grande, a la derecha, con borde blanco. */}
      <Img
        src={staticFile(p.sujeto.ruta)}
        style={{
          position: "absolute",
          right: -30 - Math.round(260 * (p.acercar - 1)),
          top: 14,
          height: altoSujeto,
          width: anchoSujeto,
          maxWidth: "none",
          filter: `${borde(7, "#fff")} drop-shadow(0 18px 40px rgba(0,0,0,.75))`,
        }}
      />

      {/* Izquierda arriba: quién es, la cifra enorme y lo que cuenta. */}
      <div style={{ position: "absolute", left: 44, top: 22 }}>
        {p.etiqueta && (
          <div
            style={{
              display: "inline-block",
              backgroundColor: NEGRO,
              color: "#fff",
              border: `5px solid ${p.acento}`,
              borderRadius: 14,
              padding: "6px 22px 4px",
              fontSize: 50,
              letterSpacing: 2,
              lineHeight: 1.1,
            }}
          >
            {p.etiqueta}
          </div>
        )}
        <div
          style={{
            marginTop: 22,
            fontSize: 286,
            lineHeight: 0.92,
            color: p.acento,
            ...trazo(22),
            textShadow: "0 12px 0 rgba(0,0,0,.55)",
          }}
        >
          {p.cifra}
        </div>
        <div
          style={{
            marginTop: -6,
            fontSize: p.linea.length > 13 ? 84 : 104,
            lineHeight: 1,
            color: "#fff",
            letterSpacing: 1,
            ...trazo(16),
          }}
        >
          {p.linea}
        </div>
      </div>

      {/* Izquierda abajo: el objeto en un disco claro (tachado como una señal de prohibido, si toca)… */}
      {p.objeto && (
        <div
          style={{
            position: "absolute",
            left: 30,
            bottom: 14,
            width: DISCO,
            height: DISCO,
            borderRadius: "50%",
            background: "radial-gradient(circle at 50% 38%, #ffffff 0%, #e9e2d0 100%)",
            boxShadow: `0 0 0 7px ${NEGRO}, 0 14px 30px rgba(0,0,0,.7)`,
          }}
        >
          <div
            style={{
              position: "absolute",
              left: (DISCO - ANCHO_OBJETO) / 2,
              top: (DISCO - altoObjeto) / 2,
              width: ANCHO_OBJETO,
              height: altoObjeto,
              overflow: "hidden",
            }}
          >
            <Img
              src={staticFile(p.objeto.ruta)}
              style={{
                display: "block",
                width: ANCHO_OBJETO,
                height: (ANCHO_OBJETO * p.objeto.alto) / p.objeto.ancho,
                maxWidth: "none",
              }}
            />
          </div>
          {p.objeto.tachado && (
            <svg
              viewBox="0 0 100 100"
              style={{ position: "absolute", left: 0, top: 0, width: DISCO, height: DISCO }}
            >
              <circle cx="50" cy="50" r="45.5" fill="none" stroke="#ff1b1b" strokeWidth="9" />
              <path d="M18 18 L82 82" stroke="#ff1b1b" strokeWidth="9" />
            </svg>
          )}
        </div>
      )}
      {/* …y el remate en su caja. */}
      {p.remate && (
        <div
          style={{
            position: "absolute",
            left: p.objeto ? 284 : 44,
            bottom: 34,
            transform: "rotate(-4deg)",
            backgroundColor: "#ff1b1b",
            color: "#fff",
            border: `8px solid ${NEGRO}`,
            boxShadow: `10px 10px 0 ${NEGRO}`,
            padding: "0 26px 2px",
            fontSize: letrasRemate > 10 ? 114 : 150,
            lineHeight: 1.12,
            letterSpacing: 1,
            whiteSpace: "nowrap",
          }}
        >
          {palabras.map((w, k) => (
            <span
              key={k}
              style={{
                color: w.marcada ? p.acento : "#fff",
                marginRight: k < palabras.length - 1 ? "0.22em" : 0,
              }}
            >
              {w.texto}
            </span>
          ))}
        </div>
      )}
    </AbsoluteFill>
  );
};
