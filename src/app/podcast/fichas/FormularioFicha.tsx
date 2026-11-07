"use client";

// La ficha del invitado: el formato (una historia o la entrevista a la propia IA), su nombre, el tema, quién
// sale en el estudio (el avatar), cómo habla, la voz del banco (nunca la de Richard) y, si es una historia, si
// es de ficción o real (solo la real pide el permiso por escrito) y la historia, que es lo ÚNICO que sabe.
// Lo que no aplica al formato elegido se esconde con CSS (no con estado de React), así el borrador lo devuelve
// todo en su sitio. Guarda borrador mientras se escribe y no se limpia hasta que el
// panel confirma que se guardó (regla de los formularios).
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AvisoBorrador } from "@/componentes/AvisoBorrador";
import { BancoDeVoces } from "@/componentes/BancoDeVoces";
import { useBorrador } from "@/componentes/useBorrador";
import {
  AVISO_FALTA_HISTORIA,
  LEYENDAS,
  LIMITES_FICHA as L,
  MINIMO_HISTORIA,
  ORIGEN_POR_DEFECTO,
  TIPO_POR_DEFECTO,
  VOCES_INVITADO,
  type FichaPodcast,
} from "@compartido/podcast";
import { AVATAR_NUEVO } from "@compartido/podcast-avatares";
import type { EstadoFicha } from "./acciones";
import { SelectorAvatar } from "./SelectorAvatar";

export function FormularioFicha({
  ficha,
  guardar,
  alGuardar,
}: {
  ficha: FichaPodcast | null;
  guardar: (previo: EstadoFicha, datos: FormData) => Promise<EstadoFicha>;
  alGuardar?: (id: number) => void;
}) {
  const { ref, recuperado, empezarDeNuevo, descartar } = useBorrador(`podcast-ficha-${ficha?.id ?? "nueva"}`);
  const [estado, setEstado] = useState<EstadoFicha>({ error: "", ok: "", id: null });
  const [pendiente, iniciar] = useTransition();
  const router = useRouter();
  const irALaFicha = alGuardar ?? ((id: number) => router.push(`/podcast/fichas?ficha=${id}&guardada=1`));

  function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const datos = new FormData(e.currentTarget);
    // La historia solo hace falta en una ficha de historia (el navegador no la exige: se esconde en la entrevista).
    const historia = String(datos.get("historia") ?? "").trim();
    if (datos.get("tipo") !== "entrevista_ia" && historia.length < MINIMO_HISTORIA) {
      setEstado({ error: AVISO_FALTA_HISTORIA, ok: "", id: null });
      return;
    }
    iniciar(async () => {
      let r: EstadoFicha;
      try {
        r = await guardar(estado, datos);
      } catch {
        r = {
          error: "No se pudo guardar (¿sin internet?). Lo escrito sigue aquí: vuelve a intentarlo.",
          ok: "",
          id: null,
        };
      }
      setEstado(r);
      // Solo con la confirmación del panel se borra el borrador.
      if (r.ok && r.id) {
        descartar();
        irALaFicha(r.id);
      }
    });
  }

  return (
    <form
      ref={ref}
      onSubmit={enviar}
      className="group/ficha max-w-3xl space-y-5"
      aria-label="Ficha del invitado"
    >
      <AvisoBorrador visible={recuperado} alEmpezarDeNuevo={empezarDeNuevo} />
      {ficha && <input type="hidden" name="id" value={ficha.id} />}
      {ficha?.ejemplo && (
        <p className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-200">
          Esta es la ficha de ejemplo: la historia es ficticia, sirve para probar el estudio y no se publica.
        </p>
      )}
      <fieldset>
        <legend className="etiqueta">El formato</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {(
            [
              ["historia", "Una historia", "El invitado cuenta en primera persona la historia de la ficha."],
              [
                "entrevista_ia",
                "Entrevista a la IA",
                "El invitado es la propia IA y contesta preguntas de misterio. No lleva historia.",
              ],
            ] as const
          ).map(([valor, nombre, detalle]) => (
            <label
              key={valor}
              className="flex cursor-pointer items-start gap-3 rounded-lg border border-neutral-700 p-3 text-sm has-[:checked]:border-amber-500 has-[:checked]:bg-amber-500/10"
            >
              <input
                type="radio"
                name="tipo"
                value={valor}
                defaultChecked={(ficha?.tipo ?? TIPO_POR_DEFECTO) === valor}
                aria-label={nombre}
                className="mt-0.5 accent-amber-500"
              />
              <span className="min-w-0 flex-1">
                <span className="block font-medium text-neutral-100">{nombre}</span>
                <span className="block text-xs text-neutral-400">{detalle}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="nombre" className="etiqueta">
            Nombre del invitado (sale en su etiqueta)
          </label>
          <input
            id="nombre"
            name="nombre"
            required
            maxLength={L.nombre}
            defaultValue={ficha?.nombre ?? ""}
            placeholder="Nombre del invitado (inventado si la historia es de ficción)"
            className="campo"
          />
        </div>
        <div>
          <label htmlFor="etiqueta" className="etiqueta">
            Debajo del nombre
          </label>
          <input
            id="etiqueta"
            name="etiqueta"
            maxLength={L.etiqueta}
            defaultValue={ficha?.etiqueta ?? "Invitado especial"}
            placeholder="Invitado especial"
            className="campo"
          />
        </div>
      </div>
      <div>
        <label htmlFor="tema" className="etiqueta">
          Tema de hoy (sale en la barra de abajo)
        </label>
        <input
          id="tema"
          name="tema"
          maxLength={L.tema}
          defaultValue={ficha?.tema ?? ""}
          placeholder="De qué trata la historia, en una frase"
          className="campo"
        />
      </div>
      <SelectorAvatar porDefecto={ficha?.avatar ?? AVATAR_NUEVO} />
      <BancoDeVoces
        nombre="voz"
        porDefecto={ficha?.voz ?? "neutra"}
        voces={VOCES_INVITADO}
        titulo="La voz del invitado (del banco; nunca un clon de la persona real)"
      />
      <div>
        <label htmlFor="personalidad" className="etiqueta">
          Cómo es y cómo habla
        </label>
        <textarea
          id="personalidad"
          name="personalidad"
          rows={3}
          maxLength={L.personalidad}
          defaultValue={ficha?.personalidad ?? ""}
          placeholder="Por ejemplo: tímido, cálido, habla despacio, se ríe cuando se pone nervioso"
          className="campo"
        />
      </div>
      {/* Lo de la historia: no aplica (y no se ve) en una entrevista a la IA. Ojo: en las clases de Tailwind el «_»
          es un espacio, por eso se busca el valor que empieza por «entrevista». */}
      <div className="space-y-5 group-has-[input[value^=entrevista]:checked]/ficha:hidden">
        {/* De dónde sale la historia. El permiso solo se pide (y solo se ve) si es real. */}
        <div className="group/origen space-y-3">
          <fieldset>
            <legend className="etiqueta">De dónde sale la historia</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {(
                [
                  [
                    "ficcion",
                    "De ficción (la escribimos nosotros)",
                    "Un nombre inventado y un mensaje: motivación, aventura, crecimiento personal, autoestima.",
                  ],
                  [
                    "real",
                    "Real, con permiso de su protagonista",
                    "Alguien te la cedió por escrito. Necesita el permiso confirmado para grabar.",
                  ],
                ] as const
              ).map(([valor, nombre, detalle]) => (
                <label
                  key={valor}
                  className="flex cursor-pointer items-start gap-3 rounded-lg border border-neutral-700 p-3 text-sm has-[:checked]:border-amber-500 has-[:checked]:bg-amber-500/10"
                >
                  <input
                    type="radio"
                    name="origen"
                    value={valor}
                    defaultChecked={(ficha?.origen ?? ORIGEN_POR_DEFECTO) === valor}
                    aria-label={nombre}
                    className="mt-0.5 accent-amber-500"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium text-neutral-100">{nombre}</span>
                    <span className="block text-xs text-neutral-400">{detalle}</span>
                    <span className="mt-1 block text-xs text-neutral-500">Leyenda: «{LEYENDAS[valor]}»</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          {/* También en la ficha de ejemplo: si se pasa a «real», el permiso se pide como en todas. */}
          <label className="hidden items-start gap-3 rounded-md border border-neutral-700 p-3 text-sm group-has-[input[value=real]:checked]/origen:flex">
            <input
              type="checkbox"
              name="permiso"
              defaultChecked={ficha?.permiso ?? false}
              className="mt-0.5 accent-amber-500"
            />
            <span>
              Tengo el permiso por escrito de su protagonista para contar esta historia, en las redes donde se
              va a publicar. Sin esta casilla una historia real no entra al estudio.
            </span>
          </label>
        </div>
      </div>
      {/* La historia (en una ficha de historia) o los datos del tema de hoy (en la entrevista a la IA): el modelo de
          la entrevista no sabe lo que pasó después de su fecha de corte, así que los hechos recientes van aquí
          (Richard, 7 nov 2026: el episodio de las IAs que se escaparon de sus pruebas). */}
      <div>
        <label htmlFor="historia" className="etiqueta">
          <span className="group-has-[input[value^=entrevista]:checked]/ficha:hidden">
            La historia, en primera persona (es lo ÚNICO que sabe el invitado)
          </span>
          <span className="hidden group-has-[input[value^=entrevista]:checked]/ficha:inline">
            Los datos del tema de hoy (opcional): los hechos verificados que la IA tiene que saber
          </span>
        </label>
        <textarea
          id="historia"
          name="historia"
          rows={14}
          maxLength={L.historia}
          defaultValue={ficha?.historia ?? ""}
          placeholder="En una historia: el relato en primera persona, con su mensaje. En una entrevista a la IA: los hechos del tema de hoy, con fechas y nombres. Lo que no esté aquí, el invitado no lo inventa."
          className="campo font-mono text-[13px] leading-relaxed"
        />
      </div>
      <div>
        <label htmlFor="primer_mensaje" className="etiqueta">
          Lo primero que dice al conectarse (opcional)
        </label>
        <input
          id="primer_mensaje"
          name="primer_mensaje"
          maxLength={L.primer_mensaje}
          defaultValue={ficha?.primer_mensaje ?? ""}
          placeholder="Un saludo corto para Richard"
          className="campo"
        />
      </div>
      {estado.error && (
        <p className="text-sm text-red-300" role="alert">
          {estado.error}
        </p>
      )}
      {estado.ok && <p className="text-sm text-green-300">{estado.ok}</p>}
      <button type="submit" disabled={pendiente} className="boton">
        {pendiente ? "Guardando…" : "Guardar la ficha"}
      </button>
    </form>
  );
}
