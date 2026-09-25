import Link from "next/link";
import { notFound } from "next/navigation";
import { Marco } from "@/componentes/Marco";
import { exigirSesion } from "@/lib/auth";
import { archivosDeGuion, guionPorId, productoPorId, rendersDeGuion, trabajosDeGuion } from "@/lib/consultas";
import { contexto } from "@/lib/entorno";
import { duracionEstimadaSeg, esquemaGuion } from "@compartido/guion";
import { buscarTematica } from "@compartido/tematicas";
import { EditorGuion } from "./EditorGuion";
import { reintentarTrabajo } from "./acciones";

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
  const [producto, trabajos, renders, archivos] = await Promise.all([
    guion.producto_id ? productoPorId(db, guion.producto_id) : null,
    trabajosDeGuion(db, numero),
    rendersDeGuion(db, numero),
    archivosDeGuion(db, numero),
  ]);
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
        estado <strong className="text-neutral-200">{guion.estado}</strong>
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
          {voz && (
            <audio controls preload="none" src={`/datos/archivos/${voz.clave}`} className="mt-3 w-full">
              Tu navegador no puede reproducir el audio.
            </audio>
          )}
          {renders.length > 0 && (
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

      <EditorGuion
        id={guion.id}
        estado={guion.estado}
        titulo={contenido.titulo}
        gancho={contenido.gancho}
        escenas={contenido.escenas}
        hechos={contenido.hechos_a_verificar}
        opinion={guion.opinion_richard}
        notas={guion.notas_richard}
        producto={producto ? { nombre: producto.nombre, url: producto.url } : null}
      />
    </Marco>
  );
}
