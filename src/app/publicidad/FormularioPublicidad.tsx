"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AvisoBorrador } from "@/componentes/AvisoBorrador";
import { BancoDeVoces } from "@/componentes/BancoDeVoces";
import { useBorrador } from "@/componentes/useBorrador";
import { IDIOMAS } from "@compartido/comerciales";
import { contarPalabras } from "@compartido/grabaciones";
import { esquemaPublicidadNueva, MAX_PALABRAS_PUBLICIDAD } from "@compartido/publicidad";

type Estado = { fase: "listo" | "enviando" | "hecho"; error: string };
export type ImagenParaAvatar = { id: number; nombre: string; carpeta: string };

const carpetasMarcadas = (form: HTMLFormElement) => new FormData(form).getAll("carpetas").map(String);

export function FormularioPublicidad({
  carpetas,
  imagenes,
}: {
  carpetas: string[];
  imagenes: ImagenParaAvatar[];
}) {
  const router = useRouter();
  const { ref, recuperado, empezarDeNuevo, descartar } = useBorrador("publicidad-nueva");
  const [estado, setEstado] = useState<Estado>({ fase: "listo", error: "" });
  const [palabras, setPalabras] = useState(0);
  const [elegidas, setElegidas] = useState<string[]>([]);

  // Después de que el borrador devuelve lo escrito: contar palabras y ver qué carpetas quedaron marcadas.
  useEffect(() => {
    const form = ref.current;
    if (!form) return;
    const t = setTimeout(() => {
      setElegidas(carpetasMarcadas(form));
      setPalabras(contarPalabras(String(new FormData(form).get("narracion") ?? "")));
    }, 0);
    return () => clearTimeout(t);
  }, [ref, recuperado]);

  async function pedir(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const form = evento.currentTarget;
    const datos = new FormData(form);
    const marcadas = datos.getAll("carpetas").map(String);
    const avatar = String(datos.get("avatar") ?? "");
    // Un avatar de una carpeta que ya no está marcada no se manda: no llegaría a la Mac.
    const avatarValido = imagenes.some((i) => i.nombre === avatar && marcadas.includes(i.carpeta))
      ? avatar
      : "";
    const parseo = esquemaPublicidadNueva.safeParse({
      nombre: datos.get("nombre"),
      narracion: datos.get("narracion"),
      idioma: datos.get("idioma"),
      voz: datos.get("voz"),
      carpetas: marcadas,
      avatar: avatarValido,
      instrucciones: datos.get("instrucciones") ?? "",
    });
    if (!parseo.success)
      return setEstado({ fase: "listo", error: parseo.error.issues[0]?.message ?? "Revisa los datos." });
    setEstado({ fase: "enviando", error: "" });
    try {
      const r = await fetch("/datos/publicidades", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(parseo.data),
      });
      const respuesta = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok)
        return setEstado({ fase: "listo", error: respuesta.error ?? "No se pudo pedir el anuncio." });
      descartar();
      form.reset();
      setElegidas([]);
      setPalabras(0);
      setEstado({ fase: "hecho", error: "" });
      router.refresh();
      document.getElementById("titulo-lista")?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch {
      setEstado({
        fase: "listo",
        error: "Se cortó la conexión. Lo que escribiste sigue aquí: vuelve a intentarlo.",
      });
    }
  }

  const visibles = imagenes.filter((i) => elegidas.includes(i.carpeta));

  return (
    <>
      {estado.fase === "hecho" && (
        <div
          role="status"
          className="mb-4 max-w-2xl rounded-md border border-emerald-900 bg-emerald-950/40 p-4"
        >
          <p className="text-base font-semibold text-emerald-200">Listo: el anuncio quedó pedido.</p>
          <p className="mt-1 text-sm text-emerald-100/80">
            La Mac lo toma sola y lo arma en unos minutos. Lo ves abajo, en «Tus anuncios».
          </p>
        </div>
      )}
      <form
        ref={ref}
        onSubmit={pedir}
        onChange={(e) => setElegidas(carpetasMarcadas(e.currentTarget))}
        className="space-y-5"
      >
        <AvisoBorrador visible={recuperado} alEmpezarDeNuevo={empezarDeNuevo} />
        <div>
          <label htmlFor="nombre" className="etiqueta">
            Nombre del anuncio
          </label>
          <input
            id="nombre"
            name="nombre"
            required
            maxLength={120}
            className="campo"
            placeholder="El cliente y el producto"
          />
        </div>
        <div>
          <label htmlFor="narracion" className="etiqueta">
            Lo que dice la voz
          </label>
          <textarea
            id="narracion"
            name="narracion"
            required
            rows={6}
            className="campo"
            placeholder="El texto del anuncio: qué es el producto, para qué sirve y dónde se compra"
            onChange={(e) => setPalabras(contarPalabras(e.currentTarget.value))}
          />
          <p className="mt-1.5 text-xs text-neutral-400">
            {palabras} palabras · unos {Math.round(palabras / 2.6)} segundos. Entre 30 y{" "}
            {MAX_PALABRAS_PUBLICIDAD} palabras (de 12 a 45 segundos). Las cifras, escríbelas en números: «1200
            vatios».
          </p>
        </div>
        <div className="max-w-xs">
          <label htmlFor="idioma" className="etiqueta">
            Idioma del texto
          </label>
          <select id="idioma" name="idioma" required className="campo" defaultValue="es">
            {IDIOMAS.map((i) => (
              <option key={i.id} value={i.id}>
                {i.nombre}
              </option>
            ))}
          </select>
        </div>
        <BancoDeVoces porDefecto="venezolana" />
        <fieldset>
          <legend className="etiqueta">Carpetas del cliente (logo y fotos del producto)</legend>
          {carpetas.length === 0 ? (
            <p className="text-sm text-amber-300">
              Todavía no hay carpetas: sube primero el logo y las fotos del cliente en «Imágenes».
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {carpetas.map((c) => (
                <label
                  key={c}
                  className="flex cursor-pointer items-center gap-2 rounded-full border border-neutral-700 px-3 py-1.5 text-sm text-neutral-200 has-[:checked]:border-amber-500 has-[:checked]:bg-amber-500/15"
                >
                  <input type="checkbox" name="carpetas" value={c} className="accent-amber-500" />
                  {c}
                </label>
              ))}
            </div>
          )}
        </fieldset>
        <fieldset>
          <legend className="etiqueta">Quién habla en el anuncio</legend>
          <p className="mb-2 text-xs text-neutral-400">
            La foto de una persona, de frente: la IA la hace hablar con la voz elegida. Sale de las carpetas
            que marques.
          </p>
          <div className="flex flex-wrap gap-2">
            <label className="flex h-24 w-20 cursor-pointer items-center justify-center rounded-lg border border-neutral-700 p-2 text-center text-xs text-neutral-300 has-[:checked]:border-amber-500 has-[:checked]:bg-amber-500/15">
              <input
                type="radio"
                name="avatar"
                value=""
                defaultChecked
                className="sr-only"
                aria-label="Sin persona"
              />
              Sin persona
            </label>
            {imagenes.map((i) => (
              <label
                key={i.id}
                title={i.nombre}
                className={`relative h-24 w-20 cursor-pointer overflow-hidden rounded-lg border border-neutral-700 has-[:checked]:border-2 has-[:checked]:border-amber-500 ${
                  elegidas.includes(i.carpeta) ? "" : "hidden"
                }`}
              >
                <input
                  type="radio"
                  name="avatar"
                  value={i.nombre}
                  className="sr-only"
                  aria-label={i.nombre}
                />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/datos/imagenes/${i.id}`}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              </label>
            ))}
          </div>
          {elegidas.length > 0 && visibles.length === 0 && (
            <p className="mt-2 text-xs text-neutral-400">Esas carpetas no tienen fotos para elegir.</p>
          )}
        </fieldset>
        <div>
          <label htmlFor="instrucciones" className="etiqueta">
            Cómo lo quieres (opcional)
          </label>
          <textarea
            id="instrucciones"
            name="instrucciones"
            rows={3}
            maxLength={2000}
            className="campo"
            placeholder="Qué foto va primero, qué palabras salen en grande, cómo cierra"
          />
        </div>
        <p className="text-xs text-neutral-400">
          Sale vertical (para Shorts, Reels y TikTok): el logo arriba, las fotos del producto en tarjetas con
          etiquetas, subtítulos, música y la persona hablando abajo. Con persona cuesta de 65 centavos a un
          dólar, según lo largo; sin persona, unos 5 centavos.
        </p>
        {estado.error && (
          <p role="alert" className="rounded-md border border-red-900 bg-red-950/50 p-3 text-sm text-red-200">
            {estado.error}
          </p>
        )}
        <button
          type="submit"
          disabled={estado.fase === "enviando" || carpetas.length === 0}
          className="boton"
        >
          {estado.fase === "enviando" ? "Pidiendo…" : "Pedir el anuncio"}
        </button>
      </form>
    </>
  );
}
