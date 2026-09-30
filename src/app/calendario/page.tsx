import Link from "next/link";
import { ChipCanal } from "@/componentes/ChipCanal";
import { CopiarTexto } from "@/componentes/CopiarTexto";
import { FiltroCanal } from "@/componentes/FiltroCanal";
import { Marco } from "@/componentes/Marco";
import { exigirSesion } from "@/lib/auth";
import {
  descartadas,
  entradaPorId,
  entradasDeGuion,
  entradasEntre,
  entradasHasta,
  miniaturasDeGuiones,
  pendientes,
  reglasCalendario,
} from "@/lib/calendario";
import { contexto } from "@/lib/entorno";
import {
  cuando,
  diaCorto,
  etiquetaDia,
  hora12,
  hoyEn,
  miniaturaDeEnlace,
  NOMBRE_ESTADO,
  NOMBRE_PLATAFORMA,
  PLATAFORMAS,
  plataformasFaltantes,
  porDia,
  repartir,
  sePasoLaFecha,
  sumarDias,
  yaSalio,
  type EntradaCalendario,
  type EstadoCalendario,
  type Plataforma,
} from "@compartido/calendario";
import { canalDesde } from "@compartido/canales";
import type { Canal } from "@compartido/tematicas";
import { marcarEstado, quitarEntrada } from "./acciones";
import { BotonAgendarTodas } from "./BotonAgendarTodas";
import { ChipPlataforma } from "./ChipPlataforma";
import { FormularioEnlace } from "./FormularioEnlace";
import { FormularioManual } from "./FormularioManual";
import { FormularioReglas } from "./FormularioReglas";
import { MenuTresPuntos } from "./MenuTresPuntos";
import { Miniatura } from "./Miniatura";
import { PublicarTambien } from "./PublicarTambien";
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
/** Lo que falta por salir se dice en palabras de Richard, no con el nombre interno del estado. */
const COMO_VA: Record<EstadoCalendario, string> = {
  agendado: "Falta programarlo",
  programado: "Ya programado",
  publicado: "Publicado",
  descartado: "Fuera de la lista",
};
// Los videos de Escenia se agendan para YouTube; lo de otras plataformas se agrega a mano.
const PLATAFORMA_PRINCIPAL = "youtube" as const;

const uno = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const nombrePieza = (e: Pick<EntradaCalendario, "pieza" | "indice">) =>
  e.pieza === "short" ? "Short" : "Video largo";
const ficha = (id: number) => `/calendario?entrada=${id}#entrada`;

export default async function PaginaCalendario(props: PageProps<"/calendario">) {
  await exigirSesion();
  const sp = await props.searchParams;
  const elegida = Math.trunc(Number(uno(sp.entrada)) || 0);
  // Filtro opcional por red social; sin filtro se ve todo junto.
  const filtro: Plataforma | null = PLATAFORMAS.find((p) => p === uno(sp.plataforma)) ?? null;
  // Separador de canales: sin elegir ninguno se ven los dos juntos.
  const canal = canalDesde(uno(sp.canal));

  const { db } = await contexto();
  const reglas = await reglasCalendario(db);
  const hoy = hoyEn(reglas.zona, new Date());
  const [futuras, lista, fuera, anteriores, elegidaEnBase, enPlataformas] = await Promise.all([
    entradasEntre(db, sumarDias(hoy.fecha, -1), sumarDias(hoy.fecha, 125)),
    pendientes(db, PLATAFORMA_PRINCIPAL),
    descartadas(db),
    entradasHasta(db, hoy.fecha),
    elegida ? entradaPorId(db, elegida) : null,
    db.todos<Pick<EntradaCalendario, "guion_id" | "pieza" | "indice" | "plataforma" | "estado">>(
      "SELECT guion_id, pieza, indice, plataforma, estado FROM calendario WHERE guion_id IS NOT NULL",
    ),
  ]);

  // Una sola lista: TODO lo que falta por publicarse, de todos los canales y plataformas.
  const deLaRed = (e: EntradaCalendario) =>
    (!filtro || e.plataforma === filtro) && (!canal || e.canal === canal);
  const porSalir = futuras.filter((e) => deLaRed(e) && !yaSalio(e, hoy) && !sePasoLaFecha(e, hoy));
  const dias = porDia(porSalir);
  const publicados = anteriores.filter((e) => deLaRed(e) && yaSalio(e, hoy));
  const vencidos = anteriores.filter((e) => deLaRed(e) && sePasoLaFecha(e, hoy));
  const sinHora = porSalir.filter((e) => e.hora === "");
  const plan = repartir(futuras, lista, PLATAFORMA_PRINCIPAL, reglas, hoy).filter(
    (p) => !canal || p.canal === canal,
  );
  const seleccion = elegidaEnBase && elegidaEnBase.estado !== "descartado" ? elegidaEnBase : undefined;
  const delGuionElegido = seleccion?.guion_id ? await entradasDeGuion(db, seleccion.guion_id) : [];
  const faltantesDe = (p: { guion_id: number | null; pieza: "largo" | "short"; indice: number }) =>
    plataformasFaltantes(enPlataformas, p);
  // Los dos filtros se combinan: cambiar de red no suelta el canal, ni al revés.
  const enlaceCon = (p: Plataforma | null, c: Canal | null) => {
    const q = new URLSearchParams();
    if (c) q.set("canal", c);
    if (p) q.set("plataforma", p);
    const texto = q.toString();
    return texto ? `/calendario?${texto}` : "/calendario";
  };
  const enlaceFiltro = (p: Plataforma | null) => enlaceCon(p, canal);
  const cuantasDe = (c: Canal | null) =>
    futuras.filter(
      (e) =>
        (!filtro || e.plataforma === filtro) &&
        (!c || e.canal === c) &&
        !yaSalio(e, hoy) &&
        !sePasoLaFecha(e, hoy),
    ).length;
  const propias = await miniaturasDeGuiones(
    db,
    [...porSalir, ...plan, ...publicados, ...vencidos, ...(seleccion ? [seleccion] : [])].map(
      (e) => e.guion_id ?? 0,
    ),
  );
  const respaldo = (guionId: number | null) => (guionId ? (propias.get(guionId) ?? null) : null);

  return (
    <Marco titulo="Calendario">
      {seleccion && (
        <div id="entrada" className="tarjeta mb-6 min-w-0 scroll-mt-4 text-sm">
          <div className="flex items-start gap-2">
            <div className="min-w-0">
              <div className="flex flex-wrap gap-1.5">
                <span className="chip bg-amber-500/15 text-amber-300">{nombrePieza(seleccion)}</span>
                <ChipCanal canal={seleccion.canal} />
                <ChipPlataforma plataforma={seleccion.plataforma} />
                <span className={`chip border ${COLOR[seleccion.estado]}`}>
                  {yaSalio(seleccion, hoy) ? NOMBRE_ESTADO.publicado : COMO_VA[seleccion.estado]}
                </span>
              </div>
              <p className="mt-2 text-base font-medium text-neutral-100">{seleccion.titulo}</p>
              <p className="mt-1 text-neutral-300">
                {yaSalio(seleccion, hoy) ? "Salió" : "Sale"}: {cuando(seleccion.fecha, seleccion.hora)}
              </p>
              <Miniatura
                principal={miniaturaDeEnlace(seleccion.enlace)}
                respaldo={respaldo(seleccion.guion_id)}
                alt={`Miniatura de «${seleccion.titulo}»`}
                className="mt-3 w-full max-w-xs"
              />
            </div>
            <div className="ml-auto flex items-center gap-1">
              <Link href="/calendario" className="boton-suave px-3 py-1 text-xs">
                Cerrar
              </Link>
              <MenuTresPuntos
                accion={quitarEntrada}
                ocultos={{ id: seleccion.id }}
                etiqueta="Quitar del calendario"
                pregunta={
                  seleccion.guion_id
                    ? "¿Quitar esta publicación del calendario? El video vuelve a «Sin fecha todavía»."
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
            {seleccion.estado === "agendado" && (
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
                  Todavía no lo he programado
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
          {faltantesDe(seleccion).length > 0 && (
            <div className="mt-4 border-t border-neutral-800 pt-3">
              <PublicarTambien
                key={`tambien-${seleccion.id}`}
                base={{
                  guion_id: seleccion.guion_id,
                  pieza: seleccion.pieza,
                  indice: seleccion.indice,
                  titulo: seleccion.titulo,
                  canal: seleccion.canal,
                }}
                faltantes={faltantesDe(seleccion)}
                entradas={[...futuras, ...delGuionElegido.filter((e) => !futuras.some((f) => f.id === e.id))]}
                reglas={reglas}
                hoy={hoy}
              />
            </div>
          )}
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

      <section className="mb-8" aria-labelledby="por-salir">
        <h2 id="por-salir" className="mb-1 text-lg font-semibold">
          Falta por publicarse ({porSalir.length})
        </h2>
        <p className="mb-3 text-sm text-neutral-400">
          Todo lo que viene, en orden. Lo que ya salió no aparece aquí. Toca un video para ver su ficha.
        </p>
        <div className="mb-3">
          <FiltroCanal elegido={canal} enlace={(c) => enlaceCon(filtro, c)} cuenta={cuantasDe} />
        </div>
        <div className="mb-4 flex flex-wrap items-center gap-2" role="group" aria-label="Red social">
          <Link
            href={enlaceFiltro(null)}
            aria-current={filtro === null ? "true" : undefined}
            className={`rounded-full border px-3 py-1 text-xs font-medium ${
              filtro === null
                ? "border-amber-500 bg-amber-500 text-neutral-950"
                : "border-neutral-700 text-neutral-200 hover:bg-neutral-800"
            }`}
          >
            Todas las redes
          </Link>
          {PLATAFORMAS.map((p) => (
            <Link
              key={p}
              href={enlaceFiltro(p)}
              aria-current={filtro === p ? "true" : undefined}
              className={`rounded-full border px-3 py-1 text-xs font-medium ${
                filtro === p
                  ? "border-amber-500 bg-amber-500 text-neutral-950"
                  : "border-neutral-700 text-neutral-200 hover:bg-neutral-800"
              }`}
            >
              {NOMBRE_PLATAFORMA[p]}
            </Link>
          ))}
        </div>

        {vencidos.length > 0 && (
          <div className="mb-4 rounded-md border border-amber-800 bg-amber-950/40 p-3 text-sm text-amber-200">
            <p>
              {vencidos.length === 1
                ? "A 1 video se le pasó la fecha sin programarlo."
                : `A ${vencidos.length} videos se les pasó la fecha sin programarlos.`}{" "}
              Tócalo para ponerle otra fecha o marcar que ya salió.
            </p>
            <ul className="mt-2 space-y-1">
              {vencidos.map((e) => (
                <li key={e.id}>
                  <Link href={ficha(e.id)} className="underline hover:text-white">
                    {cuando(e.fecha, e.hora)} · {e.titulo}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {sinHora.length > 0 && (
          <p className="mb-4 rounded-md border border-amber-800 bg-amber-950/40 p-3 text-sm text-amber-200">
            {sinHora.length === 1 ? "Hay 1 video" : `Hay ${sinHora.length} videos`} sin hora. Tócalo y ponle
            la hora que tiene en la plataforma.
          </p>
        )}

        {dias.length === 0 ? (
          <p className="tarjeta text-sm text-neutral-300">
            {filtro || canal
              ? "No hay nada pendiente por publicarse con ese filtro."
              : "No hay nada pendiente por publicarse. Cuando programes un video, aparece aquí con su día y su hora."}
          </p>
        ) : (
          <ol className="space-y-5">
            {dias.map((dia) => (
              <li key={dia.fecha}>
                <h3
                  className={`mb-2 text-sm font-semibold ${
                    dia.fecha === hoy.fecha ? "text-amber-300" : "text-neutral-300"
                  }`}
                >
                  {dia.fecha === hoy.fecha || dia.fecha === sumarDias(hoy.fecha, 1)
                    ? `${etiquetaDia(dia.fecha, hoy.fecha)} · ${diaCorto(dia.fecha)}`
                    : diaCorto(dia.fecha)}
                  <span className="ml-2 font-normal text-neutral-500">
                    {dia.entradas.length === 1 ? "1 video" : `${dia.entradas.length} videos`}
                  </span>
                </h3>
                <ul className="space-y-2">
                  {dia.entradas.map((e) => (
                    <li key={e.id}>
                      <Link
                        href={ficha(e.id)}
                        className={`flex items-start gap-3 rounded-md border p-2 text-sm hover:brightness-125 ${COLOR[e.estado]} ${
                          e.id === elegida ? "ring-2 ring-amber-400" : ""
                        }`}
                      >
                        <Miniatura
                          principal={miniaturaDeEnlace(e.enlace)}
                          respaldo={respaldo(e.guion_id)}
                          alt=""
                          className="w-24 shrink-0"
                        />
                        <span className="block min-w-0">
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="text-base font-semibold">
                              {e.hora ? hora12(e.hora) : "Falta la hora"}
                            </span>
                            <ChipPlataforma plataforma={e.plataforma} />
                            <ChipCanal canal={e.canal} />
                          </span>
                          <span className="mt-0.5 block text-neutral-100">{e.titulo}</span>
                          <span className="mt-1 block text-xs opacity-80">
                            {nombrePieza(e)} · {COMO_VA[e.estado]}
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        )}
      </section>

      {plan.length > 0 && (
        <section className="mb-8" aria-labelledby="sin-fecha">
          <h2 id="sin-fecha" className="mb-1 text-lg font-semibold">
            Sin fecha todavía ({plan.length})
          </h2>
          <p className="mb-3 text-sm text-neutral-400">
            Videos que Escenia ya produjo y no tienen día en YouTube. Cada uno trae el próximo hueco libre.
          </p>
          <div className="mb-3">
            <BotonAgendarTodas cuantas={plan.length} plataforma={PLATAFORMA_PRINCIPAL} canal="" />
          </div>
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {plan.map((p) => (
              <TarjetaPendiente
                key={`${p.guion_id}-${p.pieza}-${p.indice}`}
                pieza={p}
                plataforma={PLATAFORMA_PRINCIPAL}
                hueco={p.hueco}
                entradas={futuras}
                reglas={reglas}
                hoy={hoy}
                miniatura={respaldo(p.guion_id)}
                faltantes={faltantesDe(p).filter((x) => x !== PLATAFORMA_PRINCIPAL)}
              />
            ))}
          </ul>
        </section>
      )}

      <details className="tarjeta mb-4">
        <summary className="cursor-pointer font-medium">Agregar un video que no hizo Escenia</summary>
        <div className="mt-4">
          <FormularioManual plataforma={PLATAFORMA_PRINCIPAL} hoy={hoy.fecha} />
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

      {publicados.length > 0 && (
        <details className="tarjeta mb-4 text-sm">
          <summary className="cursor-pointer font-medium text-neutral-400">
            Ya publicados ({publicados.length})
          </summary>
          <ul className="mt-3 space-y-2">
            {publicados.map((e) => (
              <li key={e.id}>
                <Link
                  href={ficha(e.id)}
                  className="flex items-start gap-3 rounded-md p-1 hover:bg-neutral-800"
                >
                  <Miniatura
                    principal={miniaturaDeEnlace(e.enlace)}
                    respaldo={respaldo(e.guion_id)}
                    alt=""
                    className="w-24 shrink-0"
                  />
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-2 text-xs text-neutral-400">
                      <ChipPlataforma plataforma={e.plataforma} />
                      <ChipCanal canal={e.canal} />
                      {cuando(e.fecha, e.hora)} · {nombrePieza(e)}
                    </span>
                    <span className="block text-neutral-200">{e.titulo}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </details>
      )}

      {fuera.length > 0 && (
        <details className="tarjeta mb-4 text-sm">
          <summary className="cursor-pointer font-medium text-neutral-400">
            Fuera de la lista ({fuera.length})
          </summary>
          <ul className="mt-3 space-y-2">
            {fuera.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center gap-2">
                <span className="chip bg-neutral-800 text-neutral-300">{nombrePieza(e)}</span>
                <span className="text-neutral-200">{e.titulo}</span>
                <form action={quitarEntrada} className="ml-auto">
                  <input type="hidden" name="id" value={e.id} />
                  <button type="submit" className="boton-suave px-3 py-1 text-xs">
                    Devolver a «Sin fecha todavía»
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
