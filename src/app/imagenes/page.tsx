import { MenuTresPuntos } from "@/app/calendario/MenuTresPuntos";
import { Marco } from "@/componentes/Marco";
import { exigirSesion } from "@/lib/auth";
import { contexto } from "@/lib/entorno";
import { carpetasDeImagenes, imagenesActivas, type FilaImagen } from "@/lib/imagenes";
import { quitarCarpetaEntera, quitarDeLaBiblioteca } from "./acciones";
import { FormularioImagenes } from "./FormularioImagenes";

export const dynamic = "force-dynamic";
export const metadata = { title: "Imágenes" };

const megas = (bytes: number) =>
  bytes < 1_048_576 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / 1_048_576).toFixed(1)} MB`;

function Imagen({ i }: { i: FilaImagen }) {
  return (
    <li className="relative rounded-md border border-neutral-800 bg-neutral-900/60 p-2">
      <div className="flex aspect-square items-center justify-center overflow-hidden rounded bg-[repeating-conic-gradient(#1f2937_0%_25%,#111827_0%_50%)] bg-[length:16px_16px]">
        {i.tipo === "pdf" ? (
          <span className="rounded bg-red-700 px-2 py-1 text-xs font-semibold text-white">PDF</span>
        ) : (
          // Sale del almacén con sesión: el optimizador de imágenes no aplica.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/datos/imagenes/${i.id}`}
            alt={i.nombre}
            loading="lazy"
            className="max-h-full max-w-full object-contain"
          />
        )}
      </div>
      <p className="mt-2 truncate text-xs text-neutral-200" title={i.nombre}>
        {i.nombre}
      </p>
      <p className="text-[11px] text-neutral-500">{megas(i.bytes)}</p>
      <div className="absolute right-1 top-1">
        <MenuTresPuntos
          accion={quitarDeLaBiblioteca}
          ocultos={{ id: i.id }}
          etiqueta="Quitar esta imagen"
          pregunta="¿Quitar esta imagen? Deja de ofrecerse para los videos nuevos. No se borra nada."
          confirmar="Sí, quitar"
        />
      </div>
    </li>
  );
}

export default async function PaginaImagenes() {
  await exigirSesion();
  const { db } = await contexto();
  const [carpetas, imagenes] = await Promise.all([carpetasDeImagenes(db), imagenesActivas(db)]);

  return (
    <Marco titulo="Imágenes">
      <p className="mb-6 max-w-2xl text-sm text-neutral-300">
        El material que te manda un cliente para su video: sus logos, las capturas de su página, un PDF. Se
        guarda por carpetas y, al pedir un comercial, eliges qué carpetas se usan.
      </p>

      <section aria-labelledby="titulo-subir" className="tarjeta mb-8">
        <h2 id="titulo-subir" className="mb-4 text-lg font-semibold">
          Subir imágenes a una carpeta
        </h2>
        <FormularioImagenes carpetas={carpetas.map((c) => c.carpeta)} />
      </section>

      {carpetas.length === 0 ? (
        <p className="tarjeta text-sm text-neutral-300">Todavía no hay carpetas. Sube la primera arriba.</p>
      ) : (
        carpetas.map((c) => (
          <section key={c.carpeta} className="mb-8" aria-label={`Carpeta ${c.carpeta}`}>
            <div className="mb-3 flex items-center gap-2">
              <h2 className="text-lg font-semibold">
                {c.carpeta}{" "}
                <span className="text-sm font-normal text-neutral-400">
                  · {c.archivos} archivo(s) · {megas(c.bytes)}
                </span>
              </h2>
              <div className="ml-auto">
                <MenuTresPuntos
                  accion={quitarCarpetaEntera}
                  ocultos={{ carpeta: c.carpeta }}
                  etiqueta="Quitar la carpeta entera"
                  pregunta={`¿Quitar la carpeta «${c.carpeta}» con todo? Deja de ofrecerse para los videos nuevos. No se borra nada.`}
                  confirmar="Sí, quitar la carpeta"
                />
              </div>
            </div>
            <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
              {imagenes
                .filter((i) => i.carpeta === c.carpeta)
                .map((i) => (
                  <Imagen key={i.id} i={i} />
                ))}
            </ul>
          </section>
        ))
      )}
    </Marco>
  );
}
