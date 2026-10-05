// La subida de una grabación desde el navegador, por trozos de 8 MB y con reintentos:
// un corte de internet de unos segundos no obliga a empezar de cero.
import { partesDe, TAMANO_PARTE } from "@compartido/grabaciones";

export type SubidaEnCurso = {
  archivo: File;
  id: number;
  uploadId: string;
  /** Trozos que ya llegaron. Si se corta, se sigue desde el que falta. */
  partes: { partNumber: number; etag: string }[];
};

export class FalloDeSubida extends Error {
  constructor(
    mensaje: string,
    /** Se puede seguir desde donde quedó (se cortó la red) o hay que empezar otra vez. */
    public readonly sePuedeSeguir: boolean,
  ) {
    super(mensaje);
  }
}

const ESPERAS_MS = [2000, 5000, 10000, 20000];
const dormirDeVerdad = (ms: number) => new Promise<void>((listo) => setTimeout(listo, ms));

async function leerError(r: Response, porDefecto: string): Promise<string> {
  const cuerpo = (await r.json().catch(() => ({}))) as { error?: string };
  return cuerpo.error ?? porDefecto;
}

/** Paso 1: se anota la grabación y se abre la subida. */
export async function iniciarSubida(
  archivo: File,
  datos: { tema: string; formato: string; canal: string },
  pedir: typeof fetch = fetch,
): Promise<SubidaEnCurso> {
  let r: Response;
  try {
    r = await pedir("/datos/grabaciones/iniciar", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...datos, archivo: archivo.name, bytes: archivo.size }),
    });
  } catch {
    throw new FalloDeSubida("No hay conexión con el panel. Revisa tu internet y vuelve a intentarlo.", false);
  }
  if (!r.ok) throw new FalloDeSubida(await leerError(r, "No se pudo empezar la subida."), false);
  const inicio = (await r.json()) as { id: number; uploadId: string };
  return { archivo, id: inicio.id, uploadId: inicio.uploadId, partes: [] };
}

/** Pasos 2 y 3: sube los trozos que falten (cada uno con sus reintentos) y cierra. */
export async function seguirSubida(
  s: SubidaEnCurso,
  avisar: (subidos: number, total: number) => void,
  opciones: { pedir?: typeof fetch; dormir?: (ms: number) => Promise<void> } = {},
): Promise<void> {
  const pedir = opciones.pedir ?? fetch;
  const dormir = opciones.dormir ?? dormirDeVerdad;
  const total = s.archivo.size;
  for (const p of partesDe(total, TAMANO_PARTE)) {
    if (s.partes.some((x) => x.partNumber === p.n)) continue;
    const q = new URLSearchParams({ id: String(s.id), uploadId: s.uploadId, n: String(p.n) });
    for (let intento = 0; ; intento++) {
      let r: Response | null = null;
      try {
        r = await pedir(`/datos/grabaciones/parte?${q}`, {
          method: "PUT",
          headers: { "content-type": "application/octet-stream" },
          body: s.archivo.slice(p.desde, p.hasta),
        });
      } catch {
        r = null;
      }
      if (r?.ok) {
        const parte = (await r.json()) as { partNumber: number; etag: string };
        s.partes.push({ partNumber: parte.partNumber, etag: parte.etag });
        avisar(p.hasta, total);
        break;
      }
      // Lo que el panel rechazó (sesión cerrada, subida ya cerrada) no mejora repitiéndolo.
      if (r && r.status >= 400 && r.status < 500 && r.status !== 408 && r.status !== 429)
        throw new FalloDeSubida(await leerError(r, "El panel rechazó la subida."), false);
      const espera = ESPERAS_MS[intento];
      if (espera === undefined)
        throw new FalloDeSubida(
          "Se cortó la conexión mientras subía. Lo que ya subió no se pierde: toca «Seguir subiendo».",
          true,
        );
      await dormir(espera);
    }
  }
  let r: Response;
  try {
    r = await pedir("/datos/grabaciones/terminar", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        id: s.id,
        uploadId: s.uploadId,
        partes: [...s.partes].sort((a, b) => a.partNumber - b.partNumber),
      }),
    });
  } catch {
    throw new FalloDeSubida(
      "El video subió completo, pero se cortó la conexión al cerrar. Toca «Seguir subiendo».",
      true,
    );
  }
  if (!r.ok) throw new FalloDeSubida(await leerError(r, "No se pudo cerrar la subida."), r.status >= 500);
}
