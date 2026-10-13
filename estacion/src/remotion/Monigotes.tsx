// Plantilla de los videos de monigotes animados (docs/MONIGOTES.md), en el estilo del reel viral de
// referencia: fondo negro, el dibujo animado a pantalla completa, el título arriba en dos líneas
// (color del canal y blanco), subtítulos en mayúsculas con la palabra clave en una caja del color del
// canal, el nombre de la canción en cada hueco (Richard pega ahí el pedacito en su editor) y la marca
// abajo. El color es el del canal: rojo en Caprichoso TV, el verde del logo en Full Código.
import {
  AbsoluteFill,
  Audio,
  Easing,
  Img,
  OffthreadVideo,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { loadFont } from "@remotion/google-fonts/Anton";
import { z } from "zod";

const { fontFamily } = loadFont("normal", { weights: ["400"], subsets: ["latin", "latin-ext"] });
const FPS = 30;
export const ROJO = "#ff2a2a";

/** Letra negra sobre un color claro (el verde de Full Código) y blanca sobre uno oscuro (el rojo). */
export function textoSobre(color: string): "#000" | "#fff" {
  const n = (i: number) => parseInt(color.slice(i, i + 2), 16) / 255;
  const lineal = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const luz = 0.2126 * lineal(n(1)) + 0.7152 * lineal(n(3)) + 0.0722 * lineal(n(5));
  return luz > 0.3 ? "#000" : "#fff";
}

export const esquemaMonigotes = z.object({
  titulo: z.tuple([z.string(), z.string()]),
  marca: z.string(),
  acento: z
    .string()
    .regex(/^#[0-9a-f]{6}$/i)
    .default(ROJO),
  audio: z.string(),
  duracionMs: z.number(),
  escenas: z.array(
    z.object({
      inicioMs: z.number(),
      finMs: z.number(),
      // «video»: clip animado de pago (Kling). «imagen»: una pose dibujada que la plantilla mueve gratis.
      clips: z.array(
        z.object({
          ruta: z.string(),
          duracionMs: z.number(),
          tipo: z.enum(["video", "imagen"]).default("video"),
          // Solo en imágenes: cuánto subir (fracción del alto) y acercar el dibujo para dejarlo en la
          // franja libre entre el título y los subtítulos (encuadreDeDibujo en monigotes.ts).
          encuadre: z.object({ subir: z.number(), zoom: z.number() }).optional(),
        }),
      ),
      hueco: z
        .object({ inicioMs: z.number(), finMs: z.number(), cancion: z.string(), artista: z.string() })
        .nullable(),
    }),
  ),
  subtitulos: z.array(
    z.object({
      inicioMs: z.number(),
      finMs: z.number(),
      palabras: z.array(z.string()),
      resaltada: z.number(),
    }),
  ),
});
export type PropsMonigotes = z.infer<typeof esquemaMonigotes>;

const f = (ms: number) => Math.round((ms / 1000) * FPS);

/**
 * Dónde va cada cosa (en píxeles de 1080×1920). En un Short, YouTube tapa más o menos el 15 % de abajo
 * con el nombre del canal y el título, y la columna derecha con los botones: el 12 oct 2026 la marca
 * «CAPRICHOSO TV» quedó debajo del título de YouTube (C-MONIGOTES-1). Todo el texto queda por encima
 * del 85 % del alto y lejos del borde derecho. En cada hueco de canción va un recuadro 16:9 PEQUEÑO en la
 * esquina de arriba a la izquierda, siempre en el mismo sitio, para que Richard pegue ahí el video de la
 * canción; el dibujo NO se oscurece: el muñeco sigue siendo el protagonista.
 */
export const ZONA = {
  titulo: 250,
  subtitulos: 1370,
  marca: 1500,
  limiteAbajo: 1920 * 0.85,
  margenLados: 110,
  // Pequeño y en la esquina: el protagonista sigue siendo el dibujo (Richard, 12 oct 2026).
  recuadro: { x: 40, y: 470, ancho: 400, alto: 225 },
  tarjetaCancion: 1370,
} as const;

/** Cuatro ruidos distintos: se cambia de uno a otro cada 3 cuadros y la línea tiembla como dibujada a mano. */
const HERVOR = [1, 2, 3, 4] as const;
const FiltrosDeHervor: React.FC = () => (
  <svg width="0" height="0" style={{ position: "absolute" }}>
    {HERVOR.map((semilla) => (
      <filter key={semilla} id={`hervor-${semilla}`} x="-5%" y="-5%" width="110%" height="110%">
        <feTurbulence type="fractalNoise" baseFrequency="0.018" numOctaves={2} seed={semilla} />
        <feDisplacementMap in="SourceGraphic" scale={3} />
      </filter>
    ))}
  </svg>
);

/**
 * Una pose quieta que se mueve gratis (modo «poses», docs/MONIGOTES.md): entra con un golpecito, la
 * cámara se acerca y se corre despacio (una pose hacia un lado, la siguiente hacia el otro), la línea
 * tiembla como dibujada a mano y el brillo de color respira.
 */
const DibujoVivo: React.FC<{
  ruta: string;
  duracion: number;
  indice: number;
  encuadre?: { subir: number; zoom: number } | undefined;
}> = ({ ruta, duracion, indice, encuadre }) => {
  const frame = useCurrentFrame();
  const avance = Math.min(1, frame / Math.max(1, duracion));
  const lado = indice % 2 === 0 ? 1 : -1;
  const golpe = interpolate(frame, [0, 6], [0.05, 0], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const zoom = (encuadre?.zoom ?? 1) * (1.04 + 0.07 * avance + golpe);
  const subir = (encuadre?.subir ?? 0) * 1920;
  const x = lado * (avance * 36 - 18);
  const giro = lado * 0.5 * Math.sin(frame / 45);
  const respira = 1 + 0.5 * (0.5 + 0.5 * Math.sin(frame / 8));
  const semilla = HERVOR[Math.floor(frame / 3) % HERVOR.length] ?? 1;
  return (
    <AbsoluteFill style={{ filter: `url(#hervor-${semilla}) saturate(${respira.toFixed(3)})` }}>
      <Img
        src={staticFile(ruta)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `translate(${x.toFixed(1)}px, ${(-subir).toFixed(1)}px) scale(${zoom.toFixed(4)}) rotate(${giro.toFixed(3)}deg)`,
        }}
      />
    </AbsoluteFill>
  );
};

const Escena: React.FC<{ clips: PropsMonigotes["escenas"][number]["clips"]; duracion: number }> = ({
  clips,
  duracion,
}) => {
  // Dónde empieza cada clip dentro de la escena (uno detrás de otro).
  const inicios = clips.map((_, i) => clips.slice(0, i).reduce((s, c) => s + f(c.duracionMs), 0));
  return (
    <AbsoluteFill>
      {clips.map((c, i) => {
        const largo = f(c.duracionMs);
        const inicio = inicios[i] ?? 0;
        // El último clip se queda hasta el final de la escena (si es un poco más corto, va un poco más lento).
        const ultimo = i === clips.length - 1;
        const dura = ultimo ? Math.max(1, duracion - inicio) : largo;
        const ritmo = ultimo ? Math.min(1, largo / dura) : 1;
        return (
          <Sequence key={c.ruta} from={inicio} durationInFrames={dura} layout="none">
            {c.tipo === "imagen" ? (
              <DibujoVivo ruta={c.ruta} duracion={dura} indice={i} encuadre={c.encuadre} />
            ) : (
              <AbsoluteFill>
                <OffthreadVideo
                  src={staticFile(c.ruta)}
                  muted
                  playbackRate={ritmo}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </AbsoluteFill>
            )}
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

const Fundido: React.FC<{
  duracion: number;
  primera: boolean;
  ultima: boolean;
  children: React.ReactNode;
}> = ({ duracion, primera, ultima, children }) => {
  const frame = useCurrentFrame();
  // Entre escenas, un fundido corto. La primera arranca ya visible (los 3 primeros segundos son imagen y
  // voz, C-GANCHO-1) y la última no se apaga: el video no termina en negro.
  const entrada = primera ? 1 : interpolate(frame, [0, 6], [0, 1], { extrapolateRight: "clamp" });
  const salida = ultima
    ? 1
    : interpolate(frame, [duracion - 6, duracion], [1, 0], { extrapolateLeft: "clamp" });
  const opacidad = Math.min(entrada, salida);
  return <AbsoluteFill style={{ opacity: opacidad }}>{children}</AbsoluteFill>;
};

/** Cada línea del título en una sola línea: la letra se achica si el texto es largo (Anton, ~0,46 del alto por letra). */
export const tamanoDeLinea = (texto: string): number =>
  Math.max(56, Math.min(96, Math.floor(960 / Math.max(1, texto.length * 0.46))));

/** La tarjeta de la canción en UNA línea: «Así se le canta al despecho» se partía y pisaba la marca. */
export const tamanoDeTarjeta = (cancion: string): number =>
  Math.max(44, Math.min(84, Math.floor(820 / Math.max(1, (cancion.length + 2) * 0.47))));

const sombra = "0 0 18px rgba(0,0,0,0.95), 0 4px 0 #000, 0 -2px 0 #000, 3px 0 0 #000, -3px 0 0 #000";

export const Monigotes: React.FC<PropsMonigotes> = (p) => {
  const frame = useCurrentFrame();
  const ms = (frame / FPS) * 1000;
  const sub = p.subtitulos.find((s) => ms >= s.inicioMs && ms < s.finMs);
  const hueco = p.escenas.map((e) => e.hueco).find((h) => h && ms >= h.inicioMs && ms < h.finMs) ?? null;
  const acento = p.acento;
  const letraSobreAcento = textoSobre(acento);
  return (
    <AbsoluteFill style={{ backgroundColor: "#000", fontFamily }}>
      <FiltrosDeHervor />
      {p.escenas.map((e, i) => {
        const dur = f(e.finMs) - f(e.inicioMs);
        return (
          <Sequence key={i} from={f(e.inicioMs)} durationInFrames={dur}>
            <Fundido duracion={dur} primera={i === 0} ultima={i === p.escenas.length - 1}>
              <Escena clips={e.clips} duracion={dur} />
            </Fundido>
          </Sequence>
        );
      })}
      {hueco ? (
        // En el hueco de una canción: el recuadro pequeño para el video de la canción; el dibujo sigue igual.
        <AbsoluteFill>
          <div
            style={{
              position: "absolute",
              left: ZONA.recuadro.x,
              top: ZONA.recuadro.y,
              width: ZONA.recuadro.ancho,
              height: ZONA.recuadro.alto,
              background: "#000",
              border: `5px solid ${acento}`,
              borderRadius: 12,
              boxSizing: "border-box",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: ZONA.recuadro.x,
              top: ZONA.recuadro.y + ZONA.recuadro.alto + 8,
              width: ZONA.recuadro.ancho,
              textAlign: "center",
              color: "#fff",
              fontSize: 40,
              textShadow: sombra,
            }}
          >
            {hueco.artista}
          </div>
        </AbsoluteFill>
      ) : null}
      {/* Sombra negra arriba y abajo: el título, los subtítulos y la marca se leen aunque el dibujo pase por debajo. */}
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.92) 0px, rgba(0,0,0,0.85) 470px, rgba(0,0,0,0) 640px, rgba(0,0,0,0) 1230px, rgba(0,0,0,0.8) 1380px, rgba(0,0,0,0.92) 1920px)",
        }}
      />
      {/* Título arriba, como el reel de referencia: la primera línea en el color del canal y la segunda en blanco. */}
      <AbsoluteFill style={{ top: ZONA.titulo, alignItems: "center", justifyContent: "flex-start" }}>
        <div
          style={{
            color: acento,
            fontSize: tamanoDeLinea(p.titulo[0]),
            lineHeight: 1.08,
            textShadow: sombra,
            whiteSpace: "nowrap",
          }}
        >
          {p.titulo[0]}
        </div>
        <div
          style={{
            color: "#fff",
            fontSize: tamanoDeLinea(p.titulo[1]),
            lineHeight: 1.08,
            textShadow: sombra,
            whiteSpace: "nowrap",
          }}
        >
          {p.titulo[1]}
        </div>
      </AbsoluteFill>
      {/* Subtítulo: la palabra clave en una caja del color del canal. En el hueco de una canción, su nombre. */}
      <AbsoluteFill
        style={{
          top: hueco ? ZONA.tarjetaCancion : ZONA.subtitulos,
          alignItems: "center",
          justifyContent: "flex-start",
          padding: `0 ${ZONA.margenLados}px`,
        }}
      >
        {hueco ? (
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                display: "inline-block",
                background: acento,
                color: letraSobreAcento,
                fontSize: tamanoDeTarjeta(hueco.cancion),
                whiteSpace: "nowrap",
                padding: "6px 26px",
                borderRadius: 10,
              }}
            >
              ♪ {hueco.cancion}
            </div>
          </div>
        ) : sub ? (
          <div
            style={{
              display: "flex",
              gap: 18,
              flexWrap: "wrap",
              justifyContent: "center",
              padding: "0 70px",
            }}
          >
            {sub.palabras.map((w, i) =>
              i === sub.resaltada ? (
                <span
                  key={i}
                  style={{
                    background: acento,
                    color: letraSobreAcento,
                    fontSize: 80,
                    padding: "2px 16px",
                    borderRadius: 10,
                  }}
                >
                  {w}
                </span>
              ) : (
                <span key={i} style={{ color: "#fff", fontSize: 80, textShadow: sombra }}>
                  {w}
                </span>
              ),
            )}
          </div>
        ) : null}
      </AbsoluteFill>
      {/* La marca del canal, abajo y en su color. */}
      <AbsoluteFill style={{ top: ZONA.marca, alignItems: "center", justifyContent: "flex-start" }}>
        <div style={{ color: acento, fontSize: 84, letterSpacing: 2, textShadow: sombra }}>{p.marca}</div>
      </AbsoluteFill>
      {p.audio ? <Audio src={staticFile(p.audio)} /> : null}
    </AbsoluteFill>
  );
};
