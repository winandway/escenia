// Lo último que se supo de la IA que escribe (Anthropic): si el último pedido
// falló por algo que NO se arregla reintentando (sin saldo, clave inválida),
// queda anotado en la base y el canario lo muestra en rojo. Sin esto, la cuenta
// se quedaba sin saldo y el panel seguía diciendo «anthropic: ok» (C-IA-SALDO-1).
import { ajuste, guardarAjuste } from "./consultas";
import type { BaseDatos } from "./db";

const CLAVE = "ia_ultimo_error";

/** De un error de la IA a una frase que Richard entienda, o `null` si es un tropiezo pasajero. */
export function problemaDeCuenta(e: unknown): string | null {
  const texto = e instanceof Error ? e.message : String(e);
  if (/credit balance is too low/i.test(texto))
    return "La cuenta de Anthropic se quedó sin saldo: la IA no puede escribir guiones ni títulos hasta que se recargue (consola de Anthropic → Plans & Billing).";
  if (/invalid x-api-key|authentication_error|\b401\b/i.test(texto))
    return "La clave de Anthropic no es válida o fue revocada: hay que poner una nueva en las variables del panel (ANTHROPIC_API_KEY).";
  if (/permission_error|\b403\b/i.test(texto))
    return "La clave de Anthropic no tiene permiso para este modelo: hay que revisarla en la consola de Anthropic.";
  return null;
}

/** Anota el resultado del último pedido: un problema de cuenta queda guardado; un éxito lo borra. */
export async function anotarEstadoIA(db: BaseDatos, error: unknown | null): Promise<string | null> {
  const problema = error === null ? null : problemaDeCuenta(error);
  // Un error pasajero (red, saturación) no dice nada de la cuenta: no se toca lo anotado.
  if (error !== null && !problema) return null;
  await guardarAjuste(
    db,
    CLAVE,
    problema ? JSON.stringify({ mensaje: problema, cuando: new Date().toISOString() }) : "",
  ).catch(() => {});
  return problema;
}

/** El problema de cuenta que sigue abierto, o `null` si la IA respondió bien la última vez. */
export async function problemaAbiertoDeIA(
  db: BaseDatos,
): Promise<{ mensaje: string; cuando: string } | null> {
  const crudo = await ajuste(db, CLAVE, "").catch(() => "");
  if (!crudo) return null;
  try {
    const d = JSON.parse(crudo) as { mensaje?: string; cuando?: string };
    return d.mensaje ? { mensaje: d.mensaje, cuando: d.cuando ?? "" } : null;
  } catch {
    return null;
  }
}

/** Corre un pedido a la IA y deja anotado cómo salió. Un problema de cuenta sale con su frase clara. */
export async function conEstadoIA<T>(db: BaseDatos, pedido: () => Promise<T>): Promise<T> {
  try {
    const r = await pedido();
    await anotarEstadoIA(db, null);
    return r;
  } catch (e) {
    const problema = await anotarEstadoIA(db, e);
    if (problema) throw new Error(problema);
    throw e;
  }
}
