"use client";

// La ficha del invitado: su nombre, el tema, cómo habla, la voz del banco (nunca la de Richard) y la
// historia, que es lo ÚNICO que sabe. Guarda borrador mientras se escribe y no se limpia hasta que el
// panel confirma que se guardó (regla de los formularios).
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AvisoBorrador } from "@/componentes/AvisoBorrador";
import { BancoDeVoces } from "@/componentes/BancoDeVoces";
import { useBorrador } from "@/componentes/useBorrador";
import { LIMITES_FICHA as L, VOCES_INVITADO, type FichaPodcast } from "@compartido/podcast";
import type { EstadoFicha } from "./acciones";

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
    <form ref={ref} onSubmit={enviar} className="max-w-3xl space-y-5" aria-label="Ficha del invitado">
      <AvisoBorrador visible={recuperado} alEmpezarDeNuevo={empezarDeNuevo} />
      {ficha && <input type="hidden" name="id" value={ficha.id} />}
      {ficha?.ejemplo && (
        <p className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-200">
          Esta es la ficha de ejemplo: la historia es ficticia, sirve para probar el estudio y no se publica.
        </p>
      )}
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
            placeholder="Nombre del invitado o un nombre cambiado"
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
      <div>
        <label htmlFor="historia" className="etiqueta">
          La historia, en primera persona (es lo ÚNICO que sabe el invitado)
        </label>
        <textarea
          id="historia"
          name="historia"
          rows={14}
          required
          minLength={40}
          maxLength={L.historia}
          defaultValue={ficha?.historia ?? ""}
          placeholder="Lo que la persona contó y aprobó por escrito. Lo que no esté aquí, el invitado no lo inventa: dice que prefiere no contarlo o que no lo recuerda bien."
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
      {!ficha?.ejemplo && (
        <label className="flex items-start gap-3 rounded-md border border-neutral-700 p-3 text-sm">
          <input
            type="checkbox"
            name="permiso"
            defaultChecked={ficha?.permiso ?? false}
            className="mt-0.5 accent-amber-500"
          />
          <span>
            Tengo el permiso por escrito de su protagonista para contar esta historia, en las redes donde se
            va a publicar. Sin esta casilla la ficha no entra al estudio.
          </span>
        </label>
      )}
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
