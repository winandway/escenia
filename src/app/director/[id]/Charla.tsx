"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AvisoBorrador } from "@/componentes/AvisoBorrador";
import { useBorrador } from "@/componentes/useBorrador";
import { iniciarSubidaDeVideo, seguirSubida, FalloDeSubida } from "@/app/grabaciones/subida";
import { notaDeFotos, notaDeVideos } from "@/lib/director-prompt";
import { MAX_BYTES_VIDEO_DIRECTOR } from "@compartido/director";
import { EXTENSIONES_VIDEO } from "@compartido/grabaciones";
import { extensionDeImagen, MAX_BYTES_IMAGEN } from "@compartido/imagenes";

/** Los atajos llenan el cuadro de escribir; no reemplazan la conversación. */
const ATAJOS = [
  {
    titulo: "Un producto con mis fotos",
    texto: "Quiero un anuncio para vender este producto: … Te subo las fotos. Se compra o se pide por: …",
  },
  {
    titulo: "Con una persona que habla",
    texto: "Quiero un anuncio con una persona que lo presente, para: … Se compra o se pide por: …",
  },
  {
    titulo: "Prueba en vivo con mi video",
    texto:
      "Quiero un anuncio con este video de la prueba, sin cortes, explicando cada paso: … Te subo el video. Se compra o se pide por: …",
  },
  {
    titulo: "Ponle mi voz a este video",
    texto: "Quiero ponerle mi voz a este video, con un piano suave. Este es el texto: …",
  },
  {
    titulo: "Mi app con capturas",
    texto:
      "Quiero un anuncio de mi aplicación: … Te subo las capturas de pantalla. Lo que más le sirve a la gente es: …",
  },
];

type Subida = {
  nombre: string;
  tipo: "foto" | "video";
  estado: "subiendo" | "lista" | "error";
  error?: string;
  /** Cuánto lleva un video (los videos suben por partes). */
  pct?: number;
};

const esVideo = (nombre: string) =>
  (EXTENSIONES_VIDEO as readonly string[]).includes(nombre.toLowerCase().split(".").pop() ?? "");
type Estado = { fase: "listo" | "enviando"; error: string; enviado: string };

export function Charla({
  encargoId,
  carpeta,
  vacio,
  pendiente,
}: {
  encargoId: number;
  carpeta: string;
  vacio: boolean;
  pendiente: boolean;
}) {
  const router = useRouter();
  const { ref, recuperado, empezarDeNuevo, descartar } = useBorrador(`director-${encargoId}`);
  const [subidas, setSubidas] = useState<Subida[]>([]);
  const [estado, setEstado] = useState<Estado>({ fase: "listo", error: "", enviado: "" });

  // Al abrir y después de cada respuesta, la conversación se ve desde abajo (lo último).
  useEffect(() => {
    ref.current?.scrollIntoView({ block: "end" });
  }, [ref, pendiente, vacio]);

  const campo = () => ref.current?.elements.namedItem("texto") as HTMLTextAreaElement | null;

  function ponerAtajo(texto: string) {
    const c = campo();
    if (!c) return;
    c.value = texto;
    c.dispatchEvent(new Event("input", { bubbles: true }));
    c.focus();
  }

  const anotar = (s: Subida) => setSubidas((antes) => [...antes.filter((x) => x.nombre !== s.nombre), s]);

  /** Un video sube por partes de 8 MB, con reintentos; al terminar, la Mac lo mira sola. */
  async function subirVideo(archivo: File) {
    if (archivo.size > MAX_BYTES_VIDEO_DIRECTOR)
      return anotar({ nombre: archivo.name, tipo: "video", estado: "error", error: "pasa de 2 GB" });
    anotar({ nombre: archivo.name, tipo: "video", estado: "subiendo", pct: 0 });
    try {
      const base = `/datos/director/${encargoId}/videos`;
      const s = await iniciarSubidaDeVideo(archivo, base);
      await seguirSubida(
        s,
        (subidos, total) =>
          anotar({
            nombre: archivo.name,
            tipo: "video",
            estado: "subiendo",
            pct: Math.round((subidos / total) * 100),
          }),
        { rutas: { parte: `${base}/parte`, terminar: `${base}/terminar` } },
      );
      anotar({ nombre: archivo.name, tipo: "video", estado: "lista" });
      router.refresh();
    } catch (e) {
      anotar({
        nombre: archivo.name,
        tipo: "video",
        estado: "error",
        error: e instanceof FalloDeSubida ? e.message : "se cortó la conexión",
      });
    }
  }

  async function subir(archivos: FileList | null) {
    for (const archivo of Array.from(archivos ?? [])) {
      if (esVideo(archivo.name)) {
        await subirVideo(archivo);
        continue;
      }
      const extension = extensionDeImagen(archivo.name);
      if (!extension || extension === "pdf") {
        anotar({
          nombre: archivo.name,
          tipo: "foto",
          estado: "error",
          error: "solo fotos (PNG, JPG, WEBP) o videos",
        });
        continue;
      }
      if (archivo.size > MAX_BYTES_IMAGEN) {
        anotar({ nombre: archivo.name, tipo: "foto", estado: "error", error: "pesa demasiado" });
        continue;
      }
      anotar({ nombre: archivo.name, tipo: "foto", estado: "subiendo" });
      try {
        const consulta = new URLSearchParams({ carpeta, nombre: archivo.name, extension });
        const r = await fetch(`/datos/imagenes?${consulta}`, { method: "POST", body: archivo });
        const j = (await r.json().catch(() => ({}))) as { error?: string };
        anotar(
          r.ok
            ? { nombre: archivo.name, tipo: "foto", estado: "lista" }
            : { nombre: archivo.name, tipo: "foto", estado: "error", error: j.error ?? "no se pudo subir" },
        );
      } catch {
        anotar({ nombre: archivo.name, tipo: "foto", estado: "error", error: "se cortó la conexión" });
      }
    }
  }

  async function mandar(texto: string) {
    setEstado({ fase: "enviando", error: "", enviado: texto });
    try {
      const r = await fetch(`/datos/director/${encargoId}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ texto }),
      });
      const j = (await r.json().catch(() => ({}))) as { error?: string; guardado?: boolean };
      // El mensaje quedó guardado (aunque la IA fallara): ya se ve arriba y el cuadro se limpia.
      if (r.ok || j.guardado) {
        descartar();
        ref.current?.reset();
        setSubidas([]);
      }
      setEstado({
        fase: "listo",
        enviado: "",
        error: r.ok ? "" : (j.error ?? "No se pudo mandar el mensaje. Lo que escribiste sigue aquí."),
      });
      router.refresh();
    } catch {
      setEstado({
        fase: "listo",
        enviado: "",
        error: "Se cortó la conexión. Si tu mensaje no aparece arriba, sigue aquí: vuelve a mandarlo.",
      });
      router.refresh();
    }
  }

  function alMandar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (estado.fase === "enviando" || subidas.some((s) => s.estado === "subiendo")) return;
    const escrito = String(new FormData(evento.currentTarget).get("texto") ?? "").trim();
    const listas = subidas.filter((s) => s.estado === "lista");
    const notas = [
      notaDeFotos(
        listas.filter((s) => s.tipo === "foto").map((s) => s.nombre),
        carpeta,
      ),
      notaDeVideos(listas.filter((s) => s.tipo === "video").map((s) => s.nombre)),
    ];
    const texto = [escrito, ...notas].filter(Boolean).join("\n\n");
    if (!texto)
      return setEstado({ ...estado, error: "Escribe qué video quieres, o sube las fotos o el video." });
    void mandar(texto);
  }

  const subiendo = subidas.some((s) => s.estado === "subiendo");
  return (
    <div className="mx-auto mt-4 max-w-2xl">
      {estado.fase === "enviando" && (
        <div className="mb-4 space-y-3" aria-live="polite">
          <p className="ml-auto max-w-[85%] whitespace-pre-line rounded-2xl rounded-br-sm bg-amber-500/15 px-4 py-2.5 text-sm text-neutral-100">
            {estado.enviado}
          </p>
          <p className="animate-pulse text-sm text-amber-300">El Director está pensando…</p>
        </div>
      )}
      {vacio && estado.fase !== "enviando" && (
        <div className="mb-4">
          <p className="mb-2 text-sm text-neutral-300">
            Cuéntale qué quieres y súbele las fotos o el video. Si prefieres, empieza con uno de estos:
          </p>
          <div className="flex flex-wrap gap-2">
            {ATAJOS.map((a) => (
              <button
                key={a.titulo}
                type="button"
                onClick={() => ponerAtajo(a.texto)}
                className="rounded-full border border-neutral-700 px-3 py-1.5 text-sm text-neutral-200 hover:border-amber-500 hover:bg-amber-500/10"
              >
                {a.titulo}
              </button>
            ))}
          </div>
        </div>
      )}
      {pendiente && estado.fase !== "enviando" && (
        <p className="mb-3 flex flex-wrap items-center gap-3 text-sm text-amber-200">
          El Director no ha respondido tu último mensaje.
          <button type="button" className="boton-suave" onClick={() => void mandar("")}>
            Pedirle que responda
          </button>
        </p>
      )}
      <form
        ref={ref}
        onSubmit={alMandar}
        className="sticky bottom-0 border-t border-neutral-800 bg-[var(--background)] pt-3 pb-4"
      >
        <AvisoBorrador visible={recuperado} alEmpezarDeNuevo={empezarDeNuevo} />
        {subidas.length > 0 && (
          <ul className="mb-2 flex flex-wrap gap-1.5" aria-label="Fotos y videos para el Director">
            {subidas.map((s) => (
              <li
                key={s.nombre}
                className={`chip ${
                  s.estado === "lista"
                    ? "bg-emerald-500/15 text-emerald-300"
                    : s.estado === "error"
                      ? "bg-red-500/15 text-red-300"
                      : "bg-neutral-800 text-neutral-300"
                }`}
              >
                {s.nombre}
                {s.estado === "subiendo"
                  ? ` · subiendo${s.pct !== undefined ? ` ${s.pct} %` : "…"}`
                  : s.estado === "error"
                    ? ` · ${s.error}`
                    : s.tipo === "video"
                      ? " · subido; la Mac lo está mirando"
                      : " · lista"}
              </li>
            ))}
          </ul>
        )}
        <label htmlFor="mensaje" className="sr-only">
          Tu mensaje para el Director
        </label>
        <textarea
          id="mensaje"
          name="texto"
          rows={3}
          maxLength={4000}
          className="campo"
          placeholder="Qué quieres vender, a quién, y cómo te compran o te escriben"
          onKeyDown={(e) => {
            // En la computadora, Enter manda y Mayúscula+Enter baja de línea; en el teléfono, Enter baja.
            if (e.key !== "Enter" || e.shiftKey || e.nativeEvent.isComposing) return;
            if (!window.matchMedia("(pointer: fine)").matches) return;
            e.preventDefault();
            e.currentTarget.form?.requestSubmit();
          }}
        />
        <div className="mt-2 flex items-center gap-2">
          <label className="boton-suave cursor-pointer">
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,video/*,.mov,.mp4,.m4v"
              multiple
              className="sr-only"
              onChange={(e) => {
                void subir(e.currentTarget.files);
                e.currentTarget.value = "";
              }}
            />
            Subir fotos o videos
          </label>
          <button type="submit" className="boton ml-auto" disabled={estado.fase === "enviando" || subiendo}>
            {estado.fase === "enviando" ? "Mandando…" : subiendo ? "Subiendo fotos…" : "Mandar"}
          </button>
        </div>
        {estado.error && (
          <p
            role="alert"
            className="mt-3 rounded-md border border-red-900 bg-red-950/50 p-3 text-sm text-red-200"
          >
            {estado.error}
          </p>
        )}
      </form>
    </div>
  );
}
