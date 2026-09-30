import Link from "next/link";
import { LISTA_CANALES } from "@compartido/canales";
import { NOMBRE_CANAL, type Canal } from "@compartido/tematicas";

const ELEGIDO: Record<Canal | "todos", string> = {
  todos: "border-neutral-100 bg-neutral-100 text-neutral-950",
  "canal-ia": "border-emerald-400 bg-emerald-400 text-neutral-950",
  "caprichoso-tv": "border-amber-500 bg-amber-500 text-neutral-950",
};
const SIN_ELEGIR = "border-neutral-700 text-neutral-200 hover:bg-neutral-800";

/**
 * Separador de canales: «Todos», «Full Código», «Caprichoso TV». Son enlaces
 * (cambian `?canal=`), así que funciona sin JavaScript y se puede compartir.
 */
export function FiltroCanal({
  elegido,
  enlace,
  cuenta,
}: {
  elegido: Canal | null;
  /** Dirección de la página con ese canal elegido (null = todos). */
  enlace: (canal: Canal | null) => string;
  /** Cuántos hay en cada canal, para decirlo en el botón. */
  cuenta?: (canal: Canal | null) => number;
}) {
  const opciones: (Canal | null)[] = [null, ...LISTA_CANALES];
  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Canal">
      {opciones.map((c) => (
        <Link
          key={c ?? "todos"}
          href={enlace(c)}
          aria-current={elegido === c ? "true" : undefined}
          className={`rounded-full border px-3.5 py-1.5 text-sm font-medium ${
            elegido === c ? ELEGIDO[c ?? "todos"] : SIN_ELEGIR
          }`}
        >
          {c ? NOMBRE_CANAL[c] : "Todos los canales"}
          {cuenta && <span className="ml-1.5 opacity-70">{cuenta(c)}</span>}
        </Link>
      ))}
    </div>
  );
}
