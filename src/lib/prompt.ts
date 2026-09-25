// Arma las instrucciones para la IA que escribe el guion.
// Aquí va solo lo GENÉRICO (el repositorio es público). Los ajustes finos de
// Richard viven en la base (`ajustes.instrucciones_extra`) y se suman al final.
import type { Tematica } from "@compartido/tematicas";

export type EntradaGuion = {
  tematica: Tematica;
  tema: { titulo: string; contexto: string; urlFuente: string };
  producto: { id: string; nombre: string; url: string; descripcion_corta: string } | null;
  estructura: string[];
  recientes: { titulo: string; gancho: string }[];
  instruccionesExtra: string;
};

export function elegirEstructura(tematica: Tematica, estructurasRecientes: string[]): string[] {
  // Rota: toma la estructura que menos se usó en los últimos videos de esta temática.
  const conteo = tematica.estructuras.map((e) => ({
    e,
    usos: estructurasRecientes.filter((r) => r === e.join(">")).length,
  }));
  conteo.sort((a, b) => a.usos - b.usos);
  return conteo[0]?.e ?? tematica.estructuras[0] ?? ["gancho", "demo", "opinion", "cta"];
}

export function instruccionesSistema(): string {
  return [
    "Eres guionista de videos de YouTube en español neutro (para todo el público hispano, sin regionalismos).",
    "El video lo narra una sola voz, sin mostrar la cara del presentador. Escribes para el oído: frases cortas, ritmo claro, nada de listas leídas.",
    "Reglas que nunca se rompen:",
    "- No inventes datos, cifras, fechas ni citas. Si un dato no está en el contexto que te dan, no lo digas o dilo como pregunta abierta.",
    "- Cada afirmación concreta que dependa de una fuente va también en `hechos_a_verificar`, para que el editor humano la compruebe.",
    "- Nada de plantillas genéricas ni frases de relleno («en el video de hoy», «no olvides suscribirte»). Cada guion tiene que sentirse escrito para ese tema.",
    "- El gancho de los primeros 5 segundos plantea una tensión o una pregunta concreta, no un saludo.",
    "- La escena de opinión la escribe el editor humano: deja en ella una narración corta de relleno que diga «[opinión del editor]».",
    "- El producto (si hay) aparece al final como una recomendación natural y honesta, sin exagerar.",
    "- En `visual.busqueda` escribe 2 a 5 palabras EN INGLÉS para buscar un clip de stock (ej.: «programmer laptop night»). Nunca pidas personas famosas ni marcas.",
    "- En `visual.texto_en_pantalla` pon frases de 2 a 6 palabras que refuercen la idea.",
  ].join("\n");
}

export function mensajeUsuario(e: EntradaGuion): string {
  const partes: string[] = [];
  partes.push(`TEMÁTICA: ${e.tematica.nombre}`);
  partes.push(`TONO: ${e.tematica.tono}`);
  partes.push(
    `DURACIÓN OBJETIVO: unos ${e.tematica.duracionObjetivo.largo} segundos de narración (≈ ${Math.round((e.tematica.duracionObjetivo.largo / 60) * 150)} palabras).`,
  );
  partes.push(
    `ESTRUCTURA (en este orden; cada parte puede tener 1 a 3 escenas): ${e.estructura.join(" → ")}`,
  );
  if (e.tematica.reglas.length) partes.push(`REGLAS DE ESTA TEMÁTICA:\n- ${e.tematica.reglas.join("\n- ")}`);
  partes.push(`TEMA: ${e.tema.titulo}`);
  if (e.tema.urlFuente) partes.push(`FUENTE: ${e.tema.urlFuente}`);
  partes.push(
    e.tema.contexto.trim()
      ? `CONTEXTO (los únicos datos que puedes afirmar):\n"""\n${e.tema.contexto.trim().slice(0, 12000)}\n"""`
      : "CONTEXTO: no hay texto de fuente. No afirmes datos concretos; habla de lo que se puede mostrar y explicar.",
  );
  if (e.producto) {
    partes.push(
      `PRODUCTO PARA EL CIERRE: ${e.producto.nombre} (${e.producto.url}). Qué es: ${e.producto.descripcion_corta} ` +
        "Menciónalo solo con lo que dice esa descripción.",
    );
  } else {
    partes.push("PRODUCTO: ninguno. Cierra con una reflexión, sin vender nada.");
  }
  if (e.recientes.length) {
    partes.push(
      "VIDEOS RECIENTES (tu guion tiene que ser DISTINTO en gancho, enfoque y títulos):\n" +
        e.recientes.map((r) => `- «${r.titulo}» — gancho: ${r.gancho}`).join("\n"),
    );
  }
  if (e.instruccionesExtra.trim()) partes.push(`INDICACIONES DEL EDITOR:\n${e.instruccionesExtra.trim()}`);
  return partes.join("\n\n");
}
