// Las fichas del Podcast IA (docs/PODCAST.md): quién es cada invitado y la historia que cedió, el tope de
// minutos del día y si la voz del invitado ya está conectada.
import Link from "next/link";
import { Marco } from "@/componentes/Marco";
import { MenuTresPuntos } from "@/app/calendario/MenuTresPuntos";
import { exigirSesion } from "@/lib/auth";
import { contexto } from "@/lib/entorno";
import {
  conexionDelPodcast,
  fichaPorId,
  fichasActivas,
  segundosUsadosHoy,
  topeMinutos,
  ultimoErrorDelPodcast,
} from "@/lib/podcast";
import { fichaLista, minutosParaMostrar } from "@compartido/podcast";
import { archivarFichaAccion, guardarFichaAccion, guardarTopeAccion } from "./acciones";
import { FormularioFicha } from "./FormularioFicha";
import { FormularioTope } from "./FormularioTope";
import { MiniaturaAvatar } from "./SelectorAvatar";

export const dynamic = "force-dynamic";
export const metadata = { title: "Podcast IA" };

export default async function PaginaFichas({ searchParams }: PageProps<"/podcast/fichas">) {
  await exigirSesion();
  const { db, env } = await contexto();
  const parametros = await searchParams;
  const editar = Number(parametros.ficha);
  const [fichas, conexion, usados, tope, error, enEdicion] = await Promise.all([
    fichasActivas(db),
    conexionDelPodcast(db, env),
    segundosUsadosHoy(db),
    topeMinutos(db),
    ultimoErrorDelPodcast(db),
    fichaPorId(db, editar),
  ]);

  return (
    <Marco titulo="Podcast IA">
      <p className="mb-5 max-w-3xl text-sm text-neutral-400">
        Entrevistas a una IA en vivo: la propia IA contesta preguntas de misterio, o cuenta en primera persona
        una historia de ficción escrita para inspirar (o, con su permiso por escrito, la historia real de
        alguien). Abre el estudio, ponlo a pantalla completa y grábalo con tu grabador de siempre.
      </p>
      <div className="mb-6 grid gap-3 text-sm sm:grid-cols-3">
        <div className="tarjeta flex flex-col justify-between gap-3">
          <div>
            <div className="text-neutral-400">El estudio</div>
            <div className="text-xs text-neutral-500">
              16:9, con la leyenda que toca según la ficha (IA, ficción o historia real con permiso).
            </div>
          </div>
          <Link href="/podcast" className="boton self-start">
            Abrir el estudio
          </Link>
        </div>
        <div className="tarjeta">
          <div className="text-neutral-400">Minutos de hoy</div>
          <div className="text-xl font-semibold">
            {minutosParaMostrar(usados)} de {tope}
          </div>
          <FormularioTope minutos={tope} guardar={guardarTopeAccion} />
        </div>
        <div className="tarjeta">
          <div className="text-neutral-400">La voz del invitado</div>
          {conexion && !error ? (
            <div className="text-lg font-semibold text-green-300">Conectada</div>
          ) : conexion && error ? (
            <>
              <div className="text-lg font-semibold text-red-300">Con problema</div>
              <p className="text-xs text-red-200">{error.mensaje}</p>
            </>
          ) : (
            <>
              <div className="text-lg font-semibold text-amber-300">Falta conectar la voz del invitado</div>
              <p className="text-xs text-neutral-400">
                Falta la clave de ElevenLabs con permiso de Agents. Los pasos están en la guía del podcast
                (docs/PODCAST.md).
              </p>
            </>
          )}
        </div>
      </div>

      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Fichas</h2>
        <Link href="/podcast/fichas" className="boton-suave px-3 py-1.5">
          Ficha nueva
        </Link>
      </div>
      {fichas.length === 0 ? (
        <p className="mb-8 text-sm text-neutral-400">Todavía no hay fichas. Escribe la primera abajo.</p>
      ) : (
        <ul className="mb-8 grid gap-3 sm:grid-cols-2">
          {fichas.map((f) => {
            const falta = fichaLista(f);
            return (
              <li key={f.id} className={`tarjeta ${f.id === enEdicion?.id ? "border-amber-500/60" : ""}`}>
                <div className="flex items-start justify-between gap-2">
                  <MiniaturaAvatar avatar={f.avatar} lado={48} />
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold">{f.nombre}</div>
                    <div className="text-xs text-neutral-400">{f.tema || "Sin tema todavía"}</div>
                  </div>
                  <MenuTresPuntos
                    accion={archivarFichaAccion}
                    ocultos={{ id: f.id }}
                    etiqueta="Archivar la ficha"
                    pregunta="La ficha sale del estudio y de esta lista. La historia queda guardada."
                    confirmar="Archivar"
                  />
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {f.ejemplo && <span className="chip bg-amber-500/20 text-amber-200">Ejemplo ficticio</span>}
                  {f.tipo === "entrevista_ia" && (
                    <span className="chip bg-violet-500/15 text-violet-200">Entrevista a la IA</span>
                  )}
                  {!f.ejemplo && f.tipo === "historia" && f.origen === "ficcion" && (
                    <span className="chip bg-sky-500/15 text-sky-200">Ficción</span>
                  )}
                  {!f.ejemplo &&
                    f.tipo === "historia" &&
                    f.origen === "real" &&
                    (f.permiso ? (
                      <span className="chip bg-green-500/15 text-green-300">Permiso confirmado</span>
                    ) : (
                      <span className="chip bg-red-500/15 text-red-300">Falta el permiso</span>
                    ))}
                  <span className="chip bg-neutral-800 text-neutral-300">Voz: {f.voz}</span>
                </div>
                {falta && <p className="mt-2 text-xs text-amber-300">{falta}</p>}
                <div className="mt-3 flex gap-2">
                  <Link href={`/podcast/fichas?ficha=${f.id}`} className="boton-suave px-3 py-1.5">
                    Editar
                  </Link>
                  {/* Solo abre el estudio: la grabación la hace el grabador de pantalla de Richard. */}
                  <Link href={`/podcast?ficha=${f.id}`} className="boton-suave px-3 py-1.5">
                    Abrir en el estudio
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <h2 className="mb-3 text-lg font-semibold">
        {enEdicion ? `Editar: ${enEdicion.nombre}` : "Ficha nueva"}
      </h2>
      {parametros.guardada && enEdicion && <p className="mb-3 text-sm text-green-300">Ficha guardada.</p>}
      <FormularioFicha key={enEdicion?.id ?? "nueva"} ficha={enEdicion} guardar={guardarFichaAccion} />
    </Marco>
  );
}
