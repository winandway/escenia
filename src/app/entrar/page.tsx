import { redirect } from "next/navigation";
import { haySesion } from "@/lib/auth";
import { contexto, variablesFaltantes } from "@/lib/entorno";
import { FormularioEntrar } from "./FormularioEntrar";
import { PrimeraConfiguracion } from "./PrimeraConfiguracion";

export const metadata = { title: "Entrar" };
export const dynamic = "force-dynamic";

export default async function PaginaEntrar() {
  const faltan = await variablesFaltantes();
  if (faltan.length === 0 && (await haySesion())) redirect("/");
  let siteKey: string | undefined;
  if (faltan.length === 0) {
    try {
      siteKey = (await contexto()).env.TURNSTILE_SITE_KEY;
    } catch {
      siteKey = undefined;
    }
  }
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center px-4 py-10">
      <h1 className="mb-1 text-2xl font-semibold">Escenia</h1>
      <p className="mb-6 text-sm text-neutral-400">Motor de videos de Windoce. Solo para el equipo.</p>
      {faltan.length > 0 ? <PrimeraConfiguracion faltan={faltan} /> : <FormularioEntrar siteKey={siteKey} />}
    </main>
  );
}
