// Candado de gasto diario. Toda llamada que cuesta dinero pregunta aquí
// ANTES de salir, y anota lo que costó DESPUÉS. Si se pasa del tope, se para.
import type { BaseDatos } from "./db";

export class PresupuestoAgotado extends Error {
  constructor(
    public gastadoHoy: number,
    public tope: number,
  ) {
    super(
      `Se alcanzó el tope de gasto de hoy ($${tope.toFixed(2)}). Van $${gastadoHoy.toFixed(2)}. ` +
        `Súbelo en Ajustes si hace falta, o espera a mañana.`,
    );
    this.name = "PresupuestoAgotado";
  }
}

export async function topeDiario(db: BaseDatos): Promise<number> {
  const fila = await db.uno<{ valor: string }>(
    "SELECT valor FROM ajustes WHERE clave = 'presupuesto_diario_usd'",
  );
  const n = Number(fila?.valor);
  // Sin valor válido, el tope es CERO: mejor no gastar que gastar sin límite.
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export async function gastadoHoy(db: BaseDatos): Promise<number> {
  const fila = await db.uno<{ total: number | null }>(
    "SELECT SUM(costo_usd) AS total FROM gastos WHERE fecha = date('now')",
  );
  return fila?.total ?? 0;
}

/** Lanza PresupuestoAgotado si gastar `estimado` haría pasar el tope. */
export async function autorizarGasto(db: BaseDatos, estimado: number): Promise<void> {
  const [tope, hoy] = await Promise.all([topeDiario(db), gastadoHoy(db)]);
  if (hoy + Math.max(0, estimado) > tope) throw new PresupuestoAgotado(hoy, tope);
}

export async function anotarGasto(
  db: BaseDatos,
  servicio: string,
  detalle: string,
  costo: number,
): Promise<void> {
  if (!Number.isFinite(costo) || costo < 0) throw new Error(`Costo inválido para ${servicio}: ${costo}`);
  await db.ejecutar("INSERT INTO gastos (servicio, detalle, costo_usd) VALUES (?, ?, ?)", [
    servicio,
    detalle.slice(0, 200),
    costo,
  ]);
}
