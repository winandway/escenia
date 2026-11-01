// Cuánto se gastó en un mes y en qué (docs/GASTOS.md): por servicio, por pieza (cada guion, anuncio o
// proyecto del Director) y por día, a partir del libro de gastos del panel. Lo pidió Richard el 31 oct
// 2026 al ver en su tarjeta varios cobros de 10 dólares de fal.ai: «quiero tener control de cuánto sale
// cada video y cuántos videos hemos hecho».
import type { BaseDatos } from "./db";

export type Pieza = { clave: string; nombre: string; enlace: string | null };

/** De qué pieza es un gasto, según cómo quedó descrito en el libro. */
export function piezaDelGasto(detalle: string): Pieza {
  const guion = /guion (\d+)/i.exec(detalle)?.[1];
  if (guion) return { clave: `guion-${guion}`, nombre: `Guion ${guion}`, enlace: `/guiones/${guion}` };
  const anuncio = /anuncio (\d+)/i.exec(detalle)?.[1];
  if (anuncio) return { clave: `anuncio-${anuncio}`, nombre: `Anuncio ${anuncio}`, enlace: "/publicidad" };
  const trabajo = /director, trabajo (\d+)/i.exec(detalle)?.[1];
  if (trabajo)
    return { clave: `director-video-${trabajo}`, nombre: `Director · video ${trabajo}`, enlace: null };
  const grabacion = /grabación (\d+)/i.exec(detalle)?.[1];
  if (grabacion)
    return { clave: `grabacion-${grabacion}`, nombre: `Grabación ${grabacion}`, enlace: "/grabaciones" };
  if (/^plan de anuncio/i.test(detalle))
    return { clave: "planes-anuncio", nombre: "Planes de anuncios (IA)", enlace: "/publicidad" };
  const encargo = /encargo (\d+)/i.exec(detalle)?.[1];
  if (encargo)
    return {
      clave: `encargo-${encargo}`,
      nombre: `Director · proyecto ${encargo}`,
      enlace: `/director/${encargo}`,
    };
  if (/^guion:/i.test(detalle))
    return { clave: "guiones-ia", nombre: "Guiones escritos por la IA", enlace: "/" };
  if (/imagen escena/i.test(detalle))
    return { clave: "escenas", nombre: "Imágenes de escenas (sin guion anotado)", enlace: null };
  return { clave: "otros", nombre: "Otros", enlace: null };
}

/** El nombre de cada servicio, como lo entiende Richard. */
export function nombreDelServicio(servicio: string): string {
  if (/^fal/i.test(servicio)) return "fal.ai (imágenes, presentadora que habla, animaciones)";
  if (/eleven/i.test(servicio)) return "ElevenLabs (voces)";
  if (/claude|anthropic/i.test(servicio)) return "Claude (guiones, planes y el Director)";
  return servicio;
}
const servicioBase = (s: string) => (/^fal/i.test(s) ? "fal" : s.toLowerCase());

export type ResumenDelMes = {
  mes: string;
  total: number;
  porServicio: { servicio: string; nombre: string; usd: number; veces: number }[];
  porPieza: (Pieza & { usd: number; porServicio: Record<string, number> })[];
  porDia: { fecha: string; usd: number }[];
  videos: { guiones: number; anuncios: number; director: number };
};

export const mesValido = (m: string | undefined): string =>
  m && /^\d{4}-(0[1-9]|1[0-2])$/.test(m) ? m : new Date().toISOString().slice(0, 7);

export async function resumenDelMes(db: BaseDatos, mes: string): Promise<ResumenDelMes> {
  const filas = await db.todos<{ fecha: string; servicio: string; detalle: string; costo_usd: number }>(
    "SELECT fecha, servicio, detalle, costo_usd FROM gastos WHERE substr(fecha, 1, 7) = ? ORDER BY fecha",
    [mes],
  );
  const servicios = new Map<string, { usd: number; veces: number }>();
  const piezas = new Map<string, Pieza & { usd: number; porServicio: Record<string, number> }>();
  const dias = new Map<string, number>();
  let total = 0;
  for (const f of filas) {
    const s = servicioBase(f.servicio);
    const sv = servicios.get(s) ?? { usd: 0, veces: 0 };
    sv.usd += f.costo_usd;
    sv.veces += 1;
    servicios.set(s, sv);
    const p = piezaDelGasto(f.detalle);
    const pz = piezas.get(p.clave) ?? { ...p, usd: 0, porServicio: {} };
    pz.usd += f.costo_usd;
    pz.porServicio[s] = (pz.porServicio[s] ?? 0) + f.costo_usd;
    piezas.set(p.clave, pz);
    dias.set(f.fecha, (dias.get(f.fecha) ?? 0) + f.costo_usd);
    total += f.costo_usd;
  }
  const contar = async (sql: string) => (await db.uno<{ n: number }>(sql, [mes]))?.n ?? 0;
  return {
    mes,
    total,
    porServicio: [...servicios.entries()]
      .map(([servicio, v]) => ({ servicio, nombre: nombreDelServicio(servicio), ...v }))
      .sort((a, b) => b.usd - a.usd),
    porPieza: [...piezas.values()].sort((a, b) => b.usd - a.usd),
    porDia: [...dias.entries()].map(([fecha, usd]) => ({ fecha, usd })),
    videos: {
      guiones: await contar(
        "SELECT COUNT(*) AS n FROM trabajos WHERE estado = 'hecho' AND substr(creado_en, 1, 7) = ?",
      ),
      anuncios: await contar(
        "SELECT COUNT(*) AS n FROM publicidades WHERE estado = 'lista' AND substr(creado_en, 1, 7) = ?",
      ),
      director: await contar(
        "SELECT COUNT(*) AS n FROM director_trabajos WHERE estado = 'lista' AND substr(creado_en, 1, 7) = ?",
      ),
    },
  };
}
