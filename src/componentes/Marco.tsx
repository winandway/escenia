import Link from "next/link";
import { salir } from "@/app/entrar/acciones";

const ENLACES = [
  { href: "/", texto: "Guiones" },
  { href: "/nuevo", texto: "Nuevo video" },
  { href: "/trabajos", texto: "Estación" },
  { href: "/ajustes", texto: "Ajustes" },
] as const;

/** Encabezado + pie de todas las pantallas del panel (ya con sesión). */
export function Marco({ children, titulo }: { children: React.ReactNode; titulo?: string }) {
  return (
    <>
      <header className="border-b border-neutral-800">
        <nav className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3 text-sm">
          <Link href="/" className="mr-2 font-semibold text-amber-400">
            Escenia
          </Link>
          {ENLACES.map((e) => (
            <Link key={e.href} href={e.href} className="text-neutral-300 hover:text-white">
              {e.texto}
            </Link>
          ))}
          <form action={salir} className="ml-auto">
            <button type="submit" className="text-neutral-400 hover:text-white">
              Cerrar sesión
            </button>
          </form>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
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
