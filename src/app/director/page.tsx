import Link from "next/link";
import { MenuTresPuntos } from "@/app/calendario/MenuTresPuntos";
import { Marco } from "@/componentes/Marco";
import { exigirSesion } from "@/lib/auth";
import { encargosAbiertos } from "@/lib/director";
import { dinero } from "@/lib/director-prompt";
import { contexto } from "@/lib/entorno";
import { archivar, nuevoEncargo } from "./acciones";

export const dynamic = "force-dynamic";
export const metadata = { title: "Director" };

export default async function PaginaDirector() {
  await exigirSesion();
  const { db } = await contexto();
  const encargos = await encargosAbiertos(db);
  return (
    <Marco titulo="Director">
      <p className="mb-5 max-w-2xl text-sm text-neutral-300">
        Cuéntale al Director qué anuncio quieres y súbele las fotos. Él te propone el texto, la voz y la
        persona que habla, con el precio delante. No se gasta nada hasta que tú apruebes la tarjeta.
      </p>
      <form action={nuevoEncargo} className="mb-8">
        <button type="submit" className="boton">
          Encargo nuevo
        </button>
      </form>
      <section aria-labelledby="titulo-encargos">
        <h2 id="titulo-encargos" className="mb-3 text-lg font-semibold">
          Tus encargos ({encargos.length})
        </h2>
        {encargos.length === 0 ? (
          <p className="tarjeta text-sm text-neutral-300">Todavía no has abierto ninguno.</p>
        ) : (
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {encargos.map((e) => (
              <li key={e.id} className="tarjeta flex min-w-0 items-start gap-2 text-sm">
                <Link href={`/director/${e.id}`} className="min-w-0 flex-1 hover:text-amber-300">
                  <p className="truncate font-medium text-neutral-100">{e.titulo}</p>
                  <p className="mt-1 text-xs text-neutral-400">
                    {e.carpeta} · la conversación lleva {dinero(e.costo_usd)}
                  </p>
                </Link>
                <MenuTresPuntos
                  accion={archivar}
                  ocultos={{ id: e.id }}
                  etiqueta="Archivar"
                  pregunta="¿Archivar este encargo? Sale de la lista; la conversación y sus videos se guardan."
                  confirmar="Sí, archivar"
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </Marco>
  );
}
