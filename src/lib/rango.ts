// Respuestas parciales (HTTP Range) para que el navegador pueda reproducir un
// video del almacén saltando y sin bajarlo entero.

export type RangoR2 =
  { offset: number; length?: number } | { offset?: number; length: number } | { suffix: number };

/** Convierte la cabecera Range del navegador en el rango que entiende R2. */
export function rangoDesdeCabecera(cabecera: string | null, tamano: number): RangoR2 | null {
  if (!cabecera) return null;
  const m = /^bytes=(\d*)-(\d*)$/.exec(cabecera.trim());
  if (!m) return null;
  const inicio = m[1] === "" ? null : Number(m[1]);
  const fin = m[2] === "" ? null : Number(m[2]);
  if (inicio === null && fin === null) return null;
  if (inicio === null && fin !== null) return { suffix: Math.min(fin, tamano) };
  if (inicio === null) return null;
  if (inicio >= tamano) return null;
  const hasta = fin === null || fin >= tamano ? tamano - 1 : fin;
  if (hasta < inicio) return null;
  return { offset: inicio, length: hasta - inicio + 1 };
}

/** Cabeceras y código para una respuesta parcial (206) o completa (200). */
export function cabecerasDeRango(
  rango: RangoR2 | null,
  tamano: number,
  tipo: string,
): { status: number; headers: Record<string, string> } {
  const base: Record<string, string> = {
    "content-type": tipo,
    "accept-ranges": "bytes",
    "cache-control": "private, max-age=3600",
  };
  if (!rango) return { status: 200, headers: { ...base, "content-length": String(tamano) } };
  let inicio: number;
  let largo: number;
  if ("suffix" in rango) {
    largo = Math.min(rango.suffix, tamano);
    inicio = tamano - largo;
  } else {
    inicio = rango.offset ?? 0;
    largo = rango.length ?? tamano - inicio;
  }
  const fin = inicio + largo - 1;
  return {
    status: 206,
    headers: {
      ...base,
      "content-length": String(largo),
      "content-range": `bytes ${inicio}-${fin}/${tamano}`,
    },
  };
}
