import Link from "next/link";
import { notFound } from "next/navigation";
import { RefrescoSolo } from "@/app/grabaciones/RefrescoSolo";
import { Marco } from "@/componentes/Marco";
import { exigirSesion } from "@/lib/auth";
import { latidoEstacion } from "@/lib/consultas";
import {
  datosDePropuesta,
  encargoPorId,
  mensajesDelEncargo,
  propuestasDelEncargo,
  type FilaPropuesta,
} from "@/lib/director";
import { dinero } from "@/lib/director-prompt";
import { contexto } from "@/lib/entorno";
import { estacionViva } from "@/lib/estacion-estado";
import { imagenesActivas, type FilaImagen } from "@/lib/imagenes";
import { publicidadPorId, type FilaPublicidad } from "@/lib/publicidades";
import { contarPalabras } from "@compartido/grabaciones";
import { ETIQUETA_VOZ } from "@compartido/guion";
import { aprobar } from "../acciones";
import { BotonCambiar } from "./BotonCambiar";
import { Charla } from "./Charla";

export const dynamic = "force-dynamic";
export const metadata = { title: "Director" };

function EstadoDelAnuncio({ a, macEncendida }: { a: FilaPublicidad; macEncendida: boolean }) {
  if (a.estado === "lista")
    return (
      <div className="mt-3">
        <p className="text-sm text-emerald-300">
          Listo: {Math.round(a.duracion_seg)} segundos. Costó {dinero(a.costo_usd)}.
        </p>
        {a.video && (
          <>
            <video
              controls
              preload="metadata"
              src={`/datos/archivos/${a.video}`}
              className="mt-3 aspect-[9/16] w-full max-w-[260px] rounded-lg bg-black"
            />
            <a href={`/datos/archivos/${a.video}?descargar=1`} className="boton mt-3">
              Descargar el video
            </a>
          </>
        )}
      </div>
    );
  if (a.estado === "error")
    return (
      <p className="mt-3 text-sm text-red-300">
        No salió: {a.error || "error sin detalle"}. Cuéntaselo al Director o inténtalo otra vez desde
        Publicidad.
      </p>
    );
  if (a.estado === "tomada")
    return <p className="mt-3 text-sm text-amber-300">La Mac lo está armando: {a.paso || "empezando"}.</p>;
  return (
    <p className="mt-3 text-sm text-neutral-300">
      {macEncendida
        ? "En la fila: la Mac lo toma en un momento."
        : "En la fila: se arma cuando la Mac vuelva."}
    </p>
  );
}

/** La propuesta del Director: el precio primero, el texto entero y el botón de aprobar (C-DIRECTOR-1). */
function TarjetaPropuesta({
  p,
  anuncio,
  imagenes,
  macEncendida,
}: {
  p: FilaPropuesta;
  anuncio: FilaPublicidad | null;
  imagenes: FilaImagen[];
  macEncendida: boolean;
}) {
  const d = datosDePropuesta(p);
  const segundos = Math.round(contarPalabras(d.narracion) / 2.6);
  const persona = d.avatar
    ? imagenes.find((i) => i.nombre === d.avatar && d.carpetas.includes(i.carpeta))
    : undefined;
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
            {reemplazada
              ? "Propuesta anterior"
              : p.estado === "aprobada"
                ? "Propuesta aprobada"
                : "Propuesta"}
          </p>
          <p className="mt-1 text-2xl font-semibold text-white">{dinero(p.precio_usd)}</p>
          <p className="text-xs text-neutral-400">
            Unos {segundos} segundos · {ETIQUETA_VOZ[d.voz]} ·{" "}
            {d.avatar ? "con persona que habla" : "sin persona"}
          </p>
        </div>
        {persona && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/datos/imagenes/${persona.id}`}
            alt={`La persona que habla: ${persona.nombre}`}
            className="h-24 w-16 shrink-0 rounded-md object-cover"
          />
        )}
      </div>
      <p className="mt-3 font-medium text-neutral-100">{d.nombre}</p>
      <p className="mt-2 whitespace-pre-line border-l-2 border-neutral-700 pl-3 text-sm text-neutral-200">
        {d.narracion}
      </p>
      <p className="mt-3 flex flex-wrap gap-1.5">
        {d.carpetas.map((c) => (
          <span key={c} className="chip bg-neutral-800 text-neutral-300">
            {c}
          </span>
        ))}
      </p>
      {d.instrucciones && <p className="mt-2 text-xs text-neutral-400">Cómo se arma: {d.instrucciones}</p>}
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
      {p.estado === "aprobada" && anuncio && <EstadoDelAnuncio a={anuncio} macEncendida={macEncendida} />}
    </section>
  );
}

export default async function PaginaEncargo(props: PageProps<"/director/[id]">) {
  await exigirSesion();
  const id = Number((await props.params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const { db } = await contexto();
  const encargo = await encargoPorId(db, id);
  if (!encargo) notFound();
  const [mensajes, propuestas, imagenes, latido] = await Promise.all([
    mensajesDelEncargo(db, id),
    propuestasDelEncargo(db, id),
    imagenesActivas(db),
    latidoEstacion(db),
  ]);
  const anuncios = new Map<number, FilaPublicidad>();
  for (const p of propuestas)
    if (p.publicidad_id) {
      const a = await publicidadPorId(db, p.publicidad_id);
      if (a) anuncios.set(p.id, a);
    }
  const porId = new Map(propuestas.map((p) => [p.id, p]));
  const viva = estacionViva(latido);
  const enCurso = [...anuncios.values()].some((a) => a.estado === "subida" || a.estado === "tomada");
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
                  anuncio={anuncios.get(p.id) ?? null}
                  imagenes={imagenes}
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
