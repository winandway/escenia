// Estilo neón: de lo que escribe el guion (objetos, flechas y la frase que
// enciende cada objeto) a lo que dibuja el video (cada cosa con su momento).
// Aquí va lo que no depende de la Mac, para poder probarlo.
import { buscarFrase, type PalabraConTiempo } from "./planos";

export type NodoDeGuion = { id: string; icono: string; etiqueta: string; nota: string; frase: string };
export type DiagramaDeGuion = {
  seccion: string;
  nodos: NodoDeGuion[];
  flechas: { de: string; a: string }[];
  formula: string;
};

export type DiagramaArmado = {
  numero: number;
  secciones: string[];
  seccion: number;
  titular: string;
  bajada: string;
  nodos: { id: string; icono: string; etiqueta: string; nota: string; entraMs: number }[];
  flechas: { de: string; a: string; texto: string; entraMs: number }[];
  formula: string;
  formulaMs: number | null;
};

/** El primer objeto se enciende, como mucho, a este tiempo del arranque: la escena no abre apagada. */
export const PRIMER_NODO_MS = 1100;
/** Dos objetos no se encienden más pegados que esto. */
export const ENTRE_NODOS_MS = 900;
const ANTICIPO_MS = 120;

/**
 * Cuándo se enciende cada objeto: justo antes de que la voz diga su frase. El
 * que no encuentra su frase se reparte entre sus vecinos; todos quedan en
 * orden, separados y dentro de la escena (ninguno se pierde).
 */
export function tiemposDeNodos(
  frases: string[],
  palabras: PalabraConTiempo[],
  inicioMs: number,
  finMs: number,
): number[] {
  const crudos: (number | null)[] = [];
  let desde = 0;
  for (const frase of frases) {
    const i = buscarFrase(palabras, frase, desde);
    const palabra = i === null ? undefined : palabras[i];
    if (i === null || !palabra) {
      crudos.push(null);
      continue;
    }
    crudos.push(palabra.startMs - ANTICIPO_MS);
    desde = i + 1;
  }
  for (let i = 0; i < crudos.length; i++) {
    if (crudos[i] !== null) continue;
    let j = i;
    while (j < crudos.length && crudos[j] === null) j++;
    const antes = i === 0 ? inicioMs : (crudos[i - 1] ?? inicioMs);
    const despues = j < crudos.length ? (crudos[j] ?? finMs) : finMs;
    const paso = (despues - antes) / (j - i + 1);
    for (let k = i; k < j; k++) crudos[k] = antes + paso * (k - i + 1);
    i = j - 1;
  }
  const tope = Math.max(inicioMs, finMs - 700);
  let previo = -Infinity;
  return crudos.map((t, k) => {
    let ms = Math.max(inicioMs, t ?? inicioMs);
    if (k === 0) ms = Math.min(ms, inicioMs + PRIMER_NODO_MS);
    ms = Math.max(ms, previo + ENTRE_NODOS_MS);
    // Al final de la escena se aprietan antes que perderse: un objeto que no se enciende no explica nada.
    ms = Math.min(ms, tope - (crudos.length - 1 - k) * 250);
    ms = Math.max(ms, Math.min(previo + 250, tope));
    previo = ms;
    return Math.round(ms);
  });
}

/** Arma el diagrama de una escena con sus tiempos (el número y las secciones se ponen después). */
export function armarDiagrama(
  visual: { titular?: string; cuerpo?: string; diagrama: DiagramaDeGuion },
  palabras: PalabraConTiempo[],
  inicioMs: number,
  finMs: number,
): DiagramaArmado {
  const d = visual.diagrama;
  // Dos objetos con el mismo id confundirían las flechas: al repetido se le agrega su número.
  const vistos = new Set<string>();
  const nodos = d.nodos.map((n, k) => {
    const id = vistos.has(n.id) ? `${n.id}-${k + 1}` : n.id;
    vistos.add(id);
    return { ...n, id };
  });
  const tiempos = tiemposDeNodos(
    nodos.map((n) => n.frase),
    palabras,
    inicioMs,
    finMs,
  );
  const armados = nodos.map((n, k) => ({
    id: n.id,
    icono: n.icono,
    etiqueta: n.etiqueta,
    nota: n.nota,
    entraMs: tiempos[k] ?? inicioMs,
  }));
  const porId = new Map(armados.map((n) => [n.id, n] as const));
  const flechas = d.flechas.flatMap((f) => {
    const de = porId.get(f.de);
    const a = porId.get(f.a);
    // La flecha se enciende cuando ya están los dos objetos que une.
    return de && a && de !== a
      ? [{ de: f.de, a: f.a, texto: "", entraMs: Math.max(de.entraMs, a.entraMs) }]
      : [];
  });
  const ultimo = armados[armados.length - 1]?.entraMs ?? inicioMs;
  const formula = d.formula.trim();
  return {
    numero: 1,
    secciones: [],
    seccion: 0,
    titular: (visual.titular ?? "").trim(),
    bajada: (visual.cuerpo ?? "").trim(),
    nodos: armados,
    flechas,
    formula,
    formulaMs: formula ? Math.max(inicioMs, Math.min(ultimo + 1500, finMs - 1800)) : null,
  };
}

/**
 * Numera los diagramas del video y arma la barra de secciones de arriba. Cada
 * escena dice su sección; las seguidas con la misma comparten casilla y una
 * escena que no la dice hereda la anterior. `seccionGuion` es lo que escribió el guion.
 */
export function numerarDiagramas(
  escenas: { diagrama: DiagramaArmado | null }[],
  seccionesDelGuion: (string | null)[],
): void {
  const secciones: string[] = [];
  let numero = 0;
  let actual = -1;
  const asignadas: number[] = [];
  escenas.forEach((e, i) => {
    if (!e.diagrama) {
      asignadas.push(-1);
      return;
    }
    const nombre = (seccionesDelGuion[i] ?? "").trim();
    if (nombre && nombre.toLowerCase() !== (secciones[actual] ?? "").toLowerCase()) {
      secciones.push(nombre);
      actual = secciones.length - 1;
    } else if (actual === -1) {
      // La primera escena no dijo sección: la barra arranca con una genérica.
      secciones.push(nombre || "Inicio");
      actual = 0;
    }
    asignadas.push(actual);
  });
  escenas.forEach((e, i) => {
    if (!e.diagrama) return;
    numero++;
    e.diagrama.numero = numero;
    e.diagrama.secciones = secciones;
    e.diagrama.seccion = asignadas[i] ?? 0;
  });
}
