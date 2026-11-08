import Link from "next/link";
import { notFound } from "next/navigation";
import { RefrescoSolo } from "@/app/grabaciones/RefrescoSolo";
import { Marco } from "@/componentes/Marco";
import { exigirSesion } from "@/lib/auth";
import { carpetasDe, comercialParaPortada } from "@/lib/comerciales";
import { archivosDeGuion } from "@/lib/consultas";
import { contexto } from "@/lib/entorno";
import { imagenesActivas } from "@/lib/imagenes";
import { buscarImagenPorNombre } from "@compartido/imagenes";
import { textosMiniatura } from "@compartido/miniatura";
import { clavePieza, miniaturasPorPieza } from "@compartido/portada";
import { FormularioMiniatura, type OpcionMiniatura } from "./FormularioMiniatura";

export const dynamic = "force-dynamic";
export const metadata = { title: "Miniatura del comercial" };

const ESTADO = {
  pedida: { texto: "Pedida: la Mac la va a dibujar en cuanto se desocupe.", clase: "text-amber-300" },
  tomada: { texto: "La Mac la está dibujando ahora mismo.", clase: "text-amber-300" },
  hecha: { texto: "Hecha: es la que ves aquí y la que va con el video.", clase: "text-emerald-300" },
  error: { texto: "No se pudo dibujar", clase: "text-red-300" },
} as const;

export default async function PaginaMiniaturaComercial(props: PageProps<"/comerciales/[id]/miniatura">) {
  await exigirSesion();
  const id = Number((await props.params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const { db } = await contexto();
  const p = await comercialParaPortada(db, id);
  if (!p) notFound();
  const carpetas = new Set(carpetasDe(p.comercial));
  const [biblioteca, archivos] = await Promise.all([imagenesActivas(db), archivosDeGuion(db, p.guionId)]);
  const deLasCarpetas = biblioteca.filter((i) => carpetas.has(i.carpeta));
  const opciones: OpcionMiniatura[] = p.opciones.map((nombre) => ({
    nombre,
    imagenId: buscarImagenPorNombre(nombre, deLasCarpetas)?.id ?? null,
  }));
  const actual = miniaturasPorPieza(archivos)[clavePieza("largo", 0)];
  const automaticos = textosMiniatura(p.comercial.nombre);
  const inicial = p.portada
    ? { archivo: p.portada.archivo, titulo: p.portada.titulo, frase: p.portada.frase }
    : { archivo: opciones[0]?.nombre ?? "", titulo: automaticos.nombre, frase: automaticos.gancho };
  const estado = p.portada ? ESTADO[p.portada.estado] : null;
  const enCurso = p.portada?.estado === "pedida" || p.portada?.estado === "tomada";

  return (
    <Marco titulo={`Miniatura: ${p.comercial.nombre}`}>
      <RefrescoSolo activo={enCurso} />
      <div className="mb-4 flex flex-wrap gap-4 text-sm text-neutral-400">
        <Link href="/comerciales" className="hover:text-white">
          ← Comerciales
        </Link>
        <Link href={`/guiones/${p.guionId}`} className="hover:text-white">
          Ver y descargar el video
        </Link>
      </div>
      <p className="mb-6 max-w-2xl text-sm text-neutral-300">
        Elige cuál de las imágenes del cliente va en la miniatura y escribe el texto. La Mac la vuelve a
        dibujar con el mismo diseño, sin gastar nada, y queda al lado del video para descargarla.
      </p>
      <section aria-labelledby="titulo-actual" className="mb-8 flex flex-wrap items-start gap-4">
        <div className="w-72 max-w-full">
          <h2 id="titulo-actual" className="mb-2 text-sm font-semibold text-neutral-200">
            La miniatura de ahora
          </h2>
          {actual ? (
            // Sale del almacén con sesión: el optimizador de imágenes no aplica.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/datos/archivos/${actual}`}
              alt="Miniatura actual del comercial"
              className="aspect-video w-full rounded-md bg-black object-cover"
            />
          ) : (
            <p className="tarjeta text-sm text-neutral-400">Este video todavía no tiene miniatura.</p>
          )}
        </div>
        {estado && (
          <p role="status" className={`mt-8 max-w-sm text-sm ${estado.clase}`}>
            {estado.texto}
            {p.portada?.estado === "error" && p.portada.error ? `: ${p.portada.error}` : ""}
          </p>
        )}
      </section>
      {opciones.length === 0 ? (
        <p className="tarjeta text-sm text-neutral-300">
          En este video no sale ninguna imagen del cliente: la miniatura se queda con la automática.
        </p>
      ) : (
        <FormularioMiniatura id={id} opciones={opciones} inicial={inicial} />
      )}
    </Marco>
  );
}
