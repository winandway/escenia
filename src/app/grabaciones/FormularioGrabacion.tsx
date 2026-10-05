"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AvisoBorrador } from "@/componentes/AvisoBorrador";
import { useBorrador } from "@/componentes/useBorrador";
import { esquemaGrabacionNueva, extensionDeVideo, MAX_BYTES_GRABACION } from "@compartido/grabaciones";
import { ESTILOS_VIDEO, NOMBRE_CANAL, NOMBRE_FORMATO } from "@compartido/tematicas";
import { FalloDeSubida, iniciarSubida, seguirSubida, type SubidaEnCurso } from "./subida";

type Estado = {
  fase: "listo" | "subiendo" | "pausada";
  subidos: number;
  total: number;
  error: string;
  ok: string;
};

const EN_REPOSO: Estado = { fase: "listo", subidos: 0, total: 0, error: "", ok: "" };

const QUE_VA_DETRAS = {
  neon: "diagramas de neón que se encienden cuando nombras cada cosa",
  ilustrado: "las personas que nombras, dibujadas, con titulares",
  clasico: "fotos y videos reales de lo que vas nombrando",
} as const;

// El que más se usa con una grabación va primero.
const ORDEN_DE_FORMATOS = [...ESTILOS_VIDEO].reverse();

const megas = (bytes: number) => `${Math.round(bytes / 1_048_576)} MB`;

export function FormularioGrabacion() {
  const router = useRouter();
  const { ref, recuperado, empezarDeNuevo, descartar } = useBorrador("grabacion-nueva");
  const [estado, setEstado] = useState<Estado>(EN_REPOSO);
  const subida = useRef<SubidaEnCurso | null>(null);

  // Mientras sube, el navegador avisa antes de cerrar la pestaña: cerrar corta la subida.
  useEffect(() => {
    if (estado.fase !== "subiendo") return;
    const avisar = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", avisar);
    return () => window.removeEventListener("beforeunload", avisar);
  }, [estado.fase]);

  async function continuar(s: SubidaEnCurso) {
    const total = s.archivo.size;
    setEstado((e) => ({ ...e, fase: "subiendo", total, error: "", ok: "" }));
    try {
      await seguirSubida(s, (subidos) => setEstado((e) => ({ ...e, subidos })));
      subida.current = null;
      descartar();
      ref.current?.reset();
      setEstado({
        ...EN_REPOSO,
        ok: "Tu video ya subió. La Mac lo toma sola: aquí abajo vas viendo cómo avanza.",
      });
      router.refresh();
    } catch (e) {
      const seguir = e instanceof FalloDeSubida && e.sePuedeSeguir;
      if (!seguir) subida.current = null;
      // Lo escrito se queda en pantalla: se corrige o se sigue, nunca se pierde.
      setEstado((x) => ({
        ...x,
        fase: seguir ? "pausada" : "listo",
        error: e instanceof Error ? e.message : "No se pudo subir. Inténtalo otra vez.",
      }));
      if (!seguir) router.refresh();
    }
  }

  async function subir(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (subida.current) return void continuar(subida.current);
    const datos = new FormData(evento.currentTarget);
    const archivo = datos.get("archivo");
    if (!(archivo instanceof File) || archivo.size === 0)
      return setEstado({ ...EN_REPOSO, error: "Elige el video que grabaste." });
    if (!extensionDeVideo(archivo.name))
      return setEstado({
        ...EN_REPOSO,
        error: "Ese archivo no es un video que sepamos leer. Súbelo en MP4 o MOV.",
      });
    const parseo = esquemaGrabacionNueva.safeParse({
      tema: datos.get("tema"),
      formato: datos.get("formato"),
      canal: datos.get("canal"),
      archivo: archivo.name,
      bytes: archivo.size,
    });
    if (!parseo.success)
      return setEstado({ ...EN_REPOSO, error: parseo.error.issues[0]?.message ?? "Revisa los datos." });
    setEstado({ ...EN_REPOSO, fase: "subiendo", total: archivo.size });
    try {
      subida.current = await iniciarSubida(archivo, parseo.data);
    } catch (e) {
      return setEstado({
        ...EN_REPOSO,
        error: e instanceof Error ? e.message : "No se pudo empezar la subida.",
      });
    }
    await continuar(subida.current);
  }

  const ocupado = estado.fase === "subiendo";
  const pct = estado.total > 0 ? Math.round((estado.subidos / estado.total) * 100) : 0;

  return (
    <form ref={ref} onSubmit={subir} className="max-w-2xl space-y-5">
      <AvisoBorrador visible={recuperado} alEmpezarDeNuevo={empezarDeNuevo} />

      <div>
        <label htmlFor="archivo" className="etiqueta">
          Tu video (MP4 o MOV, hasta {MAX_BYTES_GRABACION / 1_073_741_824} GB)
        </label>
        <input
          id="archivo"
          name="archivo"
          type="file"
          accept="video/*,.mp4,.mov,.m4v,.webm,.mkv"
          required
          disabled={ocupado || estado.fase === "pausada"}
          className="campo file:mr-3 file:rounded-md file:border-0 file:bg-neutral-700 file:px-3 file:py-1.5 file:text-neutral-100"
        />
        <p className="mt-1.5 text-xs text-neutral-400">
          Grábate en horizontal, de la cintura para arriba, con el fondo verde parejo y bien iluminado. Sirve
          el archivo tal como sale del teléfono o de la cámara. Si lo grabas sin fondo verde, sales en una
          ventana.
        </p>
      </div>

      <div>
        <label htmlFor="tema" className="etiqueta">
          De qué hablas en el video
        </label>
        <textarea
          id="tema"
          name="tema"
          required
          minLength={5}
          maxLength={300}
          rows={2}
          className="campo"
          placeholder="El tema del video, en una frase"
        />
      </div>

      <div>
        <label htmlFor="formato" className="etiqueta">
          Qué va detrás de ti
        </label>
        <select id="formato" name="formato" required className="campo" defaultValue="neon">
          {ORDEN_DE_FORMATOS.map((f) => (
            <option key={f} value={f}>
              {NOMBRE_FORMATO[f]}: {QUE_VA_DETRAS[f]}
            </option>
          ))}
        </select>
        <p className="mt-1.5 text-xs text-neutral-400">
          Después puedes probar el mismo video con otro formato, sin subirlo otra vez.
        </p>
      </div>

      <div>
        <label htmlFor="canal" className="etiqueta">
          Para qué canal
        </label>
        <select id="canal" name="canal" required className="campo" defaultValue="canal-ia">
          {(["canal-ia", "caprichoso-tv"] as const).map((c) => (
            <option key={c} value={c}>
              {NOMBRE_CANAL[c]}
            </option>
          ))}
        </select>
      </div>

      {estado.fase !== "listo" && (
        <div role="status" aria-live="polite">
          <div
            className="h-2 overflow-hidden rounded-full bg-neutral-800"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={pct}
            aria-label="Avance de la subida"
          >
            <div className="h-full bg-amber-500 transition-[width]" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-1.5 text-sm text-neutral-300">
            {estado.fase === "subiendo" ? "Subiendo" : "En pausa"}: {pct}% ({megas(estado.subidos)} de{" "}
            {megas(estado.total)}).{" "}
            {estado.fase === "subiendo" && "No cierres esta pestaña hasta que termine."}
          </p>
        </div>
      )}

      {estado.error && (
        <p role="alert" className="rounded-md border border-red-900 bg-red-950/50 p-3 text-sm text-red-200">
          {estado.error}
        </p>
      )}
      {estado.ok && (
        <p
          role="status"
          className="rounded-md border border-emerald-900 bg-emerald-950/40 p-3 text-sm text-emerald-200"
        >
          {estado.ok}
        </p>
      )}

      <button type="submit" disabled={ocupado} className="boton">
        {ocupado ? "Subiendo…" : estado.fase === "pausada" ? "Seguir subiendo" : "Subir y armar el video"}
      </button>
    </form>
  );
}
