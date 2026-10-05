// Formato Presentador: Richard, grabado de verdad, encima de los gráficos.
// Tiene dos sitios y pasa de uno a otro con un movimiento suave:
//  · «completo»: él en grande, y lo de atrás se oscurece (el arranque, la opinión);
//  · «esquina»: él chico, abajo, dejando ver lo que explica.
// Si se grabó con croma llega sin fondo (video transparente). Si no, sale en
// una ventana redondeada, y en «completo» llena la pantalla.
import { createContext, useContext } from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  OffthreadVideo,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { FPS, type PropsVideo } from "./props";

type Presentador = NonNullable<PropsVideo["presentador"]>;

/**
 * Lo que necesitan saber los gráficos cuando hay presentador: en horizontal él
 * ocupa la esquina de abajo a la derecha, así que las figuras y los diagramas
 * se corren a la izquierda para no quedar detrás de él.
 */
export const ContextoPresentador = createContext<{ activo: boolean }>({ activo: false });
export const usePresentador = () => useContext(ContextoPresentador);

/** Cuadros que tarda en ir de la esquina a pantalla completa (y al revés). */
const CAMBIO = 14;

/** Qué tan «en grande» está en este instante: 0 = en la esquina, 1 = a pantalla completa. */
export function grandeEn(momentos: Presentador["momentos"], tMs: number): number {
  let actual = 0;
  let previo = 0;
  let desde = -Infinity;
  for (const m of momentos) {
    if (m.inicioMs > tMs) break;
    previo = actual;
    actual = m.modo === "completo" ? 1 : 0;
    desde = m.inicioMs;
  }
  if (desde === -Infinity) return momentos[0]?.modo === "completo" ? 1 : 0;
  const avance = interpolate(((tMs - desde) / 1000) * FPS, [0, CAMBIO], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });
  return previo + (actual - previo) * avance;
}

const mezcla = (a: number, b: number, t: number) => a + (b - a) * t;

export const CapaPresentador: React.FC<{
  presentador: Presentador;
  /** Tiempo del video largo en el primer cuadro de esta capa (en un Short, donde empieza su trozo). */
  desdeMs: number;
  acento: string;
}> = ({ presentador, desdeMs, acento }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const vertical = height > width;
  const tMs = desdeMs + (frame / FPS) * 1000;
  const g = grandeEn(presentador.momentos, tMs);
  const forma = presentador.ancho / presentador.alto;
  const video = (estilo: React.CSSProperties) => (
    <OffthreadVideo
      src={staticFile(presentador.ruta)}
      startFrom={Math.round((desdeMs / 1000) * FPS)}
      muted
      transparent={presentador.transparente}
      style={estilo}
    />
  );

  if (presentador.transparente) {
    // Sin fondo: la figura va anclada al borde de abajo y crece desde ahí.
    const altoChico = vertical ? height * 0.37 : height * 0.52;
    const altoGrande = vertical ? height * 0.62 : height * 0.98;
    const alto = mezcla(altoChico, altoGrande, g);
    const ancho = alto * forma;
    const centroChico = vertical ? width * 0.5 : width - 36 - (altoChico * forma) / 2;
    const centro = mezcla(centroChico, width * 0.5, g);
    return (
      <AbsoluteFill>
        {/* Cuando él sale en grande, lo de atrás se apaga un poco para que mande su cara. */}
        <AbsoluteFill style={{ backgroundColor: `rgba(5,5,12,${0.62 * g})` }} />
        {video({
          position: "absolute",
          left: centro - ancho / 2,
          bottom: 0,
          width: ancho,
          height: alto,
          maxWidth: "none",
          filter: `drop-shadow(0 0 ${mezcla(18, 34, g)}px rgba(0,0,0,.75)) drop-shadow(0 0 2px ${acento}66)`,
        })}
      </AbsoluteFill>
    );
  }

  // Con fondo (sin croma): una ventana redondeada en la esquina, que crece hasta llenar la pantalla.
  const anchoChico = vertical ? width * 0.92 : width * 0.27;
  const altoChico = anchoChico / Math.max(forma, 1.2);
  const ancho = mezcla(anchoChico, width, g);
  const alto = mezcla(altoChico, height, g);
  const derecha = mezcla(vertical ? (width - anchoChico) / 2 : 40, 0, g);
  const abajo = mezcla(vertical ? 90 : 40, 0, g);
  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          right: derecha,
          bottom: abajo,
          width: ancho,
          height: alto,
          overflow: "hidden",
          borderRadius: mezcla(28, 0, g),
          border: `${mezcla(5, 0, g)}px solid ${acento}`,
          boxShadow: `0 18px 50px rgba(0,0,0,${0.7 * (1 - g)})`,
          backgroundColor: "#000",
        }}
      >
        {video({ width: "100%", height: "100%", objectFit: "cover" })}
      </div>
    </AbsoluteFill>
  );
};
