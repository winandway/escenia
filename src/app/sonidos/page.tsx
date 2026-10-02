import { MenuTresPuntos } from "@/app/calendario/MenuTresPuntos";
import { Marco } from "@/componentes/Marco";
import { exigirSesion } from "@/lib/auth";
import { contexto } from "@/lib/entorno";
import { sonidosActivos, type FilaSonido } from "@/lib/sonidos";
import { GENEROS, ORIGENES, USOS_EFECTO } from "@compartido/sonidos";
import { quitarDeLaBiblioteca } from "./acciones";
import { FormularioSonido } from "./FormularioSonido";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sonidos" };

const megas = (bytes: number) => `${(bytes / 1_048_576).toFixed(1)} MB`;
const nombreDe = (lista: readonly { id: string; nombre: string }[], id: string) =>
  lista.find((x) => x.id === id)?.nombre ?? id;

function Fila({ s }: { s: FilaSonido }) {
  return (
    <li className="tarjeta min-w-0 text-sm">
      <div className="flex items-start gap-2">
        <div className="min-w-0">
          <p className="font-medium text-neutral-100">{s.nombre}</p>
          <p className="mt-1 flex flex-wrap gap-1.5">
            <span className="chip bg-amber-500/15 text-amber-300">
              {s.tipo === "musica" ? nombreDe(GENEROS, s.genero) : nombreDe(USOS_EFECTO, s.uso)}
            </span>
            <span className="chip bg-neutral-800 text-neutral-300">{nombreDe(ORIGENES, s.origen)}</span>
            <span className="chip bg-neutral-800 text-neutral-400">{megas(s.bytes)}</span>
          </p>
        </div>
        <div className="ml-auto">
          <MenuTresPuntos
            accion={quitarDeLaBiblioteca}
            ocultos={{ id: s.id }}
            etiqueta="Quitar de la biblioteca"
            pregunta="¿Quitar este sonido? Deja de usarse en los videos nuevos. Los videos ya hechos no cambian."
            confirmar="Sí, quitar"
          />
        </div>
      </div>
      <audio controls preload="none" src={`/datos/sonidos/${s.id}`} className="mt-3 w-full">
        <track kind="captions" />
      </audio>
    </li>
  );
}

export default async function PaginaSonidos() {
  await exigirSesion();
  const { db } = await contexto();
  const sonidos = await sonidosActivos(db);
  const musica = sonidos.filter((s) => s.tipo === "musica");
  const efectos = sonidos.filter((s) => s.tipo === "efecto");

  return (
    <Marco titulo="Sonidos">
      <p className="mb-6 max-w-2xl text-sm text-neutral-300">
        Tu biblioteca de música y efectos. Lo que subes aquí queda guardado y la Estación lo usa sola: la
        música se elige por el género de cada video y los efectos suenan en cada cambio de imagen.
      </p>

      <section className="mb-8" aria-labelledby="titulo-musica">
        <h2 id="titulo-musica" className="mb-3 text-lg font-semibold">
          Música de fondo ({musica.length})
        </h2>
        {musica.length === 0 ? (
          <p className="tarjeta text-sm text-neutral-300">
            Todavía no has subido música. Mientras tanto, los videos salen con las pistas propias del motor.
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {musica.map((s) => (
              <Fila key={s.id} s={s} />
            ))}
          </ul>
        )}
      </section>

      <section className="mb-8" aria-labelledby="titulo-efectos">
        <h2 id="titulo-efectos" className="mb-3 text-lg font-semibold">
          Efectos de sonido ({efectos.length})
        </h2>
        {efectos.length === 0 ? (
          <p className="tarjeta text-sm text-neutral-300">
            Todavía no has subido efectos. Mientras tanto, cada cambio de imagen suena con los efectos propios
            del motor.
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {efectos.map((s) => (
              <Fila key={s.id} s={s} />
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="titulo-subir" className="tarjeta">
        <h2 id="titulo-subir" className="mb-4 text-lg font-semibold">
          Subir un sonido
        </h2>
        <FormularioSonido />
      </section>
    </Marco>
  );
}
