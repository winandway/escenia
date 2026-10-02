import { createTikTokStyleCaptions } from "@remotion/captions";
import { volumenMusica } from "./musica";
import { posicionObjeto } from "./enfoque";
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
import {
  CierreMarca,
  Cursor,
  LogoRedondo,
  MarcaFija,
  MarcoCodigo,
  mono,
  PALETA_MARCA,
  RotuloCodigo,
  TarjetaNoticia,
  TituloTerminal,
  type MarcaVideo,
} from "./Marca";
import { PlanosDeEscena } from "./Planos";
import { CIERRE_SHORT_MS, FPS, INTRO_SHORT_MS, type PropsVideo } from "./props";

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
  // Short: se dibuja solo la ventana [inicioMs, finMs] del video largo, con un
  // título propio al arrancar y un cierre al final. `tMs` es SIEMPRE el tiempo
  // del video largo al que corresponde este frame.
  const v = p.ventana;
  const introFrames = v ? msAFrame(INTRO_SHORT_MS) : 0;
  const cierreFrames = v ? msAFrame(CIERRE_SHORT_MS) : 0;
  const inicioVentanaMs = v?.inicioMs ?? 0;
  const finVentanaMs = v?.finMs ?? p.duracionMs;
  const tMs = ((frame - introFrames) / FPS) * 1000 + inicioVentanaMs;
  // De tiempo del video largo a frame de ESTE video.
  const aFrame = (ms: number) => msAFrame(ms - inicioVentanaMs) + introFrames;
  // Tiempos de la música en el reloj de ESTE video (en un short empiezan tras el título).
  const aLocalMs = (ms: number) => ms - inicioVentanaMs + (v ? INTRO_SHORT_MS : 0);

  const { pages } = useMemo(
    () =>
      createTikTokStyleCaptions({
        captions: p.palabras,
        // Pocas palabras a la vez, como en CapCut: se leen de un golpe (C-RITMO-1).
        combineTokensWithinMilliseconds: vertical ? 520 : 900,
      }),
    [p.palabras, vertical],
  );
  const pagina =
    frame >= introFrames && tMs < finVentanaMs
      ? pages.find((pg) => tMs >= pg.startMs && tMs < pg.startMs + pg.durationMs)
      : undefined;
  const interludios = useMemo(
    () =>
      p.escenas
        .filter((e) => e.interludio && e.finMs > inicioVentanaMs && e.inicioMs < finVentanaMs)
        .map((e) => ({
          inicioMs: Math.max(e.inicioMs, inicioVentanaMs) - inicioVentanaMs + (v ? INTRO_SHORT_MS : 0),
          finMs: Math.min(e.finMs, finVentanaMs) - inicioVentanaMs + (v ? INTRO_SHORT_MS : 0),
        })),
    [p.escenas, inicioVentanaMs, finVentanaMs, v],
  );
  const finVozLocalMs = aLocalMs(finVentanaMs);
  const finVideoMs = (durationInFrames / FPS) * 1000;
  const visibles = p.escenas
    .map((e, i) => ({ e, i }))
    .filter(({ e }) => e.finMs > inicioVentanaMs && e.inicioMs < finVentanaMs);
  // En un interludio no hay voz: se esconde el último subtítulo para que no se quede pegado.
  const enInterludio = interludios.some((tr) => tMs >= tr.inicioMs && tMs < tr.finMs);
  const whooshes = p.sfx.whoosh;
  const documental = p.tema === "documental";
  // Con marca, el video toma los colores y la letra de código del canal.
  const marca = p.marca;
  const acento = marca ? marca.acento : documental ? ORO : AMBAR;
  const fuenteTitulos = marca ? mono : documental ? serif : fontFamily;
  const paleta = marca ? PALETA_MARCA : PALETA;
  // Donde termina la voz del video largo empieza el cierre del canal.
  const inicioCierreMarca = aFrame(p.duracionMs) + 8;
  const finMarcaFija = v ? durationInFrames - cierreFrames : inicioCierreMarca;

  return (
    <AbsoluteFill style={{ backgroundColor: "#000", fontFamily }}>
      {/* Escenas: cada una se funde sobre la anterior */}
      {visibles.map(({ e, i }, k) => {
        const primera = k === 0;
        const ultima = k === visibles.length - 1;
        const desde = aFrame(Math.max(e.inicioMs, inicioVentanaMs));
        const dur = Math.max(
          1,
          aFrame(Math.min(e.finMs, finVentanaMs)) - desde + (ultima ? cierreFrames : TRANSICION),
        );
        const colores = paleta[i % paleta.length] ?? PALETA[0];
        const whoosh = whooshes.length ? (whooshes[i % whooshes.length] ?? null) : null;
        return (
          <Sequence key={i} from={desde} durationInFrames={dur} name={`escena ${i + 1} · ${e.parte}`}>
            <EscenaVista
              escena={e}
              indice={i}
              colores={colores}
              durFrames={dur}
              vertical={vertical}
              fundir={!primera}
              pop={p.sfx.pop}
              retraso={primera ? (v ? Math.round(FPS * 3.1) : 8) : TRANSICION}
              acento={acento}
              fuenteTitulos={fuenteTitulos}
              boom={p.sfx.boom}
              whoosh={whoosh}
              marca={marca}
              desdeMs={Math.max(e.inicioMs, inicioVentanaMs)}
              cortes={p.sfx.corte.length ? p.sfx.corte : whooshes}
            />
            {whoosh && !primera && <Audio src={staticFile(whoosh)} volume={0.4} />}
          </Sequence>
        );
      })}

      {/* Título como banda encima de la primera imagen: nada de portada oscura,
          los primeros 3 segundos son imagen y voz (C-GANCHO-1). */}
      <Sequence from={0} durationInFrames={Math.round(FPS * 3)} name="título">
        {marca ? (
          <TituloTerminal texto={v ? v.titulo : p.titulo} vertical={vertical} marca={marca} />
        ) : (
          <TituloBanda
            texto={v ? v.titulo : p.titulo}
            vertical={vertical}
            acento={acento}
            fuente={fuenteTitulos}
          />
        )}
        {p.sfx.riser && <Audio src={staticFile(p.sfx.riser)} volume={0.22} />}
      </Sequence>

      {/* Marca del canal: tinte, esquinas de visor y el logo fijo (se quita en el cierre) */}
      {marca && <MarcoCodigo marca={marca} vertical={vertical} />}
      {marca && finMarcaFija > 0 && (
        <Sequence from={0} durationInFrames={finMarcaFija} name="logo del canal">
          <MarcaFija marca={marca} vertical={vertical} />
        </Sequence>
      )}

      {/* Subtítulos palabra por palabra, al estilo CapCut: pocas palabras, borde grueso y la
          palabra que se está diciendo salta en el color del canal (C-RITMO-1). */}
      {pagina && !enInterludio && (
        <AbsoluteFill
          style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: vertical ? 420 : 100 }}
        >
          <div
            style={{
              maxWidth: vertical ? "90%" : "74%",
              textAlign: "center",
              fontSize: vertical ? 76 : 60,
              fontWeight: 900,
              lineHeight: 1.12,
              color: "#fff",
              textTransform: vertical ? "uppercase" : undefined,
              WebkitTextStroke: `${vertical ? 12 : 9}px #000`,
              paintOrder: "stroke fill",
              textShadow: "0 6px 26px rgba(0,0,0,.85)",
            }}
          >
            {pagina.tokens.map((tk, k) => {
              // Solo UNA palabra encendida: la última que empezó a decirse.
              const siguiente = pagina.tokens[k + 1];
              const sonando = tMs >= tk.fromMs && (!siguiente || tMs < siguiente.fromMs);
              // Salta y vuelve a su tamaño: si se quedara grande, se comería el espacio de al lado.
              const salto = sonando
                ? interpolate(tMs - tk.fromMs, [0, 80, 200], [1, 1.13, 1], {
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                  })
                : 1;
              return (
                <span
                  key={k}
                  style={{
                    display: "inline-block",
                    whiteSpace: "pre",
                    padding: "0 0.05em",
                    color: sonando ? acento : "#fff",
                    transform: `scale(${salto})`,
                  }}
                >
                  {tk.text}
                </span>
              );
            })}
          </div>
        </AbsoluteFill>
      )}

      {/* Cierre del short: invita a ver el video completo */}
      {v && (
        <Sequence from={Math.max(0, durationInFrames - cierreFrames)} name="cierre-short">
          <CierreShort
            titulo={p.titulo}
            acento={acento}
            fuente={fuenteTitulos}
            cierre={p.cierre}
            marca={marca}
          />
          {p.sfx.ding && <Audio src={staticFile(p.sfx.ding)} volume={0.45} />}
        </Sequence>
      )}

      {/* Cierre del canal (solo en el video largo): logo, «suscríbete» y el @ */}
      {!v && marca && (
        <Sequence from={inicioCierreMarca} name="cierre del canal">
          <CierreMarca marca={marca} vertical={vertical} producto={p.producto} />
          {p.sfx.ding && <Audio src={staticFile(p.sfx.ding)} volume={0.45} />}
        </Sequence>
      )}

      {/* Cierre con producto (solo en el video largo y sin marca) */}
      {!v && !marca && p.producto && (
        <Sequence from={Math.max(0, durationInFrames - FPS * 6)} name="cta">
          <Cierre nombre={p.producto.nombre} url={p.producto.url} vertical={vertical} acento={acento} />
          {p.sfx.ding && <Audio src={staticFile(p.sfx.ding)} volume={0.45} />}
        </Sequence>
      )}

      {/* Barra de progreso */}
      <AbsoluteFill style={{ justifyContent: "flex-end" }}>
        <div
          style={{
            height: 8,
            width: `${(frame / durationInFrames) * 100}%`,
            background: marca ? `linear-gradient(90deg, ${marca.acento}, ${marca.secundario})` : acento,
          }}
        />
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

      {v ? (
        <Sequence
          from={introFrames}
          durationInFrames={Math.max(1, msAFrame(finVentanaMs - inicioVentanaMs))}
          name="voz"
        >
          <Audio
            src={staticFile(p.audio)}
            startFrom={msAFrame(inicioVentanaMs)}
            endAt={msAFrame(finVentanaMs)}
          />
        </Sequence>
      ) : (
        <Audio src={staticFile(p.audio)} />
      )}
      {/* Música en bucle a mano: con `loop`, el frame que recibe `volume` se
          reinicia en cada vuelta y la curva se desfasa (los interludios después
          del primer bucle sonaban bajos). Cada copia sabe su desplazamiento. */}
      {p.musica &&
        Array.from({
          length: Math.ceil(durationInFrames / Math.max(1, Math.round(p.musica.duracionSeg * FPS))),
        }).map((_, k) => {
          const largo = Math.max(1, Math.round((p.musica?.duracionSeg ?? 1) * FPS));
          const desde = k * largo;
          return (
            <Sequence key={`musica-${k}`} from={desde} durationInFrames={largo} name={`música ${k + 1}`}>
              <Audio
                src={staticFile(p.musica?.ruta ?? "")}
                volume={(f) =>
                  volumenMusica(((f + desde) / FPS) * 1000, interludios, finVozLocalMs, finVideoMs)
                }
              />
            </Sequence>
          );
        })}
    </AbsoluteFill>
  );
};

const EscenaVista: React.FC<{
  escena: Escena;
  indice: number;
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
  marca: MarcaVideo | null;
  /** Tiempo del video largo en el primer cuadro de esta escena en pantalla. */
  desdeMs: number;
  /** Sonidos cortos para los cambios de imagen. */
  cortes: string[];
}> = ({
  escena,
  indice,
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
  marca,
  desdeMs,
  cortes,
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
        fondoFoto={escena.fondoFoto}
        colores={colores}
        durFrames={durFrames}
        difuminado={esFrase || esFoto || esTitular || esRecorte}
        cuadricula={marca?.acento ?? null}
      />
      {esFoto && escena.foto && escena.fotos.length <= 1 && (
        <FotoConMovimiento
          foto={escena.foto}
          durFrames={durFrames}
          vertical={vertical}
          desde={indice % 2 === 0 ? "derecha" : "izquierda"}
        />
      )}
      {esFoto && escena.fotos.length > 1 && (
        <FotosEnSecuencia fotos={escena.fotos} durFrames={durFrames} vertical={vertical} whoosh={whoosh} />
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
          codigo={marca !== null}
        />
      )}
      {esRecorte && escena.recorte && escena.recorte.tipo === "periodico" && marca && (
        <TarjetaNoticia
          recorte={escena.recorte}
          retraso={retraso}
          marca={marca}
          vertical={vertical}
          whoosh={whoosh}
        />
      )}
      {esRecorte && escena.recorte && escena.recorte.tipo === "periodico" && !marca && (
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
            codigo={marca !== null}
          />
        ) : marca ? (
          <RotuloCodigo
            texto={escena.textoEnPantalla}
            vertical={vertical}
            retraso={retraso}
            marca={marca}
            abajo={esFoto}
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
      {/* Planos: los cambios de imagen de la escena, encima de su imagen de arranque (C-RITMO-1). */}
      {escena.planos.length > 0 && (
        <PlanosDeEscena
          escena={escena}
          desdeMs={desdeMs}
          durFrames={durFrames}
          indiceEscena={indice}
          vertical={vertical}
          acento={acento}
          fuente={fuenteTitulos}
          colores={colores}
          cortes={cortes}
          golpe={boom ?? pop}
        />
      )}
      {/* En la opinión, las imágenes pasan y la etiqueta se queda: se sabe quién habla. */}
      {escena.parte === "opinion" && escena.planos.length > 0 && (
        <EtiquetaFija texto="Mi opinión" acento={acento} fuente={fuenteTitulos} vertical={vertical} />
      )}
    </AbsoluteFill>
  );
};

/** Etiqueta chica que acompaña toda una escena (por ejemplo «Mi opinión»). */
const EtiquetaFija: React.FC<{ texto: string; acento: string; fuente: string; vertical: boolean }> = ({
  texto,
  acento,
  fuente,
  vertical,
}) => (
  <div
    style={{
      position: "absolute",
      left: vertical ? 60 : 80,
      top: vertical ? 170 : 70,
      backgroundColor: acento,
      color: "#0b0b0b",
      fontFamily: fuente,
      fontWeight: 900,
      fontSize: vertical ? 40 : 34,
      letterSpacing: 1,
      textTransform: "uppercase",
      padding: vertical ? "10px 22px" : "8px 20px",
      borderRadius: 10,
      boxShadow: "0 8px 30px rgba(0,0,0,.5)",
    }}
  >
    {texto}
  </div>
);

const Fondo: React.FC<{
  clip: Escena["clip"];
  fondoFoto?: string | null;
  colores: readonly [string, string];
  durFrames: number;
  difuminado: boolean;
  /** Color de la cuadrícula del fondo de reserva (canales con marca), o null. */
  cuadricula?: string | null;
}> = ({ clip, fondoFoto, colores, durFrames, difuminado, cuadricula = null }) => {
  const frame = useCurrentFrame();
  // Movimiento lento (Ken Burns) para que ningún plano se sienta quieto.
  const zoom = interpolate(frame, [0, Math.max(1, durFrames)], [1.02, 1.12], { extrapolateRight: "clamp" });
  if (fondoFoto) {
    // Foto de la persona difuminada: fondo siempre del tema del video (C-FONDO-1).
    return (
      <AbsoluteFill style={{ overflow: "hidden", backgroundColor: colores[0] }}>
        <AbsoluteFill style={{ transform: `scale(${zoom * 1.08})`, filter: "blur(16px) brightness(.42)" }}>
          <Img src={staticFile(fondoFoto)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </AbsoluteFill>
      </AbsoluteFill>
    );
  }
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
    >
      {cuadricula && (
        <AbsoluteFill
          style={{
            backgroundImage: `linear-gradient(${cuadricula}12 1px, transparent 1px), linear-gradient(90deg, ${cuadricula}12 1px, transparent 1px)`,
            backgroundSize: "64px 64px",
          }}
        />
      )}
    </AbsoluteFill>
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
  /** Letra de código (más ancha): el titular va un poco más chico para que quepa. */
  codigo?: boolean;
}> = ({ titular, fecha, retraso, acento, fuente, vertical, boom, codigo = false }) => {
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
          fontSize: codigo ? (vertical ? 96 : 128) : vertical ? 120 : 150,
          fontWeight: 900,
          lineHeight: codigo ? 1.02 : 0.95,
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
            fontFamily: codigo ? fuente : undefined,
            letterSpacing: codigo ? 2 : 6,
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

/** Varias imágenes en la misma escena: una por frase, con fundido entre ellas. */
const FotosEnSecuencia: React.FC<{
  fotos: Escena["fotos"];
  durFrames: number;
  vertical: boolean;
  whoosh: string | null;
}> = ({ fotos, durFrames, vertical, whoosh }) => {
  const porFoto = Math.max(1, Math.floor(durFrames / fotos.length));
  return (
    <AbsoluteFill>
      {fotos.map((f, k) => {
        const desde = k * porFoto;
        const dur = k === fotos.length - 1 ? Math.max(1, durFrames - desde) : porFoto + TRANSICION;
        return (
          <Sequence key={k} from={desde} durationInFrames={dur} name={`cuadro ${k + 1}`}>
            <CuadroFundido
              foto={f}
              durFrames={dur}
              vertical={vertical}
              fundir={k > 0}
              desde={k % 2 === 0 ? "derecha" : "izquierda"}
            />
            {/* Cada foto entra con su silbido (TikTok/CapCut); en el short, más presente. */}
            {whoosh && k > 0 && <Audio src={staticFile(whoosh)} volume={vertical ? 0.6 : 0.25} />}
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

const CuadroFundido: React.FC<{
  foto: NonNullable<Escena["foto"]>;
  durFrames: number;
  vertical: boolean;
  fundir: boolean;
  desde: "derecha" | "izquierda";
}> = ({ foto, durFrames, vertical, fundir, desde }) => {
  const frame = useCurrentFrame();
  // En vertical la foto entra deslizada (no fundida); en 16:9 se funde como siempre.
  const opacidad =
    fundir && !vertical ? interpolate(frame, [0, TRANSICION], [0, 1], { extrapolateRight: "clamp" }) : 1;
  return (
    <AbsoluteFill style={{ opacity: opacidad }}>
      <FotoConMovimiento foto={foto} durFrames={durFrames} vertical={vertical} desde={desde} />
    </AbsoluteFill>
  );
};

/** Fotografía real con movimiento lento y marco, sobre el clip difuminado. */
const FotoConMovimiento: React.FC<{
  foto: NonNullable<Escena["foto"]>;
  durFrames: number;
  vertical: boolean;
  desde?: "derecha" | "izquierda";
}> = ({ foto, durFrames, vertical, desde = "derecha" }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const entrada = spring({ frame, fps, config: { damping: 30, stiffness: 60 } });
  // Entrada deslizada (vertical): la foto llega desde un lado y frena con rebote corto.
  const deslizada = spring({ frame, fps, config: { damping: 18, stiffness: 150 } });
  const desplazamientoX = (1 - deslizada) * (desde === "izquierda" ? -100 : 100);
  const zoom = interpolate(frame, [0, Math.max(1, durFrames)], [1.0, 1.1], { extrapolateRight: "clamp" });
  const desplazo = interpolate(frame, [0, Math.max(1, durFrames)], [-12, 12], { extrapolateRight: "clamp" });
  const horizontal = foto.ancho >= foto.alto;
  const { width: anchoVideo, height: altoVideo } = useVideoConfig();
  if (vertical) {
    // Short: la foto llena la pantalla, recortada sobre la persona (C-SHORTS-2),
    // con un degradado abajo para que las letras se lean encima.
    const pos = posicionObjeto(
      { ancho: foto.ancho, alto: foto.alto },
      { ancho: anchoVideo, alto: altoVideo },
      foto.enfoque ?? null,
    );
    return (
      <AbsoluteFill style={{ overflow: "hidden", transform: `translateX(${desplazamientoX}%)` }}>
        <Img
          src={staticFile(foto.ruta)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: `${pos.x}% ${pos.y}%`,
            transform: `scale(${zoom})`,
            transformOrigin: `${pos.x}% ${pos.y}%`,
          }}
        />
        <AbsoluteFill
          style={{
            background:
              "linear-gradient(180deg, rgba(0,0,0,.18) 0%, rgba(0,0,0,0) 22%, rgba(0,0,0,0) 55%, rgba(0,0,0,.72) 100%)",
          }}
        />
      </AbsoluteFill>
    );
  }
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: 90 }}>
      <div
        style={{
          opacity: entrada,
          transform: `scale(${0.96 + entrada * 0.04})`,
          height: "84%",
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
  /** Letra de código: más ancha (va más chica) y con el cursor al final. */
  codigo?: boolean;
}> = ({ texto, vertical, retraso, acento, fuente, codigo = false }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const palabras = texto.split(/\s+/).filter(Boolean);
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: vertical ? 70 : 140 }}>
      <div
        style={{
          textAlign: "center",
          fontSize: codigo ? (vertical ? 80 : 90) : vertical ? 96 : 104,
          fontWeight: 900,
          lineHeight: codigo ? 1.12 : 1.05,
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
        {codigo && frame > retraso + palabras.length * 3 + 6 && <Cursor color={acento} alto="0.8em" />}
      </div>
    </AbsoluteFill>
  );
};

/** Banda de título arriba, sobre la imagen que ya se mueve: entra, se queda 3 s y se va. */
const TituloBanda: React.FC<{ texto: string; vertical: boolean; acento: string; fuente: string }> = ({
  texto,
  vertical,
  acento,
  fuente,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const entrada = spring({ frame, fps, config: { damping: 14, stiffness: 150 } });
  const salida = interpolate(frame, [durationInFrames - 10, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill
      style={{
        justifyContent: "flex-start",
        alignItems: "flex-start",
        padding: vertical ? "150px 60px" : "70px 80px",
        opacity: salida,
      }}
    >
      <div
        style={{
          transform: `translateY(${(1 - entrada) * -40}px)`,
          opacity: entrada,
          backgroundColor: "rgba(0,0,0,.62)",
          borderLeft: `10px solid ${acento}`,
          padding: vertical ? "18px 26px" : "16px 28px",
          borderRadius: 10,
          maxWidth: vertical ? "92%" : "62%",
          fontSize: vertical ? 46 : 42,
          fontWeight: 900,
          lineHeight: 1.12,
          color: "#fff",
          fontFamily: fuente,
          textShadow: "0 3px 16px rgba(0,0,0,.8)",
        }}
      >
        {texto}
      </div>
    </AbsoluteFill>
  );
};

/**
 * Cierre de un short, al estilo de la app de Richard (Beellon): «¿Te gustó?»,
 * el letrero «VER VIDEO COMPLETO» que rebota, la miniatura del largo como un
 * video con ▶ y barra que avanza, la caja de búsqueda con el título (en un
 * Short no hay enlace: la gente busca el título) y la tarjeta del canal.
 */
const CierreShort: React.FC<{
  titulo: string;
  acento: string;
  fuente: string;
  cierre: PropsVideo["cierre"];
  marca?: MarcaVideo | null;
}> = ({ titulo, acento, fuente, cierre, marca = null }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const letrero = spring({ frame, fps, config: { damping: 9, stiffness: 180 } });
  const tarjeta = spring({ frame: frame - 6, fps, config: { damping: 14, stiffness: 120 } });
  const busqueda = spring({ frame: frame - 14, fps, config: { damping: 16, stiffness: 140 } });
  const canal = spring({ frame: frame - 22, fps, config: { damping: 16, stiffness: 140 } });
  const barra = interpolate(frame, [12, durationInFrames - 8], [0.08, 0.95], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const oscuro = "rgba(12,12,12,.92)";
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: "0 64px" }}>
      <AbsoluteFill style={{ backgroundColor: "rgba(0,0,0,.66)" }} />
      <div
        style={{ width: "100%", maxWidth: 960, textAlign: "center", fontFamily: marca ? fuente : undefined }}
      >
        <div style={{ fontSize: 46, fontWeight: 700, color: "#fff", letterSpacing: 3, opacity: letrero }}>
          ¿TE GUSTÓ?
        </div>
        <div
          style={{
            display: "inline-block",
            marginTop: 18,
            padding: "22px 48px",
            borderRadius: 26,
            backgroundColor: acento,
            color: "#111",
            fontSize: marca ? 54 : 60,
            fontWeight: 900,
            letterSpacing: 1,
            transform: `scale(${0.6 + letrero * 0.4})`,
            opacity: letrero,
          }}
        >
          VER VIDEO COMPLETO
        </div>

        <div
          style={{
            marginTop: 30,
            transform: `translateY(${(1 - tarjeta) * 60}px)`,
            opacity: tarjeta,
            borderRadius: 26,
            border: `6px solid ${acento}`,
            overflow: "hidden",
            backgroundColor: "#111",
            aspectRatio: "16 / 9",
            position: "relative",
          }}
        >
          {cierre?.miniatura ? (
            <Img src={cierre.miniatura} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <div
              style={{
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 40,
                fontSize: 48,
                fontWeight: 900,
                color: "#fff",
                fontFamily: fuente,
              }}
            >
              {titulo}
            </div>
          )}
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              width: 120,
              height: 120,
              marginLeft: -60,
              marginTop: -60,
              borderRadius: 60,
              backgroundColor: acento,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 10px 40px rgba(0,0,0,.6)",
            }}
          >
            <div
              style={{
                width: 0,
                height: 0,
                marginLeft: 12,
                borderTop: "30px solid transparent",
                borderBottom: "30px solid transparent",
                borderLeft: "50px solid #111",
              }}
            />
          </div>
          <div
            style={{
              position: "absolute",
              left: 24,
              right: 24,
              bottom: 18,
              height: 10,
              borderRadius: 5,
              backgroundColor: "rgba(255,255,255,.35)",
            }}
          >
            <div
              style={{ width: `${barra * 100}%`, height: "100%", borderRadius: 5, backgroundColor: acento }}
            />
            <div
              style={{
                position: "absolute",
                left: `calc(${barra * 100}% - 12px)`,
                top: -7,
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: "#fff",
              }}
            />
          </div>
        </div>

        <div
          style={{
            marginTop: 26,
            transform: `translateX(${(1 - busqueda) * -80}px)`,
            opacity: busqueda,
            backgroundColor: oscuro,
            borderRadius: 24,
            padding: "26px 34px",
            display: "flex",
            alignItems: "center",
            gap: 22,
            textAlign: "left",
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              border: `6px solid ${acento}`,
              flexShrink: 0,
              position: "relative",
            }}
          >
            <div
              style={{
                position: "absolute",
                right: -16,
                bottom: -14,
                width: 22,
                height: 8,
                backgroundColor: acento,
                transform: "rotate(45deg)",
                borderRadius: 4,
              }}
            />
          </div>
          <div style={{ fontSize: 42, fontWeight: 700, color: "#fff", lineHeight: 1.2, fontFamily: fuente }}>
            “{titulo}”
          </div>
        </div>

        {(cierre?.canalNombre || cierre?.canalUsuario) && (
          <div
            style={{
              marginTop: 24,
              transform: `translateY(${(1 - canal) * 60}px)`,
              opacity: canal,
              backgroundColor: oscuro,
              border: `5px solid ${acento}`,
              borderRadius: 26,
              padding: "24px 34px",
              display: "flex",
              alignItems: "center",
              gap: 26,
              textAlign: "left",
            }}
          >
            {marca ? (
              <LogoRedondo logo={marca.logo} lado={118} color={acento} />
            ) : (
              <div
                style={{
                  width: 110,
                  height: 110,
                  borderRadius: 26,
                  backgroundColor: acento,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    width: 0,
                    height: 0,
                    marginLeft: 8,
                    borderTop: "26px solid transparent",
                    borderBottom: "26px solid transparent",
                    borderLeft: "42px solid #111",
                  }}
                />
              </div>
            )}
            <div style={{ fontFamily: marca ? fuente : undefined }}>
              <div style={{ fontSize: marca ? 54 : 60, fontWeight: 900, color: "#fff", lineHeight: 1.05 }}>
                {cierre?.canalNombre}
              </div>
              {cierre?.canalUsuario && (
                <div style={{ fontSize: 36, fontWeight: 700, color: acento, marginTop: 6 }}>
                  {cierre.canalUsuario}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
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
