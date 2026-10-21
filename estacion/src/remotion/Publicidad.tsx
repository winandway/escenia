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
import {
  formatoCifra,
  mezclarVistas,
  type PropsPublicidad,
  vistaCompleta,
  vistaDeEnfoque,
  type Vista,
  ZONA_PUBLICIDAD as Z,
} from "./publicidad-diseno";

export * from "./publicidad-diseno";

const { fontFamily } = loadFont("normal", { weights: ["400"], subsets: ["latin", "latin-ext"] });
const FPS = 30;
const f = (ms: number) => Math.round((ms / 1000) * FPS);
const sombra = "0 0 18px rgba(0,0,0,0.85), 0 4px 0 #000, 0 -2px 0 #000, 3px 0 0 #000, -3px 0 0 #000";

type Tramo = PropsPublicidad["tramos"][number];

/**
 * La foto del momento en la tarjeta: entra con un golpe de zoom (o barriendo de lado) y sigue
 * acercándose despacio. Con `enfoque`, la cámara viaja hasta esa zona de la imagen (una captura de
 * pantalla se ve de cerca): desde la imagen entera, o desde la zona anterior si es la misma imagen.
 */
const Tarjeta: React.FC<{
  tramo: Tramo;
  anterior: Tramo | null;
  duracion: number;
  indice: number;
  acento: string;
  fondo: string;
}> = ({ tramo, anterior, duracion, indice, acento, fondo }) => {
  const frame = useCurrentFrame();
  const caja = { ancho: Z.tarjeta.ancho, alto: Z.tarjeta.alto };
  const img = { ancho: tramo.imagenAncho, alto: tramo.imagenAlto };
  const misma = anterior?.imagen === tramo.imagen && anterior !== null;
  const conEnfoque = Boolean(tramo.enfoque && img.ancho > 0 && img.alto > 0);
  const vistaDe = (t: Tramo | null): Vista =>
    t?.enfoque ? vistaDeEnfoque(caja, img, t.enfoque) : vistaCompleta(caja, img);
  const lento = interpolate(frame, [0, Math.max(1, duracion)], [1, conEnfoque ? 1.04 : 1.08], {
    extrapolateRight: "clamp",
  });
  const golpe = misma
    ? 1
    : interpolate(frame, [0, 7], [1.12, 1], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const barrido =
    tramo.entrada === "barrido" && !misma
      ? interpolate(frame, [0, 9], [1100, 0], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) })
      : 0;
  const entra =
    misma || tramo.entrada === "barrido"
      ? 1
      : interpolate(frame, [0, 5], [0, 1], { extrapolateRight: "clamp" });
  const noche = tramo.oscurecer ? interpolate(frame, [0, 14], [0, 0.72], { extrapolateRight: "clamp" }) : 0;
  let contenido: React.ReactNode;
  if (conEnfoque && tramo.enfoque) {
    const desde = misma ? vistaDe(anterior) : vistaCompleta(caja, img);
    const hasta = vistaDeEnfoque(caja, img, tramo.enfoque);
    const t = interpolate(frame, [misma ? 0 : 6, misma ? 14 : 22], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.inOut(Easing.cubic),
    });
    const v = mezclarVistas(desde, hasta, t);
    contenido = (
      <div style={{ position: "absolute", inset: 0, transform: `scale(${golpe * lento})` }}>
        <Img
          src={staticFile(tramo.imagen ?? "")}
          style={{ position: "absolute", left: v.left, top: v.top, width: v.width, height: v.height }}
        />
      </div>
    );
  } else {
    const lado = indice % 2 === 0 ? 1 : -1;
    const x = interpolate(frame, [0, Math.max(1, duracion)], [-14 * lado, 14 * lado], {
      extrapolateRight: "clamp",
    });
    contenido = (
      <Img
        src={staticFile(tramo.imagen ?? "")}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `translateX(${x}px) scale(${golpe * lento})`,
        }}
      />
    );
  }
  return (
    <div
      style={{
        position: "absolute",
        left: Z.tarjeta.x + barrido,
        top: Z.tarjeta.y,
        width: Z.tarjeta.ancho,
        height: Z.tarjeta.alto,
        borderRadius: 40,
        overflow: "hidden",
        border: `6px solid ${acento}`,
        boxShadow: "0 30px 80px rgba(0,0,0,0.55)",
        background: fondo,
        opacity: entra,
      }}
    >
      {contenido}
      {noche > 0 && <AbsoluteFill style={{ background: `rgba(2,4,12,${noche})` }} />}
    </div>
  );
};

/** Una cifra grande que sube como contador (la utilidad neta, por ejemplo). */
const Cifra: React.FC<{ cifra: NonNullable<Tramo["cifra"]>; acento: string }> = ({ cifra, acento }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 12, stiffness: 160 } });
  const avance = interpolate(frame, [0, 34], [0, 1], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const texto = `${cifra.prefijo}${formatoCifra(cifra.valor * avance, cifra.decimales)}${cifra.sufijo}`;
  return (
    <AbsoluteFill
      style={{ top: Z.texto.y, height: Z.texto.alto, alignItems: "center", justifyContent: "center" }}
    >
      <div
        style={{
          transform: `scale(${0.6 + 0.4 * s})`,
          background: acento,
          color: textoSobre(acento),
          fontSize: 124,
          lineHeight: 1.05,
          padding: "8px 36px",
          borderRadius: 18,
          boxShadow: "0 12px 30px rgba(0,0,0,0.45)",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {texto}
      </div>
    </AbsoluteFill>
  );
};

/** La persona que habla en un tramo: de medio cuerpo abajo a la izquierda, o de cuerpo completo al centro. */
const Aparicion: React.FC<{ a: PropsPublicidad["apariciones"][number]; entra: boolean }> = ({ a, entra }) => {
  const frame = useCurrentFrame();
  const cuerpo = a.encuadre === "cuerpo";
  const alto = cuerpo ? Z.cuerpo.alto : Z.medio.alto;
  const ancho = (alto * a.ancho) / a.alto;
  const mov = entra
    ? interpolate(frame, [0, 9], [1, 0], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) })
    : 0;
  return (
    <div
      style={{
        position: "absolute",
        left: (cuerpo ? (1080 - ancho) / 2 : Z.medio.x) - (cuerpo ? 0 : 420 * mov),
        bottom: 0,
        height: alto,
        width: ancho,
        transform: cuerpo ? `translateY(${260 * mov}px)` : undefined,
        opacity: cuerpo ? 1 - mov * 0.8 : 1,
      }}
    >
      <OffthreadVideo src={staticFile(a.ruta)} transparent muted style={{ width: "100%", height: "100%" }} />
    </div>
  );
};

/** El texto grande del momento, en la caja del color de la marca: entra con un rebote. */
const TextoGrande: React.FC<{ texto: string; acento: string; quieto?: boolean }> = ({
  texto,
  acento,
  quieto = false,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // `quieto`: el primer cuadro es la miniatura de WhatsApp; el título ya está completo desde ahí.
  const s = quieto ? 1 : spring({ frame, fps, config: { damping: 11, stiffness: 170 } });
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
const Cierre: React.FC<{ logo: string; lineas: string[]; acento: string; oscuro: boolean }> = ({
  logo,
  lineas,
  acento,
  oscuro,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 13, stiffness: 140 } });
  return (
    <AbsoluteFill
      style={{
        background: oscuro
          ? `radial-gradient(circle at 50% 30%, ${acento}33 0%, #06110b 55%, #030805 100%)`
          : "#fff",
        alignItems: "center",
        paddingTop: 130,
        opacity: Math.min(1, frame / 6),
      }}
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
              color: i === 0 ? acento : oscuro ? "#fff" : "#111",
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
  const oscuro = p.tema === "oscuro";
  // Cada tramo con imagen abre una tarjeta; dura hasta la próxima imagen, un tramo «sin tarjeta» o el cierre.
  const cortes = p.tramos.filter((t) => t.imagen || t.sinTarjeta);
  const imagenes = p.tramos.filter((t) => t.imagen);
  const actual = [...imagenes].reverse().find((t) => t.inicioMs <= ms) ?? imagenes[0];
  const aparicion = p.apariciones.find((a) => ms >= a.inicioMs && ms < a.finMs) ?? null;
  const conPersona = aparicion !== null || (p.avatar !== null && p.apariciones.length === 0);
  const subtitulosEn =
    aparicion?.encuadre === "cuerpo"
      ? { left: 60, right: 60, top: Z.subtitulosCuerpo.y }
      : conPersona
        ? { left: Z.subtitulos.izquierda, right: Z.subtitulos.derecha, top: Z.subtitulos.y }
        : { left: 80, right: 80, top: Z.subtitulos.y };
  return (
    <AbsoluteFill style={{ backgroundColor: oscuro ? "#050b07" : "#0b0b0b", fontFamily }}>
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
      {cortes.map((t, i) => {
        if (!t.imagen) return null;
        const siguiente = cortes[i + 1];
        const desde = f(t.inicioMs);
        const hasta = siguiente ? f(siguiente.inicioMs) : f(p.cierre.inicioMs);
        if (hasta <= desde) return null;
        const anterior = cortes[i - 1] ?? null;
        return (
          <Sequence key={`img-${i}`} from={desde} durationInFrames={hasta - desde} layout="none">
            <Tarjeta
              tramo={t}
              anterior={anterior?.imagen ? anterior : null}
              duracion={hasta - desde}
              indice={i}
              acento={p.acento}
              fondo={oscuro ? "#0b120e" : "#fff"}
            />
          </Sequence>
        );
      })}
      {/* El texto grande o las etiquetas de cada momento. */}
      {p.tramos.map((t, i) => {
        if (!t.texto && !t.chips.length && !t.cifra) return null;
        const desde = f(t.inicioMs);
        const hasta = Math.min(f(t.finMs), f(p.cierre.inicioMs));
        if (hasta <= desde) return null;
        return (
          <Sequence key={`txt-${i}`} from={desde} durationInFrames={hasta - desde} layout="none">
            {t.cifra ? (
              <Cifra cifra={t.cifra} acento={p.acento} />
            ) : t.chips.length ? (
              <Etiquetas chips={t.chips} desdeMs={t.inicioMs} />
            ) : (
              <TextoGrande texto={t.texto ?? ""} acento={p.acento} quieto={t.inicioMs === 0} />
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
            background: oscuro ? "rgba(4,10,7,0.88)" : "rgba(255,255,255,0.95)",
            border: oscuro ? `2px solid ${p.acento}88` : undefined,
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
        <Cierre logo={p.logo} lineas={p.cierre.lineas} acento={p.acento} oscuro={oscuro} />
      </Sequence>
      {/* La persona por tramos (medio cuerpo o cuerpo completo); fuera del cierre. */}
      {p.apariciones.map((a, i) => {
        const desde = f(a.inicioMs);
        const hasta = Math.min(f(a.finMs), f(p.cierre.inicioMs));
        if (hasta <= desde) return null;
        const previa = p.apariciones[i - 1];
        const seguida =
          previa !== undefined && previa.encuadre === a.encuadre && Math.abs(previa.finMs - a.inicioMs) < 60;
        return (
          <Sequence key={`persona-${i}`} from={desde} durationInFrames={hasta - desde} layout="none">
            <Aparicion a={a} entra={!seguida && a.inicioMs > 0} />
          </Sequence>
        );
      })}
      {/* La persona con su fondo, en un recuadro del color de la marca (abajo a la izquierda). */}
      {p.apariciones.length === 0 && p.avatar?.recuadro && (
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
      {p.apariciones.length === 0 && p.avatar && !p.avatar.recuadro && (
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
      {/* Subtítulos al estilo CapCut, encima de todo (también de la persona de cuerpo completo). */}
      {sub && !enCierre && (
        <div
          style={{
            position: "absolute",
            left: subtitulosEn.left,
            right: subtitulosEn.right,
            top: subtitulosEn.top,
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
      {p.tramos.map((t, i) => {
        // Cada cambio de imagen suena (un corte); el tramo con su propio efecto suena con ese.
        if (i === 0 && !t.sonido) return null;
        const sfx = t.sonido ?? (t.imagen ? p.sfx.cortes[i % Math.max(1, p.sfx.cortes.length)] : undefined);
        return sfx ? (
          <Sequence
            key={`sfx-${i}`}
            from={Math.max(0, f(t.inicioMs) - 2)}
            durationInFrames={30}
            layout="none"
          >
            <Audio src={staticFile(sfx)} volume={t.sonido ? 0.5 : 0.35} />
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
