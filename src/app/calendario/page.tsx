import Link from "next/link";
import { CopiarTexto } from "@/componentes/CopiarTexto";
import { Marco } from "@/componentes/Marco";
import { exigirSesion } from "@/lib/auth";
import {
  descartadas,
  entradasEntre,
  miniaturasDeGuiones,
  pendientes,
  reglasCalendario,
} from "@/lib/calendario";
import { contexto } from "@/lib/entorno";
import {
  CANALES_CALENDARIO,
  cuando,
  diaCorto,
  hora12,
  hoyEn,
  lunesDe,
  miniaturaDeEnlace,
  NOMBRE_ESTADO,
  NOMBRE_PLATAFORMA,
  PLATAFORMAS,
  repartir,
  sumarDias,
  type EntradaCalendario,
  type EstadoCalendario,
} from "@compartido/calendario";
import { NOMBRE_CANAL } from "@compartido/tematicas";
import { marcarEstado, quitarEntrada } from "./acciones";
import { BotonAgendarTodas } from "./BotonAgendarTodas";
import { FormularioEnlace } from "./FormularioEnlace";
import { FormularioManual } from "./FormularioManual";
import { FormularioReglas } from "./FormularioReglas";
import { MenuTresPuntos } from "./MenuTresPuntos";
import { Miniatura } from "./Miniatura";
import { SelectorHueco } from "./SelectorHueco";
import { TarjetaPendiente } from "./TarjetaPendiente";

export const dynamic = "force-dynamic";
export const metadata = { title: "Calendario" };

const COLOR: Record<EstadoCalendario, string> = {
  agendado: "border-amber-600/70 bg-amber-500/10 text-amber-100",
  programado: "border-sky-600/70 bg-sky-500/10 text-sky-100",
  publicado: "border-emerald-700/70 bg-emerald-500/10 text-emerald-100",
  descartado: "border-neutral-700 text-neutral-400",
};
const DIAS_SEMANA = ["lun", "mar", "mié", "jue", "vie", "sáb", "dom"];

const uno = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const nombrePieza = (e: Pick<EntradaCalendario, "pieza" | "indice">) =>
  e.pieza === "short" ? `Short${e.indice ? ` ${e.indice}` : ""}` : "Largo";

export default async function PaginaCalendario(props: PageProps<"/calendario">) {
  await exigirSesion();
  const sp = await props.searchParams;
  const plataforma = PLATAFORMAS.find((p) => p === uno(sp.plataforma)) ?? "youtube";
  const canal = CANALES_CALENDARIO.find((c) => c === uno(sp.canal)) ?? null;
  const semanas = Math.max(-26, Math.min(26, Math.trunc(Number(uno(sp.semana)) || 0)));
  const elegida = Math.trunc(Number(uno(sp.entrada)) || 0);

  const { db } = await contexto();
  const reglas = await reglasCalendario(db);
  const hoy = hoyEn(reglas.zona, new Date());
  const inicio = sumarDias(lunesDe(hoy.fecha), semanas * 7);
  const fin = sumarDias(inicio, 27);
  const [visibles, futuras, lista, fuera] = await Promise.all([
    entradasEntre(db, inicio, fin),
    entradasEntre(db, sumarDias(hoy.fecha, -1), sumarDias(hoy.fecha, 125)),
    pendientes(db, plataforma),
    descartadas(db),
  ]);

  const filtrar = (e: EntradaCalendario) => e.plataforma === plataforma && (!canal || e.canal === canal);
  const enPantalla = visibles.filter(filtrar);
  const plan = repartir(
    futuras,
    lista.filter((p) => !canal || p.canal === canal),
    plataforma,
    reglas,
    hoy,
  );
  const seleccion = elegida ? [...visibles, ...futuras].find((e) => e.id === elegida) : undefined;
  const sinHora = enPantalla.filter((e) => e.hora === "");
  const dias = Array.from({ length: 28 }, (_, i) => sumarDias(inicio, i));
  const propias = await miniaturasDeGuiones(
    db,
    [...enPantalla, ...plan, ...(seleccion ? [seleccion] : [])].map((e) => e.guion_id ?? 0),
  );
  const respaldo = (guionId: number | null) => (guionId ? (propias.get(guionId) ?? null) : null);

  const enlace = (cambios: Record<string, string | number | null>) => {
    const q = new URLSearchParams();
    const base: Record<string, string | number | null> = {
      plataforma: plataforma === "youtube" ? null : plataforma,
      canal,
      semana: semanas || null,
      ...cambios,
    };
    for (const [k, v] of Object.entries(base)) if (v !== null && v !== "") q.set(k, String(v));
    const s = q.toString();
    return s ? `/calendario?${s}` : "/calendario";
  };
  const pastilla = (activa: boolean) =>
    `rounded-full border px-3 py-1.5 text-xs font-medium ${
      activa
        ? "border-amber-500 bg-amber-500 text-neutral-950"
        : "border-neutral-700 text-neutral-200 hover:bg-neutral-800"
    }`;

  return (
    <Marco titulo="Calendario de publicaciones">
      <p className="mb-4 max-w-3xl text-sm text-neutral-400">
        Cada video con su día y su hora. El calendario no deja que dos salgan a la misma hora, ni demasiado
        juntos, en el mismo canal. Las horas son las de tu reloj.
      </p>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        {PLATAFORMAS.map((p) => (
          <Link
            key={p}
            href={enlace({ plataforma: p === "youtube" ? null : p, entrada: null })}
            className={pastilla(p === plataforma)}
          >
            {NOMBRE_PLATAFORMA[p]}
          </Link>
        ))}
        <span className="mx-1 text-neutral-700">|</span>
        <Link href={enlace({ canal: null, entrada: null })} className={pastilla(canal === null)}>
          Todos los canales
        </Link>
        {CANALES_CALENDARIO.map((c) => (
          <Link key={c} href={enlace({ canal: c, entrada: null })} className={pastilla(c === canal)}>
            {NOMBRE_CANAL[c]}
          </Link>
        ))}
      </div>

      <section className="mb-8" aria-labelledby="por-agendar">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <h2 id="por-agendar" className="text-lg font-semibold">
            Por agendar ({plan.length})
          </h2>
        </div>
        {plan.length === 0 ? (
          <p className="text-sm text-neutral-400">
            No hay videos esperando fecha en {NOMBRE_PLATAFORMA[plataforma]}. Cuando la Estación termine un
            video, aparece aquí.
          </p>
        ) : (
          <>
            <div className="mb-3">
              <BotonAgendarTodas cuantas={plan.length} plataforma={plataforma} canal={canal ?? ""} />
            </div>
            <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {plan.map((p) => (
                <TarjetaPendiente
                  key={`${p.guion_id}-${p.pieza}-${p.indice}`}
                  pieza={p}
                  plataforma={plataforma}
                  hueco={p.hueco}
                  entradas={futuras}
                  reglas={reglas}
                  hoy={hoy}
                  miniatura={respaldo(p.guion_id)}
                />
              ))}
            </ul>
          </>
        )}
      </section>

      <section className="mb-8" aria-labelledby="calendario">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <h2 id="calendario" className="text-lg font-semibold">
            {diaCorto(inicio)} al {diaCorto(fin)}
          </h2>
          <div className="ml-auto flex gap-2 text-xs">
            <Link href={enlace({ semana: semanas - 4, entrada: null })} className="boton-suave px-3 py-1.5">
              ← Antes
            </Link>
            {semanas !== 0 && (
              <Link href={enlace({ semana: null, entrada: null })} className="boton-suave px-3 py-1.5">
                Hoy
              </Link>
            )}
            <Link href={enlace({ semana: semanas + 4, entrada: null })} className="boton-suave px-3 py-1.5">
              Después →
            </Link>
          </div>
        </div>
        <div className="mb-3 flex flex-wrap gap-2 text-xs">
          {(["agendado", "programado", "publicado"] as const).map((e) => (
            <span key={e} className={`rounded-md border px-2 py-0.5 ${COLOR[e]}`}>
              {NOMBRE_ESTADO[e]}
            </span>
          ))}
        </div>

        {sinHora.length > 0 && (
          <p className="mb-3 rounded-md border border-amber-800 bg-amber-950/40 p-3 text-sm text-amber-200">
            {sinHora.length === 1 ? "Hay 1 publicación" : `Hay ${sinHora.length} publicaciones`} sin hora.
            Tócala y ponle la hora que tiene en {NOMBRE_PLATAFORMA[plataforma]}, para que el calendario pueda
            cuidar ese hueco.
          </p>
        )}

        {seleccion && (
          <div id="entrada" className="tarjeta mb-4 min-w-0 scroll-mt-4 text-sm">
            <div className="flex items-start gap-2">
              <div>
                <div className="flex flex-wrap gap-1.5">
                  <span className="chip bg-amber-500/15 text-amber-300">{nombrePieza(seleccion)}</span>
                  <span className="chip bg-neutral-800 text-neutral-300">
                    {NOMBRE_CANAL[seleccion.canal]}
                  </span>
                  <span className="chip bg-neutral-800 text-neutral-300">
                    {NOMBRE_PLATAFORMA[seleccion.plataforma]}
                  </span>
                  <span className={`chip border ${COLOR[seleccion.estado]}`}>
                    {NOMBRE_ESTADO[seleccion.estado]}
                  </span>
                </div>
                <p className="mt-2 text-base font-medium text-neutral-100">{seleccion.titulo}</p>
                <p className="mt-1 text-neutral-300">Sale: {cuando(seleccion.fecha, seleccion.hora)}</p>
                <Miniatura
                  principal={miniaturaDeEnlace(seleccion.enlace)}
                  respaldo={respaldo(seleccion.guion_id)}
                  alt={`Miniatura de «${seleccion.titulo}»`}
                  className="mt-3 w-full max-w-xs"
                />
              </div>
              <div className="ml-auto flex items-center gap-1">
                <Link href={enlace({ entrada: null })} className="boton-suave px-3 py-1 text-xs">
                  Cerrar
                </Link>
                <MenuTresPuntos
                  accion={quitarEntrada}
                  ocultos={{ id: seleccion.id }}
                  etiqueta="Quitar del calendario"
                  pregunta={
                    seleccion.guion_id
                      ? "¿Quitar esta publicación del calendario? El video vuelve a «Por agendar»."
                      : "¿Quitar esta publicación del calendario? Esto no se puede deshacer."
                  }
                  confirmar="Sí, quitar"
                />
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <CopiarTexto texto={seleccion.titulo} etiqueta="Copiar título" />
              {seleccion.enlace && (
                <a
                  href={seleccion.enlace}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="boton-suave px-3 py-1 text-xs"
                >
                  Abrir en {NOMBRE_PLATAFORMA[seleccion.plataforma]} ↗
                </a>
              )}
              {seleccion.estado !== "programado" && (
                <form action={marcarEstado}>
                  <input type="hidden" name="id" value={seleccion.id} />
                  <input type="hidden" name="estado" value="programado" />
                  <button type="submit" className="boton-suave px-3 py-1 text-xs">
                    Ya lo programé en {NOMBRE_PLATAFORMA[seleccion.plataforma]}
                  </button>
                </form>
              )}
              {seleccion.estado !== "publicado" && (
                <form action={marcarEstado}>
                  <input type="hidden" name="id" value={seleccion.id} />
                  <input type="hidden" name="estado" value="publicado" />
                  <button type="submit" className="boton-suave px-3 py-1 text-xs">
                    Ya salió
                  </button>
                </form>
              )}
              {seleccion.estado !== "agendado" && (
                <form action={marcarEstado}>
                  <input type="hidden" name="id" value={seleccion.id} />
                  <input type="hidden" name="estado" value="agendado" />
                  <button type="submit" className="boton-suave px-3 py-1 text-xs">
                    Volver a «agendado»
                  </button>
                </form>
              )}
              {seleccion.guion_id && (
                <Link
                  href={`/guiones/${seleccion.guion_id}`}
                  className="text-xs text-neutral-400 hover:text-white"
                >
                  Ver el guion y sus textos →
                </Link>
              )}
            </div>
            <div className="mt-4 border-t border-neutral-800 pt-3">
              <FormularioEnlace
                key={seleccion.id}
                id={seleccion.id}
                enlace={seleccion.enlace}
                plataforma={seleccion.plataforma}
              />
            </div>
            <div className="mt-4 border-t border-neutral-800 pt-3">
              <h3 className="mb-2 font-medium">
                {seleccion.hora ? "Cambiar el día o la hora" : "Ponerle la hora"}
              </h3>
              <SelectorHueco
                key={seleccion.id}
                modo="mover"
                ocultos={{ id: seleccion.id }}
                pedido={{
                  id: seleccion.id,
                  guion_id: seleccion.guion_id,
                  canal: seleccion.canal,
                  plataforma: seleccion.plataforma,
                  pieza: seleccion.pieza,
                }}
                entradas={futuras}
                reglas={reglas}
                hoy={hoy}
                inicial={seleccion.fecha}
              />
            </div>
          </div>
        )}

        <div className="mb-1 hidden grid-cols-7 gap-2 text-center text-xs text-neutral-500 md:grid">
          {DIAS_SEMANA.map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>
        <ol className="grid grid-cols-1 gap-2 md:grid-cols-7">
          {dias.map((d) => {
            const delDia = enPantalla.filter((e) => e.fecha === d);
            const pasado = d < hoy.fecha;
            return (
              <li
                key={d}
                className={`min-h-20 rounded-md border p-2 ${
                  d === hoy.fecha ? "border-amber-500" : "border-neutral-800"
                } ${pasado ? "opacity-50" : ""} ${delDia.length === 0 ? "max-md:min-h-0 max-md:py-1.5" : ""}`}
              >
                <div className="mb-1 flex items-center gap-2 text-xs text-neutral-400">
                  <span className={d === hoy.fecha ? "font-semibold text-amber-300" : ""}>
                    {d === hoy.fecha ? `Hoy · ${diaCorto(d)}` : diaCorto(d)}
                  </span>
                  {delDia.length === 0 && <span className="text-neutral-600 md:hidden">libre</span>}
                </div>
                <div className="space-y-1">
                  {delDia.map((e) => (
                    <Link
                      key={e.id}
                      href={`${enlace({ entrada: e.id })}#entrada`}
                      className={`block rounded-md border px-2 py-1 text-xs hover:brightness-125 ${COLOR[e.estado]} ${
                        e.id === elegida ? "ring-2 ring-amber-400" : ""
                      }`}
                    >
                      <span className="flex items-start gap-2 md:block">
                        <Miniatura
                          principal={miniaturaDeEnlace(e.enlace)}
                          respaldo={respaldo(e.guion_id)}
                          alt=""
                          className="w-24 shrink-0 md:mb-1 md:w-full"
                        />
                        <span className="block min-w-0">
                          <span className="font-semibold">{e.hora ? hora12(e.hora) : "Falta la hora"}</span>
                          <span className="opacity-80">
                            {" "}
                            · {nombrePieza(e)}
                            {canal ? "" : ` · ${NOMBRE_CANAL[e.canal]}`}
                          </span>
                          <span className="block truncate">{e.titulo}</span>
                        </span>
                      </span>
                    </Link>
                  ))}
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      <details className="tarjeta mb-4">
        <summary className="cursor-pointer font-medium">Agregar un video hecho fuera de Escenia</summary>
        <div className="mt-4">
          <FormularioManual plataforma={plataforma} hoy={hoy.fecha} />
        </div>
      </details>

      <details className="tarjeta mb-4">
        <summary className="cursor-pointer font-medium">
          Reglas: Shorts a las {reglas.horasShort.map(hora12).join(" y ")} · largos a las{" "}
          {reglas.horasLargo.map(hora12).join(" y ")} · {reglas.separacionMin / 60} h de separación
        </summary>
        <div className="mt-4">
          <FormularioReglas reglas={reglas} />
        </div>
      </details>

      {fuera.length > 0 && (
        <details className="tarjeta mb-4 text-sm">
          <summary className="cursor-pointer font-medium">Fuera de la lista ({fuera.length})</summary>
          <ul className="mt-3 space-y-2">
            {fuera.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center gap-2">
                <span className="chip bg-neutral-800 text-neutral-300">{nombrePieza(e)}</span>
                <span className="chip bg-neutral-800 text-neutral-300">
                  {NOMBRE_PLATAFORMA[e.plataforma]}
                </span>
                <span className="text-neutral-200">{e.titulo}</span>
                <form action={quitarEntrada} className="ml-auto">
                  <input type="hidden" name="id" value={e.id} />
                  <button type="submit" className="boton-suave px-3 py-1 text-xs">
                    Devolver a «Por agendar»
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </details>
      )}
    </Marco>
  );
}
