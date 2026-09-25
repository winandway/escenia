import { Marco } from "@/componentes/Marco";
import { exigirSesion } from "@/lib/auth";
import { ajuste } from "@/lib/consultas";
import { contexto } from "@/lib/entorno";
import { gastadoHoy } from "@/lib/presupuesto";
import { MODELO_POR_DEFECTO, MODELOS_PERMITIDOS } from "@compartido/modelos";
import { FormularioAjustes } from "./FormularioAjustes";

export const dynamic = "force-dynamic";
export const metadata = { title: "Ajustes" };

export default async function PaginaAjustes() {
  await exigirSesion();
  const { db, env } = await contexto();
  const [presupuesto, modelo, instrucciones, gasto] = await Promise.all([
    ajuste(db, "presupuesto_diario_usd", "3"),
    ajuste(db, "modelo_guion", MODELO_POR_DEFECTO),
    ajuste(db, "instrucciones_extra"),
    gastadoHoy(db),
  ]);
  const gastosMes = await db.todos<{ servicio: string; total: number }>(
    "SELECT servicio, SUM(costo_usd) AS total FROM gastos WHERE fecha >= date('now','start of month') GROUP BY servicio",
  );

  return (
    <Marco titulo="Ajustes">
      <div className="mb-6 grid gap-3 text-sm sm:grid-cols-3">
        <div className="tarjeta">
          <div className="text-neutral-400">Gasto de hoy</div>
          <div className="text-xl font-semibold">${gasto.toFixed(2)}</div>
        </div>
        <div className="tarjeta">
          <div className="text-neutral-400">Este mes</div>
          <div className="text-xl font-semibold">
            ${gastosMes.reduce((s, g) => s + g.total, 0).toFixed(2)}
          </div>
          <div className="text-xs text-neutral-500">
            {gastosMes.map((g) => `${g.servicio} $${g.total.toFixed(2)}`).join(" · ") || "sin gastos"}
          </div>
        </div>
        <div className="tarjeta">
          <div className="text-neutral-400">Claves en el panel</div>
          <div className="text-xs">
            Anthropic: {env.ANTHROPIC_API_KEY ? "✓" : "falta"} · Turnstile:{" "}
            {env.TURNSTILE_SECRET_KEY ? "✓" : "apagado"}
          </div>
        </div>
      </div>
      <FormularioAjustes
        presupuesto={presupuesto}
        modelo={modelo}
        instrucciones={instrucciones}
        modelos={Object.entries(MODELOS_PERMITIDOS).map(([id, m]) => ({
          id,
          texto: `${id} — $${m.entrada}/$${m.salida} por millón de tokens`,
        }))}
      />
    </Marco>
  );
}
