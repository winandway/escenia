"use client";

// El estudio del Podcast IA (docs/PODCAST.md): Richard lo abre a pantalla completa, lo graba con su
// grabador de siempre y conversa con el invitado. La voz va por ElevenLabs Agents con una URL firmada que
// pide el panel en cada conversación (la clave nunca llega aquí). Los controles se esconden solos mientras
// se graba y vuelven al mover el ratón.
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MAX_SEGUNDOS_CONVERSACION } from "@compartido/podcast";
import { gestosDelTexto, type Gesto } from "@compartido/podcast-poses";
import { Escenario, type InvitadoEnEscena } from "./Escenario";
import type { AudioInvitado, EstadoInvitado } from "./RobotInvitado";
import css from "./estudio.module.css";

export type FichaDelEstudio = InvitadoEnEscena & { id: number; falta: string | null };

/** Al lado de «Empezar la conversación», y se esconde con los controles. */
export const PISTA_GRABAR = "Para grabar, usa tu grabador de pantalla (Pantalay)";

type Inicio = {
  conversacionId: number;
  signedUrl: string;
  maxSegundos: number;
  overrides: { agent: { prompt: { prompt: string }; firstMessage: string }; tts: { voiceId: string } };
};

/** Lo poco que usamos de la conversación del SDK. */
type Sesion = {
  endSession: () => Promise<void>;
  getOutputVolume: () => number;
  getOutputByteFrequencyData: () => Uint8Array;
};

const WORKLETS = {
  workletPaths: {
    rawAudioProcessor: "/podcast/worklets/rawAudioProcessor.js",
    audioConcatProcessor: "/podcast/worklets/audioConcatProcessor.js",
  },
  libsampleratePath: "/podcast/worklets/libsamplerate.worklet.js",
};

const leer = (clave: string) => {
  try {
    return window.localStorage.getItem(`escenia:podcast:${clave}`);
  } catch {
    return null;
  }
};
const guardar = (clave: string, valor: string) => {
  try {
    window.localStorage.setItem(`escenia:podcast:${clave}`, valor);
  } catch {
    // sin almacenamiento: la preferencia solo dura esta visita
  }
};

/** Los gestos de una respuesta nueva, sin los que ya pasaron. */
export function gestosDeLaRespuesta(
  antes: readonly Gesto[],
  texto: string,
  ahora = performance.now(),
): Gesto[] {
  return [...antes.filter((g) => g.hasta > ahora), ...gestosDelTexto(texto, ahora)];
}

const reloj = (s: number) =>
  `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

export function Estudio({
  fichas,
  conectado,
  minutosHoy,
  topeMinutos,
  errorConexion,
  fichaInicial = null,
}: {
  fichas: FichaDelEstudio[];
  conectado: boolean;
  minutosHoy: number;
  topeMinutos: number;
  errorConexion: string | null;
  /** La ficha que se pidió en la dirección (/podcast?ficha=3): manda sobre la última usada. */
  fichaInicial?: number | null;
}) {
  const [fichaId, setFichaId] = useState<number | null>(fichaInicial ?? fichas[0]?.id ?? null);
  const [estado, setEstado] = useState<EstadoInvitado>("reposo");
  const [aviso, setAviso] = useState<string>("");
  const [camara, setCamara] = useState(false);
  const [controlesVisibles, setControlesVisibles] = useState(true);
  const [segundos, setSegundos] = useState(0);
  const [usados, setUsados] = useState(minutosHoy);
  const sesion = useRef<Sesion | null>(null);
  const conversacion = useRef<number | null>(null);
  const flujo = useRef<MediaStream | null>(null);
  const video = useRef<HTMLVideoElement | null>(null);
  const escondido = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inicioMs = useRef<number | null>(null);
  // Los gestos que salen de lo que dice el invitado (la risa, el aplauso, la idea, las notas): el motor de
  // poses los lee en cada cuadro (podcast-poses.ts).
  const gestos = useRef<Gesto[]>([]);

  const ficha = fichas.find((f) => f.id === fichaId) ?? fichas[0] ?? null;
  const enVivo = estado !== "reposo";

  // Lo que eligió la última vez: la ficha y si quiere su cámara en el panel.
  useEffect(() => {
    const id = Number(leer("ficha"));
    const camaraGuardada = leer("camara") === "1";
    const t = setTimeout(() => {
      if (!fichaInicial && fichas.some((f) => f.id === id)) setFichaId(id);
      if (camaraGuardada) setCamara(true);
    }, 0);
    return () => clearTimeout(t);
  }, [fichas, fichaInicial]);

  // La cámara de Richard: se pide permiso al encenderla y se suelta al apagarla.
  useEffect(() => {
    if (!camara) return;
    let cancelado = false;
    navigator.mediaDevices
      ?.getUserMedia({ video: { width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false })
      .then((s) => {
        if (cancelado) return s.getTracks().forEach((t) => t.stop());
        flujo.current = s;
        if (video.current) video.current.srcObject = s;
      })
      .catch(() => {
        if (cancelado) return;
        setCamara(false);
        guardar("camara", "0");
        setAviso(
          "No pude encender tu cámara: revisa el permiso del navegador. El panel queda con fondo limpio.",
        );
      });
    return () => {
      cancelado = true;
      flujo.current?.getTracks().forEach((t) => t.stop());
      flujo.current = null;
    };
  }, [camara]);

  // Los controles se esconden solos mientras hay conversación; el ratón los trae de vuelta.
  const mostrarControles = useCallback(() => {
    setControlesVisibles(true);
    if (escondido.current) clearTimeout(escondido.current);
    escondido.current = setTimeout(() => setControlesVisibles(false), 2500);
  }, []);
  useEffect(() => {
    if (!enVivo) {
      if (escondido.current) clearTimeout(escondido.current);
      const t = setTimeout(() => setControlesVisibles(true), 0);
      return () => clearTimeout(t);
    }
    const t = setTimeout(mostrarControles, 0);
    return () => clearTimeout(t);
  }, [enVivo, mostrarControles]);

  // El reloj de la conversación (el corte de los 10 minutos lo hace el propio agente).
  useEffect(() => {
    if (!enVivo) return;
    const t = setInterval(() => {
      if (inicioMs.current) setSegundos(Math.floor((Date.now() - inicioMs.current) / 1000));
    }, 500);
    return () => clearInterval(t);
  }, [enVivo]);

  const cerrarEnElPanel = useCallback(() => {
    inicioMs.current = null;
    const id = conversacion.current;
    conversacion.current = null;
    if (!id) return;
    void fetch(`/datos/podcast/conversaciones/${id}/fin`, { method: "POST", keepalive: true })
      .then((r) => (r.ok ? (r.json() as Promise<{ segundos: number | null }>) : null))
      .then((d) => {
        if (d?.segundos != null) setUsados((u) => u + Math.ceil(d.segundos! / 60));
      })
      .catch(() => {
        // Si no llega, la próxima conversación la cierra contando los 10 minutos: nunca de menos.
      });
  }, []);

  // Si se cierra la pestaña a media conversación, igual se avisa al panel.
  useEffect(() => {
    const alSalir = () => {
      void sesion.current?.endSession();
      cerrarEnElPanel();
    };
    window.addEventListener("pagehide", alSalir);
    return () => window.removeEventListener("pagehide", alSalir);
  }, [cerrarEnElPanel]);

  const audio = useMemo<AudioInvitado>(
    () => ({
      volumen: () => sesion.current?.getOutputVolume() ?? 0,
      frecuencias: () => sesion.current?.getOutputByteFrequencyData() ?? null,
      gestos: () => gestos.current,
    }),
    [],
  );

  async function empezar() {
    if (!ficha || enVivo) return;
    setAviso("");
    setSegundos(0);
    setEstado("conectando");
    let inicio: Inicio;
    try {
      const r = await fetch("/datos/podcast/conversaciones", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ fichaId: ficha.id }),
      });
      const datos = (await r.json().catch(() => ({}))) as Partial<Inicio> & { error?: string };
      if (!r.ok || !datos.signedUrl) throw new Error(datos.error ?? `El panel respondió ${r.status}.`);
      inicio = datos as Inicio;
    } catch (e) {
      setEstado("reposo");
      setAviso(e instanceof Error ? e.message : "No se pudo abrir la conversación.");
      return;
    }
    conversacion.current = inicio.conversacionId;
    try {
      const { Conversation } = await import("@elevenlabs/client");
      const s = await Conversation.startSession({
        signedUrl: inicio.signedUrl,
        connectionType: "websocket",
        overrides: inicio.overrides,
        ...WORKLETS,
        onModeChange: ({ mode }) => setEstado(mode === "speaking" ? "hablando" : "escuchando"),
        onMessage: ({ role, message }) => {
          // Richard terminó de hablar: el invitado piensa hasta que empiece a contestar.
          if (role === "user") setEstado((e) => (e === "hablando" ? e : "pensando"));
          // El texto de la respuesta (llega con las etiquetas de emoción, como «[laughs]»): sus gestos.
          if (role === "agent") gestos.current = gestosDeLaRespuesta(gestos.current, message);
        },
        onDisconnect: (detalle) => {
          sesion.current = null;
          setEstado("reposo");
          cerrarEnElPanel();
          if (detalle.reason === "agent")
            setAviso("La conversación terminó (cada una dura como mucho 10 minutos).");
          else if (detalle.reason === "error") setAviso(`Se cortó la conversación: ${detalle.message}`);
        },
        onError: (mensaje) => setAviso(`El invitado tuvo un problema: ${mensaje}`),
      });
      sesion.current = s as unknown as Sesion;
      inicioMs.current = Date.now();
      guardar("ficha", String(ficha.id));
    } catch (e) {
      setEstado("reposo");
      cerrarEnElPanel();
      const texto = e instanceof Error ? e.message : String(e);
      setAviso(
        /permission|denied|NotAllowed/i.test(texto)
          ? "El navegador no dejó usar el micrófono: dale permiso y vuelve a empezar."
          : `No se pudo conectar al invitado: ${texto}`,
      );
    }
  }

  async function terminar() {
    const s = sesion.current;
    if (s) await s.endSession().catch(() => undefined);
    else {
      setEstado("reposo");
      cerrarEnElPanel();
    }
  }

  function alternarCamara() {
    const nueva = !camara;
    setCamara(nueva);
    guardar("camara", nueva ? "1" : "0");
  }

  function pantallaCompleta() {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen?.().catch(() => undefined);
  }

  const motivoBloqueo = !ficha
    ? "Crea una ficha antes de grabar."
    : ficha.falta
      ? ficha.falta
      : !conectado
        ? "Falta conectar la voz del invitado."
        : null;

  return (
    <div
      className={`${css.pantalla} ${enVivo && !controlesVisibles ? css.sinCursor : ""}`}
      onMouseMove={enVivo ? mostrarControles : undefined}
    >
      <Escenario
        invitado={
          ficha ?? {
            nombre: "Invitado",
            etiqueta: "Invitado especial",
            tema: "",
            ejemplo: false,
            origen: "ficcion",
          }
        }
        estado={estado}
        audio={audio}
        camara={camara}
        video={video}
      />

      <div
        className={`${css.controles} ${enVivo && !controlesVisibles ? css.controlesOcultos : ""}`}
        role="toolbar"
        aria-label="Controles del estudio"
      >
        {!enVivo && fichas.length > 1 && (
          <select
            aria-label="Invitado"
            value={ficha?.id ?? ""}
            onChange={(e) => {
              setFichaId(Number(e.target.value));
              guardar("ficha", e.target.value);
            }}
            className="rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1.5 text-sm"
          >
            {fichas.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nombre}
              </option>
            ))}
          </select>
        )}
        {enVivo ? (
          <button
            type="button"
            onClick={terminar}
            className="rounded-md bg-red-600 px-3 py-1.5 font-semibold text-white hover:bg-red-500"
          >
            Terminar
          </button>
        ) : (
          <button type="button" onClick={empezar} disabled={motivoBloqueo !== null} className="boton">
            Empezar la conversación
          </button>
        )}
        {/* El estudio no graba: lo graba el grabador de pantalla (Richard lo creyó, 7 nov 2026). */}
        <span className={css.pista}>{PISTA_GRABAR}</span>
        <button
          type="button"
          role="switch"
          aria-checked={camara}
          onClick={alternarCamara}
          className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-neutral-800"
        >
          <span
            className={`relative inline-block h-5 w-9 rounded-full transition ${camara ? "bg-amber-500" : "bg-neutral-600"}`}
            aria-hidden="true"
          >
            <span
              className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${camara ? "left-[18px]" : "left-0.5"}`}
            />
          </span>
          Mi cámara
        </button>
        <button
          type="button"
          onClick={pantallaCompleta}
          className="rounded-md px-2 py-1.5 hover:bg-neutral-800"
        >
          Pantalla completa
        </button>
        <span className="tabular-nums text-neutral-400">
          {enVivo ? `${reloj(segundos)} / ${reloj(MAX_SEGUNDOS_CONVERSACION)} · ` : ""}Hoy {usados} de{" "}
          {topeMinutos} min
        </span>
        {!enVivo && (
          <>
            <Link
              href="/podcast/fichas"
              className="rounded-md px-2 py-1.5 text-neutral-300 hover:bg-neutral-800"
            >
              Fichas
            </Link>
            <Link href="/" className="rounded-md px-2 py-1.5 text-neutral-400 hover:bg-neutral-800">
              Panel
            </Link>
          </>
        )}
        {(aviso || (!enVivo && motivoBloqueo) || (!enVivo && errorConexion)) && (
          <p
            className={`${css.aviso} ${aviso || motivoBloqueo ? "text-amber-300" : "text-red-300"}`}
            role="status"
          >
            {aviso || motivoBloqueo || `La última conversación falló: ${errorConexion}`}
          </p>
        )}
      </div>
    </div>
  );
}
