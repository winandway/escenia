import Link from "next/link";
import { MenuTresPuntos } from "@/app/calendario/MenuTresPuntos";
import { RefrescoSolo } from "@/app/grabaciones/RefrescoSolo";
import { Marco } from "@/componentes/Marco";
import { exigirSesion } from "@/lib/auth";
import { carpetasDe, comercialesVisibles, type ComercialConVideo } from "@/lib/comerciales";
import { latidoEstacion } from "@/lib/consultas";
import { contexto } from "@/lib/entorno";
import { estacionViva } from "@/lib/estacion-estado";
import { carpetasDeImagenes } from "@/lib/imagenes";
import { IDIOMAS } from "@compartido/comerciales";
import { avisoDeGrabacion } from "@compartido/grabaciones";
import { ETIQUETA_VOZ } from "@compartido/guion";
import { armarOtraVez, quitarDeLaLista, reintentar } from "./acciones";
import { FormularioComercial } from "./FormularioComercial";

export const dynamic = "force-dynamic";
export const metadata = { title: "Comerciales" };

const COLOR = {
  espera: "text-neutral-300",
  trabajando: "text-amber-300",
  listo: "text-emerald-300",
  error: "text-red-300",
} as const;

function Fila({ c, macEncendida }: { c: ComercialConVideo; macEncendida: boolean }) {
  const aviso = avisoDeGrabacion(c, macEncendida);
  return (
    <li className="tarjeta min-w-0 text-sm">
      <div className="flex items-start gap-2">
        <div className="min-w-0">
          <p className="font-medium text-neutral-100">{c.nombre}</p>
          <p className="mt-1.5 flex flex-wrap gap-1.5">
            <span className="chip bg-amber-500/15 text-amber-300">
              {IDIOMAS.find((i) => i.id === c.idioma)?.nombre ?? c.idioma}
            </span>
            <span className="chip bg-neutral-800 text-neutral-300">{ETIQUETA_VOZ[c.voz]}</span>
            {carpetasDe(c).map((k) => (
              <span key={k} className="chip bg-neutral-800 text-neutral-400">
                {k}
              </span>
            ))}
          </p>
        </div>
        {c.estado !== "tomada" && (
          <div className="ml-auto">
            <MenuTresPuntos
              accion={quitarDeLaLista}
              ocultos={{ id: c.id }}
              etiqueta="Quitar de la lista"
              pregunta="¿Quitar este comercial de la lista? No se borra nada: su guion y sus videos siguen en Guiones."
              confirmar="Sí, quitar"
            />
          </div>
        )}
      </div>
      <p className={`mt-3 ${COLOR[aviso.tono]}`}>{aviso.texto}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {c.guion_id && (
          <Link href={`/guiones/${c.guion_id}`} className="boton">
            {aviso.tono === "listo" ? "Ver y descargar el video" : "Ver cómo va"}
          </Link>
        )}
        {c.estado === "error" && (
          <form action={reintentar}>
            <input type="hidden" name="id" value={c.id} />
            <button type="submit" className="boton">
              Intentar otra vez
            </button>
          </form>
        )}
        {c.estado === "planeada" && (
          <form action={armarOtraVez}>
            <input type="hidden" name="id" value={c.id} />
            <button type="submit" className="boton-suave">
              Armar otra versión
            </button>
          </form>
        )}
      </div>
    </li>
  );
}

export default async function PaginaComerciales() {
  await exigirSesion();
  const { db } = await contexto();
  const [comerciales, carpetas, latido] = await Promise.all([
    comercialesVisibles(db),
    carpetasDeImagenes(db),
    latidoEstacion(db),
  ]);
  const viva = estacionViva(latido);
  const enCurso = comerciales.some((c) => avisoDeGrabacion(c).enCurso);
  return (
    <Marco titulo="Comerciales">
      <RefrescoSolo activo={enCurso} />
      <p className="mb-6 max-w-2xl text-sm text-neutral-300">
        Un video publicitario con lo que manda el cliente: su texto (lo lee nuestra voz), sus logos y sus
        capturas. Sale en Neón con personajes: diagramas de neón y sus imágenes moviéndose. Sin marca de
        canal.
      </p>
      {!viva && (
        <p role="status" className="tarjeta mb-6 border-amber-700 text-sm text-amber-200">
          La Mac no está respondiendo en este momento. Puedes pedir el video igual: se queda esperando y se
          arma cuando la Mac vuelva.
        </p>
      )}
      <section aria-labelledby="titulo-pedir" className="tarjeta mb-8">
        <h2 id="titulo-pedir" className="mb-4 text-lg font-semibold">
          Pedir un comercial
        </h2>
        <FormularioComercial carpetas={carpetas.map((c) => c.carpeta)} />
      </section>
      <section aria-labelledby="titulo-lista">
        <h2 id="titulo-lista" className="mb-3 text-lg font-semibold">
          Tus comerciales ({comerciales.length})
        </h2>
        {comerciales.length === 0 ? (
          <p className="tarjeta text-sm text-neutral-300">Todavía no has pedido ninguno.</p>
        ) : (
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {comerciales.map((c) => (
              <Fila key={c.id} c={c} macEncendida={viva} />
            ))}
          </ul>
        )}
      </section>
    </Marco>
  );
}
