// Portada de impacto: la miniatura hecha para que le den clic. Tres cosas que
// se leen en un segundo y en chiquito: la cara (recortada, con borde blanco),
// una cifra o palabra enorme y un remate en una caja de color. Nada más.
// Horizontal (1280×720) para el video largo; vertical (1080×1920) para los Shorts.
import { loadFont } from "@remotion/google-fonts/Anton";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { letraQueCabe, partesDelRemate, type PropsPortada } from "./props";

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
const ROJO = "#ff1b1b";
/** Letra con borde negro grueso: se lee encima de cualquier fondo. */
const trazo = (px: number): React.CSSProperties => ({
  WebkitTextStroke: `${px}px ${NEGRO}`,
  paintOrder: "stroke fill",
});

/** Las medidas de cada formato: dónde va el texto y qué tan grande puede ser. */
const FORMATOS = {
  horizontal: {
    foco: "76% 40%",
    sombra: "linear-gradient(90deg, rgba(0,0,0,.55) 0%, rgba(0,0,0,.15) 46%, rgba(0,0,0,0) 62%)",
    velo: "linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 30%)",
    etiqueta: 50,
    grande: { maximo: 286, ancho: 580, trazo: 22 },
    linea: { maximo: 104, ancho: 610, trazo: 16 },
    remate: { maximo: 114, trazo: 8 },
    borde: 7,
  },
  vertical: {
    foco: "50% 62%",
    sombra: "linear-gradient(180deg, rgba(0,0,0,.6) 0%, rgba(0,0,0,.2) 42%, rgba(0,0,0,0) 60%)",
    velo: "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 22%)",
    etiqueta: 66,
    grande: { maximo: 320, ancho: 940, trazo: 26 },
    linea: { maximo: 124, ancho: 960, trazo: 18 },
    remate: { maximo: 122, trazo: 9 },
    borde: 9,
  },
} as const;

export const Portada: React.FC<PropsPortada> = (p) => {
  const vertical = p.formato === "vertical";
  const f = FORMATOS[p.formato];
  // Del objeto se enseña solo la parte de arriba que se pidió (la base de un trofeo trae otro nombre).
  const DISCO = 226;
  const cabe = p.objeto ? (DISCO * 0.98) / Math.hypot(p.objeto.ancho, p.objeto.alto * p.objeto.mostrar) : 0;
  const anchoObjeto = p.objeto ? p.objeto.ancho * cabe : 0;
  const altoObjeto = p.objeto ? p.objeto.alto * p.objeto.mostrar * cabe : 0;
  const conObjeto = Boolean(p.objeto) && !vertical;

  const palabras = partesDelRemate(p.remate);
  const textoRemate = palabras.map((w) => w.texto).join(" ");
  const anchoRemate = vertical ? 900 : 1280 - (conObjeto ? 284 : 44) - 90;
  const letraGrande = letraQueCabe(p.cifra, f.grande.ancho, f.grande.maximo);
  const letraLinea = letraQueCabe(p.linea, f.linea.ancho, f.linea.maximo);
  const letraRemate = letraQueCabe(textoRemate, anchoRemate, f.remate.maximo);

  const etiqueta = p.etiqueta && (
    <div
      style={{
        display: "inline-block",
        backgroundColor: NEGRO,
        color: "#fff",
        border: `${vertical ? 6 : 5}px solid ${p.acento}`,
        borderRadius: vertical ? 18 : 14,
        padding: vertical ? "8px 30px 6px" : "6px 22px 4px",
        fontSize: f.etiqueta,
        letterSpacing: 2,
        lineHeight: 1.1,
        whiteSpace: "nowrap",
      }}
    >
      {p.etiqueta}
    </div>
  );
  const grande = p.cifra && (
    <div
      style={{
        marginTop: vertical ? 30 : 22,
        fontSize: letraGrande,
        lineHeight: 0.92,
        color: p.acento,
        whiteSpace: "nowrap",
        ...trazo(Math.max(12, Math.round((f.grande.trazo * letraGrande) / f.grande.maximo))),
        textShadow: "0 12px 0 rgba(0,0,0,.55)",
      }}
    >
      {p.cifra}
    </div>
  );
  const linea = p.linea && (
    <div
      style={{
        marginTop: vertical ? 6 : -6,
        fontSize: letraLinea,
        lineHeight: 1,
        color: "#fff",
        letterSpacing: 1,
        whiteSpace: "nowrap",
        ...trazo(Math.max(10, Math.round((f.linea.trazo * letraLinea) / f.linea.maximo))),
      }}
    >
      {p.linea}
    </div>
  );
  const remate = p.remate && (
    <div
      style={{
        display: "inline-block",
        transform: `rotate(${vertical ? -3 : -4}deg)`,
        backgroundColor: ROJO,
        color: "#fff",
        border: `${f.remate.trazo}px solid ${NEGRO}`,
        boxShadow: `10px 10px 0 ${NEGRO}`,
        padding: "0 26px 2px",
        fontSize: letraRemate,
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
  );

  return (
    <AbsoluteFill style={{ backgroundColor: p.fondo[1], fontFamily, overflow: "hidden" }}>
      {/* Fondo: un foco de color detrás de la persona y rayos que salen de ahí. */}
      <AbsoluteFill
        style={{ background: `radial-gradient(circle at ${f.foco}, ${p.fondo[0]} 0%, ${p.fondo[1]} 68%)` }}
      />
      <AbsoluteFill
        style={{
          background: `repeating-conic-gradient(from 0deg at ${f.foco}, rgba(255,255,255,.075) 0deg 7deg, rgba(255,255,255,0) 7deg 18deg)`,
        }}
      />
      {/* Sin persona que recortar: una foto del video a pantalla completa, oscurecida detrás del texto. */}
      {!p.sujeto && p.fondoFoto && (
        // La foto ocupa el lado donde iría la persona y se funde con el color: el texto nunca le cae encima.
        <Img
          src={staticFile(p.fondoFoto)}
          style={{
            position: "absolute",
            ...(vertical
              ? { left: 0, top: 880, width: 1080, height: 1040 }
              : { left: 500, top: 0, width: 780, height: 720 }),
            objectFit: "cover",
            objectPosition: "50% 22%",
            maskImage: f.velo,
            WebkitMaskImage: f.velo,
          }}
        />
      )}
      <AbsoluteFill style={{ background: f.sombra }} />

      {/* La persona: recortada, grande, con borde blanco. Quien arma la portada ya calculó dónde va. */}
      {p.sujeto && (
        <Img
          src={staticFile(p.sujeto.ruta)}
          style={{
            position: "absolute",
            left: p.sujeto.izquierda,
            top: p.sujeto.arriba,
            width: p.sujeto.ancho,
            height: p.sujeto.alto,
            maxWidth: "none",
            filter: `${borde(f.borde, "#fff")} drop-shadow(0 18px 40px rgba(0,0,0,.75))`,
          }}
        />
      )}

      {vertical ? (
        // Vertical: todo el texto arriba, centrado; la persona debajo. Nada tapa la cara.
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 250,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          {etiqueta}
          {grande}
          {linea}
          <div style={{ marginTop: 34 }}>{remate}</div>
        </div>
      ) : (
        <>
          {/* Horizontal, izquierda arriba: quién es, lo enorme y lo que cuenta. */}
          <div style={{ position: "absolute", left: 44, top: 22 }}>
            {etiqueta}
            {grande}
            {linea}
          </div>
          {/* Izquierda abajo: el objeto en un disco claro (con la señal de prohibido, si toca)… */}
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
                  left: (DISCO - anchoObjeto) / 2,
                  top: (DISCO - altoObjeto) / 2,
                  width: anchoObjeto,
                  height: altoObjeto,
                  overflow: "hidden",
                }}
              >
                <Img
                  src={staticFile(p.objeto.ruta)}
                  style={{
                    display: "block",
                    width: anchoObjeto,
                    height: (anchoObjeto * p.objeto.alto) / p.objeto.ancho,
                    maxWidth: "none",
                  }}
                />
              </div>
              {p.objeto.tachado && (
                <svg
                  viewBox="0 0 100 100"
                  style={{ position: "absolute", left: 0, top: 0, width: DISCO, height: DISCO }}
                >
                  <circle cx="50" cy="50" r="45.5" fill="none" stroke={ROJO} strokeWidth="9" />
                  <path d="M18 18 L82 82" stroke={ROJO} strokeWidth="9" />
                </svg>
              )}
            </div>
          )}
          {/* …y el remate en su caja. */}
          <div style={{ position: "absolute", left: conObjeto ? 284 : 44, bottom: 34 }}>{remate}</div>
        </>
      )}
    </AbsoluteFill>
  );
};
