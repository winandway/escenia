// Plantilla de los videos de monigotes animados (docs/MONIGOTES.md), en el estilo del reel viral de
// referencia: fondo negro, el dibujo animado a pantalla completa, el título arriba en dos líneas
// (rojo y blanco), subtítulos en mayúsculas con la palabra clave en una caja roja, el nombre de la
// canción en cada hueco (Richard pega ahí el pedacito en su editor) y la marca del canal abajo en rojo.
import {
  AbsoluteFill,
  Audio,
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
const ROJO = "#ff2a2a";

export const esquemaMonigotes = z.object({
  titulo: z.tuple([z.string(), z.string()]),
  marca: z.string(),
  audio: z.string(),
  duracionMs: z.number(),
  escenas: z.array(
    z.object({
      inicioMs: z.number(),
      finMs: z.number(),
      clips: z.array(z.object({ ruta: z.string(), duracionMs: z.number() })),
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
            <AbsoluteFill>
              <OffthreadVideo
                src={staticFile(c.ruta)}
                muted
                playbackRate={ritmo}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </AbsoluteFill>
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

const Fundido: React.FC<{ duracion: number; children: React.ReactNode }> = ({ duracion, children }) => {
  const frame = useCurrentFrame();
  const opacidad = interpolate(frame, [0, 6, duracion - 6, duracion], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return <AbsoluteFill style={{ opacity: opacidad }}>{children}</AbsoluteFill>;
};

const sombra = "0 0 18px rgba(0,0,0,0.95), 0 4px 0 #000, 0 -2px 0 #000, 3px 0 0 #000, -3px 0 0 #000";

export const Monigotes: React.FC<PropsMonigotes> = (p) => {
  const frame = useCurrentFrame();
  const ms = (frame / FPS) * 1000;
  const sub = p.subtitulos.find((s) => ms >= s.inicioMs && ms < s.finMs);
  const hueco = p.escenas.map((e) => e.hueco).find((h) => h && ms >= h.inicioMs && ms < h.finMs) ?? null;
  return (
    <AbsoluteFill style={{ backgroundColor: "#000", fontFamily }}>
      {p.escenas.map((e, i) => {
        const dur = f(e.finMs) - f(e.inicioMs);
        return (
          <Sequence key={i} from={f(e.inicioMs)} durationInFrames={dur}>
            <Fundido duracion={dur}>
              <Escena clips={e.clips} duracion={dur} />
            </Fundido>
          </Sequence>
        );
      })}
      {/* Título arriba, como el reel de referencia: la primera línea en rojo y la segunda en blanco. */}
      <AbsoluteFill style={{ top: 250, alignItems: "center", justifyContent: "flex-start" }}>
        <div
          style={{
            color: ROJO,
            fontSize: 92,
            lineHeight: 1.05,
            textShadow: sombra,
            textAlign: "center",
            padding: "0 60px",
          }}
        >
          {p.titulo[0]}
        </div>
        <div
          style={{
            color: "#fff",
            fontSize: 92,
            lineHeight: 1.05,
            textShadow: sombra,
            textAlign: "center",
            padding: "0 60px",
          }}
        >
          {p.titulo[1]}
        </div>
      </AbsoluteFill>
      {/* Subtítulo: la palabra clave en una caja roja. En el hueco de una canción, su nombre. */}
      <AbsoluteFill style={{ top: 1210, alignItems: "center", justifyContent: "flex-start" }}>
        {hueco ? (
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                display: "inline-block",
                background: ROJO,
                color: "#fff",
                fontSize: 84,
                padding: "6px 26px",
                borderRadius: 10,
              }}
            >
              ♪ {hueco.cancion}
            </div>
            <div style={{ color: "#fff", fontSize: 58, marginTop: 14, textShadow: sombra }}>
              {hueco.artista}
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
                    background: ROJO,
                    color: "#fff",
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
      {/* La marca del canal, abajo y en rojo. */}
      <AbsoluteFill style={{ top: 1500, alignItems: "center", justifyContent: "flex-start" }}>
        <div style={{ color: ROJO, fontSize: 96, letterSpacing: 2, textShadow: sombra }}>{p.marca}</div>
      </AbsoluteFill>
      {p.audio ? <Audio src={staticFile(p.audio)} /> : null}
    </AbsoluteFill>
  );
};
