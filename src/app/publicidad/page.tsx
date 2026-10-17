import { MenuTresPuntos } from "@/app/calendario/MenuTresPuntos";
import { RefrescoSolo } from "@/app/grabaciones/RefrescoSolo";
import { Marco } from "@/componentes/Marco";
import { exigirSesion } from "@/lib/auth";
import { latidoEstacion } from "@/lib/consultas";
import { contexto } from "@/lib/entorno";
import { estacionViva } from "@/lib/estacion-estado";
import { carpetasDeImagenes, imagenesActivas } from "@/lib/imagenes";
import { carpetasDePublicidad, publicidadesVisibles, type FilaPublicidad } from "@/lib/publicidades";
import { IDIOMAS } from "@compartido/comerciales";
import { ETIQUETA_VOZ } from "@compartido/guion";
import { armarOtraVez, quitarDeLaLista } from "./acciones";
import { FormularioPublicidad } from "./FormularioPublicidad";

export const dynamic = "force-dynamic";
export const metadata = { title: "Publicidad" };

const dinero = (usd: number) => (usd < 1 ? `${Math.round(usd * 100)} centavos` : `$${usd.toFixed(2)}`);

function Aviso({ p, macEncendida }: { p: FilaPublicidad; macEncendida: boolean }) {
  if (p.estado === "lista")
    return (
      <p className="mt-3 text-emerald-300">
        Listo: {Math.round(p.duracion_seg)} segundos. Costó {dinero(p.costo_usd)}.
      </p>
    );
  if (p.estado === "error")
    return <p className="mt-3 text-red-300">No salió: {p.error || "error sin detalle"}</p>;
  if (p.estado === "tomada")
    return <p className="mt-3 text-amber-300">La Mac lo está armando: {p.paso || "empezando"}.</p>;
  return (
    <p className="mt-3 text-neutral-300">
      {macEncendida
        ? "En la fila: la Mac lo toma en un momento."
        : "En la fila: se arma cuando la Mac vuelva."}
    </p>
  );
}

function Fila({ p, macEncendida }: { p: FilaPublicidad; macEncendida: boolean }) {
  return (
    <li className="tarjeta min-w-0 text-sm">
      <div className="flex items-start gap-2">
        <div className="min-w-0">
          <p className="font-medium text-neutral-100">{p.nombre}</p>
          <p className="mt-1.5 flex flex-wrap gap-1.5">
            <span className="chip bg-amber-500/15 text-amber-300">
              {IDIOMAS.find((i) => i.id === p.idioma)?.nombre ?? p.idioma}
            </span>
            <span className="chip bg-neutral-800 text-neutral-300">{ETIQUETA_VOZ[p.voz] ?? p.voz}</span>
            {carpetasDePublicidad(p).map((k) => (
              <span key={k} className="chip bg-neutral-800 text-neutral-400">
                {k}
              </span>
            ))}
          </p>
        </div>
        {p.estado !== "tomada" && (
          <div className="ml-auto">
            <MenuTresPuntos
              accion={quitarDeLaLista}
              ocultos={{ id: p.id }}
              etiqueta="Quitar de la lista"
              pregunta="¿Quitar este anuncio de la lista? No se borra nada: el video sigue guardado."
              confirmar="Sí, quitar"
            />
          </div>
        )}
      </div>
      <Aviso p={p} macEncendida={macEncendida} />
      {p.estado === "lista" && p.video && (
        <video
          controls
          preload="metadata"
          src={`/datos/archivos/${p.video}`}
          className="mt-3 aspect-[9/16] w-full max-w-[260px] rounded-lg bg-black"
        />
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {p.estado === "lista" && p.video && (
          <a href={`/datos/archivos/${p.video}?descargar=1`} className="boton">
            Descargar el video
          </a>
        )}
        {(p.estado === "lista" || p.estado === "error") && (
          <form action={armarOtraVez}>
            <input type="hidden" name="id" value={p.id} />
            <button type="submit" className="boton-suave">
              {p.estado === "error" ? "Intentar otra vez" : "Armar otra vez"}
            </button>
          </form>
        )}
      </div>
    </li>
  );
}

export default async function PaginaPublicidad() {
  await exigirSesion();
  const { db } = await contexto();
  const [anuncios, carpetas, imagenes, latido] = await Promise.all([
    publicidadesVisibles(db),
    carpetasDeImagenes(db),
    imagenesActivas(db),
    latidoEstacion(db),
  ]);
  const viva = estacionViva(latido);
  const enCurso = anuncios.some((p) => p.estado === "subida" || p.estado === "tomada");
  return (
    <Marco titulo="Publicidad">
      <RefrescoSolo activo={enCurso} />
      <p className="mb-6 max-w-2xl text-sm text-neutral-300">
        Un anuncio vertical de 30 a 45 segundos para vender un producto: el logo y las fotos del cliente en
        tarjetas que se mueven, una voz del banco y una persona que habla. Elige la voz dándole play.
      </p>
      {!viva && (
        <p role="status" className="tarjeta mb-6 border-amber-700 text-sm text-amber-200">
          La Mac no está respondiendo en este momento. Puedes pedir el anuncio igual: se queda esperando y se
          arma cuando la Mac vuelva.
        </p>
      )}
      <section aria-labelledby="titulo-pedir" className="tarjeta mb-8">
        <h2 id="titulo-pedir" className="mb-4 text-lg font-semibold">
          Pedir un anuncio
        </h2>
        <FormularioPublicidad
          carpetas={carpetas.map((c) => c.carpeta)}
          imagenes={imagenes
            .filter((i) => i.tipo === "imagen")
            .map((i) => ({ id: i.id, nombre: i.nombre, carpeta: i.carpeta }))}
        />
      </section>
      <section aria-labelledby="titulo-lista">
        <h2 id="titulo-lista" className="mb-3 text-lg font-semibold">
          Tus anuncios ({anuncios.length})
        </h2>
        {anuncios.length === 0 ? (
          <p className="tarjeta text-sm text-neutral-300">Todavía no has pedido ninguno.</p>
        ) : (
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {anuncios.map((p) => (
              <Fila key={p.id} p={p} macEncendida={viva} />
            ))}
          </ul>
        )}
      </section>
    </Marco>
  );
}
