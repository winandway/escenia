import { redirect } from "next/navigation";
import { haySesion } from "@/lib/auth";
import { contexto } from "@/lib/entorno";
import { FormularioEntrar } from "./FormularioEntrar";

export const metadata = { title: "Entrar" };

export default async function PaginaEntrar() {
  if (await haySesion()) redirect("/");
  let siteKey: string | undefined;
  try {
    siteKey = (await contexto()).env.TURNSTILE_SITE_KEY;
  } catch {
    siteKey = undefined;
  }
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center px-4 py-10">
      <h1 className="mb-1 text-2xl font-semibold">Escenia</h1>
      <p className="mb-6 text-sm text-neutral-400">Motor de videos de Windoce. Solo para el equipo.</p>
      <FormularioEntrar siteKey={siteKey} />
    </main>
  );
}
