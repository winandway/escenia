import Link from "next/link";
import { notFound } from "next/navigation";
import { Marco } from "@/componentes/Marco";
import { exigirSesion } from "@/lib/auth";
import { carpetasDe, imagenesDe, planEnRevision } from "@/lib/comerciales";
import { contexto } from "@/lib/entorno";
import { imagenesActivas } from "@/lib/imagenes";
import { buscarImagenPorNombre } from "@compartido/imagenes";
import { EditorPlanComercial, type EscenaDelEditor, type OpcionDeImagen } from "./EditorPlanComercial";

export const dynamic = "force-dynamic";
export const metadata = { title: "Plan del comercial" };

export default async function PaginaPlanComercial(props: PageProps<"/comerciales/[id]">) {
  await exigirSesion();
  const id = Number((await props.params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const { db } = await contexto();
  const plan = await planEnRevision(db, id);
  if (!plan) notFound();

  // La miniatura de cada imagen sale de la biblioteca (las páginas de un PDF no tienen: se nombran solas).
  const carpetas = new Set(carpetasDe(plan.comercial));
  const biblioteca = (await imagenesActivas(db)).filter((i) => carpetas.has(i.carpeta));
  const miniatura = (nombre: string) => buscarImagenPorNombre(nombre, biblioteca)?.id ?? null;
  const opciones: OpcionDeImagen[] = imagenesDe(plan.comercial).map((i) => ({
    nombre: i.nombre,
    miniatura: miniatura(i.nombre),
  }));
  const escenas: EscenaDelEditor[] = plan.guion.escenas.map((e) => ({
    narracion: e.narracion,
    titular: e.visual.titular ?? "",
    diagrama: e.visual.tipo === "diagrama",
    planos: (e.visual.planos ?? []).map((p, k) => ({
      indice: k,
      tipo: p.tipo,
      frase: p.frase,
      archivo: p.archivo ?? "",
      texto: p.texto ?? "",
      miniatura: p.archivo ? miniatura(p.archivo) : null,
    })),
  }));

  return (
    <Marco titulo={`Plan: ${plan.comercial.nombre}`}>
      <div className="mb-4 text-sm text-neutral-400">
        <Link href="/comerciales" className="hover:text-white">
          ← Comerciales
        </Link>
      </div>
      <p className="mb-6 max-w-2xl text-sm text-neutral-300">
        {plan.editable
          ? "Así va a quedar el video: cada frase del texto con la imagen que entra en ese momento. Cambia o quita la que no te guste y toca «Armar el video». Hasta entonces no se gasta nada."
          : "Este plan ya se mandó a armar. Si quieres otro, vuelve a Comerciales y toca «Armar otra versión»."}
      </p>
      <EditorPlanComercial
        id={id}
        guionId={plan.guionId}
        escenas={escenas}
        opciones={opciones}
        editable={plan.editable}
      />
    </Marco>
  );
}
