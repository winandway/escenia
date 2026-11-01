// Gastos (docs/GASTOS.md): cuánto se gastó cada mes, en qué servicio, en qué pieza y qué día, y cuántos
// videos salieron. Para que Richard sepa qué es cada cobro de su tarjeta.
import Link from "next/link";
import { Marco } from "@/componentes/Marco";
import { exigirSesion } from "@/lib/auth";
import { contexto } from "@/lib/entorno";
import { mesValido, nombreDelServicio, resumenDelMes } from "@/lib/gastos-mes";

export const dynamic = "force-dynamic";
export const metadata = { title: "Gastos" };

const dinero = (usd: number) => `$${usd.toFixed(2)}`;
const MESES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];
const nombreDelMes = (mes: string) => `${MESES[Number(mes.slice(5, 7)) - 1] ?? ""} de ${mes.slice(0, 4)}`;
function otroMes(mes: string, delta: number): string {
  const d = new Date(`${mes}-15T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + delta);
  return d.toISOString().slice(0, 7);
}

export default async function PaginaGastos({ searchParams }: PageProps<"/gastos">) {
  await exigirSesion();
  const { db } = await contexto();
  const mes = mesValido((await searchParams).mes as string | undefined);
  const r = await resumenDelMes(db, mes);
  const videos = r.videos.guiones + r.videos.anuncios + r.videos.director;

  return (
    <Marco titulo="Gastos">
      <div className="mb-4 flex items-center gap-3 text-sm">
        <Link href={`/gastos?mes=${otroMes(mes, -1)}`} className="boton-suave whitespace-nowrap">
          ← Anterior
        </Link>
        <strong className="flex-1 text-center text-neutral-100">{nombreDelMes(mes)}</strong>
        <Link href={`/gastos?mes=${otroMes(mes, 1)}`} className="boton-suave whitespace-nowrap">
          Siguiente →
        </Link>
      </div>

      <div className="tarjeta mb-5">
        <p className="text-3xl font-semibold text-neutral-100">{dinero(r.total)}</p>
        <p className="mt-1 text-sm text-neutral-400">
          Gastado este mes por el panel · {videos} producciones terminadas ({r.videos.guiones} de guiones,
          contando las que se rehicieron, {r.videos.anuncios} anuncios, {r.videos.director} del Director con
          video)
        </p>
        <p className="mt-3 text-xs text-neutral-500">
          Ojo: la cuenta de fal.ai la usan también otros proyectos (Beellon y Losupe), y fal.ai cobra la
          tarjeta en recargas de 10 dólares para toda la cuenta. Aquí está solo lo que gastó Escenia desde el
          panel; lo que se hizo a mano desde la Mac (pruebas y prototipos) no siempre quedó anotado.
        </p>
      </div>

      <h2 className="mb-2 text-sm font-semibold text-neutral-300">Por servicio</h2>
      <div className="tarjeta mb-5 text-sm">
        {r.porServicio.length === 0 ? (
          <p className="text-neutral-400">Sin gastos este mes.</p>
        ) : (
          r.porServicio.map((s) => (
            <p
              key={s.servicio}
              className="flex justify-between border-b border-neutral-800 py-2 last:border-0"
            >
              <span>
                {s.nombre} <span className="text-neutral-500">· {s.veces} llamadas</span>
              </span>
              <strong className="text-neutral-100">{dinero(s.usd)}</strong>
            </p>
          ))
        )}
      </div>

      <h2 className="mb-2 text-sm font-semibold text-neutral-300">Por pieza (cada video o proyecto)</h2>
      <div className="tarjeta mb-5 text-sm">
        {r.porPieza.map((p) => (
          <div key={p.clave} className="border-b border-neutral-800 py-2 last:border-0">
            <p className="flex justify-between">
              {p.enlace ? (
                <Link href={p.enlace} className="hover:text-amber-300">
                  {p.nombre}
                </Link>
              ) : (
                <span>{p.nombre}</span>
              )}
              <strong className="text-neutral-100">{dinero(p.usd)}</strong>
            </p>
            <p className="text-xs text-neutral-500">
              {Object.entries(p.porServicio)
                .map(([s, usd]) => `${nombreDelServicio(s).split(" (")[0]} ${dinero(usd)}`)
                .join(" · ")}
            </p>
          </div>
        ))}
      </div>

      <h2 className="mb-2 text-sm font-semibold text-neutral-300">Por día</h2>
      <div className="tarjeta text-sm">
        {r.porDia.map((d) => (
          <p key={d.fecha} className="flex justify-between border-b border-neutral-800 py-1.5 last:border-0">
            <span>{d.fecha}</span>
            <span className="text-neutral-100">{dinero(d.usd)}</span>
          </p>
        ))}
      </div>
    </Marco>
  );
}
