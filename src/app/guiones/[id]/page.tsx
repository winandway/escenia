import Link from "next/link";
import { notFound } from "next/navigation";
import { Marco } from "@/componentes/Marco";
import { exigirSesion } from "@/lib/auth";
import {
  archivosDeGuion,
  guionPorId,
  productoPorId,
  rendersDeGuion,
  trabajosDeGuion,
  videosDeGuion,
} from "@/lib/consultas";
import { entradasDeGuion, reglasCalendario } from "@/lib/calendario";
import { contexto } from "@/lib/entorno";
import { cuando, hoyEn, NOMBRE_PLATAFORMA, yaSalio } from "@compartido/calendario";
import { duracionEstimadaSeg, esquemaGuion, ETIQUETA_VOZ, etiquetasParaYouTube } from "@compartido/guion";
import { buscarTematica } from "@compartido/tematicas";
import { separarEntregas } from "@compartido/videos";
import { CopiarTexto } from "@/componentes/CopiarTexto";
import { EditorGuion } from "./EditorGuion";
import { regenerarPublicacion, reintentarTrabajo } from "./acciones";

export const dynamic = "force-dynamic";

const TEXTO_TRABAJO: Record<string, string> = {
  pendiente: "En cola, esperando a la Estación",
  tomado: "Produciendo",
  hecho: "Video listo",
  error: "Falló",
  cancelado: "Cancelado",
};

export default async function PaginaGuion(props: PageProps<"/guiones/[id]">) {
  await exigirSesion();
  const { id } = await props.params;
  const numero = Number(id);
  if (!Number.isInteger(numero) || numero <= 0) notFound();

  const { db } = await contexto();
  const guion = await guionPorId(db, numero);
  if (!guion) notFound();

  const contenido = esquemaGuion.parse(JSON.parse(guion.contenido));
  const [producto, trabajos, renders, archivos, videos, agenda] = await Promise.all([
    guion.producto_id ? productoPorId(db, guion.producto_id) : null,
    trabajosDeGuion(db, numero),
    rendersDeGuion(db, numero),
    archivosDeGuion(db, numero),
    videosDeGuion(db, numero),
    entradasDeGuion(db, numero).catch(() => []),
  ]);
  const hoy = hoyEn((await reglasCalendario(db).catch(() => null))?.zona ?? "America/New_York", new Date());
  const sale = (pieza: "largo" | "short", indice: number) => {
    const fechas = agenda
      .filter((e) => e.pieza === pieza && e.indice === indice)
      .map(
        (e) =>
          `${yaSalio(e, hoy) ? "Salió" : "Sale"} en ${NOMBRE_PLATAFORMA[e.plataforma]}: ${cuando(e.fecha, e.hora)}`,
      );
    return fechas.length ? fechas.join(" · ") : "Sin fecha todavía";
  };
  // A la vista solo la última entrega; las anteriores quedan plegadas.
  const { vigentes, anteriores } = separarEntregas(videos);
  const tematica = buscarTematica(guion.tematica_id);
  const trabajo = trabajos[0];
  const voz = archivos.find((a) => a.tipo === "voz");

  return (
    <Marco>
      <div className="mb-4 text-sm text-neutral-400">
        <Link href="/" className="hover:text-white">
          ← Guiones
        </Link>
        <span className="mx-2">·</span>#{guion.id} · {tematica?.nombre ?? guion.tematica_id} · ~
        {Math.round(duracionEstimadaSeg(contenido.escenas) / 60)} min · costó ${guion.costo_usd.toFixed(3)} ·
        estado <strong className="text-neutral-200">{guion.estado}</strong> · narra{" "}
        <strong className="text-neutral-200">{ETIQUETA_VOZ[contenido.voz].toLowerCase()}</strong>
      </div>

      {guion.aviso_parecido && (
        <p className="mb-4 rounded-md border border-amber-800 bg-amber-950/40 p-3 text-sm text-amber-200">
          {guion.aviso_parecido}
        </p>
      )}

      {trabajo && (
        <div className="tarjeta mb-4 text-sm">
          <div className="flex flex-wrap items-center gap-3">
            <span>
              Producción: <strong>{TEXTO_TRABAJO[trabajo.estado] ?? trabajo.estado}</strong>
            </span>
            {trabajo.paso && <span className="text-neutral-400">{trabajo.paso}</span>}
            {trabajo.estado === "tomado" && <span className="text-neutral-400">{trabajo.progreso}%</span>}
            {(trabajo.estado === "error" || trabajo.estado === "hecho") && (
              <form action={reintentarTrabajo} className="ml-auto">
                <input type="hidden" name="guion_id" value={guion.id} />
                <button type="submit" className="boton-suave">
                  {trabajo.estado === "error" ? "Reintentar" : "Volver a producir"}
                </button>
              </form>
            )}
          </div>
          {trabajo.error && <p className="mt-2 text-red-300">{trabajo.error}</p>}
          {vigentes.map((v) => (
            <div key={v.id} className="mt-3 space-y-2">
              <video
                controls
                preload="metadata"
                playsInline
                src={`/datos/archivos/${v.clave}`}
                className="w-full rounded-md bg-black"
                style={{ aspectRatio: v.formato === "9x16" ? "9 / 16" : "16 / 9", maxHeight: 520 }}
              >
                Tu navegador no puede reproducir el video.
              </video>
              <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-400">
                <span>
                  Video {v.formato} · {Math.round(v.duracion_seg)} s · {(v.bytes / 1_048_576).toFixed(0)} MB
                  {v.voz_de_prueba ? " · voz de prueba del sistema" : ""}
                </span>
                <a href={`/datos/archivos/${v.clave}?descargar=1`} className="boton-suave ml-auto px-3 py-1">
                  Descargar
                </a>
              </div>
            </div>
          ))}
          {anteriores.length > 0 && (
            <details className="mt-4">
              <summary className="cursor-pointer text-sm text-neutral-400 hover:text-white">
                Versiones anteriores ({anteriores.length}). La de arriba es la que vale.
              </summary>
              {anteriores.map((v) => (
                <div key={v.id} className="mt-3 space-y-2">
                  <video
                    controls
                    preload="metadata"
                    playsInline
                    src={`/datos/archivos/${v.clave}`}
                    className="w-full rounded-md bg-black"
                    style={{ aspectRatio: v.formato === "9x16" ? "9 / 16" : "16 / 9", maxHeight: 520 }}
                  >
                    Tu navegador no puede reproducir el video.
                  </video>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-400">
                    <span>
                      Video {v.formato} · {Math.round(v.duracion_seg)} s · {(v.bytes / 1_048_576).toFixed(0)}{" "}
                      MB
                      {v.voz_de_prueba ? " · voz de prueba del sistema" : ""}
                    </span>
                    <a
                      href={`/datos/archivos/${v.clave}?descargar=1`}
                      className="boton-suave ml-auto px-3 py-1"
                    >
                      Descargar
                    </a>
                  </div>
                </div>
              ))}
            </details>
          )}
          {voz && videos.length === 0 && (
            <audio controls preload="none" src={`/datos/archivos/${voz.clave}`} className="mt-3 w-full">
              Tu navegador no puede reproducir el audio.
            </audio>
          )}
          {renders.length > 0 && videos.length === 0 && (
            <ul className="mt-3 space-y-1 text-neutral-300">
              {renders.map((r) => (
                <li key={r.id}>
                  Video {r.formato}: <code className="text-xs">{r.ruta_local}</code> (
                  {(r.bytes / 1_048_576).toFixed(0)} MB, {Math.round(r.duracion_seg)} s)
                  {r.voz_de_prueba ? " — con voz de prueba del sistema" : ""}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {(contenido.publicacion || videos.length > 0) && (
        <section className="tarjeta mb-4 text-sm">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-lg font-semibold">Para YouTube</h2>
            <Link href="/calendario" className="boton-suave px-3 py-1 text-xs">
              Agendar en el calendario
            </Link>
            <form action={regenerarPublicacion} className="ml-auto">
              <input type="hidden" name="guion_id" value={guion.id} />
              <button type="submit" className="boton-suave px-3 py-1 text-xs">
                {contenido.publicacion ? "Volver a escribir" : "Escribir títulos y palabras clave"}
              </button>
            </form>
          </div>
          {!contenido.publicacion && (
            <p className="mt-2 text-neutral-400">
              Se escriben solos al terminar el video. Si no aparecen, toca el botón.
            </p>
          )}
          {contenido.publicacion && (
            <div className="mt-3 space-y-4">
              <div>
                <div className="etiqueta flex items-center justify-between">
                  <span>Título del video</span>
                  <CopiarTexto texto={contenido.publicacion.titulo} />
                </div>
                <p className="mt-1 text-neutral-100">{contenido.publicacion.titulo}</p>
                <p className="mt-1 text-xs text-neutral-500">{sale("largo", 0)}</p>
              </div>
              {contenido.publicacion.shorts.map((s) => (
                <div key={s.indice}>
                  <div className="etiqueta flex items-center justify-between">
                    <span>Short {s.indice}</span>
                    <CopiarTexto texto={s.titulo} />
                  </div>
                  <p className="mt-1 text-neutral-100">{s.titulo}</p>
                  <p className="mt-1 text-xs text-neutral-500">{sale("short", s.indice)}</p>
                </div>
              ))}
              <div>
                <div className="etiqueta flex items-center justify-between">
                  <span>Descripción</span>
                  <CopiarTexto texto={contenido.publicacion.descripcion} />
                </div>
                <p className="mt-1 whitespace-pre-line text-neutral-300">
                  {contenido.publicacion.descripcion}
                </p>
              </div>
              <div>
                <div className="etiqueta flex items-center justify-between">
                  <span>Palabras clave ({contenido.publicacion.etiquetas.length})</span>
                  <CopiarTexto texto={etiquetasParaYouTube(contenido.publicacion.etiquetas)} />
                </div>
                <p className="mt-1 text-neutral-300">
                  {etiquetasParaYouTube(contenido.publicacion.etiquetas)}
                </p>
              </div>
            </div>
          )}
        </section>
      )}

      <EditorGuion
        id={guion.id}
        estado={guion.estado}
        titulo={contenido.titulo}
        gancho={contenido.gancho}
        escenas={contenido.escenas}
        hechos={contenido.hechos_a_verificar}
        opinion={guion.opinion_richard}
        notas={guion.notas_richard}
        voz={contenido.voz}
        musica={contenido.musica}
        producto={producto ? { nombre: producto.nombre, url: producto.url } : null}
      />
    </Marco>
  );
}
