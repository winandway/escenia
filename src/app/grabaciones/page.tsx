import Link from "next/link";
import { MenuTresPuntos } from "@/app/calendario/MenuTresPuntos";
import { ChipCanal } from "@/componentes/ChipCanal";
import { Marco } from "@/componentes/Marco";
import { exigirSesion } from "@/lib/auth";
import { latidoEstacion } from "@/lib/consultas";
import { contexto } from "@/lib/entorno";
import { estacionViva } from "@/lib/estacion-estado";
import { grabacionesVisibles, type GrabacionConVideo } from "@/lib/grabaciones";
import { avisoDeGrabacion } from "@compartido/grabaciones";
import { ESTILOS_VIDEO, NOMBRE_FORMATO } from "@compartido/tematicas";
import { probarOtroFormato, quitarDeLaLista, reintentar } from "./acciones";
import { FormularioGrabacion } from "./FormularioGrabacion";
import { RefrescoSolo } from "./RefrescoSolo";

export const dynamic = "force-dynamic";
export const metadata = { title: "Grabaciones" };

const megas = (bytes: number) => `${Math.round(bytes / 1_048_576)} MB`;

const COLOR = {
  espera: "text-neutral-300",
  trabajando: "text-amber-300",
  listo: "text-emerald-300",
  error: "text-red-300",
} as const;

function Fila({ g, macEncendida }: { g: GrabacionConVideo; macEncendida: boolean }) {
  const aviso = avisoDeGrabacion(g, macEncendida);
  const sePuedeRepetir = !["subiendo", "error"].includes(g.estado);
  return (
    <li className="tarjeta min-w-0 text-sm">
      <div className="flex items-start gap-2">
        <div className="min-w-0">
          <p className="font-medium text-neutral-100">{g.tema}</p>
          <p className="mt-1.5 flex flex-wrap gap-1.5">
            <span className="chip bg-amber-500/15 text-amber-300">Formato {NOMBRE_FORMATO[g.formato]}</span>
            <ChipCanal canal={g.canal} />
            <span className="chip bg-neutral-800 text-neutral-400">{megas(g.bytes)}</span>
          </p>
        </div>
        {g.estado !== "tomada" && (
          <div className="ml-auto">
            <MenuTresPuntos
              accion={quitarDeLaLista}
              ocultos={{ id: g.id }}
              etiqueta="Quitar de la lista"
              pregunta="¿Quitar esta grabación de la lista? No se borra nada: su video y su guion siguen en Guiones."
              confirmar="Sí, quitar"
            />
          </div>
        )}
      </div>

      <p className={`mt-3 ${COLOR[aviso.tono]}`}>{aviso.texto}</p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {g.guion_id && (
          <Link href={`/guiones/${g.guion_id}`} className="boton">
            {aviso.tono === "listo" ? "Ver y descargar el video" : "Ver cómo va"}
          </Link>
        )}
        {g.estado === "error" && (
          <form action={reintentar}>
            <input type="hidden" name="id" value={g.id} />
            <button type="submit" className="boton">
              Intentar otra vez
            </button>
          </form>
        )}
        {sePuedeRepetir &&
          ESTILOS_VIDEO.filter((f) => f !== g.formato).map((f) => (
            <form key={f} action={probarOtroFormato}>
              <input type="hidden" name="id" value={g.id} />
              <input type="hidden" name="formato" value={f} />
              <button type="submit" className="boton-suave">
                Probar en {NOMBRE_FORMATO[f]}
              </button>
            </form>
          ))}
      </div>
    </li>
  );
}

export default async function PaginaGrabaciones() {
  await exigirSesion();
  const { db } = await contexto();
  const [grabaciones, latido] = await Promise.all([grabacionesVisibles(db), latidoEstacion(db)]);
  const viva = estacionViva(latido);
  const enCurso = grabaciones.some((g) => avisoDeGrabacion(g).enCurso);

  return (
    <Marco titulo="Grabaciones">
      <RefrescoSolo activo={enCurso} />
      <p className="mb-6 max-w-2xl text-sm text-neutral-300">
        Aquí subes un video tuyo hablando. La Mac te quita el fondo verde, escucha lo que dices y arma detrás
        de ti los gráficos de cada cosa que nombras. Sales en grande al empezar y después en una esquina. Al
        terminar tienes el video horizontal, los verticales y sus miniaturas.
      </p>

      {!viva && (
        <p role="status" className="tarjeta mb-6 border-amber-700 text-sm text-amber-200">
          La Mac no está respondiendo en este momento. Puedes subir tu video igual: se queda esperando y se
          arma cuando la Mac vuelva.
        </p>
      )}

      <section aria-labelledby="titulo-subir" className="tarjeta mb-8">
        <h2 id="titulo-subir" className="mb-4 text-lg font-semibold">
          Subir una grabación
        </h2>
        <FormularioGrabacion />
      </section>

      <section aria-labelledby="titulo-lista">
        <h2 id="titulo-lista" className="mb-3 text-lg font-semibold">
          Tus grabaciones ({grabaciones.length})
        </h2>
        {grabaciones.length === 0 ? (
          <p className="tarjeta text-sm text-neutral-300">
            Todavía no has subido ninguna. Para la primera prueba alcanza con un video de medio minuto.
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {grabaciones.map((g) => (
              <Fila key={g.id} g={g} macEncendida={viva} />
            ))}
          </ul>
        )}
      </section>
    </Marco>
  );
}
