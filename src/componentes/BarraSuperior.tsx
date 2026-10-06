"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Los grupos del menú: hacer videos, el material, y la casa. */
export const GRUPOS = [
  {
    nombre: "Videos",
    enlaces: [
      { href: "/", texto: "Guiones", icono: "M4 5h16M4 12h10M4 19h7" },
      { href: "/nuevo", texto: "Nuevo video", icono: "M12 5v14M5 12h14" },
      {
        href: "/grabaciones",
        texto: "Grabaciones",
        icono: "M4 7h11a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H4zM17 10l4-2v8l-4-2",
      },
      { href: "/comerciales", texto: "Comerciales", icono: "M3 11l18-6v14L3 13zM7 13v5" },
    ],
  },
  {
    nombre: "Material",
    enlaces: [
      { href: "/imagenes", texto: "Imágenes", icono: "M4 5h16v14H4zM4 15l5-5 4 4 3-3 4 4" },
      {
        href: "/sonidos",
        texto: "Sonidos",
        icono: "M9 18V6l10-2v12M6 18a3 3 0 1 0 0-6 3 3 0 0 0 0 6M16 16a3 3 0 1 0 0-6 3 3 0 0 0 0 6",
      },
    ],
  },
  {
    nombre: "Casa",
    enlaces: [
      { href: "/calendario", texto: "Calendario", icono: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4" },
      { href: "/trabajos", texto: "Estación", icono: "M4 4h16v10H4zM8 20h8M12 14v6" },
      {
        href: "/ajustes",
        texto: "Ajustes",
        icono:
          "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M4 12h2M18 12h2M12 4v2M12 18v2M6.3 6.3l1.4 1.4M16.3 16.3l1.4 1.4M6.3 17.7l1.4-1.4M16.3 7.7l1.4-1.4",
      },
    ],
  },
] as const;

const Icono = ({ d }: { d: string }) => (
  <svg
    viewBox="0 0 24 24"
    width="16"
    height="16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.9"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d={d} />
  </svg>
);

/** La barra del panel: los botones por grupos, el activo encendido, y si la Mac está viva. */
export function BarraSuperior({
  macEncendida,
  salir,
}: {
  macEncendida: boolean | null;
  salir: React.ReactNode;
}) {
  const ruta = usePathname();
  const activo = (href: string) =>
    href === "/" ? ruta === "/" || ruta.startsWith("/guiones") : ruta.startsWith(href);
  return (
    <header className="sticky top-0 z-20 border-b border-neutral-800/80 bg-[#0b0f19]/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5">
        <Link href="/" className="mr-1 flex items-center gap-2" aria-label="Escenia, inicio">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-amber-400 to-orange-600 text-sm font-black text-neutral-950 shadow-[0_0_18px_rgba(245,158,11,.45)]">
            E
          </span>
          <span className="hidden text-base font-semibold tracking-tight text-neutral-100 sm:inline">
            Escenia
          </span>
        </Link>
        {/* En pantalla chica los botones pasan a dos o tres filas: nada queda escondido. */}
        <nav aria-label="Secciones" className="-mx-1 flex min-w-0 flex-1 flex-wrap items-center gap-1 px-1">
          {GRUPOS.map((g, k) => (
            <div key={g.nombre} className="flex shrink-0 items-center gap-1">
              {k > 0 && <span aria-hidden="true" className="mx-1 h-5 w-px bg-neutral-800" />}
              {g.enlaces.map((e) => {
                const on = activo(e.href);
                return (
                  <Link
                    key={e.href}
                    href={e.href}
                    aria-current={on ? "page" : undefined}
                    className={`flex items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1.5 text-sm transition ${
                      on
                        ? "bg-amber-500/15 text-amber-300 ring-1 ring-inset ring-amber-500/40"
                        : "text-neutral-300 hover:bg-neutral-800/80 hover:text-white"
                    }`}
                  >
                    <Icono d={e.icono} />
                    {e.texto}
                    {e.href === "/trabajos" && macEncendida !== null && (
                      <span
                        aria-label={macEncendida ? "La Mac está conectada" : "La Mac no responde"}
                        className={`ml-0.5 inline-block h-2 w-2 rounded-full ${macEncendida ? "bg-emerald-400 shadow-[0_0_8px_#34d399]" : "bg-red-500"}`}
                      />
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
        <div className="shrink-0">{salir}</div>
      </div>
    </header>
  );
}
