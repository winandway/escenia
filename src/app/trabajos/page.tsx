import Link from "next/link";
import { Marco } from "@/componentes/Marco";
import { exigirSesion } from "@/lib/auth";
import { latidoEstacion, listarTrabajos } from "@/lib/consultas";
import { contexto } from "@/lib/entorno";
import { estacionViva } from "@/lib/estacion-estado";

export const dynamic = "force-dynamic";
export const metadata = { title: "Estación" };

export default async function PaginaTrabajos() {
  await exigirSesion();
  const { db } = await contexto();
  const [trabajos, latido] = await Promise.all([listarTrabajos(db), latidoEstacion(db)]);
  const viva = estacionViva(latido);

  return (
    <Marco titulo="Estación">
      <div className="tarjeta mb-5 text-sm">
        {viva ? (
          <p>
            La Estación está <strong className="text-emerald-400">conectada</strong> (versión{" "}
            {latido?.version || "?"}). Toma los trabajos en orden y los produce en la Mac.
          </p>
        ) : (
          <p>
            La Estación está <strong className="text-red-400">apagada</strong>
            {latido ? ` (última señal: ${latido.visto_en} UTC)` : ""}. Los trabajos esperan en cola hasta que
            arranque. Cómo se enciende: <code className="text-xs">docs/ESTACION.md</code>.
          </p>
        )}
      </div>

      {trabajos.length === 0 ? (
        <p className="text-sm text-neutral-400">
          No hay trabajos todavía. Aprueba un guion y aparecerá aquí.
        </p>
      ) : (
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-neutral-500">
            <tr>
              <th className="py-1">#</th>
              <th>Guion</th>
              <th>Estado</th>
              <th>Paso</th>
              <th>Creado (UTC)</th>
            </tr>
          </thead>
          <tbody>
            {trabajos.map((t) => (
              <tr key={t.id} className="border-t border-neutral-800">
                <td className="py-2 text-neutral-500">{t.id}</td>
                <td>
                  <Link href={`/guiones/${t.guion_id}`} className="hover:text-amber-300">
                    {t.titulo}
                  </Link>
                </td>
                <td>{t.estado}</td>
                <td className="text-neutral-400">
                  {t.paso} {t.estado === "tomado" ? `${t.progreso}%` : ""}{" "}
                  {t.error && <span className="text-red-300">{t.error}</span>}
                </td>
                <td className="text-neutral-500">{t.creado_en}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Marco>
  );
}
