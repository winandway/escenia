"use client";

// El escenario 16:9 del Podcast IA, lo que sale en la grabación: el título, la cinta, Richard a la
// izquierda (su cámara o un fondo limpio), el invitado a la derecha (su avatar, de la ficha, con su casa detrás y
// su micrófono delante si el catálogo se los da), el tema de hoy y
// la leyenda obligatoria (C-PODCAST-1: siempre visible, y dice la verdad: ficción o historia real con permiso).
import type { RefObject } from "react";
import {
  CANAL_DEL_PODCAST,
  leyendaDelPodcast,
  type OrigenHistoria,
  type TipoFicha,
} from "@compartido/podcast";
import { AVATAR_NUEVO, avatarPorId, type AvatarId } from "@compartido/podcast-avatares";
import { RobotInvitado, type AudioInvitado, type EstadoInvitado } from "./RobotInvitado";
import css from "./estudio.module.css";

export type InvitadoEnEscena = {
  nombre: string;
  etiqueta: string;
  tema: string;
  /** La ficha de prueba: lleva el letrero amarillo «no publicar». */
  ejemplo: boolean;
  /** Sin origen es ficción: la leyenda nunca dice «historia real» si la ficha no lo dice. */
  origen?: OrigenHistoria;
  /** En una entrevista a la IA la leyenda solo dice que la voz y el avatar son de IA. */
  tipo?: TipoFicha;
  avatar?: AvatarId;
};

const TEXTO_ESTADO: Record<EstadoInvitado, string> = {
  reposo: "En espera",
  conectando: "Conectando",
  escuchando: "Escuchando",
  pensando: "Pensando",
  hablando: "Hablando",
};

const ALTURAS_ONDA = [0.35, 0.6, 0.9, 0.55, 1, 0.7, 0.45, 0.8, 0.4];

function Ondas({ tono }: { tono: "rosa" | "cian" }) {
  const alturas = tono === "rosa" ? ALTURAS_ONDA : [...ALTURAS_ONDA].reverse();
  return (
    <div className={`${css.ondas} ${tono === "rosa" ? css.ondasRosa : css.ondasCian}`} aria-hidden="true">
      {alturas.map((h, i) => (
        <span key={i} style={{ height: `${h * 100}%`, animationDelay: `${(i % 4) * 0.18}s` }} />
      ))}
    </div>
  );
}

const IconoMicrofono = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 48 48" className={className} fill="none" aria-hidden="true">
    <defs>
      <linearGradient id="podcast-mic" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#f472b6" />
        <stop offset="1" stopColor="#67e8f9" />
      </linearGradient>
    </defs>
    <rect x="17" y="4" width="14" height="24" rx="7" stroke="url(#podcast-mic)" strokeWidth="3" />
    <path
      d="M11 22a13 13 0 0 0 26 0M24 35v8M17 43h14"
      stroke="url(#podcast-mic)"
      strokeWidth="3"
      strokeLinecap="round"
    />
  </svg>
);

const IconoMicBlanco = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="#fff"
    strokeWidth="2.2"
    strokeLinecap="round"
    aria-hidden="true"
  >
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M6 11a6 6 0 0 0 12 0M12 17v4M9 21h6" />
  </svg>
);

const IconoRobot = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <rect x="4" y="7" width="16" height="12" rx="4" />
    <path d="M12 3v4M9 12h.01M15 12h.01M9.5 15.5c1.4 1 3.6 1 5 0" />
  </svg>
);

const IconoClaqueta = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    className={className}
    fill="none"
    stroke="#fff"
    strokeWidth="1.7"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M3 9h18v11H3z" />
    <path d="M3 9l1.6-5 17 3.5L21 9M8 4.6 9.5 8.4M13 5.6l1.5 3.4M18 6.7l1 2.3" />
    <path d="M10 12.5v5l4.2-2.5z" fill="#fff" />
  </svg>
);

function Etiqueta({ icono, nombre, rol }: { icono: React.ReactNode; nombre: string; rol: string }) {
  return (
    <div className={css.etiqueta}>
      <span className={css.etiquetaIcono}>{icono}</span>
      <span className={css.etiquetaTexto}>
        <span className={css.etiquetaNombre}>{nombre}</span>
        <span className={css.etiquetaRol}>{rol}</span>
      </span>
    </div>
  );
}

export function Escenario({
  invitado,
  estado,
  audio,
  camara,
  video,
}: {
  invitado: InvitadoEnEscena;
  estado: EstadoInvitado;
  audio?: AudioInvitado | null;
  /** La cámara de Richard encendida en el panel izquierdo. */
  camara: boolean;
  video?: RefObject<HTMLVideoElement | null>;
}) {
  const avatar = avatarPorId(invitado.avatar ?? AVATAR_NUEVO);
  const fondo = avatar.escenario?.fondo;
  return (
    <div className={css.escenario} data-testid="escenario">
      {/* El podcast es una sección del canal Full Código (@FullCodigo): la marca va siempre en la grabación. */}
      <div className={css.canal} aria-label="Un podcast de Full Código">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/podcast/full-codigo.webp" alt="" className={css.canalLogo} />
        <span className={css.canalTexto}>
          <b>{CANAL_DEL_PODCAST.nombre}</b>
          <small>{CANAL_DEL_PODCAST.arroba}</small>
        </span>
      </div>
      <header className={css.cabecera}>
        <Ondas tono="rosa" />
        <h1 className={css.marca}>
          <IconoMicrofono className={css.microfono} />
          <span>
            Podcast <span className={css.marcaIA}>IA</span>
          </span>
        </h1>
        <Ondas tono="cian" />
      </header>
      <p className={css.cinta}>
        Historias que inspiran<b>·</b>Entrevistas a IAs<b>·</b>Preguntas de la vida
      </p>

      <section className={`${css.panel} ${css.panelHost}`} aria-label="Richard">
        {camara && <video ref={video} className={css.camara} autoPlay muted playsInline />}
        <Etiqueta icono={<IconoMicBlanco />} nombre="Richard" rol="Host" />
      </section>

      <section className={`${css.panel} ${css.panelInvitado}`} aria-label={invitado.nombre}>
        {/* Su casa detrás (si su avatar la tiene): oscurecida y desenfocada para que el invitado resalte. */}
        {fondo && (
          <div
            className={css.casa}
            data-casa={fondo.imagen}
            aria-hidden="true"
            style={{
              backgroundImage: `url(${fondo.imagen})`,
              backgroundPosition: `${fondo.enfoqueX}% 50%`,
              filter: `brightness(${fondo.brillo}) blur(${fondo.desenfoque}cqw)`,
            }}
          />
        )}
        {invitado.ejemplo && (
          <span className={css.ejemplo}>Historia de ejemplo (ficticia) · no publicar</span>
        )}
        <span className={css.estado} data-estado={estado}>
          <span className={css.estadoPunto} />
          {TEXTO_ESTADO[estado]}
        </span>
        <RobotInvitado estado={estado} audio={audio} avatar={avatar} className={css.robot} />
        <Etiqueta
          icono={<IconoRobot />}
          nombre={invitado.nombre}
          rol={invitado.etiqueta || "Invitado especial"}
        />
      </section>

      <div className={css.tema}>
        <span className={css.temaRotulo}>Tema de hoy:</span>
        <span className={css.temaBarra} aria-hidden="true" />
        <IconoClaqueta className={css.temaIcono} />
        <span className={css.temaTexto}>
          {invitado.tema ||
            (invitado.tipo === "entrevista_ia"
              ? "Pregúntale a la IA"
              : invitado.origen === "real"
                ? "Una historia real contada por su protagonista"
                : "Una historia para inspirar")}
        </span>
      </div>

      <p className={css.leyenda}>{leyendaDelPodcast(invitado.origen, invitado.tipo)}</p>
    </div>
  );
}
