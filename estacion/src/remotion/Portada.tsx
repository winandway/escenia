// Portada de impacto: la miniatura hecha para que le den clic. Tres cosas que
// se leen en un segundo y en chiquito: la cara (recortada, con borde blanco),
// una cifra o palabra enorme y un remate en una caja de color. Nada más.
// Horizontal (1280×720) para el video largo; vertical (1080×1920) para los Shorts.
//
// El fondo (rehecho el 5 oct 2026): Richard pidió no usar más el de rayos sobre morado
// («no es un diseño serio, no es de enganche»). Ahora es oscuro, casi negro, con una luz
// fuerte de color detrás de la persona, un panel inclinado que le da fondo y una trama de
// puntos. Sin persona, la luz y el panel siguen ahí: nunca queda un fondo vacío.
import { loadFont } from "@remotion/google-fonts/Anton";
import { loadFont as cargarInter } from "@remotion/google-fonts/Inter";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { letraQueCabe, partesDeLinea, partesDelRemate, type PropsPortada } from "./props";

const { fontFamily } = loadFont("normal", { weights: ["400"], subsets: ["latin", "latin-ext"] });
const { fontFamily: inter } = cargarInter("normal", { weights: ["800"], subsets: ["latin", "latin-ext"] });

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
    foco: "77% 44%",
    // El panel inclinado detrás de la persona (de arriba a abajo, más ancho abajo).
    panel: "polygon(57% 0%, 100% 0%, 100% 100%, 46% 100%)",
    filo: "polygon(57% 0%, 57.5% 0%, 46.5% 100%, 46% 100%)",
    chip: 44,
    sombra: "linear-gradient(90deg, rgba(0,0,0,.62) 0%, rgba(0,0,0,.2) 46%, rgba(0,0,0,0) 62%)",
    velo: "linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 30%)",
    etiqueta: 50,
    grande: { maximo: 286, ancho: 620, trazo: 22 },
    linea: { maximo: 112, ancho: 640, trazo: 16 },
    remate: { maximo: 114, trazo: 8 },
    borde: 7,
  },
  vertical: {
    foco: "50% 66%",
    panel: "polygon(0% 47%, 100% 39%, 100% 100%, 0% 100%)",
    filo: "polygon(0% 47%, 100% 39%, 100% 39.4%, 0% 47.4%)",
    chip: 56,
    sombra: "linear-gradient(180deg, rgba(0,0,0,.66) 0%, rgba(0,0,0,.25) 40%, rgba(0,0,0,0) 56%)",
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
      {partesDeLinea(p.linea).map((w, k, todas) => (
        <span
          key={k}
          style={{
            position: "relative",
            display: "inline-block",
            color: w.marcada ? p.acento : "#fff",
            marginRight: k < todas.length - 1 ? "0.24em" : 0,
          }}
        >
          {w.texto}
          {/* La palabra tachada: una raya roja gruesa, un poco inclinada, con su borde negro. */}
          {w.tachada && (
            <span
              style={{
                position: "absolute",
                left: "-7%",
                right: "-7%",
                top: "40%",
                height: Math.max(16, Math.round(letraLinea * 0.2)),
                backgroundColor: ROJO,
                border: `${Math.max(4, Math.round(letraLinea * 0.045))}px solid ${NEGRO}`,
                borderRadius: 6,
                transform: "rotate(-5deg)",
                boxShadow: "0 6px 0 rgba(0,0,0,.5)",
              }}
            />
          )}
        </span>
      ))}
    </div>
  );
  // Las marcas de las que habla el video, en pastillas blancas: se reconocen de un vistazo.
  const COLORES_CHIP = ["#10a37f", "#3b82f6", "#f59e0b"];
  const chips = p.chips.length > 0 && (
    <div style={{ display: "flex", gap: vertical ? 20 : 14, marginTop: vertical ? 30 : 20 }}>
      {p.chips.map((texto, k) => (
        <div
          key={k}
          style={{
            display: "flex",
            alignItems: "center",
            gap: f.chip * 0.3,
            backgroundColor: "#fff",
            color: NEGRO,
            fontFamily: inter,
            fontWeight: 800,
            fontSize: f.chip,
            lineHeight: 1,
            letterSpacing: -0.5,
            padding: `${f.chip * 0.3}px ${f.chip * 0.52}px ${f.chip * 0.3}px ${f.chip * 0.42}px`,
            borderRadius: 999,
            border: `${vertical ? 6 : 5}px solid ${NEGRO}`,
            boxShadow: `0 ${vertical ? 8 : 6}px 0 ${NEGRO}`,
            transform: `rotate(${k % 2 === 0 ? -2 : 2}deg)`,
            whiteSpace: "nowrap",
          }}
        >
          <span
            style={{
              width: f.chip * 0.5,
              height: f.chip * 0.5,
              borderRadius: "50%",
              backgroundColor: COLORES_CHIP[k % COLORES_CHIP.length],
            }}
          />
          {texto}
        </div>
      ))}
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
      {/* Fondo: oscuro, con un panel inclinado y una luz fuerte de color detrás de la persona. */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(${vertical ? 180 : 115}deg, ${p.fondo[1]} 0%, #0a0f1e 52%, ${p.fondo[1]} 100%)`,
        }}
      />
      {/* El panel: un plano de color, más claro arriba, que separa a la persona del texto. */}
      <AbsoluteFill
        style={{
          clipPath: f.panel,
          background: `linear-gradient(${vertical ? 180 : 160}deg, ${p.fondo[0]} 0%, ${p.fondo[0]}99 38%, ${p.fondo[0]}2e 100%)`,
        }}
      />
      {/* Una trama de puntos sobre el panel, que se apaga hacia abajo. */}
      <AbsoluteFill
        style={{
          clipPath: f.panel,
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,.34) 1.6px, transparent 2.2px)",
          backgroundSize: vertical ? "30px 30px" : "22px 22px",
          maskImage: "linear-gradient(180deg, #000 0%, transparent 78%)",
          WebkitMaskImage: "linear-gradient(180deg, #000 0%, transparent 78%)",
        }}
      />
      {/* El filo del panel, en el color de acento. */}
      <AbsoluteFill style={{ clipPath: f.filo, backgroundColor: p.acento }} />
      {/* La luz: un foco intenso justo detrás de la cabeza y los hombros. */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at ${f.foco}, rgba(255,255,255,.5) 0%, ${p.fondo[0]} 16%, ${p.fondo[0]}55 34%, transparent 58%)`,
          mixBlendMode: "screen",
        }}
      />
      {/* Los bordes se oscurecen: la mirada se queda en el centro. */}
      <AbsoluteFill
        style={{ background: "radial-gradient(ellipse at 50% 46%, transparent 52%, rgba(0,0,0,.72) 100%)" }}
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
            filter: `${borde(f.borde, "#fff")} drop-shadow(0 0 ${vertical ? 46 : 34}px ${p.fondo[0]}) drop-shadow(0 18px 40px rgba(0,0,0,.75))`,
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
          {chips}
          <div style={{ marginTop: 40 }}>{remate}</div>
        </div>
      ) : (
        <>
          {/* Horizontal, izquierda arriba: quién es, lo enorme y lo que cuenta. */}
          <div style={{ position: "absolute", left: 44, top: 22 }}>
            {etiqueta}
            {grande}
            {linea}
            {chips}
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
