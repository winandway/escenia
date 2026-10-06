"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AvisoBorrador } from "@/componentes/AvisoBorrador";
import { useBorrador } from "@/componentes/useBorrador";
import {
  extensionDeImagen,
  MAX_ARCHIVOS_POR_SUBIDA,
  MAX_BYTES_IMAGEN,
  nombreDeCarpeta,
} from "@compartido/imagenes";

type Estado = { fase: "listo" | "subiendo"; hechos: number; total: number; error: string; ok: string };
const EN_REPOSO: Estado = { fase: "listo", hechos: 0, total: 0, error: "", ok: "" };

/** Sube muchos archivos de una vez a una carpeta: uno detrás de otro, con su avance. */
export function FormularioImagenes({ carpetas }: { carpetas: string[] }) {
  const router = useRouter();
  const { ref, recuperado, empezarDeNuevo, descartar } = useBorrador("imagenes-nuevas");
  const [estado, setEstado] = useState<Estado>(EN_REPOSO);

  async function subir(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const form = evento.currentTarget;
    const datos = new FormData(form);
    const carpeta = nombreDeCarpeta(String(datos.get("carpeta") ?? ""));
    const archivos = datos.getAll("archivos").filter((a): a is File => a instanceof File && a.size > 0);
    if (carpeta.length < 2) return setEstado({ ...EN_REPOSO, error: "Ponle un nombre a la carpeta." });
    if (archivos.length === 0)
      return setEstado({ ...EN_REPOSO, error: "Elige los archivos que quieres subir." });
    if (archivos.length > MAX_ARCHIVOS_POR_SUBIDA)
      return setEstado({ ...EN_REPOSO, error: `Son muchos de una vez: hasta ${MAX_ARCHIVOS_POR_SUBIDA}.` });
    const malo = archivos.find((a) => !extensionDeImagen(a.name));
    if (malo) return setEstado({ ...EN_REPOSO, error: `«${malo.name}» no es PNG, JPG, WEBP ni PDF.` });
    const pesado = archivos.find((a) => a.size > MAX_BYTES_IMAGEN);
    if (pesado)
      return setEstado({
        ...EN_REPOSO,
        error: `«${pesado.name}» pasa de ${MAX_BYTES_IMAGEN / 1_048_576} MB.`,
      });

    setEstado({ fase: "subiendo", hechos: 0, total: archivos.length, error: "", ok: "" });
    const fallidos: string[] = [];
    for (const [k, archivo] of archivos.entries()) {
      const q = new URLSearchParams({
        carpeta,
        nombre: archivo.name,
        extension: extensionDeImagen(archivo.name),
      });
      let ultimo = "";
      // Tres intentos por archivo: un corte corto de internet no tumba la subida de treinta logos.
      for (let intento = 0; intento < 3; intento++) {
        try {
          const r = await fetch(`/datos/imagenes?${q}`, {
            method: "POST",
            body: archivo,
            headers: { "content-type": "application/octet-stream" },
          });
          if (r.ok) {
            ultimo = "";
            break;
          }
          const respuesta = (await r.json().catch(() => ({}))) as { error?: string };
          ultimo = respuesta.error ?? `No se pudo subir «${archivo.name}».`;
          if (r.status === 401 || r.status === 400 || r.status === 413) break;
        } catch {
          ultimo = `Se cortó la conexión subiendo «${archivo.name}».`;
        }
        await new Promise((listo) => setTimeout(listo, 1500 * (intento + 1)));
      }
      if (ultimo) fallidos.push(ultimo);
      setEstado((e) => ({ ...e, hechos: k + 1 }));
    }
    router.refresh();
    if (fallidos.length === archivos.length) {
      setEstado({ ...EN_REPOSO, error: fallidos[0] ?? "No se pudo subir nada." });
      return;
    }
    descartar();
    form.reset();
    setEstado({
      ...EN_REPOSO,
      ok: `${archivos.length - fallidos.length} archivo(s) en la carpeta «${carpeta}».`,
      error: fallidos.length ? `${fallidos.length} no subieron: ${fallidos[0]}` : "",
    });
  }

  const ocupado = estado.fase === "subiendo";
  return (
    <form ref={ref} onSubmit={subir} className="max-w-2xl space-y-5">
      <AvisoBorrador visible={recuperado} alEmpezarDeNuevo={empezarDeNuevo} />
      <div>
        <label htmlFor="carpeta" className="etiqueta">
          Carpeta (el cliente o el trabajo)
        </label>
        <input
          id="carpeta"
          name="carpeta"
          required
          minLength={2}
          maxLength={60}
          list="carpetas-existentes"
          className="campo"
          placeholder="Nombre de la carpeta"
        />
        <datalist id="carpetas-existentes">
          {carpetas.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
        <p className="mt-1.5 text-xs text-neutral-400">
          Si escribes el nombre de una carpeta que ya existe, los archivos se agregan a esa.
        </p>
      </div>
      <div>
        <label htmlFor="archivos" className="etiqueta">
          Archivos (PNG, JPG, WEBP o PDF; puedes elegir muchos de una vez)
        </label>
        <input
          id="archivos"
          name="archivos"
          type="file"
          multiple
          required
          accept=".png,.jpg,.jpeg,.webp,.pdf,image/png,image/jpeg,image/webp,application/pdf"
          disabled={ocupado}
          className="campo file:mr-3 file:rounded-md file:border-0 file:bg-neutral-700 file:px-3 file:py-1.5 file:text-neutral-100"
        />
        <p className="mt-1.5 text-xs text-neutral-400">
          Los logos van en PNG sin fondo. Un PDF de capturas se parte solo en páginas, una imagen por página.
        </p>
      </div>
      {ocupado && (
        <div role="status" aria-live="polite">
          <div className="h-2 overflow-hidden rounded-full bg-neutral-800">
            <div
              className="h-full bg-amber-500 transition-[width]"
              style={{ width: `${estado.total ? Math.round((estado.hechos / estado.total) * 100) : 0}%` }}
            />
          </div>
          <p className="mt-1.5 text-sm text-neutral-300">
            Subiendo {Math.min(estado.hechos + 1, estado.total)} de {estado.total}. No cierres esta pestaña.
          </p>
        </div>
      )}
      {estado.error && (
        <p role="alert" className="rounded-md border border-red-900 bg-red-950/50 p-3 text-sm text-red-200">
          {estado.error}
        </p>
      )}
      {estado.ok && (
        <p
          role="status"
          className="rounded-md border border-emerald-900 bg-emerald-950/40 p-3 text-sm text-emerald-200"
        >
          {estado.ok}
        </p>
      )}
      <button type="submit" disabled={ocupado} className="boton">
        {ocupado ? "Subiendo…" : "Subir a la carpeta"}
      </button>
    </form>
  );
}
