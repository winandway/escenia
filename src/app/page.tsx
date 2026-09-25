import Link from "next/link";
import { Marco } from "@/componentes/Marco";
import { exigirSesion } from "@/lib/auth";
import { listarGuiones, latidoEstacion } from "@/lib/consultas";
import { contexto } from "@/lib/entorno";
import { estacionViva } from "@/lib/estacion-estado";
import { gastadoHoy, topeDiario } from "@/lib/presupuesto";
import { buscarTematica } from "@compartido/tematicas";

export const dynamic = "force-dynamic";

const COLOR_ESTADO: Record<string, string> = {
  borrador: "bg-neutral-700 text-neutral-100",
  aprobado: "bg-emerald-800 text-emerald-100",
  rechazado: "bg-red-900 text-red-100",
};

const TEXTO_TRABAJO: Record<string, string> = {
  pendiente: "En cola",
  tomado: "Produciendo",
  hecho: "Video listo",
  error: "Falló",
  cancelado: "Cancelado",
};

export default async function PaginaInicio() {
  await exigirSesion();
  const { db } = await contexto();
  const [guiones, gasto, tope, latido] = await Promise.all([
    listarGuiones(db),
    gastadoHoy(db),
    topeDiario(db),
    latidoEstacion(db),
  ]);
  const viva = estacionViva(latido);

  return (
    <Marco titulo="Guiones">
      <div className="mb-5 flex flex-wrap items-center gap-3 text-sm text-neutral-400">
        <span>
          Gasto de hoy: <strong className="text-neutral-100">${gasto.toFixed(2)}</strong> de $
          {tope.toFixed(2)}
        </span>
        <span>·</span>
        <span>
          Estación:{" "}
          <strong className={viva ? "text-emerald-400" : "text-red-400"}>
            {viva ? "conectada" : "apagada"}
          </strong>
        </span>
        <Link href="/nuevo" className="boton ml-auto">
          Nuevo video
        </Link>
      </div>

      {guiones.length === 0 ? (
        <div className="tarjeta text-sm text-neutral-300">
          Todavía no hay guiones. Toca <strong>Nuevo video</strong>, escribe un tema y el motor te propone el
          guion.
        </div>
      ) : (
        <ul className="space-y-2">
          {guiones.map((g) => (
            <li key={g.id}>
              <Link
                href={`/guiones/${g.id}`}
                className="tarjeta flex flex-wrap items-center gap-3 hover:border-neutral-600"
              >
                <span className="text-xs text-neutral-500">#{g.id}</span>
                <span className="basis-full font-medium sm:basis-auto sm:flex-1">{g.titulo}</span>
                <span className="text-xs text-neutral-400">
                  {buscarTematica(g.tematica_id)?.nombre ?? g.tematica_id}
                </span>
                <span className={`chip ${COLOR_ESTADO[g.estado] ?? ""}`}>{g.estado}</span>
                {g.trabajo_estado && (
                  <span className="chip bg-sky-900 text-sky-100">
                    {TEXTO_TRABAJO[g.trabajo_estado] ?? g.trabajo_estado}
                  </span>
                )}
                {g.aviso_parecido && (
                  <span className="chip bg-amber-900 text-amber-100">se parece a otro</span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Marco>
  );
}
