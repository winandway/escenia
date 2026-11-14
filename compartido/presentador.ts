// Formato Presentador (docs/PRESENTADOR.md): Richard se graba hablando y el
// video se arma alrededor de SU voz y SU imagen. Aquí va lo que no depende de
// la Mac: pasar la transcripción a palabras con tiempo, saber dónde empieza
// cada escena dentro de la grabación y decidir cuándo él sale grande o en la esquina.
import { buscarFrase, type PalabraConTiempo } from "./planos";

export type PalabraTranscrita = {
  text: string;
  type?: string;
  start?: number;
  end?: number;
  logprob?: number;
};
export type PalabraDeVideo = {
  text: string;
  startMs: number;
  endMs: number;
  timestampMs: number | null;
  confidence: number | null;
};

/**
 * De lo que devuelve la transcripción (palabras, espacios y ruidos) a las
 * palabras que usa el video para los subtítulos y para saber cuándo entra cada
 * imagen. Los ruidos («(risas)») y los espacios no cuentan.
 */
export function palabrasDeTranscripcion(
  palabras: PalabraTranscrita[],
  nombres = NOMBRES_PROPIOS,
): PalabraDeVideo[] {
  const salida: PalabraDeVideo[] = [];
  for (const p of juntarPalabrasDeNombres(
    palabras.filter((x) => (x.type ?? "word") === "word"),
    nombres,
  )) {
    // Los nombres propios de Richard salen bien escritos desde aquí (subtítulos y plan).
    const texto = corregirNombres(p.text.trim(), nombres);
    if (!texto || typeof p.start !== "number" || typeof p.end !== "number") continue;
    const startMs = Math.round(p.start * 1000);
    salida.push({
      // Cada palabra lleva su espacio delante (menos la primera), como las de la voz generada.
      text: `${salida.length ? " " : ""}${texto}`,
      startMs,
      endMs: Math.max(startMs + 40, Math.round(p.end * 1000)),
      timestampMs: startMs,
      confidence: typeof p.logprob === "number" ? Math.exp(p.logprob) : null,
    });
  }
  return salida;
}

/**
 * Los nombres propios de Richard que la transcripción no conoce y escribe «como suenan».
 * En su primera grabación dijo «Beellon.com» y salió «Billon.com»: en los subtítulos, en el
 * diagrama y en la barra de arriba, justo donde vende su producto (C-NOMBRES-1).
 * Cada nombre lleva las formas en que puede llegar mal escrito, en minúsculas y sin tilde.
 */
export const NOMBRES_PROPIOS: { correcto: string; variantes: string[] }[] = [
  { correcto: "Beellon", variantes: ["billon", "bilon", "beelon", "bellon", "belon", "biyon", "bilion"] },
  { correcto: "Blisor", variantes: ["blizor", "blissor", "bleesor", "blisser"] },
  { correcto: "Mercatren", variantes: ["mercatrén", "mercatrem", "mercatrend"] },
  { correcto: "Tokiia", variantes: ["tokia", "toquia", "tokiya"] },
  { correcto: "Tintora", variantes: ["tintorá", "tintoora"] },
  { correcto: "QRBOTT", variantes: ["qrbot", "qrbott", "kiurbot", "qr bot", "qr bott", "q r bot"] },
  { correcto: "YaDominios", variantes: ["yadominios", "ya dominios"] },
  { correcto: "Losupe", variantes: ["losupe", "losupé"] },
];

const sinTilde = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

/**
 * Corrige un texto: cada palabra que sea una forma mal escrita de un nombre propio se cambia
 * por el nombre bien escrito, conservando lo que lleve pegado («Billon.com,» → «Beellon.com,»).
 * Solo toca palabras que llegaron con MAYÚSCULA inicial (un nombre): «un billón de dólares»,
 * en minúscula, es una cifra y se queda como está.
 */
export function corregirNombres(texto: string, nombres = NOMBRES_PROPIOS): string {
  // Primero los de varias palabras («Ya Dominios» → «YaDominios», C-NOMBRES-2): basta con que una
  // de las palabras llegue con mayúscula o que vaya pegado a un «.com»; todo en minúscula y suelto
  // pueden ser palabras corrientes.
  texto = juntarNombresEnTexto(texto, nombres);
  return texto.replace(/\p{Lu}[\p{L}\d]*/gu, (palabra) => {
    const llave = sinTilde(palabra).toLowerCase();
    const nombre = nombres.find(
      (n) => n.variantes.includes(llave) || sinTilde(n.correcto).toLowerCase() === llave,
    );
    return nombre ? nombre.correcto : palabra;
  });
}

/**
 * Los nombres de varias palabras dentro de un texto («Ya Dominios» → «YaDominios»), sin armar
 * expresiones con lo que escribió Richard: se recorren las palabras y se comparan grupos de 2 a 4
 * separadas solo por espacios o guiones.
 */
function juntarNombresEnTexto(texto: string, nombres: typeof NOMBRES_PROPIOS): string {
  const variantes = new Map<string, string>();
  for (const n of nombres) for (const v of n.variantes) if (v.includes(" ")) variantes.set(v, n.correcto);
  if (!variantes.size) return texto;
  const palabras = [...texto.matchAll(/[\p{L}\d]+/gu)].map((m) => ({
    desde: m.index,
    hasta: m.index + m[0].length,
    texto: m[0],
  }));
  let salida = "";
  let hecho = 0;
  for (let i = 0; i < palabras.length; i++) {
    for (let k = 4; k >= 2; k--) {
      const grupo = palabras.slice(i, i + k);
      if (grupo.length < k) continue;
      const separadas = grupo
        .slice(1)
        .every((p, n) => /^[\s-]+$/u.test(texto.slice((grupo[n] as typeof p).hasta, p.desde)));
      const correcto = variantes.get(grupo.map((p) => sinTilde(p.texto).toLowerCase()).join(" "));
      if (!separadas || !correcto) continue;
      const desde = (grupo[0] as (typeof grupo)[number]).desde;
      const hasta = (grupo[k - 1] as (typeof grupo)[number]).hasta;
      // Con mayúscula, o pegado a un dominio («ya dominios.com»), es el nombre.
      const esNombre =
        grupo.some((p) => /\p{Lu}/u.test(p.texto)) ||
        /^\.(com|net|org|app|dev|co)\b/i.test(texto.slice(hasta));
      if (!esNombre) continue;
      salida += texto.slice(hecho, desde) + correcto;
      hecho = hasta;
      i += k - 1;
      break;
    }
  }
  return salida + texto.slice(hecho);
}

/** Lo que se compara de una palabra: sin tilde, en minúscula y sin la puntuación de las puntas. */
const llaveDePalabra = (t: string) =>
  sinTilde(t)
    .toLowerCase()
    .replace(/^[^\p{L}\d]+|[^\p{L}\d]+$/gu, "");

/**
 * Las palabras de un nombre de varias palabras («Ya» + «Dominios.») se vuelven una sola, con la hora
 * de la primera a la última y la puntuación de la última, para que el subtítulo diga «YaDominios.»
 * (C-NOMBRES-2). Basta con que una llegue con mayúscula; las de en medio no pueden traer puntuación.
 */
function juntarPalabrasDeNombres(palabras: PalabraTranscrita[], nombres: typeof NOMBRES_PROPIOS) {
  const variantes = new Set(nombres.flatMap((n) => n.variantes.filter((v) => v.includes(" "))));
  if (!variantes.size) return palabras;
  const salida: PalabraTranscrita[] = [];
  for (let i = 0; i < palabras.length; i++) {
    let juntada: PalabraTranscrita | null = null;
    for (let k = 4; k >= 2 && !juntada; k--) {
      const grupo = palabras.slice(i, i + k);
      if (grupo.length < k) continue;
      const enMedioLimpias = grupo.slice(0, -1).every((p) => !/[^\p{L}\d]$/u.test(p.text.trim()));
      const llave = grupo.map((p) => llaveDePalabra(p.text)).join(" ");
      if (!enMedioLimpias || !variantes.has(llave) || !grupo.some((p) => /\p{Lu}/u.test(p.text))) continue;
      const ultima = grupo[k - 1] as PalabraTranscrita;
      juntada = {
        ...grupo[0],
        text: grupo.map((p) => p.text.trim()).join(" "),
        end: ultima.end,
      };
      i += k - 1;
    }
    salida.push(juntada ?? (palabras[i] as PalabraTranscrita));
  }
  return salida;
}

/**
 * Los nombres que Richard agrega desde Ajustes (C-NOMBRES-2): uno por línea, el nombre bien escrito y,
 * si quiere, después de dos puntos, las formas en que lo escribe mal la transcripción, separadas por
 * comas («Kipuu: kipu, ki pu»). Las líneas vacías no cuentan; como mucho 100 nombres.
 */
export function leerNombresPropios(texto: string): typeof NOMBRES_PROPIOS {
  const salida: typeof NOMBRES_PROPIOS = [];
  for (const linea of texto.split(/\r?\n/)) {
    const [antes = "", despues = ""] = linea.split(":");
    const correcto = antes.trim().slice(0, 40);
    if (!correcto) continue;
    const variantes = despues
      .split(",")
      .map((v) => sinTilde(v).toLowerCase().replace(/\s+/g, " ").trim().slice(0, 40))
      .filter(Boolean);
    salida.push({ correcto, variantes });
    if (salida.length >= 100) break;
  }
  return salida;
}

/** Los de fábrica más los que agregó Richard (los suyos mandan si repite un nombre). */
export function juntarNombres(suyos: typeof NOMBRES_PROPIOS): typeof NOMBRES_PROPIOS {
  const llave = (n: { correcto: string }) => sinTilde(n.correcto).toLowerCase();
  const propios = new Set(suyos.map(llave));
  return [...NOMBRES_PROPIOS.filter((n) => !propios.has(llave(n))), ...suyos];
}

/**
 * La lista que se le pasa a la transcripción para que escriba bien esos nombres (`keyterms` de
 * ElevenLabs, 20 % más caro: unos 4 centavos más por hora de grabación). Sin repetir y como mucho 100:
 * con más, ElevenLabs cobra 20 segundos como mínimo por cada transcripción.
 */
export function terminosParaTranscribir(nombres = NOMBRES_PROPIOS): string[] {
  return [
    ...new Set(nombres.map((n) => n.correcto.replace(/[<>{}[\]\\]/g, "").trim()).filter(Boolean)),
  ].slice(0, 100);
}

/**
 * Dónde empieza y termina cada escena DENTRO de la grabación. El plan trae la
 * narración de cada escena (lo que él dijo, en orden): se busca dónde arranca
 * cada una por sus primeras palabras. La que no se encuentra se reparte entre
 * sus vecinas según cuántas palabras tiene. No se pierde ni se pisa ninguna.
 */
export function tramosDeGrabacion(
  narraciones: string[],
  palabras: PalabraConTiempo[],
  duracionMs: number,
): { indice: number; inicioMs: number; finMs: number }[] {
  const inicios: (number | null)[] = [];
  let desde = 0;
  narraciones.forEach((narracion, i) => {
    if (i === 0) return inicios.push(0);
    const arranque = narracion.split(/\s+/).filter(Boolean).slice(0, 4).join(" ");
    const k = arranque ? buscarFrase(palabras, arranque, desde) : null;
    const palabra = k === null ? undefined : palabras[k];
    if (k === null || !palabra) return inicios.push(null);
    desde = k + 1;
    // El corte va un pelo antes de la primera palabra, para no comerle la entrada.
    inicios.push(Math.max(0, palabra.startMs - 150));
  });
  // Las que no aparecieron: repartidas entre la anterior y la siguiente conocidas, por su largo.
  for (let i = 0; i < inicios.length; i++) {
    if (inicios[i] !== null) continue;
    let j = i;
    while (j < inicios.length && inicios[j] === null) j++;
    const antes = inicios[i - 1] ?? 0;
    const despues = j < inicios.length ? (inicios[j] ?? duracionMs) : duracionMs;
    const largos = narraciones.slice(i - 1, j).map((n) => Math.max(1, n.split(/\s+/).filter(Boolean).length));
    const total = largos.reduce((a, b) => a + b, 0);
    let acumulado = 0;
    for (let k = i; k < j; k++) {
      acumulado += largos[k - i] ?? 1;
      inicios[k] = Math.round(antes + ((despues - antes) * acumulado) / total);
    }
    i = j - 1;
  }
  // En orden y con algo de duración cada una.
  let previo = 0;
  const limpios = inicios.map((t, i) => {
    const ms =
      i === 0 ? 0 : Math.min(Math.max(t ?? previo, previo + 400), Math.max(previo + 400, duracionMs - 400));
    previo = ms;
    return ms;
  });
  return limpios.map((inicioMs, i) => ({
    indice: i,
    inicioMs,
    finMs: i + 1 < limpios.length ? (limpios[i + 1] ?? duracionMs) : duracionMs,
  }));
}

export type ModoPresentador = "completo" | "esquina";
export type MomentoPresentador = { inicioMs: number; modo: ModoPresentador };

/** Aire que se deja antes de la primera palabra y después de la última. */
export const AIRE_ANTES_MS = 350;
export const AIRE_DESPUES_MS = 600;

/**
 * Qué trozo de la grabación se usa: desde un instante antes de la primera palabra hasta un
 * instante después de la última. Lo de antes y lo de después es Richard acercándose a la cámara
 * para darle a grabar y a parar; en su primera grabación eran tres segundos al principio y
 * cuatro al final, y el video abría con él de lado, callado (C-CROMA-1).
 */
export function corteDeGrabacion(
  palabras: { startMs: number; endMs: number }[],
  duracionMs: number,
): { desdeMs: number; hastaMs: number } {
  const primera = palabras[0];
  const ultima = palabras[palabras.length - 1];
  if (!primera || !ultima) return { desdeMs: 0, hastaMs: duracionMs };
  const desdeMs = Math.max(0, Math.round(primera.startMs - AIRE_ANTES_MS));
  const hastaMs = Math.min(duracionMs, Math.round(ultima.endMs + AIRE_DESPUES_MS));
  return hastaMs - desdeMs < 1000 ? { desdeMs: 0, hastaMs: duracionMs } : { desdeMs, hastaMs };
}

/** Las palabras, con sus tiempos contados desde el corte. */
export function palabrasDesde<T extends { startMs: number; endMs: number; timestampMs?: number | null }>(
  palabras: T[],
  desdeMs: number,
): T[] {
  return palabras.map((p) => ({
    ...p,
    startMs: Math.max(0, p.startMs - desdeMs),
    endMs: Math.max(0, p.endMs - desdeMs),
    ...(typeof p.timestampMs === "number" ? { timestampMs: Math.max(0, p.timestampMs - desdeMs) } : {}),
  }));
}

/** Cuánto dura él en grande al arrancar el video: los primeros segundos son su cara y su voz. */
export const APERTURA_MS = 3500;
/** Al empezar cada tema vuelve a salir grande un momento, y se va a la esquina cuando entran los gráficos. */
export const SALUDO_DE_ESCENA_MS = 1600;

/**
 * Cuándo sale Richard en grande y cuándo en la esquina. Abre en grande (su cara
 * es el gancho); al empezar cada escena larga vuelve un momento a pantalla
 * completa y se retira a la esquina para dejar ver lo que explica; en la
 * opinión se queda en grande, hablándole a la cámara.
 */
export function momentosDelPresentador(
  escenas: { parte: string; inicioMs: number; finMs: number }[],
): MomentoPresentador[] {
  const momentos: MomentoPresentador[] = [];
  const poner = (inicioMs: number, modo: ModoPresentador) => {
    const ultimo = momentos[momentos.length - 1];
    if (ultimo && ultimo.modo === modo) return;
    if (ultimo && inicioMs <= ultimo.inicioMs) return;
    momentos.push({ inicioMs, modo });
  };
  escenas.forEach((e, i) => {
    const dura = e.finMs - e.inicioMs;
    if (e.parte === "opinion") return poner(e.inicioMs, "completo");
    if (i === 0) {
      momentos.push({ inicioMs: 0, modo: "completo" });
      return poner(Math.min(APERTURA_MS, Math.round(dura * 0.45)), "esquina");
    }
    if (dura >= 8000) {
      poner(e.inicioMs, "completo");
      return poner(e.inicioMs + SALUDO_DE_ESCENA_MS, "esquina");
    }
    poner(e.inicioMs, "esquina");
  });
  return momentos.length ? momentos : [{ inicioMs: 0, modo: "esquina" }];
}
