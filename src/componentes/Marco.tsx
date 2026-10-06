import { salir } from "@/app/entrar/acciones";
import { latidoEstacion } from "@/lib/consultas";
import { contexto } from "@/lib/entorno";
import { estacionViva } from "@/lib/estacion-estado";
import { BarraSuperior } from "./BarraSuperior";

/** Encabezado + pie de todas las pantallas del panel (ya con sesión). */
export async function Marco({ children, titulo }: { children: React.ReactNode; titulo?: string }) {
  // Si la Mac está viva se ve en la barra, al lado de «Estación» (y si la base no responde, no se dice nada).
  const macEncendida = await contexto()
    .then(({ db }) => latidoEstacion(db))
    .then((latido) => estacionViva(latido))
    .catch(() => null);
  return (
    <>
      <BarraSuperior
        macEncendida={macEncendida}
        salir={
          <form action={salir}>
            <button
              type="submit"
              className="rounded-md px-2.5 py-1.5 text-sm text-neutral-400 hover:bg-neutral-800/80 hover:text-white"
            >
              Cerrar sesión
            </button>
          </form>
        }
      />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        {titulo && <h1 className="mb-5 text-2xl font-semibold">{titulo}</h1>}
        {children}
      </main>
      <footer className="border-t border-neutral-800 px-4 py-4 text-center text-xs text-neutral-500">
        © {new Date().getFullYear()} escenia.sitios.dev | All rights reserved. Developed by{" "}
        <a
          href="https://windoce.com"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-neutral-300"
        >
          Windoce LLC
        </a>
      </footer>
    </>
  );
}
