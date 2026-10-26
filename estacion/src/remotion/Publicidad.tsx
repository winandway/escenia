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
  capturaEnTelefono,
  contenidoDelTelefono,
  formatoCifra,
  ladoDelTelefonoEn,
  mezclarVistas,
  personaEnPizarra,
  type PropsPublicidad,
  subtitulosEnPantalla,
  tarjetaTelefono,
  telefonoPizarra,
  vistaCompleta,
  vistaDeEnfoque,
  type Vista,
  type VistaPersona,
  vistaPersonaEn,
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
  /** Diseño «pantalla»: la captura ocupa toda la pantalla, sin marco. */
  completa?: boolean;
  /** Diseño «teléfono»: la pantalla entera en una tarjeta alta, quieta (sin acercar ni mover). */
  telefono?: boolean;
}> = ({ tramo, anterior, duracion, indice, acento, fondo, completa = false, telefono = false }) => {
  const frame = useCurrentFrame();
  const caja = completa
    ? { ancho: 1080, alto: 1920 }
    : telefono
      ? { ancho: Z.telefono.ancho, alto: Z.telefono.alto }
      : { ancho: Z.tarjeta.ancho, alto: Z.tarjeta.alto };
  if (telefono) {
    // Entra creciendo hasta su tamaño (nunca más grande) y se queda quieta: la pantalla se ve entera.
    const entra = interpolate(frame, [0, 7], [0, 1], {
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    });
    // La tarjeta toma la forma de la pantalla (alta de celular o ancha de computadora): se ve entera.
    const t = tarjetaTelefono({ ancho: tramo.imagenAncho || 1, alto: tramo.imagenAlto || 1 });
    const v = { left: 0, top: 0, width: t.ancho, height: t.alto };
    const noche = tramo.oscurecer ? interpolate(frame, [0, 14], [0, 0.72], { extrapolateRight: "clamp" }) : 0;
    return (
      <div
        style={{
          position: "absolute",
          left: t.x - 6,
          top: t.y - 6,
          width: t.ancho + 12,
          height: t.alto + 12,
          borderRadius: Z.telefono.radio,
          overflow: "hidden",
          border: `6px solid ${acento}`,
          boxShadow: "0 30px 80px rgba(0,0,0,0.55)",
          background: "#fff",
          opacity: entra,
          transform: `scale(${0.9 + 0.1 * entra})`,
        }}
      >
        <Img
          src={staticFile(tramo.imagen ?? "")}
          style={{ position: "absolute", left: v.left, top: v.top, width: v.width, height: v.height }}
        />
        {noche > 0 && <AbsoluteFill style={{ background: `rgba(2,4,12,${noche})` }} />}
      </div>
    );
  }
  const img = { ancho: tramo.imagenAncho, alto: tramo.imagenAlto };
  const misma = anterior?.imagen === tramo.imagen && anterior !== null;
  const conEnfoque = Boolean(tramo.enfoque && img.ancho > 0 && img.alto > 0);
  const vistaDe = (t: Tramo | null): Vista =>
    t?.enfoque ? vistaDeEnfoque(caja, img, t.enfoque) : vistaCompleta(caja, img);
  const lento = interpolate(frame, [0, Math.max(1, duracion)], [1, conEnfoque ? 1.04 : 1.08], {
    extrapolateRight: "clamp",
  });
  // El primer momento ya está quieto en el cuadro 0: es la miniatura del anuncio (WhatsApp, Facebook).
  const primero = tramo.inicioMs === 0;
  const golpe =
    misma || primero
      ? 1
      : interpolate(frame, [0, 7], [1.12, 1], {
          extrapolateRight: "clamp",
          easing: Easing.out(Easing.cubic),
        });
  const barrido =
    tramo.entrada === "barrido" && !misma
      ? interpolate(frame, [0, 9], [1100, 0], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) })
      : 0;
  const entra =
    misma || primero || tramo.entrada === "barrido"
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
        left: (completa ? 0 : Z.tarjeta.x) + barrido,
        top: completa ? 0 : Z.tarjeta.y,
        width: caja.ancho,
        height: caja.alto,
        borderRadius: completa ? 0 : 40,
        overflow: "hidden",
        border: completa ? undefined : `6px solid ${acento}`,
        boxShadow: completa ? undefined : "0 30px 80px rgba(0,0,0,0.55)",
        background: completa ? "transparent" : fondo,
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
const Aparicion: React.FC<{
  a: PropsPublicidad["apariciones"][number];
  entra: boolean;
  /** Alto del medio cuerpo (en el diseño «teléfono» va un poco más chica para no tapar la tarjeta). */
  altoMedio?: number;
}> = ({ a, entra, altoMedio = Z.medio.alto }) => {
  const frame = useCurrentFrame();
  const cuerpo = a.encuadre === "cuerpo";
  const alto = cuerpo ? Z.cuerpo.alto : altoMedio;
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

/**
 * La persona en el diseño «pantalla»: grande al centro, pequeña de cuerpo completo, de medio cuerpo
 * señalando hacia la captura, solo la cabecita en un círculo, o fuera. Cada cambio de modo o de lado
 * entra con un salto; el video sigue corriendo debajo (la voz no se corta).
 */
const PersonaEnPantalla: React.FC<{
  a: PropsPublicidad["apariciones"][number];
  vista: VistaPersona & { desdeMs: number };
  desdeAparicionMs: number;
  acento: string;
  /** La aparición anterior terminó justo aquí con el mismo modo y lado: no se vuelve a entrar. */
  sigue: boolean;
}> = ({ a, vista, desdeAparicionMs, acento, sigue }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const P = Z.pantalla;
  // Cuadros desde que entró este modo (dentro de la aparición).
  const desde =
    sigue && vista.desdeMs <= desdeAparicionMs
      ? -100
      : f(Math.max(vista.desdeMs, desdeAparicionMs) - desdeAparicionMs);
  // Al empezar el anuncio ya está en su sitio (el cuadro 0 es la miniatura).
  const s =
    desdeAparicionMs === 0 && vista.desdeMs === 0
      ? 1
      : spring({ frame: frame - desde, fps, config: { damping: 13, stiffness: 160 } });
  const video = (estilo: React.CSSProperties) =>
    a.quieta ? (
      <Img src={staticFile(a.ruta)} style={estilo} />
    ) : (
      <OffthreadVideo src={staticFile(a.ruta)} transparent muted style={estilo} />
    );
  if (vista.modo === "oculta") return null;
  if (vista.modo === "cabeza") {
    const d = P.cabeza.diametro;
    const cara = a.cara ?? { x: 0.35, y: 0.08, ancho: 0.3, alto: 0.16 };
    // La cara ocupa algo menos de la mitad del círculo, un poco arriba del centro.
    const altoVideo = (d * 0.46) / (cara.alto * 1);
    const anchoVideo = (altoVideo * a.ancho) / a.alto;
    const izquierda = vista.lado === "izquierda";
    return (
      <div
        style={{
          position: "absolute",
          left: izquierda ? P.cabeza.margen : 1080 - P.cabeza.margen - d,
          bottom: P.cabeza.abajo,
          width: d,
          height: d,
          borderRadius: "50%",
          overflow: "hidden",
          border: `${P.cabeza.borde}px solid ${acento}`,
          boxShadow: "0 18px 50px rgba(0,0,0,0.55)",
          background: "radial-gradient(circle at 50% 35%, #2b3a31 0%, #0b120e 75%)",
          transform: `scale(${0.4 + 0.6 * s})`,
          opacity: Math.min(1, s * 1.6),
        }}
      >
        {video({
          position: "absolute",
          width: anchoVideo,
          height: altoVideo,
          left: d / 2 - (cara.x + cara.ancho / 2) * anchoVideo,
          top: d * 0.46 - (cara.y + cara.alto / 2) * altoVideo,
        })}
      </div>
    );
  }
  const alto =
    vista.modo === "grande" ? Z.cuerpo.alto : vista.modo === "cuerpo" ? P.cuerpo.alto : P.medio.alto;
  const ancho = (alto * a.ancho) / a.alto;
  const left =
    vista.modo === "grande"
      ? (1080 - ancho) / 2
      : vista.lado === "izquierda"
        ? vista.modo === "cuerpo"
          ? P.cuerpo.margen
          : -10
        : 1080 - ancho - (vista.modo === "cuerpo" ? P.cuerpo.margen : -10);
  // La de espaldas (foto quieta) se mece despacio; volteada si su mano tiene que apuntar al otro lado.
  const giro = a.quieta ? Math.sin(frame / 22) * 0.7 : 0;
  return (
    <div
      style={{
        position: "absolute",
        left,
        bottom: 0,
        height: alto,
        width: ancho,
        transform: `translateY(${(1 - s) * 320}px) rotate(${giro}deg)`,
        transformOrigin: "50% 100%",
        opacity: Math.min(1, 0.2 + s),
      }}
    >
      {video({ width: "100%", height: "100%", transform: a.espejo ? "scaleX(-1)" : undefined })}
    </div>
  );
};

/**
 * El teléfono del diseño «pizarra»: dibujado (marco oscuro, la isla y la hora arriba) con la captura
 * entera y centrada en su pantalla. Cada captura nueva entra subiendo un poco, como al cambiar de
 * pantalla en una app; nunca se acerca ni se sale del borde.
 */
const TelefonoPizarra: React.FC<{
  x: number;
  tramo: Tramo | null;
  /** Cuadros desde que entró esta captura (null: sin animación, como en el primer cuadro). */
  cuadros: number | null;
  acento: string;
}> = ({ x, tramo, cuadros, acento }) => {
  const T = Z.pizarra.telefono;
  const c = contenidoDelTelefono();
  const v = tramo?.imagen ? capturaEnTelefono({ ancho: tramo.imagenAncho, alto: tramo.imagenAlto }) : null;
  const entra =
    cuadros === null
      ? 1
      : interpolate(cuadros, [0, 8], [0, 1], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const texto: React.CSSProperties = {
    fontFamily: "Helvetica, Arial, sans-serif",
    fontWeight: 700,
    color: "#111",
  };
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: T.y,
        width: T.ancho,
        height: T.alto,
        borderRadius: T.radio,
        background: "linear-gradient(145deg, #3a3f4b 0%, #14161c 40%, #07080b 100%)",
        boxShadow: `0 40px 90px rgba(0,0,0,0.6), 0 0 0 3px ${acento}66, 0 0 70px ${acento}33`,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: T.bisel,
          top: T.bisel,
          right: T.bisel,
          bottom: T.bisel,
          borderRadius: T.radio - T.bisel,
          overflow: "hidden",
          background: "#eef2f7",
        }}
      >
        {/* La barra de arriba: la hora, la isla y la batería. */}
        <div style={{ position: "absolute", left: 34, top: 14, fontSize: 24, ...texto }}>9:41</div>
        <div
          style={{
            position: "absolute",
            left: (T.ancho - 2 * T.bisel - 124) / 2,
            top: 12,
            width: 124,
            height: 34,
            borderRadius: 17,
            background: "#000",
          }}
        />
        <div
          style={{
            position: "absolute",
            right: 30,
            top: 18,
            display: "flex",
            gap: 6,
            alignItems: "flex-end",
          }}
        >
          {[8, 12, 16, 20].map((h) => (
            <div key={h} style={{ width: 5, height: h, borderRadius: 2, background: "#111" }} />
          ))}
          <div
            style={{
              marginLeft: 8,
              width: 38,
              height: 18,
              borderRadius: 5,
              border: "2px solid #111",
              padding: 2,
              boxSizing: "border-box",
            }}
          >
            <div style={{ width: "78%", height: "100%", borderRadius: 2, background: "#111" }} />
          </div>
        </div>
        {v && tramo?.imagen && (
          <div
            style={{
              position: "absolute",
              left: c.x - T.bisel,
              top: c.y - T.bisel,
              width: c.ancho,
              height: c.alto,
              opacity: entra,
              transform: `translateY(${(1 - entra) * 40}px)`,
            }}
          >
            <Img
              src={staticFile(tramo.imagen)}
              style={{
                position: "absolute",
                left: v.left,
                top: v.top,
                width: v.width,
                height: v.height,
                borderRadius: 14,
                boxShadow: "0 8px 22px rgba(0,0,0,0.14)",
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * La persona del diseño «pizarra», de su lado y señalando el teléfono: la que habla (video) de medio
 * cuerpo o de cuerpo completo, o la de espaldas (foto quieta) que se mece despacio, con un destello
 * donde su dedo toca la pantalla, como en una pizarra.
 */
const PersonaEnPizarra: React.FC<{
  a: PropsPublicidad["apariciones"][number];
  entra: boolean;
  acento: string;
}> = ({ a, entra, acento }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pos = personaEnPizarra(a, telefonoPizarra(a.lado));
  const s = entra ? spring({ frame, fps, config: { damping: 14, stiffness: 150 } }) : 1;
  const fuera = a.lado === "izquierda" ? -(pos.left + pos.ancho) - 40 : 1080 - pos.left + 40;
  const left = pos.left + (1 - s) * fuera;
  const giro = a.quieta ? Math.sin(frame / 22) * 0.7 : 0;
  const respira = a.quieta ? 1 + Math.sin(frame / 15) * 0.006 : 1;
  // La punta del dedo, girada y escalada igual que la figura (el pivote es el centro de los pies).
  let dedo: { x: number; y: number } | null = null;
  if (a.quieta && a.dedo) {
    const fx = a.espejo ? 1 - a.dedo.x : a.dedo.x;
    const ox = (fx - 0.5) * pos.ancho * respira;
    const oy = -(1 - a.dedo.y) * pos.alto * respira;
    const r = (giro * Math.PI) / 180;
    dedo = {
      x: left + pos.ancho / 2 + ox * Math.cos(r) - oy * Math.sin(r),
      y: 1920 + ox * Math.sin(r) + oy * Math.cos(r),
    };
  }
  const fase = (frame % 26) / 26;
  return (
    <>
      <div
        style={{
          position: "absolute",
          left,
          bottom: 0,
          width: pos.ancho,
          height: pos.alto,
          transform: `rotate(${giro}deg) scale(${respira})`,
          transformOrigin: "50% 100%",
        }}
      >
        {a.quieta ? (
          <Img
            src={staticFile(a.ruta)}
            style={{ width: "100%", height: "100%", transform: a.espejo ? "scaleX(-1)" : undefined }}
          />
        ) : (
          <OffthreadVideo
            src={staticFile(a.ruta)}
            transparent
            muted
            style={{ width: "100%", height: "100%", transform: a.espejo ? "scaleX(-1)" : undefined }}
          />
        )}
      </div>
      {dedo && s > 0.95 && (
        <>
          <div
            style={{
              position: "absolute",
              left: dedo.x - (18 + 46 * fase),
              top: dedo.y - (18 + 46 * fase),
              width: 2 * (18 + 46 * fase),
              height: 2 * (18 + 46 * fase),
              borderRadius: "50%",
              border: `6px solid ${acento}`,
              opacity: 1 - fase,
            }}
          />
          <div
            style={{
              position: "absolute",
              left: dedo.x - 11,
              top: dedo.y - 11,
              width: 22,
              height: 22,
              borderRadius: "50%",
              background: "#fff",
              boxShadow: `0 0 18px 8px ${acento}`,
            }}
          />
        </>
      )}
    </>
  );
};

/** El fondo de la paleta: degradado y un dibujo suave (puntos o líneas) que se desliza despacio. */
const FondoDePaleta: React.FC<{ paleta: NonNullable<PropsPublicidad["paleta"]> }> = ({ paleta }) => {
  const frame = useCurrentFrame();
  const corre = (frame * 0.4) % 60;
  const dibujo =
    paleta.patron === "puntos"
      ? {
          backgroundImage: "radial-gradient(rgba(255,255,255,0.10) 2px, transparent 2.5px)",
          backgroundSize: "60px 60px",
        }
      : paleta.patron === "lineas"
        ? {
            backgroundImage:
              "repeating-linear-gradient(135deg, rgba(255,255,255,0.06) 0 2px, transparent 2px 38px)",
            backgroundSize: "60px 60px",
          }
        : null;
  return (
    <>
      <AbsoluteFill
        style={{ background: `linear-gradient(165deg, ${paleta.fondo[0]} 0%, ${paleta.fondo[1]} 100%)` }}
      />
      {dibujo && <AbsoluteFill style={{ ...dibujo, backgroundPosition: `${corre}px ${corre}px` }} />}
    </>
  );
};

/**
 * La portada: la etiqueta arriba a la derecha y el título en una o dos líneas grandes (la segunda en el
 * color de la marca), quietos desde el cuadro 0 para que la miniatura de WhatsApp los muestre completos;
 * al llegar `hastaMs` suben y se van.
 */
const Portada: React.FC<{ portada: NonNullable<PropsPublicidad["portada"]>; acento: string }> = ({
  portada,
  acento,
}) => {
  const frame = useCurrentFrame();
  const sale = interpolate(frame, [f(portada.hastaMs), f(portada.hastaMs) + 10], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.in(Easing.cubic),
  });
  return (
    <AbsoluteFill style={{ opacity: 1 - sale, transform: `translateY(${-160 * sale}px)` }}>
      {portada.etiqueta && (
        <div
          style={{
            position: "absolute",
            right: 40,
            top: 64,
            background: "#fff",
            color: "#111",
            fontSize: 44,
            padding: "6px 22px",
            borderRadius: 999,
            transform: "rotate(3deg)",
            boxShadow: "0 8px 22px rgba(0,0,0,0.4)",
          }}
        >
          {portada.etiqueta}
        </div>
      )}
      <div
        style={{
          position: "absolute",
          top: 170,
          left: 0,
          right: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 10,
        }}
      >
        {portada.lineas.map((l, i) => (
          <div
            key={l}
            style={{
              fontSize: 116,
              lineHeight: 1.02,
              padding: "4px 30px",
              borderRadius: 18,
              color: i === 1 ? textoSobre(acento) : "#fff",
              background: i === 1 ? acento : "transparent",
              textShadow: i === 1 ? undefined : sombra,
              transform: `rotate(${i === 1 ? -2 : 0}deg)`,
              boxShadow: i === 1 ? "0 12px 30px rgba(0,0,0,0.45)" : undefined,
            }}
          >
            {l}
          </div>
        ))}
      </div>
    </AbsoluteFill>
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

/**
 * La tarjeta final: el logo grande y las líneas de contacto, sobre blanco. Sin logo (un anuncio que
 * todavía no dice la marca), las líneas van al centro y una flecha late hacia abajo, donde está el botón
 * del anuncio: «toca aquí abajo y llena el formulario». Con paleta, el fondo oscuro es el de su paleta.
 */
const Cierre: React.FC<{
  logo: string;
  lineas: string[];
  acento: string;
  oscuro: boolean;
  paleta: PropsPublicidad["paleta"];
}> = ({ logo, lineas, acento, oscuro, paleta }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 13, stiffness: 140 } });
  const fondoOscuro = paleta
    ? `radial-gradient(circle at 50% 30%, ${acento}40 0%, ${paleta.fondo[0]} 50%, ${paleta.fondo[1]} 100%)`
    : `radial-gradient(circle at 50% 30%, ${acento}33 0%, #06110b 55%, #030805 100%)`;
  const salto = Math.abs(Math.sin((frame / fps) * Math.PI * 1.6));
  return (
    <AbsoluteFill
      style={{
        background: oscuro ? fondoOscuro : "#fff",
        alignItems: "center",
        justifyContent: logo ? undefined : "center",
        paddingTop: logo ? 130 : 0,
        paddingBottom: logo ? 0 : 260,
        opacity: Math.min(1, frame / 6),
      }}
    >
      {logo && (
        <>
          <Img src={staticFile(logo)} style={{ width: 920, transform: `scale(${0.7 + 0.3 * s})` }} />
          <div style={{ height: 50 }} />
        </>
      )}
      {lineas.map((l, i) => {
        const si = spring({ frame: frame - 6 - i * 5, fps, config: { damping: 12 } });
        return (
          <div
            key={l}
            style={{
              transform: `translateY(${(1 - si) * 40}px)`,
              opacity: si,
              fontSize: i === 0 ? (logo ? 92 : 118) : logo ? 60 : 72,
              color: i === 0 ? acento : oscuro ? "#fff" : "#111",
              marginTop: 18,
              textAlign: "center",
              padding: "0 40px",
            }}
          >
            {l}
          </div>
        );
      })}
      {!logo && (
        <svg
          width={200}
          height={240}
          viewBox="0 0 200 240"
          style={{
            position: "absolute",
            bottom: 300 - 40 * salto,
            left: 440,
            opacity: Math.min(1, Math.max(0, (frame - 16) / 8)),
            filter: `drop-shadow(0 0 24px ${acento})`,
          }}
        >
          <path d="M100 10 V170" stroke={acento} strokeWidth={30} strokeLinecap="round" />
          <path
            d="M30 120 L100 200 L170 120"
            stroke={acento}
            strokeWidth={30}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      )}
    </AbsoluteFill>
  );
};

export const Publicidad: React.FC<PropsPublicidad> = (p) => {
  const frame = useCurrentFrame();
  const ms = (frame / FPS) * 1000;
  const sub = p.subtitulos.find((s) => ms >= s.inicioMs && ms < s.finMs);
  const enCierre = ms >= p.cierre.inicioMs;
  const oscuro = p.tema === "oscuro";
  const pantalla = p.diseno === "pantalla";
  const telefono = p.diseno === "telefono";
  const pizarra = p.diseno === "pizarra";
  // Cada tramo con imagen abre una tarjeta; dura hasta la próxima imagen, un tramo «sin tarjeta» o el cierre.
  const cortes = p.tramos.filter((t) => t.imagen || t.sinTarjeta);
  const imagenes = p.tramos.filter((t) => t.imagen);
  const actual = [...imagenes].reverse().find((t) => t.inicioMs <= ms) ?? imagenes[0];
  const aparicion = p.apariciones.find((a) => ms >= a.inicioMs && ms < a.finMs) ?? null;
  const conPersona = aparicion !== null || (p.avatar !== null && p.apariciones.length === 0);
  const vistaActual = aparicion ? vistaPersonaEn(p.tramos, aparicion.encuadre, ms) : null;
  // Diseño «pizarra»: el teléfono sigue a la persona (del otro lado) y cruza deslizándose al cambiar.
  const tel = (() => {
    if (!pizarra) return null;
    const l = ladoDelTelefonoEn(p.apariciones, ms);
    const desde = telefonoPizarra(l.antes).x;
    const hasta = telefonoPizarra(l.lado);
    const t = interpolate(ms - l.desdeMs, [0, 450], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.inOut(Easing.cubic),
    });
    return { ...hasta, x: desde + (hasta.x - desde) * t };
  })();
  const subtitulosEn = tel
    ? aparicion
      ? {
          left: Math.max(20, tel.x - 40),
          right: Math.max(20, 1080 - tel.x - tel.ancho - 40),
          top: Z.pizarra.subtitulos,
        }
      : { left: 60, right: 60, top: Z.pizarra.subtitulos }
    : pantalla
      ? subtitulosEnPantalla(vistaActual)
      : telefono
        ? aparicion?.encuadre === "medio"
          ? { left: Z.subtitulos.izquierda, right: 40, top: Z.telefono.subtitulos }
          : { left: 60, right: 60, top: Z.telefono.subtitulos }
        : aparicion?.encuadre === "cuerpo"
          ? { left: 60, right: 60, top: Z.subtitulosCuerpo.y }
          : conPersona
            ? { left: Z.subtitulos.izquierda, right: Z.subtitulos.derecha, top: Z.subtitulos.y }
            : { left: 80, right: 80, top: Z.subtitulos.y };
  return (
    <AbsoluteFill style={{ backgroundColor: oscuro ? "#050b07" : "#0b0b0b", fontFamily }}>
      {/* Fondo con la armonía propia del video: degradado de su paleta y su dibujo. */}
      {p.paleta && <FondoDePaleta paleta={p.paleta} />}
      {/* Fondo: la misma foto difuminada y oscura (nunca un clip ajeno, C-FONDO-2). */}
      {actual?.imagen && !pizarra && (
        <AbsoluteFill
          style={{
            filter: "blur(28px) brightness(0.45)",
            transform: "scale(1.2)",
            opacity: p.paleta ? 0.28 : 1,
          }}
        >
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
      {/* Diseño «pizarra»: un foco de luz detrás del teléfono y el teléfono con la captura de cada momento. */}
      {tel && !enCierre && (
        <>
          <AbsoluteFill
            style={{
              background: `radial-gradient(circle at ${tel.x + tel.ancho / 2}px ${tel.y + tel.alto / 2}px, ${p.acento}40 0%, rgba(0,0,0,0) 46%)`,
            }}
          />
          <TelefonoPizarra
            x={tel.x}
            tramo={actual ?? null}
            cuadros={(() => {
              if (!actual || actual.inicioMs === 0) return null;
              const i = imagenes.indexOf(actual);
              const previa = imagenes[i - 1];
              return previa?.imagen === actual.imagen ? null : frame - f(actual.inicioMs);
            })()}
            acento={p.acento}
          />
        </>
      )}
      {/* La foto de cada momento, una detrás de otra. */}
      {cortes.map((t, i) => {
        if (!t.imagen || pizarra) return null;
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
              completa={pantalla}
              telefono={telefono}
            />
          </Sequence>
        );
      })}
      {/* Diseño «pantalla»: sombras arriba y abajo para leer el texto y ver a la persona sobre la captura. */}
      {pantalla && (
        <AbsoluteFill
          style={{
            background:
              "linear-gradient(180deg, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0) 22%, rgba(0,0,0,0) 66%, rgba(0,0,0,0.78) 100%)",
          }}
        />
      )}
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
      {/* Logo fijo arriba a la izquierda (fuera del cierre); sin logo, nada. */}
      {!enCierre && p.logo && (
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
        <Cierre logo={p.logo} lineas={p.cierre.lineas} acento={p.acento} oscuro={oscuro} paleta={p.paleta} />
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
            {pizarra ? (
              <PersonaEnPizarra
                a={a}
                entra={
                  !(
                    previa !== undefined &&
                    Math.abs(previa.finMs - a.inicioMs) < 60 &&
                    previa.lado === a.lado &&
                    previa.encuadre === a.encuadre &&
                    previa.quieta === a.quieta
                  ) && a.inicioMs > 0
                }
                acento={p.acento}
              />
            ) : pantalla ? (
              <PersonaEnPantalla
                a={a}
                vista={vistaPersonaEn(p.tramos, a.encuadre, Math.max(ms, a.inicioMs))}
                desdeAparicionMs={a.inicioMs}
                acento={p.acento}
                sigue={(() => {
                  if (!previa || Math.abs(previa.finMs - a.inicioMs) >= 60) return false;
                  const antes = vistaPersonaEn(p.tramos, previa.encuadre, a.inicioMs - 1);
                  const ahora = vistaPersonaEn(p.tramos, a.encuadre, a.inicioMs);
                  return antes.modo === ahora.modo && antes.lado === ahora.lado;
                })()}
              />
            ) : (
              <Aparicion
                a={a}
                entra={!seguida && a.inicioMs > 0}
                altoMedio={telefono ? Z.telefono.persona : Z.medio.alto}
              />
            )}
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
      {/* La portada del primer cuadro: el título grande, quieto desde el cuadro 0. */}
      {p.portada && ms < p.portada.hastaMs + 400 && <Portada portada={p.portada} acento={p.acento} />}
      {/* Subtítulos al estilo CapCut, encima de todo (también de la persona de cuerpo completo). */}
      {sub && !enCierre && !(p.portada && ms < p.portada.hastaMs) && (
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
