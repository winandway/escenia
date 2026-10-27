import Link from "next/link";
import { notFound } from "next/navigation";
import { RefrescoSolo } from "@/app/grabaciones/RefrescoSolo";
import { Marco } from "@/componentes/Marco";
import { exigirSesion } from "@/lib/auth";
import { latidoEstacion } from "@/lib/consultas";
import {
  encargoPorId,
  leerPropuesta,
  mensajesDelEncargo,
  propuestasDelEncargo,
  resultadoDePropuesta,
  type FilaPropuesta,
} from "@/lib/director";
import { dinero, reloj, type PropuestaLeida } from "@/lib/director-prompt";
import { claveDeHoja, videosDelEncargo, type FilaVideoDirector } from "@/lib/director-videos";
import { contexto } from "@/lib/entorno";
import { estacionViva } from "@/lib/estacion-estado";
import { imagenesActivas, type FilaImagen } from "@/lib/imagenes";
import { segundosDeTexto, textoDeDemostracion } from "@compartido/director";
import { contarPalabras } from "@compartido/grabaciones";
import { ETIQUETA_VOZ } from "@compartido/guion";
import { aprobar, intentarOtraVez } from "../acciones";
import { BotonCambiar } from "./BotonCambiar";
import { Charla } from "./Charla";

export const dynamic = "force-dynamic";
export const metadata = { title: "Director" };

type Resultado = NonNullable<Awaited<ReturnType<typeof resultadoDePropuesta>>>;

function EstadoDelResultado({ r, macEncendida }: { r: Resultado; macEncendida: boolean }) {
  if (r.estado === "lista")
    return (
      <div className="mt-3">
        <p className="text-sm text-emerald-300">
          Listo: {Math.round(r.duracionSeg)} segundos. Costó {dinero(r.costoUsd)}.
        </p>
        {r.video && (
          <>
            <video
              controls
              preload="metadata"
              src={`/datos/archivos/${r.video}`}
              className="mt-3 aspect-[9/16] w-full max-w-[260px] rounded-lg bg-black object-contain"
            />
            <a href={`/datos/archivos/${r.video}?descargar=1`} className="boton mt-3">
              Descargar el video
            </a>
          </>
        )}
      </div>
    );
  if (r.estado === "error")
    return (
      <div className="mt-3 text-sm text-red-300">
        <p>No salió: {r.error || "error sin detalle"}.</p>
        {r.trabajo ? (
          <form action={intentarOtraVez} className="mt-2">
            <input type="hidden" name="id" value={r.trabajo.id} />
            <button type="submit" className="boton-suave">
              Intentar otra vez
            </button>
          </form>
        ) : (
          <p className="mt-1">Cuéntaselo al Director o inténtalo otra vez desde Publicidad.</p>
        )}
      </div>
    );
  if (r.estado === "tomada")
    return <p className="mt-3 text-sm text-amber-300">La Mac lo está armando: {r.paso || "empezando"}.</p>;
  return (
    <p className="mt-3 text-sm text-neutral-300">
      {macEncendida
        ? "En la fila: la Mac lo toma en un momento."
        : "En la fila: se arma cuando la Mac vuelva."}
    </p>
  );
}

const TITULO_DE_TIPO = {
  anuncio: "Anuncio con fotos",
  demostracion: "Prueba en vivo, sin cortes",
  locucion: "Locución sobre tu video",
} as const;

function Detalle({ l, videos }: { l: PropuestaLeida; videos: FilaVideoDirector[] }) {
  if (l.tipo === "anuncio")
    return (
      <p className="mt-2 whitespace-pre-line border-l-2 border-neutral-700 pl-3 text-sm text-neutral-200">
        {l.datos.narracion}
      </p>
    );
  const video = videos.find((v) => v.id === l.datos.video_id);
  if (l.tipo === "demostracion")
    return (
      <>
        <ol className="mt-2 space-y-1.5 border-l-2 border-neutral-700 pl-3 text-sm text-neutral-200">
          {l.datos.partes.map((p, i) => (
            <li key={i}>
              <span className="mr-2 font-mono text-xs text-amber-300">{reloj(p.en_s)}</span>
              {p.texto}
              {p.titulo && <span className="ml-2 chip bg-neutral-800 text-neutral-300">{p.titulo}</span>}
            </li>
          ))}
        </ol>
        <p className="mt-2 text-xs text-neutral-400">
          El video {video ? `«${video.nombre}»` : `V${l.datos.video_id}`} va entero desde el{" "}
          {reloj(l.datos.desde_s)}, sin cortes. Portada: {l.datos.portada.lineas.join(" / ")}. Cierre:{" "}
          {l.datos.cierre.lineas.join(" · ")}.
        </p>
      </>
    );
  return (
    <>
      <div className="mt-2 space-y-2 border-l-2 border-neutral-700 pl-3 text-sm text-neutral-200">
        {l.datos.partes.map((p, i) => (
          <p key={i} className="whitespace-pre-line">
            {p.en_s !== undefined && (
              <span className="mr-2 font-mono text-xs text-amber-300">desde {reloj(p.en_s)}</span>
            )}
            {p.texto}
          </p>
        ))}
      </div>
      <p className="mt-2 text-xs text-neutral-400">
        El video {video ? `«${video.nombre}»` : `V${l.datos.video_id}`} no se toca; si la voz no cabe con
        calma, se estira un poco.
      </p>
    </>
  );
}

function resumen(l: PropuestaLeida, videos: FilaVideoDirector[]): string {
  const voz = ETIQUETA_VOZ[l.datos.voz];
  if (l.tipo === "anuncio")
    return `Unos ${Math.round(contarPalabras(l.datos.narracion) / 2.6)} segundos · ${voz} · ${l.datos.avatar ? "con persona que habla" : "sin persona"}`;
  if (l.tipo === "demostracion") {
    const ultima = l.datos.partes[l.datos.partes.length - 1];
    const fin = ultima ? ultima.en_s - l.datos.desde_s + segundosDeTexto(ultima.texto) + 3 : 0;
    return `Unos ${Math.round(fin)} segundos · ${voz} · ${l.datos.avatar ? "con persona que narra" : "sin persona"} · ${textoDeDemostracion(l.datos).length} letras de voz`;
  }
  const video = videos.find((v) => v.id === l.datos.video_id);
  return `${video ? `Video de ${reloj(video.duracion_seg)}` : "Su video"} · ${voz} · ${l.datos.musica === "piano" ? "con piano suave" : "sin música"}`;
}

/** La propuesta del Director: el precio primero, todo lo que va a decir y el botón de aprobar (C-DIRECTOR-1). */
function TarjetaPropuesta({
  p,
  resultado,
  imagenes,
  videos,
  macEncendida,
}: {
  p: FilaPropuesta;
  resultado: Resultado | null;
  imagenes: FilaImagen[];
  videos: FilaVideoDirector[];
  macEncendida: boolean;
}) {
  const l = leerPropuesta(p);
  const carpetas = l.tipo === "locucion" ? [] : l.datos.carpetas;
  const avatar = l.tipo === "locucion" ? "" : l.datos.avatar;
  const persona = avatar
    ? imagenes.find((i) => i.nombre === avatar && carpetas.includes(i.carpeta))
    : undefined;
  const video =
    l.tipo === "anuncio" ? undefined : videos.find((v) => v.id === l.datos.video_id && v.hojas > 0);
  const reemplazada = p.estado === "reemplazada";
  return (
    <section
      aria-label={`Propuesta ${p.id}`}
      className={`mt-3 rounded-lg border p-4 ${
        reemplazada ? "border-neutral-800 opacity-60" : "border-amber-500/50 bg-neutral-950"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-amber-300">
            {TITULO_DE_TIPO[l.tipo]}
            {reemplazada ? " · anterior" : p.estado === "aprobada" ? " · aprobada" : ""}
          </p>
          <p className="mt-1 text-2xl font-semibold text-white">{dinero(p.precio_usd)}</p>
          <p className="text-xs text-neutral-400">{resumen(l, videos)}</p>
        </div>
        {persona ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/datos/imagenes/${persona.id}`}
            alt={`La persona que habla: ${persona.nombre}`}
            className="h-24 w-16 shrink-0 rounded-md object-cover"
          />
        ) : (
          video && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/datos/archivos/${claveDeHoja(video.id, 1)}`}
              alt={`Cuadros del video ${video.nombre}`}
              className="h-24 w-24 shrink-0 rounded-md object-cover"
            />
          )
        )}
      </div>
      <p className="mt-3 font-medium text-neutral-100">{l.datos.nombre}</p>
      <Detalle l={l} videos={videos} />
      {carpetas.length > 0 && (
        <p className="mt-3 flex flex-wrap gap-1.5">
          {carpetas.map((c) => (
            <span key={c} className="chip bg-neutral-800 text-neutral-300">
              {c}
            </span>
          ))}
        </p>
      )}
      {l.tipo === "anuncio" && l.datos.instrucciones && (
        <p className="mt-2 text-xs text-neutral-400">Cómo se arma: {l.datos.instrucciones}</p>
      )}
      {p.estado === "propuesta" && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <form action={aprobar}>
            <input type="hidden" name="id" value={p.id} />
            <button type="submit" className="boton">
              Aprobar y hacer el video · {dinero(p.precio_usd)}
            </button>
          </form>
          <BotonCambiar />
        </div>
      )}
      {reemplazada && (
        <p className="mt-3 text-xs text-neutral-400">La cambiaste por una más nueva, más abajo.</p>
      )}
      {p.estado === "aprobada" && resultado && (
        <EstadoDelResultado r={resultado} macEncendida={macEncendida} />
      )}
    </section>
  );
}

function EstadoDelVideo({ v }: { v: FilaVideoDirector }) {
  if (v.estado === "listo")
    return <span className="text-emerald-300">{reloj(v.duracion_seg)} · el Director ya lo puede ver</span>;
  if (v.estado === "error") return <span className="text-red-300">no se pudo mirar: {v.error}</span>;
  return <span className="text-amber-300">la Mac lo está mirando…</span>;
}

export default async function PaginaEncargo(props: PageProps<"/director/[id]">) {
  await exigirSesion();
  const id = Number((await props.params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const { db } = await contexto();
  const encargo = await encargoPorId(db, id);
  if (!encargo) notFound();
  const [mensajes, propuestas, imagenes, videos, latido] = await Promise.all([
    mensajesDelEncargo(db, id),
    propuestasDelEncargo(db, id),
    imagenesActivas(db),
    videosDelEncargo(db, id),
    latidoEstacion(db),
  ]);
  const resultados = new Map<number, Resultado>();
  for (const p of propuestas) {
    const r = await resultadoDePropuesta(db, p);
    if (r) resultados.set(p.id, r);
  }
  const porId = new Map(propuestas.map((p) => [p.id, p]));
  const viva = estacionViva(latido);
  const enCurso =
    [...resultados.values()].some((r) => r.estado === "subida" || r.estado === "tomada") ||
    videos.some((v) => v.estado === "subido" || v.estado === "mirando");
  return (
    <Marco titulo={encargo.titulo}>
      <RefrescoSolo activo={enCurso} />
      <p className="-mt-3 mb-5 text-sm">
        <Link href="/director" className="text-neutral-400 hover:text-white">
          ← Encargos
        </Link>
        <span className="text-neutral-500">
          {" "}
          · las fotos de este chat van a la carpeta «{encargo.carpeta}» · la conversación lleva{" "}
          {dinero(encargo.costo_usd)}
        </span>
      </p>
      {videos.length > 0 && (
        <ul aria-label="Videos de este chat" className="mx-auto mb-5 max-w-2xl space-y-1 text-sm">
          {videos.map((v) => (
            <li key={v.id} className="tarjeta flex flex-wrap items-center gap-x-2 py-2">
              <span className="font-medium text-neutral-100">
                V{v.id} · {v.nombre}
              </span>
              <EstadoDelVideo v={v} />
            </li>
          ))}
        </ul>
      )}
      <ol aria-label="Conversación con el Director" className="mx-auto max-w-2xl space-y-4">
        {mensajes.map((m) => {
          if (m.rol === "aviso")
            return (
              <li key={m.id} className="text-center text-sm text-emerald-300">
                {m.texto}
              </li>
            );
          if (m.rol === "richard")
            return (
              <li key={m.id} className="flex justify-end">
                <p className="max-w-[85%] whitespace-pre-line rounded-2xl rounded-br-sm bg-amber-500/15 px-4 py-2.5 text-sm text-neutral-100">
                  {m.texto}
                </p>
              </li>
            );
          const p = m.propuesta_id ? porId.get(m.propuesta_id) : undefined;
          return (
            <li key={m.id}>
              <p className="mb-1 text-xs font-medium text-amber-300">Director</p>
              <p className="max-w-[95%] whitespace-pre-line rounded-2xl rounded-tl-sm border border-neutral-800 bg-neutral-900/70 px-4 py-3 text-sm text-neutral-100">
                {m.texto}
              </p>
              {p && (
                <TarjetaPropuesta
                  p={p}
                  resultado={resultados.get(p.id) ?? null}
                  imagenes={imagenes}
                  videos={videos}
                  macEncendida={viva}
                />
              )}
            </li>
          );
        })}
      </ol>
      <Charla
        encargoId={id}
        carpeta={encargo.carpeta}
        vacio={mensajes.length === 0}
        pendiente={mensajes.at(-1)?.rol === "richard"}
      />
    </Marco>
  );
}
