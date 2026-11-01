// Una guía de Docs: «← Docs» arriba (para el celular, donde la barra va plegada), el texto con sus pasos y
// capturas, y al final la tarjeta para abrir un caso de soporte.
import { notFound } from "next/navigation";
import { guiaPorRuta, TEXTOS_DOCS, type IdiomaDocs } from "./guias";

export function PaginaGuia({ idioma, seccion, slug }: { idioma: IdiomaDocs; seccion: string; slug: string }) {
  const g = guiaPorRuta(seccion, slug);
  if (!g) notFound();
  const t = TEXTOS_DOCS[idioma];
  const c = g[idioma];
  const fecha = new Intl.DateTimeFormat(idioma === "es" ? "es-US" : "en-US", {
    dateStyle: "long",
    timeZone: "UTC",
  });
  return (
    <article className="mx-auto max-w-3xl">
      <a
        href={idioma === "es" ? "/es/docs" : "/docs"}
        className="text-sm text-neutral-500 hover:text-neutral-900"
      >
        {t.volver}
      </a>
      <h1 className="mt-3 text-3xl font-semibold">{c.titulo}</h1>
      <p className="mt-2 text-lg text-neutral-600">{c.resumen}</p>
      <p className="mt-2 text-xs text-neutral-500">
        {t.actualizada}: {fecha.format(new Date(`${g.actualizada}T12:00:00Z`))}
      </p>
      {c.bloques.map((b, i) => {
        const llave = `${b.tipo}-${i}`;
        if (b.tipo === "h2")
          return (
            <h2 key={llave} className="mt-8 text-xl font-semibold">
              {b.texto}
            </h2>
          );
        if (b.tipo === "pasos")
          return (
            <ol key={llave} className="mt-3 list-decimal space-y-2 pl-6">
              {b.items.map((p) => (
                <li key={p.slice(0, 40)}>{p}</li>
              ))}
            </ol>
          );
        if (b.tipo === "nota")
          return (
            <p
              key={llave}
              className="mt-5 rounded-lg border-l-4 border-amber-400 bg-amber-50 px-4 py-3 text-sm"
            >
              {b.texto}
            </p>
          );
        if (b.tipo === "imagen")
          return (
            <figure key={llave} className="mt-5">
              {/* Capturas reales de la función; se sirven tal cual desde la carpeta pública. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={b.src}
                alt={b.alt}
                loading="lazy"
                className="w-full rounded-xl border border-neutral-200 shadow-sm"
              />
              <figcaption className="mt-2 text-center text-xs text-neutral-500">{b.alt}</figcaption>
            </figure>
          );
        return (
          <p key={llave} className="mt-4">
            {b.texto}
          </p>
        );
      })}
      <div className="mt-10 rounded-2xl border border-neutral-200 bg-neutral-50 p-5">
        <p className="font-semibold">{t.ayuda_titulo}</p>
        <p className="mt-1 text-sm text-neutral-600">{t.ayuda_texto}</p>
        <a
          href={idioma === "es" ? "/es/support" : "/support"}
          className="mt-3 inline-block rounded-lg bg-[#0b0f19] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1c2333]"
        >
          {t.ayuda_boton}
        </a>
      </div>
    </article>
  );
}
