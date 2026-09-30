// Calendario de publicaciones: cuándo sale cada video, sin que dos choquen.
// Aquí viven las partes puras (horas, huecos, choques, reparto); la base está
// en src/lib/calendario.ts y las pantallas en src/app/calendario.
import { NOMBRE_CANAL, type Canal } from "./tematicas";

export const CANALES_CALENDARIO = ["caprichoso-tv", "canal-ia"] as const satisfies readonly Canal[];
export const PLATAFORMAS = ["youtube", "facebook", "instagram", "tiktok"] as const;
export type Plataforma = (typeof PLATAFORMAS)[number];
export const NOMBRE_PLATAFORMA: Record<Plataforma, string> = {
  youtube: "YouTube",
  facebook: "Facebook",
  instagram: "Instagram",
  tiktok: "TikTok",
};
export const PIEZAS = ["largo", "short"] as const;
export type Pieza = (typeof PIEZAS)[number];
export const ESTADOS_CALENDARIO = ["agendado", "programado", "publicado", "descartado"] as const;
export type EstadoCalendario = (typeof ESTADOS_CALENDARIO)[number];
export const NOMBRE_ESTADO: Record<EstadoCalendario, string> = {
  agendado: "Agendado",
  programado: "Programado",
  publicado: "Publicado",
  descartado: "Fuera de la lista",
};

export type EntradaCalendario = {
  id: number;
  guion_id: number | null;
  pieza: Pieza;
  indice: number;
  titulo: string;
  canal: Canal;
  plataforma: Plataforma;
  /** AAAA-MM-DD, en la hora del reloj de Richard (zona de las reglas). */
  fecha: string;
  /** HH:MM en 24 horas; vacía = todavía falta la hora. */
  hora: string;
  estado: EstadoCalendario;
  nota: string;
  /** Enlace del video ya subido a la plataforma; vacío = todavía no se pegó. */
  enlace: string;
};

export const ZONAS = [
  { id: "America/New_York", nombre: "Este de EE. UU. (Miami, Nueva York)" },
  { id: "America/Chicago", nombre: "Centro de EE. UU. (Chicago, Houston)" },
  { id: "America/Denver", nombre: "Montaña de EE. UU. (Denver)" },
  { id: "America/Los_Angeles", nombre: "Pacífico de EE. UU. (Los Ángeles)" },
  { id: "America/Bogota", nombre: "Colombia (Bogotá)" },
  { id: "America/Caracas", nombre: "Venezuela (Caracas)" },
  { id: "America/Mexico_City", nombre: "México (Ciudad de México)" },
  { id: "Europe/Madrid", nombre: "España (Madrid)" },
] as const;

export type ReglasCalendario = {
  /** Horas del día en que sale un Short. Cuántas horas haya = máximo de Shorts por día. */
  horasShort: string[];
  horasLargo: string[];
  /** Minutos mínimos entre dos publicaciones del mismo canal y plataforma. */
  separacionMin: number;
  zona: string;
};

export const REGLAS_POR_DEFECTO: ReglasCalendario = {
  horasShort: ["12:00", "19:00"],
  horasLargo: ["16:00"],
  separacionMin: 180,
  zona: "America/New_York",
};

const FECHA = /^(\d{4})-(\d{2})-(\d{2})$/;
const HORA = /^([01]\d|2[0-3]):([0-5]\d)$/;
const DIAS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"] as const;
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"] as const;

function aUTC(fecha: string): Date | null {
  const m = FECHA.exec(fecha);
  if (!m) return null;
  const [a, me, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const f = new Date(Date.UTC(a, me - 1, d));
  return f.getUTCFullYear() === a && f.getUTCMonth() === me - 1 && f.getUTCDate() === d ? f : null;
}

export const fechaValida = (fecha: string): boolean => aUTC(fecha) !== null;
export const horaValida = (hora: string): boolean => HORA.test(hora);

/** «7 pm», «7:30 p. m.», «19:00» → «19:00»; null si no se entiende. */
export function normalizarHora(texto: string): string | null {
  // Sin puntos ni espacios: «7:30 p. m.» → «7:30pm».
  let t = texto.trim().toLowerCase().replace(/[.\s]/g, "");
  let sufijo = "";
  if (t.endsWith("am") || t.endsWith("pm")) {
    sufijo = t.slice(-2);
    t = t.slice(0, -2);
  }
  const [horas = "", minutos = "0", sobra] = t.split(":");
  if (sobra !== undefined || !/^\d{1,2}$/.test(horas) || !/^\d{1,2}$/.test(minutos)) return null;
  if (t.includes(":") && minutos.length !== 2) return null;
  let h = Number(horas);
  const min = Number(minutos);
  if (min > 59) return null;
  if (sufijo) {
    if (h < 1 || h > 12) return null;
    if (sufijo === "pm" && h !== 12) h += 12;
    if (sufijo === "am" && h === 12) h = 0;
  } else if (h > 23) return null;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

/** «12:00, 7 pm» → ["12:00", "19:00"], ordenadas y sin repetir. */
export function leerHoras(texto: string): string[] {
  const horas = texto
    .split(/[,;\n]+/)
    .map((h) => normalizarHora(h))
    .filter((h): h is string => h !== null);
  return [...new Set(horas)].sort();
}

export function minutosDe(hora: string): number {
  const m = HORA.exec(hora);
  return m ? Number(m[1]) * 60 + Number(m[2]) : 0;
}

/** «19:00» → «7:00 p. m.» */
export function hora12(hora: string): string {
  const m = HORA.exec(hora);
  if (!m) return "";
  const h = Number(m[1]);
  return `${h % 12 === 0 ? 12 : h % 12}:${m[2]} ${h >= 12 ? "p. m." : "a. m."}`;
}

export function sumarDias(fecha: string, dias: number): string {
  const f = aUTC(fecha);
  if (!f) return fecha;
  f.setUTCDate(f.getUTCDate() + dias);
  return f.toISOString().slice(0, 10);
}

export function diasEntre(desde: string, hasta: string): number {
  const a = aUTC(desde);
  const b = aUTC(hasta);
  return a && b ? Math.round((b.getTime() - a.getTime()) / 86_400_000) : 0;
}

/** El lunes de la semana de esa fecha. */
export function lunesDe(fecha: string): string {
  const f = aUTC(fecha);
  if (!f) return fecha;
  return sumarDias(fecha, -((f.getUTCDay() + 6) % 7));
}

/** «jue 1 oct» */
export function diaCorto(fecha: string): string {
  const f = aUTC(fecha);
  if (!f) return fecha;
  return `${DIAS[f.getUTCDay()]} ${f.getUTCDate()} ${MESES[f.getUTCMonth()]}`;
}

export function etiquetaDia(fecha: string, hoy: string): string {
  if (fecha === hoy) return "Hoy";
  if (fecha === sumarDias(hoy, 1)) return "Mañana";
  return diaCorto(fecha);
}

/** Cierra la frase con punto solo si no lo trae (las horas terminan en «p. m.»). */
export const conPunto = (texto: string): string =>
  /[.!?]$/.test(texto.trim()) ? texto.trim() : `${texto.trim()}.`;

/** «jue 1 oct · 7:00 p. m.» (o «falta la hora»). */
export function cuando(fecha: string, hora: string): string {
  return `${diaCorto(fecha)} · ${hora ? hora12(hora) : "falta la hora"}`;
}

/** La fecha y la hora de ahora en el reloj de esa zona. */
export function hoyEn(zona: string, ahora: Date): { fecha: string; hora: string } {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: zona,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(ahora);
  const p = (tipo: string) => partes.find((x) => x.type === tipo)?.value ?? "00";
  return { fecha: `${p("year")}-${p("month")}-${p("day")}`, hora: `${p("hour")}:${p("minute")}` };
}

/**
 * ¿Esta publicación ya salió? Sí, si está marcada «Publicado», o si estaba
 * «Programado» en la plataforma y su hora ya pasó (la plataforma la publica sola).
 * Un plan («Agendado») con la fecha pasada NO salió: se le pasó la fecha.
 */
export function yaSalio(e: Pick<EntradaCalendario, "estado" | "fecha" | "hora">, ahora: Momento): boolean {
  if (e.estado === "publicado") return true;
  if (e.estado !== "programado") return false;
  if (e.fecha !== ahora.fecha) return e.fecha < ahora.fecha;
  return e.hora !== "" && minutosDe(e.hora) <= minutosDe(ahora.hora);
}

/** Un plan al que se le pasó la fecha sin que nadie lo programara. */
export function sePasoLaFecha(
  e: Pick<EntradaCalendario, "estado" | "fecha" | "hora">,
  ahora: Momento,
): boolean {
  if (e.estado !== "agendado") return false;
  if (e.fecha !== ahora.fecha) return e.fecha < ahora.fecha;
  return e.hora !== "" && minutosDe(e.hora) <= minutosDe(ahora.hora);
}

export const horasDe = (pieza: Pieza, reglas: ReglasCalendario): string[] =>
  pieza === "short" ? reglas.horasShort : reglas.horasLargo;

const nombrePieza = (pieza: Pieza, n: number) =>
  pieza === "short" ? (n === 1 ? "Short" : "Shorts") : n === 1 ? "video largo" : "videos largos";

export type Pedido = {
  /** Al mover una entrada que ya existe, su id: no choca consigo misma. */
  id?: number;
  guion_id?: number | null;
  canal: Canal;
  plataforma: Plataforma;
  pieza: Pieza;
};
export type Choque = {
  motivo: "misma-hora" | "muy-cerca" | "dia-lleno" | "antes-del-largo";
  mensaje: string;
};

const minutosAbsolutos = (fecha: string, hora: string, base: string) =>
  diasEntre(base, fecha) * 1440 + minutosDe(hora);

/** Las entradas que cuentan para ese canal y esa plataforma (sin la propia ni las descartadas). */
function vecinas(entradas: EntradaCalendario[], pedido: Pedido): EntradaCalendario[] {
  return entradas.filter(
    (e) =>
      e.canal === pedido.canal &&
      e.plataforma === pedido.plataforma &&
      e.estado !== "descartado" &&
      e.id !== pedido.id,
  );
}

/**
 * ¿Se puede publicar ahí? Devuelve el choque, o null si el hueco está libre.
 * Reglas, solo dentro del mismo canal y la misma plataforma:
 * 1. nunca dos a la misma hora; 2. separación mínima entre publicaciones;
 * 3. máximo por día = cuántas horas tiene ese tipo en las reglas;
 * 4. un Short no sale antes que su video completo (el cierre invita a verlo).
 */
export function revisarHueco(
  entradas: EntradaCalendario[],
  pedido: Pedido & { fecha: string; hora: string },
  reglas: ReglasCalendario,
): Choque | null {
  const otras = vecinas(entradas, pedido);
  const donde = `${NOMBRE_CANAL[pedido.canal]} (${NOMBRE_PLATAFORMA[pedido.plataforma]})`;
  const delDia = otras.filter((e) => e.fecha === pedido.fecha);

  const misma = delDia.find((e) => e.hora !== "" && e.hora === pedido.hora);
  if (misma)
    return {
      motivo: "misma-hora",
      mensaje: `El ${diaCorto(pedido.fecha)} a las ${hora12(pedido.hora)} ya sale «${misma.titulo}» en ${donde}.`,
    };

  const mios = minutosAbsolutos(pedido.fecha, pedido.hora, pedido.fecha);
  const cerca = otras.find(
    (e) =>
      e.hora !== "" &&
      Math.abs(minutosAbsolutos(e.fecha, e.hora, pedido.fecha) - mios) < reglas.separacionMin,
  );
  if (cerca) {
    const horas = reglas.separacionMin / 60;
    const separacion = Number.isInteger(horas)
      ? `${horas} ${horas === 1 ? "hora" : "horas"}`
      : `${reglas.separacionMin} minutos`;
    return {
      motivo: "muy-cerca",
      mensaje: `Queda a menos de ${separacion} de «${cerca.titulo}» (${cuando(cerca.fecha, cerca.hora)}) en ${donde}.`,
    };
  }

  const maximo = horasDe(pedido.pieza, reglas).length;
  const iguales = delDia.filter((e) => e.pieza === pedido.pieza).length;
  if (maximo > 0 && iguales >= maximo)
    return {
      motivo: "dia-lleno",
      mensaje: `El ${diaCorto(pedido.fecha)} ya tiene ${iguales} ${nombrePieza(pedido.pieza, iguales)} en ${donde}. El máximo por día es ${maximo}.`,
    };

  if (pedido.pieza === "short" && pedido.guion_id) {
    const largo = otras.find((e) => e.guion_id === pedido.guion_id && e.pieza === "largo" && e.hora !== "");
    if (largo && minutosAbsolutos(largo.fecha, largo.hora, pedido.fecha) > mios)
      return {
        motivo: "antes-del-largo",
        mensaje: `Este Short saldría antes que su video completo (${cuando(largo.fecha, largo.hora)}). Agéndalo después: el cierre invita a ver el video completo.`,
      };
  }
  return null;
}

export type Momento = { fecha: string; hora: string };

/** Cada hora de las reglas para ese día, con su estado (libre, ya pasó u ocupada y por qué). */
export function huecosDelDia(
  entradas: EntradaCalendario[],
  pedido: Pedido,
  fecha: string,
  reglas: ReglasCalendario,
  ahora: Momento,
): { hora: string; libre: boolean; motivo: string }[] {
  return horasDe(pedido.pieza, reglas).map((hora) => {
    if (fecha < ahora.fecha || (fecha === ahora.fecha && minutosDe(hora) <= minutosDe(ahora.hora)))
      return { hora, libre: false, motivo: "Esa hora ya pasó." };
    const choque = revisarHueco(entradas, { ...pedido, fecha, hora }, reglas);
    return { hora, libre: choque === null, motivo: choque?.mensaje ?? "" };
  });
}

/** El primer hueco libre a partir de ahora (hasta 120 días). */
export function proximoHueco(
  entradas: EntradaCalendario[],
  pedido: Pedido,
  reglas: ReglasCalendario,
  ahora: Momento,
  desde: Momento = ahora,
): Momento | null {
  const inicio = desde.fecha > ahora.fecha ? desde.fecha : ahora.fecha;
  for (let d = 0; d < 120; d++) {
    const fecha = sumarDias(inicio, d);
    for (const h of huecosDelDia(entradas, pedido, fecha, reglas, ahora)) {
      if (!h.libre) continue;
      if (fecha === desde.fecha && minutosDe(h.hora) < minutosDe(desde.hora)) continue;
      return { fecha, hora: h.hora };
    }
  }
  return null;
}

export type PiezaPendiente = {
  guion_id: number;
  pieza: Pieza;
  indice: number;
  titulo: string;
  canal: Canal;
};

export type GuionProducido = {
  id: number;
  canal: Canal;
  titulo: string;
  tieneLargo: boolean;
  publicacion: { titulo: string; shorts: { indice: number; titulo: string }[] } | null;
};

/** Lo producido que todavía no está en el calendario de esa plataforma (el largo primero, después sus Shorts). */
export function piezasPorAgendar(
  guiones: GuionProducido[],
  entradas: Pick<EntradaCalendario, "guion_id" | "pieza" | "indice" | "plataforma">[],
  plataforma: Plataforma,
): PiezaPendiente[] {
  const ya = new Set(
    entradas.filter((e) => e.plataforma === plataforma).map((e) => `${e.guion_id}:${e.pieza}:${e.indice}`),
  );
  const piezas: PiezaPendiente[] = [];
  for (const g of guiones) {
    // En las plataformas de videos cortos no se agenda el largo.
    if (g.tieneLargo && plataforma === "youtube" && !ya.has(`${g.id}:largo:0`))
      piezas.push({
        guion_id: g.id,
        pieza: "largo",
        indice: 0,
        titulo: g.publicacion?.titulo || g.titulo,
        canal: g.canal,
      });
    for (const s of g.publicacion?.shorts ?? [])
      if (!ya.has(`${g.id}:short:${s.indice}`))
        piezas.push({ guion_id: g.id, pieza: "short", indice: s.indice, titulo: s.titulo, canal: g.canal });
  }
  return piezas;
}

/**
 * Reparte las piezas pendientes en los próximos huecos libres, una detrás de
 * otra, como si cada una ya quedara agendada (así no se pisan entre ellas).
 */
export function repartir(
  entradas: EntradaCalendario[],
  piezas: PiezaPendiente[],
  plataforma: Plataforma,
  reglas: ReglasCalendario,
  ahora: Momento,
): (PiezaPendiente & { hueco: Momento | null })[] {
  const ocupadas = [...entradas];
  let idTemporal = -1;
  return piezas.map((p) => {
    const pedido: Pedido = { canal: p.canal, plataforma, pieza: p.pieza, guion_id: p.guion_id };
    // Un Short busca hueco a partir de su video completo, si está en el calendario.
    const largo =
      p.pieza === "short"
        ? ocupadas.find(
            (e) =>
              e.guion_id === p.guion_id &&
              e.pieza === "largo" &&
              e.plataforma === plataforma &&
              e.estado !== "descartado" &&
              e.hora !== "",
          )
        : undefined;
    const desde = largo && largo.fecha >= ahora.fecha ? { fecha: largo.fecha, hora: largo.hora } : ahora;
    const hueco = proximoHueco(ocupadas, pedido, reglas, ahora, desde);
    if (hueco)
      ocupadas.push({
        id: idTemporal--,
        guion_id: p.guion_id,
        pieza: p.pieza,
        indice: p.indice,
        titulo: p.titulo,
        canal: p.canal,
        plataforma,
        fecha: hueco.fecha,
        hora: hueco.hora,
        estado: "agendado",
        nota: "",
        enlace: "",
      });
    return { ...p, hueco };
  });
}

// ---------------------------------------------------------------------------
// El enlace del video publicado y su miniatura.

const DOMINIOS: Record<Plataforma, string[]> = {
  youtube: ["youtube.com", "youtu.be"],
  facebook: ["facebook.com", "fb.watch", "fb.com"],
  instagram: ["instagram.com"],
  tiktok: ["tiktok.com"],
};
const ID_YOUTUBE = /^[A-Za-z0-9_-]{11}$/;

function urlSegura(enlace: string): URL | null {
  try {
    const u = new URL(enlace.trim());
    return u.protocol === "https:" ? u : null;
  } catch {
    return null;
  }
}

const esDe = (host: string, dominio: string) => host === dominio || host.endsWith(`.${dominio}`);

/** El código del video de YouTube en cualquiera de sus enlaces (ver, Shorts, corto, Studio); null si no es de YouTube. */
export function idDeYouTube(enlace: string): string | null {
  const u = urlSegura(enlace);
  if (!u) return null;
  const host = u.hostname.toLowerCase();
  const partes = u.pathname.split("/").filter(Boolean);
  let id: string | undefined;
  if (esDe(host, "youtu.be")) id = partes[0];
  else if (esDe(host, "youtube.com")) {
    if (partes[0] === "watch") id = u.searchParams.get("v") ?? undefined;
    else if (["shorts", "live", "embed", "v", "video"].includes(partes[0] ?? "")) id = partes[1];
  }
  return id && ID_YOUTUBE.test(id) ? id : null;
}

/** La miniatura que YouTube muestra para ese video (16:9, 320 px); null si el enlace no es de YouTube. */
export function miniaturaDeEnlace(enlace: string): string | null {
  const id = idDeYouTube(enlace);
  return id ? `https://i.ytimg.com/vi/${id}/mqdefault.jpg` : null;
}

/**
 * Revisa el enlace pegado: tiene que ser https y de la plataforma de esa
 * publicación. Los de YouTube se guardan en su forma corta y limpia.
 */
export function revisarEnlace(
  enlace: string,
  plataforma: Plataforma,
  pieza: Pieza,
): { ok: true; enlace: string } | { ok: false; error: string } {
  const texto = enlace.trim();
  if (texto === "") return { ok: true, enlace: "" };
  if (texto.length > 300) return { ok: false, error: "Ese enlace es demasiado largo." };
  const u = urlSegura(texto);
  if (!u) return { ok: false, error: "Pega el enlace completo, empezando por https://" };
  const host = u.hostname.toLowerCase();
  if (!DOMINIOS[plataforma].some((d) => esDe(host, d)))
    return {
      ok: false,
      error: `Ese enlace no es de ${NOMBRE_PLATAFORMA[plataforma]}. Esta publicación sale en ${NOMBRE_PLATAFORMA[plataforma]}.`,
    };
  if (plataforma === "youtube") {
    const id = idDeYouTube(texto);
    if (!id)
      return {
        ok: false,
        error: "No encuentro el video en ese enlace de YouTube. Copia el enlace del video, no el del canal.",
      };
    return {
      ok: true,
      enlace: pieza === "short" ? `https://www.youtube.com/shorts/${id}` : `https://youtu.be/${id}`,
    };
  }
  return { ok: true, enlace: u.toString() };
}
